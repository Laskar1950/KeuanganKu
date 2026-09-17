create or replace function public.get_account_balances()
returns table (account_id uuid, balance numeric)
language sql
security definer
set search_path = public
stable
as $$
  select
    a.id as account_id,
    a.initial_balance + coalesce(sum(case when t.type = 'income' then t.amount else -t.amount end), 0) as balance
  from public.accounts a
  left join public.transactions t on t.account_id = a.id
  where public.is_family_member(a.family_id)
  group by a.id, a.initial_balance;
$$;--> statement-breakpoint
grant execute on function public.get_account_balances() to authenticated;
