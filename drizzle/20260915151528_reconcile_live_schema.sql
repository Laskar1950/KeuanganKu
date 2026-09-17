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
$$;--> statement-breakpoint
grant execute on function public.create_family_with_onboarding(text, text, text, numeric) to authenticated;--> statement-breakpoint
drop policy if exists profiles_select_own_or_family_peers on public.profiles;--> statement-breakpoint
create policy profiles_select_own_or_family_peers on public.profiles for select to authenticated using (id = auth.uid() or exists (select 1 from public.family_members mine join public.family_members peer on peer.family_id = mine.family_id where mine.user_id = auth.uid() and peer.user_id = profiles.id));--> statement-breakpoint
drop policy if exists profiles_insert_own on public.profiles;--> statement-breakpoint
create policy profiles_insert_own on public.profiles for insert to authenticated with check (id = auth.uid());--> statement-breakpoint
drop policy if exists profiles_update_own on public.profiles;--> statement-breakpoint
create policy profiles_update_own on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());--> statement-breakpoint
drop policy if exists families_select_member on public.families;--> statement-breakpoint
create policy families_select_member on public.families for select to authenticated using (public.is_family_member(id));--> statement-breakpoint
drop policy if exists families_insert_owner on public.families;--> statement-breakpoint
create policy families_insert_owner on public.families for insert to authenticated with check (owner_user_id = auth.uid());--> statement-breakpoint
drop policy if exists families_update_owner on public.families;--> statement-breakpoint
create policy families_update_owner on public.families for update to authenticated using (public.is_family_owner(id)) with check (owner_user_id = auth.uid());--> statement-breakpoint
drop policy if exists family_members_select_member on public.family_members;--> statement-breakpoint
create policy family_members_select_member on public.family_members for select to authenticated using (public.is_family_member(family_id));--> statement-breakpoint
drop policy if exists family_members_insert_owner_self on public.family_members;--> statement-breakpoint
create policy family_members_insert_owner_self on public.family_members for insert to authenticated with check (user_id = auth.uid() and role = 'owner' and public.is_family_owner(family_id));--> statement-breakpoint
drop policy if exists accounts_select_member on public.accounts;--> statement-breakpoint
create policy accounts_select_member on public.accounts for select to authenticated using (public.is_family_member(family_id));--> statement-breakpoint
drop policy if exists accounts_insert_manager on public.accounts;--> statement-breakpoint
create policy accounts_insert_manager on public.accounts for insert to authenticated with check (public.is_family_admin_or_owner(family_id));--> statement-breakpoint
drop policy if exists accounts_update_manager on public.accounts;--> statement-breakpoint
create policy accounts_update_manager on public.accounts for update to authenticated using (public.is_family_admin_or_owner(family_id)) with check (public.is_family_admin_or_owner(family_id));--> statement-breakpoint
drop policy if exists accounts_delete_manager on public.accounts;--> statement-breakpoint
create policy accounts_delete_manager on public.accounts for delete to authenticated using (public.is_family_admin_or_owner(family_id));--> statement-breakpoint
drop policy if exists categories_select_default_or_member on public.categories;--> statement-breakpoint
create policy categories_select_default_or_member on public.categories for select to authenticated using (family_id is null or public.is_family_member(family_id));--> statement-breakpoint
drop policy if exists categories_insert_manager_custom on public.categories;--> statement-breakpoint
create policy categories_insert_manager_custom on public.categories for insert to authenticated with check (family_id is not null and is_default = false and public.is_family_admin_or_owner(family_id));--> statement-breakpoint
drop policy if exists categories_update_manager_custom on public.categories;--> statement-breakpoint
create policy categories_update_manager_custom on public.categories for update to authenticated using (family_id is not null and is_default = false and public.is_family_admin_or_owner(family_id)) with check (family_id is not null and is_default = false and public.is_family_admin_or_owner(family_id));--> statement-breakpoint
drop policy if exists categories_delete_manager_custom on public.categories;--> statement-breakpoint
create policy categories_delete_manager_custom on public.categories for delete to authenticated using (family_id is not null and is_default = false and public.is_family_admin_or_owner(family_id));--> statement-breakpoint
drop policy if exists budgets_select_member on public.budgets;--> statement-breakpoint
create policy budgets_select_member on public.budgets for select to authenticated using (public.is_family_member(family_id));--> statement-breakpoint
drop policy if exists budgets_insert_manager_matching_refs on public.budgets;--> statement-breakpoint
create policy budgets_insert_manager_matching_refs on public.budgets for insert to authenticated with check (public.is_family_admin_or_owner(family_id) and exists (select 1 from public.accounts a where a.id = account_id and a.family_id = budgets.family_id) and (category_id is null or exists (select 1 from public.categories c where c.id = category_id and (c.family_id = budgets.family_id or c.family_id is null))));--> statement-breakpoint
drop policy if exists budgets_update_manager_matching_refs on public.budgets;--> statement-breakpoint
create policy budgets_update_manager_matching_refs on public.budgets for update to authenticated using (public.is_family_admin_or_owner(family_id)) with check (public.is_family_admin_or_owner(family_id) and exists (select 1 from public.accounts a where a.id = account_id and a.family_id = budgets.family_id) and (category_id is null or exists (select 1 from public.categories c where c.id = category_id and (c.family_id = budgets.family_id or c.family_id is null))));--> statement-breakpoint
drop policy if exists budgets_delete_manager on public.budgets;--> statement-breakpoint
create policy budgets_delete_manager on public.budgets for delete to authenticated using (public.is_family_admin_or_owner(family_id));--> statement-breakpoint
drop policy if exists transactions_select_member on public.transactions;--> statement-breakpoint
create policy transactions_select_member on public.transactions for select to authenticated using (public.is_family_member(family_id));--> statement-breakpoint
drop policy if exists transactions_insert_member_matching_refs on public.transactions;--> statement-breakpoint
create policy transactions_insert_member_matching_refs on public.transactions for insert to authenticated with check (public.is_family_member(family_id) and created_by = auth.uid() and exists (select 1 from public.accounts a where a.id = account_id and a.family_id = transactions.family_id) and (category_id is null or exists (select 1 from public.categories c where c.id = category_id and (c.family_id = transactions.family_id or c.family_id is null))) and (budget_id is null or exists (select 1 from public.budgets b where b.id = budget_id and b.family_id = transactions.family_id and b.account_id = transactions.account_id)));--> statement-breakpoint
drop policy if exists transactions_update_manager_or_creator_matching_refs on public.transactions;--> statement-breakpoint
create policy transactions_update_manager_or_creator_matching_refs on public.transactions for update to authenticated using (public.is_family_admin_or_owner(family_id) or created_by = auth.uid()) with check (public.is_family_member(family_id) and (created_by = auth.uid() or public.is_family_admin_or_owner(family_id)) and exists (select 1 from public.accounts a where a.id = account_id and a.family_id = transactions.family_id) and (category_id is null or exists (select 1 from public.categories c where c.id = category_id and (c.family_id = transactions.family_id or c.family_id is null))) and (budget_id is null or exists (select 1 from public.budgets b where b.id = budget_id and b.family_id = transactions.family_id and b.account_id = transactions.account_id)));--> statement-breakpoint
drop policy if exists transactions_delete_manager on public.transactions;--> statement-breakpoint
create policy transactions_delete_manager on public.transactions for delete to authenticated using (public.is_family_admin_or_owner(family_id));--> statement-breakpoint
drop policy if exists saving_goals_select_member on public.saving_goals;--> statement-breakpoint
create policy saving_goals_select_member on public.saving_goals for select to authenticated using (public.is_family_member(family_id));--> statement-breakpoint
drop policy if exists saving_goals_insert_manager on public.saving_goals;--> statement-breakpoint
create policy saving_goals_insert_manager on public.saving_goals for insert to authenticated with check (public.is_family_admin_or_owner(family_id));--> statement-breakpoint
drop policy if exists saving_goals_update_manager on public.saving_goals;--> statement-breakpoint
create policy saving_goals_update_manager on public.saving_goals for update to authenticated using (public.is_family_admin_or_owner(family_id)) with check (public.is_family_admin_or_owner(family_id));--> statement-breakpoint
drop policy if exists saving_goals_delete_manager on public.saving_goals;--> statement-breakpoint
create policy saving_goals_delete_manager on public.saving_goals for delete to authenticated using (public.is_family_admin_or_owner(family_id));--> statement-breakpoint
drop policy if exists saving_goal_transactions_select_member on public.saving_goal_transactions;--> statement-breakpoint
create policy saving_goal_transactions_select_member on public.saving_goal_transactions for select to authenticated using (exists (select 1 from public.saving_goals sg where sg.id = saving_goal_id and public.is_family_member(sg.family_id)));--> statement-breakpoint
drop policy if exists saving_goal_transactions_insert_manager on public.saving_goal_transactions;--> statement-breakpoint
create policy saving_goal_transactions_insert_manager on public.saving_goal_transactions for insert to authenticated with check (exists (select 1 from public.saving_goals sg where sg.id = saving_goal_id and public.is_family_admin_or_owner(sg.family_id)));--> statement-breakpoint
drop policy if exists saving_goal_transactions_update_manager on public.saving_goal_transactions;--> statement-breakpoint
create policy saving_goal_transactions_update_manager on public.saving_goal_transactions for update to authenticated using (exists (select 1 from public.saving_goals sg where sg.id = saving_goal_id and public.is_family_admin_or_owner(sg.family_id))) with check (exists (select 1 from public.saving_goals sg where sg.id = saving_goal_id and public.is_family_admin_or_owner(sg.family_id)));--> statement-breakpoint
drop policy if exists saving_goal_transactions_delete_manager on public.saving_goal_transactions;--> statement-breakpoint
create policy saving_goal_transactions_delete_manager on public.saving_goal_transactions for delete to authenticated using (exists (select 1 from public.saving_goals sg where sg.id = saving_goal_id and public.is_family_admin_or_owner(sg.family_id)));--> statement-breakpoint
drop policy if exists notifications_select_member on public.notifications;--> statement-breakpoint
create policy notifications_select_member on public.notifications for select to authenticated using (public.is_family_member(family_id) and (user_id is null or user_id = auth.uid()));--> statement-breakpoint
drop policy if exists notifications_insert_member on public.notifications;--> statement-breakpoint
create policy notifications_insert_member on public.notifications for insert to authenticated with check (public.is_family_member(family_id) and (user_id is null or exists (select 1 from public.family_members fm where fm.family_id = notifications.family_id and fm.user_id = notifications.user_id)));--> statement-breakpoint
drop policy if exists notifications_update_recipient on public.notifications;--> statement-breakpoint
create policy notifications_update_recipient on public.notifications for update to authenticated using (public.is_family_member(family_id) and (user_id is null or user_id = auth.uid())) with check (public.is_family_member(family_id) and (user_id is null or user_id = auth.uid()));--> statement-breakpoint
drop policy if exists profiles_select_own on public.profiles;--> statement-breakpoint
drop policy if exists profiles_select_family_peers on public.profiles;--> statement-breakpoint
drop policy if exists family_members_select_own on public.family_members;--> statement-breakpoint
drop policy if exists family_members_insert_self_or_owner on public.family_members;--> statement-breakpoint
drop policy if exists family_members_update_owner on public.family_members;--> statement-breakpoint
drop policy if exists family_members_delete_owner on public.family_members;--> statement-breakpoint
drop policy if exists accounts_insert_owner on public.accounts;--> statement-breakpoint
drop policy if exists accounts_update_owner on public.accounts;--> statement-breakpoint
drop policy if exists accounts_delete_owner on public.accounts;--> statement-breakpoint
drop policy if exists categories_insert_owner on public.categories;--> statement-breakpoint
drop policy if exists categories_update_owner_custom on public.categories;--> statement-breakpoint
drop policy if exists categories_delete_owner_custom on public.categories;--> statement-breakpoint
drop policy if exists budgets_all_member on public.budgets;--> statement-breakpoint
drop policy if exists transactions_all_member on public.transactions;--> statement-breakpoint
drop policy if exists saving_goals_all_member on public.saving_goals;--> statement-breakpoint
drop policy if exists saving_goal_transactions_all_member on public.saving_goal_transactions;--> statement-breakpoint
drop policy if exists notifications_update_member on public.notifications;--> statement-breakpoint
drop policy if exists "Family members can view families" on public.families;--> statement-breakpoint
drop policy if exists "Family owners can view families" on public.families;--> statement-breakpoint
drop policy if exists "Family owners can update families" on public.families;--> statement-breakpoint
drop policy if exists "Users can create their own family" on public.families;
