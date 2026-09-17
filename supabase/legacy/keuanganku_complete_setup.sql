-- Extensions and types
create extension if not exists "pgcrypto";

create type public.family_role as enum ('owner', 'admin', 'member');
create type public.account_type as enum ('cash', 'bank', 'ewallet', 'saving', 'other');
create type public.transaction_type as enum ('income', 'expense');
create type public.saving_goal_status as enum ('active', 'completed');

-- Tables
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  email text not null,
  username text not null check (length(btrim(username)) >= 3),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) > 0),
  owner_user_id uuid not null references public.profiles(id) on delete cascade,
  invite_code text not null default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (length(btrim(invite_code)) = 8)
);

create table public.family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.family_role not null default 'member',
  created_at timestamptz not null default now(),
  unique (family_id, user_id)
);

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  type public.account_type not null default 'cash',
  initial_balance numeric(14,2) not null default 0 check (initial_balance >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references public.families(id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  type public.transaction_type not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  check ((family_id is null) = is_default),
  unique (family_id, name, type)
);

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  account_id uuid not null references public.accounts(id) on delete restrict,
  category_id uuid references public.categories(id) on delete restrict,
  month integer not null check (month between 1 and 12),
  year integer not null check (year >= 2000),
  amount numeric(14,2) not null check (amount > 0),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete restrict,
  category_id uuid references public.categories(id) on delete restrict,
  budget_id uuid references public.budgets(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  type public.transaction_type not null,
  amount numeric(14,2) not null check (amount > 0),
  transaction_date date not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((type = 'income' and category_id is not null and budget_id is null) or (type = 'expense' and category_id is null and budget_id is not null))
);

create table public.saving_goals (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  target_amount numeric(14,2) not null check (target_amount > 0),
  current_amount numeric(14,2) not null default 0 check (current_amount >= 0),
  target_date date,
  note text,
  status public.saving_goal_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.saving_goal_transactions (
  id uuid primary key default gen_random_uuid(),
  saving_goal_id uuid not null references public.saving_goals(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  transaction_date date not null,
  note text,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  type text not null default 'general',
  title text not null check (length(btrim(title)) > 0),
  message text,
  target text not null default 'dashboard',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- Indexes
create unique index profiles_username_unique_idx on public.profiles (lower(username));
create unique index families_invite_code_unique_idx on public.families (upper(invite_code));
create index family_members_user_id_idx on public.family_members (user_id);
create index family_members_family_role_idx on public.family_members (family_id, role);
create index accounts_family_id_idx on public.accounts (family_id);
create index categories_family_id_idx on public.categories (family_id);
create index transactions_family_date_idx on public.transactions (family_id, transaction_date desc);
create index transactions_budget_id_idx on public.transactions (budget_id);
create index budgets_family_month_year_idx on public.budgets (family_id, month, year);
create index budgets_account_id_idx on public.budgets (account_id);
create unique index budgets_family_named_allocation_unique_idx on public.budgets (family_id, month, year, lower(btrim(name)));
create index saving_goals_family_id_idx on public.saving_goals (family_id);
create index notifications_family_created_idx on public.notifications (family_id, created_at desc);
create index notifications_user_read_idx on public.notifications (user_id, read_at);

-- Default categories
insert into public.categories (family_id, name, type, is_default) values
  (null, 'Gaji', 'income', true), (null, 'Bonus', 'income', true),
  (null, 'Usaha Sampingan', 'income', true), (null, 'Hadiah', 'income', true),
  (null, 'Lainnya', 'income', true), (null, 'Belanja Dapur', 'expense', true),
  (null, 'Transportasi', 'expense', true), (null, 'Pendidikan', 'expense', true),
  (null, 'Kesehatan', 'expense', true), (null, 'Cicilan', 'expense', true),
  (null, 'Hiburan', 'expense', true), (null, 'Makan di Luar', 'expense', true),
  (null, 'Tagihan', 'expense', true), (null, 'Donasi', 'expense', true),
  (null, 'Lainnya', 'expense', true);

-- Functions and triggers
create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create or replace function public.prevent_transaction_creator_change() returns trigger language plpgsql as $$
begin
  if new.created_by <> old.created_by then raise exception 'Pembuat transaksi tidak dapat diubah.'; end if;
  return new;
end;
$$;

create or replace function public.slug_username(value text) returns text language sql immutable as $$
  select trim(both '_' from regexp_replace(lower(coalesce(value, 'user')), '[^a-z0-9_]+', '_', 'g'));
$$;

create or replace function public.make_unique_username(base_value text, user_id uuid default null) returns text language plpgsql security definer set search_path = public as $$
declare base_username text; candidate text; counter integer := 0;
begin
  base_username := public.slug_username(base_value);
  if base_username is null or length(base_username) < 3 then base_username := 'user'; end if;
  candidate := base_username;
  while exists (select 1 from public.profiles p where lower(p.username) = lower(candidate) and (user_id is null or p.id <> user_id)) loop
    counter := counter + 1; candidate := base_username || counter::text;
  end loop;
  return candidate;
end;
$$;

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, email, username, avatar_url)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), new.email,
    public.make_unique_username(coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)), new.id), new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do update set name = excluded.name, email = excluded.email,
    username = coalesce(public.profiles.username, excluded.username),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url), updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger families_set_updated_at before update on public.families for each row execute function public.set_updated_at();
