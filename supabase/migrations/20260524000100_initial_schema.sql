-- Family Finance Manager MVP schema for Supabase
-- Run with Supabase CLI: supabase db push

create extension if not exists "pgcrypto";

-- ENUMS
create type public.family_role as enum ('owner', 'admin', 'member');
create type public.account_type as enum ('cash', 'bank', 'ewallet', 'saving', 'other');
create type public.transaction_type as enum ('income', 'expense');
create type public.saving_goal_status as enum ('active', 'completed');

-- UPDATED AT HELPER
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- AUTH PROFILE
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do update set
    name = excluded.name,
    email = excluded.email,
    updated_at = now();
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- CORE TABLES
create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger families_set_updated_at
before update on public.families
for each row execute function public.set_updated_at();

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
  name text not null,
  type public.account_type not null default 'cash',
  initial_balance numeric(14,2) not null default 0 check (initial_balance >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger accounts_set_updated_at
before update on public.accounts
for each row execute function public.set_updated_at();

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references public.families(id) on delete cascade,
  name text not null,
  type public.transaction_type not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  unique (family_id, name, type)
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete restrict,
  category_id uuid not null references public.categories(id) on delete restrict,
  created_by uuid not null references public.profiles(id) on delete restrict,
  type public.transaction_type not null,
  amount numeric(14,2) not null check (amount > 0),
  transaction_date date not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger transactions_set_updated_at
before update on public.transactions
for each row execute function public.set_updated_at();

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete restrict,
  month int not null check (month between 1 and 12),
  year int not null check (year >= 2000),
  amount numeric(14,2) not null check (amount > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (family_id, category_id, month, year)
);

create trigger budgets_set_updated_at
before update on public.budgets
for each row execute function public.set_updated_at();

create table public.saving_goals (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  name text not null,
  target_amount numeric(14,2) not null check (target_amount > 0),
  current_amount numeric(14,2) not null default 0 check (current_amount >= 0),
  target_date date,
  note text,
  status public.saving_goal_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger saving_goals_set_updated_at
before update on public.saving_goals
for each row execute function public.set_updated_at();

create table public.saving_goal_transactions (
  id uuid primary key default gen_random_uuid(),
  saving_goal_id uuid not null references public.saving_goals(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  transaction_date date not null,
  note text,
  created_at timestamptz not null default now()
);

-- INDEXES
create index family_members_user_id_idx on public.family_members(user_id);
create index family_members_family_id_idx on public.family_members(family_id);
create index accounts_family_id_idx on public.accounts(family_id);
create index categories_family_id_idx on public.categories(family_id);
create index transactions_family_date_idx on public.transactions(family_id, transaction_date desc);
create index budgets_family_month_year_idx on public.budgets(family_id, month, year);
create index saving_goals_family_id_idx on public.saving_goals(family_id);

-- DEFAULT CATEGORIES
insert into public.categories (family_id, name, type, is_default) values
  (null, 'Gaji', 'income', true),
  (null, 'Bonus', 'income', true),
  (null, 'Usaha Sampingan', 'income', true),
  (null, 'Hadiah', 'income', true),
  (null, 'Lainnya', 'income', true),
  (null, 'Belanja Dapur', 'expense', true),
  (null, 'Transportasi', 'expense', true),
  (null, 'Pendidikan', 'expense', true),
  (null, 'Kesehatan', 'expense', true),
  (null, 'Cicilan', 'expense', true),
  (null, 'Hiburan', 'expense', true),
  (null, 'Makan di Luar', 'expense', true),
  (null, 'Tagihan', 'expense', true),
  (null, 'Donasi', 'expense', true),
  (null, 'Lainnya', 'expense', true);

-- RLS
alter table public.profiles enable row level security;
alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.saving_goals enable row level security;
alter table public.saving_goal_transactions enable row level security;


-- SECURITY HELPER FUNCTIONS
create or replace function public.is_family_member(target_family_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.family_members fm
    where fm.family_id = target_family_id and fm.user_id = auth.uid()
  );
$$;

create or replace function public.is_family_owner(target_family_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.families f
    where f.id = target_family_id and f.owner_user_id = auth.uid()
  );
$$;

-- Profiles: each user can manage their own profile.
create policy "profiles_select_own" on public.profiles
for select to authenticated using (id = auth.uid());

create policy "profiles_insert_own" on public.profiles
for insert to authenticated with check (id = auth.uid());

create policy "profiles_update_own" on public.profiles
for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Families: user can access family where they are a member. Owner can create family.
create policy "families_select_member" on public.families
for select to authenticated using (public.is_family_member(id));

create policy "families_insert_owner" on public.families
for insert to authenticated with check (owner_user_id = auth.uid());

create policy "families_update_owner" on public.families
for update to authenticated using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());

-- Members: MVP allows owner to create their own membership during onboarding.
create policy "family_members_select_own" on public.family_members
for select to authenticated using (user_id = auth.uid() or public.is_family_owner(family_id));

create policy "family_members_insert_owner_self" on public.family_members
for insert to authenticated with check (user_id = auth.uid() and public.is_family_owner(family_id));

create policy "family_members_update_owner" on public.family_members
for update to authenticated using (public.is_family_owner(family_id));

-- Categories: global defaults are readable, family categories are restricted to members.
create policy "categories_select_default_or_member" on public.categories
for select to authenticated using (family_id is null or public.is_family_member(family_id));

create policy "categories_insert_member" on public.categories
for insert to authenticated with check (family_id is not null and public.is_family_member(family_id));

create policy "categories_update_member_custom" on public.categories
for update to authenticated using (is_default = false and public.is_family_member(family_id)) with check (is_default = false);

create policy "categories_delete_member_custom" on public.categories
for delete to authenticated using (is_default = false and public.is_family_member(family_id));

-- Family-scoped tables.
create policy "accounts_all_member" on public.accounts
for all to authenticated using (public.is_family_member(family_id)) with check (public.is_family_member(family_id));

create policy "transactions_all_member" on public.transactions
for all to authenticated using (public.is_family_member(family_id)) with check (public.is_family_member(family_id));

create policy "budgets_all_member" on public.budgets
for all to authenticated using (public.is_family_member(family_id)) with check (public.is_family_member(family_id));

create policy "saving_goals_all_member" on public.saving_goals
for all to authenticated using (public.is_family_member(family_id)) with check (public.is_family_member(family_id));

create policy "saving_goal_transactions_all_member" on public.saving_goal_transactions
for all to authenticated using (
  exists (
    select 1
    from public.saving_goals sg
    where sg.id = saving_goal_transactions.saving_goal_id and public.is_family_member(sg.family_id)
  )
) with check (
  exists (
    select 1
    from public.saving_goals sg
    where sg.id = saving_goal_transactions.saving_goal_id and public.is_family_member(sg.family_id)
  )
);
