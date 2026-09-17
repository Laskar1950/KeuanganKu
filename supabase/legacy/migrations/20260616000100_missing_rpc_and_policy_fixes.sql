-- Fix kesenjangan antara file migration terpisah dan keuanganku_complete_setup.sql.
-- Menambahkan RPC yang dipanggil frontend tetapi belum ada di migration,
-- memperbaiki RLS agar sesuai dengan permission frontend (owner/admin = manager),
-- dan melindungi created_by transaksi dari perubahan.
-- Jalankan setelah semua migration 20260* sebelumnya.

-- ============================================================
-- 1. Trigger: cegah perubahan created_by pada transaksi
-- ============================================================
create or replace function public.prevent_transaction_creator_change()
returns trigger
language plpgsql
as $$
begin
  if new.created_by <> old.created_by then
    raise exception 'Pembuat transaksi tidak dapat diubah.';
  end if;
  return new;
end;
$$;

drop trigger if exists transactions_prevent_creator_change on public.transactions;
create trigger transactions_prevent_creator_change
before update on public.transactions
for each row execute function public.prevent_transaction_creator_change();

-- ============================================================
-- 2. RPC yang hilang: onboarding + manajemen anggota keluarga
-- ============================================================
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

  insert into public.accounts (family_id, name, type, initial_balance, is_active)
  values (v_family_id, btrim(p_account_name), v_account_type, greatest(coalesce(p_initial_balance, 0), 0), true);

  return jsonb_build_object('id', v_family_id, 'name', btrim(p_family_name), 'owner_user_id', v_user_id);
end;
$$;

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

  if p_role not in ('admin', 'member') or (caller_role = 'admin' and p_role <> 'member') then
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
$$;

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

  if caller.role = 'owner' then
    null;
  elsif caller.role = 'admin' and target.role = 'member' and p_role = 'member' then
    null;
  else
    raise exception 'Tidak diizinkan.';
  end if;

  update public.family_members set role = p_role where id = p_member_id;
end;
$$;

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

  if caller.role = 'owner' then
    null;
  elsif caller.role = 'admin' and target.role = 'member' then
    null;
  else
    raise exception 'Tidak diizinkan.';
  end if;

  delete from public.family_members where id = p_member_id;
end;
$$;

grant execute on function public.create_family_with_onboarding(text, text, text, numeric) to authenticated;
grant execute on function public.join_family_by_invite_code(text) to authenticated;
grant execute on function public.add_family_member_by_identifier(text, public.family_role) to authenticated;
grant execute on function public.update_family_member_role(uuid, public.family_role) to authenticated;
grant execute on function public.remove_family_member(uuid) to authenticated;
grant execute on function public.get_login_email(text) to anon, authenticated;

-- ============================================================
-- 3. RLS: family_members - semua anggota keluarga dapat melihat
--    daftar anggota (dibutuhkan UI Dashboard/Settings/Filter).
-- ============================================================
drop policy if exists "family_members_select_own" on public.family_members;
drop policy if exists "family_members_select_member" on public.family_members;
create policy "family_members_select_member" on public.family_members
for select to authenticated
using (public.is_family_member(family_id));

-- ============================================================
-- 4. RLS: accounts - owner & admin (manager) dapat mengelola.
-- ============================================================
drop policy if exists "accounts_insert_owner" on public.accounts;
drop policy if exists "accounts_insert_manager" on public.accounts;
create policy "accounts_insert_manager" on public.accounts
for insert to authenticated
with check (public.is_family_admin_or_owner(family_id));

drop policy if exists "accounts_update_owner" on public.accounts;
drop policy if exists "accounts_update_manager" on public.accounts;
create policy "accounts_update_manager" on public.accounts
for update to authenticated
using (public.is_family_admin_or_owner(family_id))
with check (public.is_family_admin_or_owner(family_id));

drop policy if exists "accounts_delete_owner" on public.accounts;
drop policy if exists "accounts_delete_manager" on public.accounts;
create policy "accounts_delete_manager" on public.accounts
for delete to authenticated
using (public.is_family_admin_or_owner(family_id));

-- ============================================================
-- 5. RLS: categories - owner & admin (manager) dapat mengelola.
-- ============================================================
drop policy if exists "categories_insert_owner" on public.categories;
drop policy if exists "categories_insert_manager_custom" on public.categories;
create policy "categories_insert_manager_custom" on public.categories
for insert to authenticated
with check (
  family_id is not null
  and is_default = false
  and public.is_family_admin_or_owner(family_id)
);