create trigger accounts_set_updated_at before update on public.accounts for each row execute function public.set_updated_at();
create trigger budgets_set_updated_at before update on public.budgets for each row execute function public.set_updated_at();
create trigger transactions_set_updated_at before update on public.transactions for each row execute function public.set_updated_at();
create trigger transactions_prevent_creator_change before update on public.transactions for each row execute function public.prevent_transaction_creator_change();
create trigger saving_goals_set_updated_at before update on public.saving_goals for each row execute function public.set_updated_at();
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- RLS helpers and RPCs
create or replace function public.is_family_member(target_family_id uuid) returns boolean language sql security definer stable set search_path = public as $$
  select auth.uid() is not null and exists (select 1 from public.family_members fm where fm.family_id = target_family_id and fm.user_id = auth.uid());
$$;

create or replace function public.is_family_owner(target_family_id uuid) returns boolean language sql security definer stable set search_path = public as $$
  select auth.uid() is not null and exists (select 1 from public.families f where f.id = target_family_id and f.owner_user_id = auth.uid());
$$;

create or replace function public.is_family_admin_or_owner(target_family_id uuid) returns boolean language sql security definer stable set search_path = public as $$
  select auth.uid() is not null and exists (select 1 from public.family_members fm where fm.family_id = target_family_id and fm.user_id = auth.uid() and fm.role in ('owner', 'admin'));
$$;

create or replace function public.get_login_email(p_identifier text) returns text language sql security definer stable set search_path = public as $$
  select p.email from public.profiles p where lower(p.email) = lower(trim(p_identifier)) or lower(p.username) = lower(trim(p_identifier)) limit 1;
$$;

create or replace function public.join_family_by_invite_code(p_invite_code text) returns uuid language plpgsql security definer set search_path = public as $$
declare target_family_id uuid;
begin
  if auth.uid() is null then raise exception 'Anda harus login terlebih dahulu.'; end if;
  select f.id into target_family_id from public.families f where upper(f.invite_code) = upper(trim(p_invite_code)) limit 1 for key share;
  if target_family_id is null then raise exception 'Kode undangan keluarga tidak valid.'; end if;
  if exists (select 1 from public.family_members fm where fm.user_id = auth.uid() and fm.family_id <> target_family_id) then raise exception 'Anda sudah tergabung dalam keluarga lain.'; end if;
  insert into public.family_members (family_id, user_id, role) values (target_family_id, auth.uid(), 'member') on conflict (family_id, user_id) do nothing;
  return target_family_id;
end;
$$;

create or replace function public.create_family_with_onboarding(
  p_family_name text,
  p_account_name text,
  p_account_type text default 'cash',
  p_initial_balance numeric default 0
) returns jsonb language plpgsql security definer set search_path = public as $$
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

create or replace function public.add_family_member_by_identifier(p_identifier text, p_role public.family_role default 'member') returns uuid language plpgsql security definer set search_path = public as $$
declare target_family_id uuid; target_user_id uuid; caller_role public.family_role;
begin
  if auth.uid() is null then raise exception 'Anda harus login terlebih dahulu.'; end if;
  select fm.family_id, fm.role into target_family_id, caller_role from public.family_members fm where fm.user_id = auth.uid() limit 1;
  if target_family_id is null or caller_role not in ('owner', 'admin') then raise exception 'Tidak diizinkan.'; end if;
  if p_role not in ('admin', 'member') or (caller_role = 'admin' and p_role <> 'member') then raise exception 'Role tidak diizinkan.'; end if;
  select p.id into target_user_id from public.profiles p where lower(p.email) = lower(trim(p_identifier)) or lower(p.username) = lower(trim(p_identifier)) limit 1;
  if target_user_id is null then raise exception 'Pengguna tidak ditemukan.'; end if;
  if exists (select 1 from public.family_members fm where fm.user_id = target_user_id and fm.family_id <> target_family_id) then raise exception 'Pengguna sudah tergabung dalam keluarga lain.'; end if;
  insert into public.family_members (family_id, user_id, role) values (target_family_id, target_user_id, p_role) on conflict (family_id, user_id) do update set role = excluded.role returning id into target_user_id;
  return target_user_id;
end;
$$;

