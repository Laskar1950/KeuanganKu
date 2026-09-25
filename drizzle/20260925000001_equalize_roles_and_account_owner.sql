-- Equalize owner/admin (except create family) + per-creator wallet tracking
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "created_by" uuid REFERENCES "public"."profiles"("id") ON DELETE SET NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "accounts_created_by_idx" ON "accounts" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "accounts_family_created_by_idx" ON "accounts" USING btree ("family_id", "created_by");--> statement-breakpoint
-- Backfill legacy shared wallets as NULL (visible to all), do not assign. No update needed.
-- Update create_family_with_onboarding to set created_by for initial wallet
create or replace function public.create_family_with_onboarding(
  p_family_name text,
  p_account_name text,
  p_account_type text default 'cash',
  p_initial_balance numeric default 0
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_family_id uuid;
  v_user_id uuid := auth.uid();
  v_account_type public.account_type;
begin
  if v_user_id is null then raise exception 'Anda harus login terlebih dahulu.'; end if;
  if length(btrim(coalesce(p_family_name, ''))) = 0 or length(btrim(coalesce(p_account_name, ''))) = 0 then
    raise exception 'Nama keluarga dan akun/dompet wajib diisi.';
  end if;

  v_account_type := coalesce(p_account_type, 'cash')::public.account_type;

  insert into public.families (name, owner_user_id)
  values (btrim(p_family_name), v_user_id)
  returning id into v_family_id;

  insert into public.family_members (family_id, user_id, role)
  values (v_family_id, v_user_id, 'owner');

  insert into public.accounts (family_id, name, type, initial_balance, is_active, created_by)
  values (v_family_id, btrim(p_account_name), v_account_type, greatest(coalesce(p_initial_balance, 0), 0), true, v_user_id);

  return jsonb_build_object('id', v_family_id, 'name', btrim(p_family_name), 'owner_user_id', v_user_id);
end;
$$;--> statement-breakpoint
-- Relax add_family_member_by_identifier: allow admin to add admin
create or replace function public.add_family_member_by_identifier(
  p_identifier text,
  p_role public.family_role default 'member'
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_family_id uuid;
  target_user_id uuid;
  caller_role public.family_role;
begin
  if auth.uid() is null then raise exception 'Anda harus login terlebih dahulu.'; end if;

  select fm.family_id, fm.role
  into target_family_id, caller_role
  from public.family_members fm
  where fm.user_id = auth.uid()
  limit 1;

  if target_family_id is null or caller_role not in ('owner', 'admin') then
    raise exception 'Tidak diizinkan.';
  end if;

  if p_role not in ('admin', 'member') then
    raise exception 'Role tidak diizinkan.';
  end if;

  select p.id into target_user_id
  from public.profiles p
  where lower(p.email) = lower(trim(p_identifier))
     or lower(p.username) = lower(trim(p_identifier))
  limit 1;

  if target_user_id is null then raise exception 'Pengguna tidak ditemukan.'; end if;
  if exists (
    select 1 from public.family_members fm
    where fm.user_id = target_user_id and fm.family_id <> target_family_id
  ) then
    raise exception 'Pengguna sudah tergabung dalam keluarga lain.';
  end if;

  insert into public.family_members (family_id, user_id, role)
  values (target_family_id, target_user_id, p_role)
  on conflict (family_id, user_id) do update set role = excluded.role
  returning id into target_user_id;

  return target_user_id;
end;
$$;--> statement-breakpoint
-- Relax update_family_member_role: owner and admin equal (both can manage member/admin, never owner/self)
create or replace function public.update_family_member_role(
  p_member_id uuid,
  p_role public.family_role
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller public.family_members;
  target public.family_members;
begin
  if auth.uid() is null or p_role = 'owner' then raise exception 'Tidak diizinkan.'; end if;

  select * into caller from public.family_members where user_id = auth.uid() limit 1;
  select * into target from public.family_members where id = p_member_id;

  if caller.id is null or target.id is null
     or caller.family_id <> target.family_id
     or target.user_id = auth.uid()
     or target.role = 'owner' then
    raise exception 'Tidak diizinkan.';
  end if;

  if caller.role not in ('owner', 'admin') then
    raise exception 'Tidak diizinkan.';
  end if;

  update public.family_members set role = p_role where id = p_member_id;
end;
$$;--> statement-breakpoint
-- Relax remove_family_member: owner and admin equal (both can remove member/admin, never owner/self)
create or replace function public.remove_family_member(p_member_id uuid) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller public.family_members;
  target public.family_members;
begin
  if auth.uid() is null then raise exception 'Anda harus login terlebih dahulu.'; end if;

  select * into caller from public.family_members where user_id = auth.uid() limit 1;
  select * into target from public.family_members where id = p_member_id;

  if caller.id is null or target.id is null
     or caller.family_id <> target.family_id
     or target.user_id = auth.uid()
     or target.role = 'owner' then
    raise exception 'Tidak diizinkan.';
  end if;

  if caller.role not in ('owner', 'admin') then
    raise exception 'Tidak diizinkan.';
  end if;

  delete from public.family_members where id = p_member_id;
end;
$$;--> statement-breakpoint
-- Allow admin to update family data (rename) — keep create restricted to owner_user_id check
DROP POLICY IF EXISTS "families_update_owner" ON "families";--> statement-breakpoint
CREATE POLICY "families_update_owner" ON "families" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (public.is_family_admin_or_owner("families"."id")) WITH CHECK (public.is_family_admin_or_owner("families"."id"));--> statement-breakpoint
-- Ensure accounts policies remain manager-based (owner|admin) — no change needed, but keep created_by visible to all via select
-- get_account_balances stays family-wide (visible everywhere)
