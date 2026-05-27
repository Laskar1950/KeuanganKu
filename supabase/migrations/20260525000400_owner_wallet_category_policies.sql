-- Restrict wallet/category management to family owners while keeping transaction usage for members.

-- Accounts/dompet: everyone in family can read, only owner can create/update/delete.
drop policy if exists "accounts_all_member" on public.accounts;
drop policy if exists "accounts_select_member" on public.accounts;
drop policy if exists "accounts_insert_owner" on public.accounts;
drop policy if exists "accounts_update_owner" on public.accounts;
drop policy if exists "accounts_delete_owner" on public.accounts;

create policy "accounts_select_member" on public.accounts
for select to authenticated
using (public.is_family_member(family_id));

create policy "accounts_insert_owner" on public.accounts
for insert to authenticated
with check (public.is_family_owner(family_id));

create policy "accounts_update_owner" on public.accounts
for update to authenticated
using (public.is_family_owner(family_id))
with check (public.is_family_owner(family_id));

create policy "accounts_delete_owner" on public.accounts
for delete to authenticated
using (public.is_family_owner(family_id));

-- Categories: all family members can read categories, owner manages family custom categories.
drop policy if exists "categories_insert_member" on public.categories;
drop policy if exists "categories_insert_owner" on public.categories;
drop policy if exists "categories_update_member_custom" on public.categories;
drop policy if exists "categories_update_owner_custom" on public.categories;
drop policy if exists "categories_delete_member_custom" on public.categories;
drop policy if exists "categories_delete_owner_custom" on public.categories;

create policy "categories_insert_owner" on public.categories
for insert to authenticated
with check (
  family_id is not null
  and is_default = false
  and public.is_family_owner(family_id)
);

create policy "categories_update_owner_custom" on public.categories
for update to authenticated
using (
  family_id is not null
  and is_default = false
  and public.is_family_owner(family_id)
)
with check (
  family_id is not null
  and is_default = false
  and public.is_family_owner(family_id)
);

create policy "categories_delete_owner_custom" on public.categories
for delete to authenticated
using (
  family_id is not null
  and is_default = false
  and public.is_family_owner(family_id)
);