create or replace function public.update_family_member_role(p_member_id uuid, p_role public.family_role) returns void language plpgsql security definer set search_path = public as $$
declare caller public.family_members; target public.family_members;
begin
  if auth.uid() is null or p_role = 'owner' then raise exception 'Tidak diizinkan.'; end if;
  select * into caller from public.family_members where user_id = auth.uid() limit 1;
  select * into target from public.family_members where id = p_member_id;
  if caller.id is null or target.id is null or caller.family_id <> target.family_id or target.user_id = auth.uid() or target.role = 'owner' then raise exception 'Tidak diizinkan.'; end if;
  if caller.role = 'owner' then null; elsif caller.role = 'admin' and target.role = 'member' and p_role = 'member' then null; else raise exception 'Tidak diizinkan.'; end if;
  update public.family_members set role = p_role where id = p_member_id;
end;
$$;

create or replace function public.remove_family_member(p_member_id uuid) returns void language plpgsql security definer set search_path = public as $$
declare caller public.family_members; target public.family_members;
begin
  if auth.uid() is null then raise exception 'Tidak diizinkan.'; end if;
  select * into caller from public.family_members where user_id = auth.uid() limit 1;
  select * into target from public.family_members where id = p_member_id;
  if caller.id is null or target.id is null or caller.family_id <> target.family_id or target.user_id = auth.uid() or target.role = 'owner' then raise exception 'Tidak diizinkan.'; end if;
  if caller.role = 'owner' then null; elsif caller.role = 'admin' and target.role = 'member' then null; else raise exception 'Tidak diizinkan.'; end if;
  delete from public.family_members where id = p_member_id;
end;
$$;

grant execute on function public.get_login_email(text) to anon, authenticated;
grant execute on function public.create_family_with_onboarding(text, text, text, numeric) to authenticated;
grant execute on function public.join_family_by_invite_code(text) to authenticated;
grant execute on function public.add_family_member_by_identifier(text, public.family_role) to authenticated;
grant execute on function public.update_family_member_role(uuid, public.family_role) to authenticated;
grant execute on function public.remove_family_member(uuid) to authenticated;

-- Row level security
alter table public.profiles enable row level security;
alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.budgets enable row level security;
alter table public.transactions enable row level security;
alter table public.saving_goals enable row level security;
alter table public.saving_goal_transactions enable row level security;
alter table public.notifications enable row level security;

create policy profiles_select_own_or_family_peers on public.profiles for select to authenticated using (id = auth.uid() or exists (select 1 from public.family_members mine join public.family_members peer on peer.family_id = mine.family_id where mine.user_id = auth.uid() and peer.user_id = profiles.id));
create policy profiles_insert_own on public.profiles for insert to authenticated with check (id = auth.uid());
create policy profiles_update_own on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy families_select_member on public.families for select to authenticated using (public.is_family_member(id));
create policy families_insert_owner on public.families for insert to authenticated with check (owner_user_id = auth.uid());
create policy families_update_owner on public.families for update to authenticated using (public.is_family_owner(id)) with check (owner_user_id = auth.uid());

create policy family_members_select_member on public.family_members for select to authenticated using (public.is_family_member(family_id));
create policy family_members_insert_owner_self on public.family_members for insert to authenticated with check (user_id = auth.uid() and role = 'owner' and public.is_family_owner(family_id));

create policy accounts_select_member on public.accounts for select to authenticated using (public.is_family_member(family_id));
create policy accounts_insert_manager on public.accounts for insert to authenticated with check (public.is_family_admin_or_owner(family_id));
create policy accounts_update_manager on public.accounts for update to authenticated using (public.is_family_admin_or_owner(family_id)) with check (public.is_family_admin_or_owner(family_id));
create policy accounts_delete_manager on public.accounts for delete to authenticated using (public.is_family_admin_or_owner(family_id));

create policy categories_select_default_or_member on public.categories for select to authenticated using (family_id is null or public.is_family_member(family_id));
create policy categories_insert_manager_custom on public.categories for insert to authenticated with check (family_id is not null and is_default = false and public.is_family_admin_or_owner(family_id));
create policy categories_update_manager_custom on public.categories for update to authenticated using (family_id is not null and is_default = false and public.is_family_admin_or_owner(family_id)) with check (family_id is not null and is_default = false and public.is_family_admin_or_owner(family_id));
create policy categories_delete_manager_custom on public.categories for delete to authenticated using (family_id is not null and is_default = false and public.is_family_admin_or_owner(family_id));

