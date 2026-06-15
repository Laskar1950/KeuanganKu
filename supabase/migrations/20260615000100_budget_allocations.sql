-- Link expense transactions to monthly budget allocations.
-- Run after 20260524000100_initial_schema.sql and 20260524000200_family_invites.sql.

alter table public.transactions
  add column if not exists budget_id uuid references public.budgets(id) on delete set null;

create index if not exists transactions_budget_id_idx on public.transactions(budget_id);

do $$
begin
  alter table public.transactions
    add constraint transactions_budget_only_for_expense
    check (type = 'expense' or budget_id is null);
exception
  when duplicate_object then null;
end $$;