drop policy if exists "categories_update_owner_custom" on public.categories;
drop policy if exists "categories_update_manager_custom" on public.categories;
create policy "categories_update_manager_custom" on public.categories
for update to authenticated
using (
  family_id is not null
  and is_default = false
  and public.is_family_admin_or_owner(family_id)
)
with check (
  family_id is not null
  and is_default = false
  and public.is_family_admin_or_owner(family_id)
);

drop policy if exists "categories_delete_owner_custom" on public.categories;
drop policy if exists "categories_delete_manager_custom" on public.categories;
create policy "categories_delete_manager_custom" on public.categories
for delete to authenticated
using (
  family_id is not null
  and is_default = false
  and public.is_family_admin_or_owner(family_id)
);

-- ============================================================
-- 6. RLS: budgets - ganti "all_member" menjadi select semua,
--    tulis hanya manager, dengan kecocokan referensi family.
-- ============================================================
drop policy if exists "budgets_all_member" on public.budgets;
drop policy if exists "budgets_select_member" on public.budgets;
create policy "budgets_select_member" on public.budgets
for select to authenticated
using (public.is_family_member(family_id));

drop policy if exists "budgets_insert_manager_matching_refs" on public.budgets;
create policy "budgets_insert_manager_matching_refs" on public.budgets
for insert to authenticated
with check (
  public.is_family_admin_or_owner(family_id)
  and exists (
    select 1 from public.accounts a
    where a.id = account_id and a.family_id = budgets.family_id
  )
  and (
    category_id is null
    or exists (
      select 1 from public.categories c
      where c.id = category_id and (c.family_id = budgets.family_id or c.family_id is null)
    )
  )
);

drop policy if exists "budgets_update_manager_matching_refs" on public.budgets;
create policy "budgets_update_manager_matching_refs" on public.budgets
for update to authenticated
using (public.is_family_admin_or_owner(family_id))
with check (
  public.is_family_admin_or_owner(family_id)
  and exists (
    select 1 from public.accounts a
    where a.id = account_id and a.family_id = budgets.family_id
  )
  and (
    category_id is null
    or exists (
      select 1 from public.categories c
      where c.id = category_id and (c.family_id = budgets.family_id or c.family_id is null)
    )
  )
);

drop policy if exists "budgets_delete_manager" on public.budgets;
create policy "budgets_delete_manager" on public.budgets
for delete to authenticated
using (public.is_family_admin_or_owner(family_id));

-- ============================================================
-- 7. RLS: transactions - ganti "all_member" dengan aturan
--    select semua, insert sendiri, update manager/pembuat,
--    delete hanya manager. Referensi wajib satu keluarga.
-- ============================================================
drop policy if exists "transactions_all_member" on public.transactions;
drop policy if exists "transactions_select_member" on public.transactions;
create policy "transactions_select_member" on public.transactions
for select to authenticated
using (public.is_family_member(family_id));

drop policy if exists "transactions_insert_member_matching_refs" on public.transactions;
create policy "transactions_insert_member_matching_refs" on public.transactions
for insert to authenticated
with check (
  public.is_family_member(family_id)
  and created_by = auth.uid()
  and exists (
    select 1 from public.accounts a
    where a.id = account_id and a.family_id = transactions.family_id
  )
  and (
    category_id is null
    or exists (
      select 1 from public.categories c
      where c.id = category_id and (c.family_id = transactions.family_id or c.family_id is null)
    )
  )
  and (
    budget_id is null
    or exists (
      select 1 from public.budgets b
      where b.id = budget_id
        and b.family_id = transactions.family_id
        and b.account_id = transactions.account_id
    )
  )
);

drop policy if exists "transactions_update_manager_or_creator_matching_refs" on public.transactions;
create policy "transactions_update_manager_or_creator_matching_refs" on public.transactions
for update to authenticated
using (public.is_family_admin_or_owner(family_id) or created_by = auth.uid())
with check (
  public.is_family_member(family_id)
  and (created_by = auth.uid() or public.is_family_admin_or_owner(family_id))
  and exists (
    select 1 from public.accounts a
    where a.id = account_id and a.family_id = transactions.family_id
  )
  and (
    category_id is null
    or exists (
      select 1 from public.categories c
      where c.id = category_id and (c.family_id = transactions.family_id or c.family_id is null)
    )
  )
  and (
    budget_id is null
    or exists (
      select 1 from public.budgets b
      where b.id = budget_id
        and b.family_id = transactions.family_id
        and b.account_id = transactions.account_id
    )
  )
);

