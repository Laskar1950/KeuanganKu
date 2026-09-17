create or replace function public.is_username_available(p_username text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select not exists (
    select 1 from public.profiles p
    where lower(p.username) = lower(trim(p_username))
  );
$$;--> statement-breakpoint
grant execute on function public.is_username_available(text) to anon, authenticated;