create policy budgets_select_member on public.budgets for select to authenticated using (public.is_family_member(family_id));
create policy budgets_insert_manager_matching_refs on public.budgets for insert to authenticated with check (public.is_family_admin_or_owner(family_id) and exists (select 1 from public.accounts a where a.id = account_id and a.family_id = budgets.family_id) and (category_id is null or exists (select 1 from public.categories c where c.id = category_id and (c.family_id = budgets.family_id or c.family_id is null))));
create policy budgets_update_manager_matching_refs on public.budgets for update to authenticated using (public.is_family_admin_or_owner(family_id)) with check (public.is_family_admin_or_owner(family_id) and exists (select 1 from public.accounts a where a.id = account_id and a.family_id = budgets.family_id) and (category_id is null or exists (select 1 from public.categories c where c.id = category_id and (c.family_id = budgets.family_id or c.family_id is null))));
create policy budgets_delete_manager on public.budgets for delete to authenticated using (public.is_family_admin_or_owner(family_id));

create policy transactions_select_member on public.transactions for select to authenticated using (public.is_family_member(family_id));
create policy transactions_insert_member_matching_refs on public.transactions for insert to authenticated with check (public.is_family_member(family_id) and created_by = auth.uid() and exists (select 1 from public.accounts a where a.id = account_id and a.family_id = transactions.family_id) and (category_id is null or exists (select 1 from public.categories c where c.id = category_id and (c.family_id = transactions.family_id or c.family_id is null))) and (budget_id is null or exists (select 1 from public.budgets b where b.id = budget_id and b.family_id = transactions.family_id and b.account_id = transactions.account_id)));
create policy transactions_update_manager_or_creator_matching_refs on public.transactions for update to authenticated using (public.is_family_admin_or_owner(family_id) or created_by = auth.uid()) with check (public.is_family_member(family_id) and (created_by = auth.uid() or public.is_family_admin_or_owner(family_id)) and exists (select 1 from public.accounts a where a.id = account_id and a.family_id = transactions.family_id) and (category_id is null or exists (select 1 from public.categories c where c.id = category_id and (c.family_id = transactions.family_id or c.family_id is null))) and (budget_id is null or exists (select 1 from public.budgets b where b.id = budget_id and b.family_id = transactions.family_id and b.account_id = transactions.account_id)));
create policy transactions_delete_manager on public.transactions for delete to authenticated using (public.is_family_admin_or_owner(family_id));

create policy saving_goals_select_member on public.saving_goals for select to authenticated using (public.is_family_member(family_id));
create policy saving_goals_insert_manager on public.saving_goals for insert to authenticated with check (public.is_family_admin_or_owner(family_id));
create policy saving_goals_update_manager on public.saving_goals for update to authenticated using (public.is_family_admin_or_owner(family_id)) with check (public.is_family_admin_or_owner(family_id));
create policy saving_goals_delete_manager on public.saving_goals for delete to authenticated using (public.is_family_admin_or_owner(family_id));
create policy saving_goal_transactions_select_member on public.saving_goal_transactions for select to authenticated using (exists (select 1 from public.saving_goals sg where sg.id = saving_goal_id and public.is_family_member(sg.family_id)));
create policy saving_goal_transactions_insert_manager on public.saving_goal_transactions for insert to authenticated with check (exists (select 1 from public.saving_goals sg where sg.id = saving_goal_id and public.is_family_admin_or_owner(sg.family_id)));
create policy saving_goal_transactions_update_manager on public.saving_goal_transactions for update to authenticated using (exists (select 1 from public.saving_goals sg where sg.id = saving_goal_id and public.is_family_admin_or_owner(sg.family_id))) with check (exists (select 1 from public.saving_goals sg where sg.id = saving_goal_id and public.is_family_admin_or_owner(sg.family_id)));
create policy saving_goal_transactions_delete_manager on public.saving_goal_transactions for delete to authenticated using (exists (select 1 from public.saving_goals sg where sg.id = saving_goal_id and public.is_family_admin_or_owner(sg.family_id)));

create policy notifications_select_member on public.notifications for select to authenticated using (public.is_family_member(family_id) and (user_id is null or user_id = auth.uid()));
create policy notifications_insert_member on public.notifications for insert to authenticated with check (public.is_family_member(family_id) and (user_id is null or exists (select 1 from public.family_members fm where fm.family_id = notifications.family_id and fm.user_id = notifications.user_id)));
create policy notifications_update_recipient on public.notifications for update to authenticated using (public.is_family_member(family_id) and (user_id is null or user_id = auth.uid())) with check (public.is_family_member(family_id) and (user_id is null or user_id = auth.uid()));

-- Avatar storage
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy avatars_select_public on storage.objects for select to public using (bucket_id = 'avatars');
create policy avatars_insert_own_folder on storage.objects for insert to authenticated with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_update_own_folder on storage.objects for update to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text) with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_delete_own_folder on storage.objects for delete to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- Realtime
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END;
$$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END;
$$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.budgets;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END;
$$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.accounts;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END;
$$;

ALTER TABLE public.transactions REPLICA IDENTITY FULL;
ALTER TABLE public.budgets REPLICA IDENTITY FULL;
ALTER TABLE public.accounts REPLICA IDENTITY FULL;