drop policy if exists "transactions_delete_manager" on public.transactions;
create policy "transactions_delete_manager" on public.transactions
for delete to authenticated
using (public.is_family_admin_or_owner(family_id));

-- ============================================================
-- 8. RLS: saving_goals & saving_goal_transactions - select
--    semua, tulis hanya manager.
-- ============================================================
drop policy if exists "saving_goals_all_member" on public.saving_goals;
drop policy if exists "saving_goals_select_member" on public.saving_goals;
create policy "saving_goals_select_member" on public.saving_goals
for select to authenticated
using (public.is_family_member(family_id));

drop policy if exists "saving_goals_insert_manager" on public.saving_goals;
create policy "saving_goals_insert_manager" on public.saving_goals
for insert to authenticated
with check (public.is_family_admin_or_owner(family_id));

drop policy if exists "saving_goals_update_manager" on public.saving_goals;
create policy "saving_goals_update_manager" on public.saving_goals
for update to authenticated
using (public.is_family_admin_or_owner(family_id))
with check (public.is_family_admin_or_owner(family_id));

drop policy if exists "saving_goals_delete_manager" on public.saving_goals;
create policy "saving_goals_delete_manager" on public.saving_goals
for delete to authenticated
using (public.is_family_admin_or_owner(family_id));

drop policy if exists "saving_goal_transactions_all_member" on public.saving_goal_transactions;
drop policy if exists "saving_goal_transactions_select_member" on public.saving_goal_transactions;
create policy "saving_goal_transactions_select_member" on public.saving_goal_transactions
for select to authenticated
using (
  exists (
    select 1 from public.saving_goals sg
    where sg.id = saving_goal_transactions.saving_goal_id
      and public.is_family_member(sg.family_id)
  )
);

drop policy if exists "saving_goal_transactions_insert_manager" on public.saving_goal_transactions;
create policy "saving_goal_transactions_insert_manager" on public.saving_goal_transactions
for insert to authenticated
with check (
  exists (
    select 1 from public.saving_goals sg
    where sg.id = saving_goal_transactions.saving_goal_id
      and public.is_family_admin_or_owner(sg.family_id)
  )
);

drop policy if exists "saving_goal_transactions_update_manager" on public.saving_goal_transactions;
create policy "saving_goal_transactions_update_manager" on public.saving_goal_transactions
for update to authenticated
using (
  exists (
    select 1 from public.saving_goals sg
    where sg.id = saving_goal_transactions.saving_goal_id
      and public.is_family_admin_or_owner(sg.family_id)
  )
)
with check (
  exists (
    select 1 from public.saving_goals sg
    where sg.id = saving_goal_transactions.saving_goal_id
      and public.is_family_admin_or_owner(sg.family_id)
  )
);

drop policy if exists "saving_goal_transactions_delete_manager" on public.saving_goal_transactions;
create policy "saving_goal_transactions_delete_manager" on public.saving_goal_transactions
for delete to authenticated
using (
  exists (
    select 1 from public.saving_goals sg
    where sg.id = saving_goal_transactions.saving_goal_id
      and public.is_family_admin_or_owner(sg.family_id)
  )
);

-- ============================================================
-- 9. RLS: notifications - user_id penerima harus anggota keluarga.
-- ============================================================
drop policy if exists "notifications_insert_member" on public.notifications;
create policy "notifications_insert_member" on public.notifications
for insert to authenticated
with check (
  public.is_family_member(family_id)
  and (
    user_id is null
    or exists (
      select 1 from public.family_members fm
      where fm.family_id = notifications.family_id
        and fm.user_id = notifications.user_id
    )
  )
);

-- ============================================================
-- 10. Constraints tambahan agar konsisten dengan schema lengkap.
-- ============================================================
-- Kategori default harus ber-family_id null dan sebaliknya.
do $$
begin
  alter table public.categories
    add constraint categories_default_null_family
    check ((family_id is null) = is_default);
exception
  when duplicate_object then null;
end $$;

-- Nama alokasi unik per keluarga per periode (menggantikan pendekatan category_id lama).
do $$
begin
  create unique index budgets_family_named_allocation_unique_idx
  on public.budgets (family_id, month, year, lower(btrim(name)));
exception
  when duplicate_table then null;
end $$;
