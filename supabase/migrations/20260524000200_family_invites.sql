-- Add real multi-member family/household support.
-- Run this migration in Supabase SQL Editor if the existing database was already created.

create extension if not exists "pgcrypto";

create or replace function public.generate_family_invite_code()
returns text
language sql
as $$
  select upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
$$;

alter table public.families
add column if not exists invite_code text;

update public.families
set invite_code = public.generate_family_invite_code()
where invite_code is null;

alter table public.families
alter column invite_code set default public.generate_family_invite_code();

create unique index if not exists families_invite_code_unique_idx
on public.families (invite_code);

create index if not exists family_members_role_idx
on public.family_members (family_id, role);

create or replace function public.is_family_admin_or_owner(target_family_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.family_members fm
    where fm.family_id = target_family_id
      and fm.user_id = auth.uid()
      and fm.role in ('owner', 'admin')
  );
$$;

create or replace function public.join_family_by_invite_code(p_invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_family_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Anda harus login terlebih dahulu.';
  end if;

  select f.id
  into target_family_id
  from public.families f
  where upper(f.invite_code) = upper(trim(p_invite_code))
  limit 1;

  if target_family_id is null then
    raise exception 'Kode undangan keluarga tidak valid.';
  end if;

  insert into public.family_members (family_id, user_id, role)
  values (target_family_id, auth.uid(), 'member')
  on conflict (family_id, user_id) do nothing;

  return target_family_id;
end;
$$;

-- Make profile data visible to members of the same family so the app can show member names.
drop policy if exists "profiles_select_family_peers" on public.profiles;
create policy "profiles_select_family_peers" on public.profiles
for select to authenticated using (
  id = auth.uid()
  or exists (
    select 1
    from public.family_members mine
    join public.family_members peer on peer.family_id = mine.family_id
    where mine.user_id = auth.uid()
      and peer.user_id = profiles.id
  )
);

-- Keep the original onboarding path valid, and allow RPC-based joining by invite code.
drop policy if exists "family_members_insert_owner_self" on public.family_members;
drop policy if exists "family_members_insert_self_or_owner" on public.family_members;
create policy "family_members_insert_self_or_owner" on public.family_members
for insert to authenticated
with check (
  user_id = auth.uid()
  and (
    public.is_family_owner(family_id)
    or exists (
      select 1
      from public.families f
      where f.id = family_members.family_id
        and f.invite_code is not null
    )
  )
);

drop policy if exists "family_members_delete_owner" on public.family_members;
create policy "family_members_delete_owner" on public.family_members
for delete to authenticated
using (
  public.is_family_owner(family_id)
  and user_id <> auth.uid()
);

-- Allow owners/admins to manage family-level settings later.
drop policy if exists "family_members_update_owner" on public.family_members;
create policy "family_members_update_owner" on public.family_members
for update to authenticated
using (public.is_family_owner(family_id))
with check (public.is_family_owner(family_id));
