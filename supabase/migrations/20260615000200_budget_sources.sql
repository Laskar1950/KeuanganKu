-- Convert budget allocations from category-based budgets into named allocations
-- with a source wallet/account.
-- Run after 20260615000100_budget_allocations.sql.

alter table public.budgets
  add column if not exists name text,
  add column if not exists account_id uuid references public.accounts(id) on delete restrict,
  add column if not exists note text;

-- Preserve old category-based budget names for existing data.
update public.budgets b
set name = coalesce(b.name, c.name, 'Alokasi Anggaran')
from public.categories c
where b.category_id = c.id
  and b.name is null;

update public.budgets
set name = 'Alokasi Anggaran'
where name is null;

-- Assign a source account to legacy budgets using the first active account in the same family.
update public.budgets b
set account_id = a.id
from lateral (
  select id
  from public.accounts
  where family_id = b.family_id
  order by is_active desc, created_at asc
  limit 1
) a
where b.account_id is null;

-- New allocation flow no longer requires expense category.
alter table public.budgets
  alter column category_id drop not null;

alter table public.transactions
  alter column category_id drop not null;

create index if not exists budgets_account_id_idx on public.budgets(account_id);
create index if not exists budgets_family_name_month_year_idx on public.budgets(family_id, name, month, year);
