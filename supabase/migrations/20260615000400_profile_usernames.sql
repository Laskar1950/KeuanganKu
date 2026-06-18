-- Username support for login with either username or email.
-- Run after 20260524000100_initial_schema.sql.

alter table public.profiles
  add column if not exists username text;

create or replace function public.slug_username(value text)
returns text
language sql
immutable
as $$
  select trim(both '_' from regexp_replace(lower(coalesce(value, 'user')), '[^a-z0-9_]+', '_', 'g'));
$$;

create or replace function public.make_unique_username(base_value text, user_id uuid default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
  candidate text;
  counter integer := 0;
begin
  base_username := public.slug_username(base_value);
  if base_username is null or length(base_username) < 3 then
    base_username := 'user';
  end if;

  candidate := base_username;
  while exists (
    select 1
    from public.profiles p
    where lower(p.username) = lower(candidate)
      and (user_id is null or p.id <> user_id)
  ) loop
    counter := counter + 1;
    candidate := base_username || counter::text;
  end loop;

  return candidate;
end;
$$;

update public.profiles p
set username = public.make_unique_username(split_part(p.email, '@', 1), p.id)
where p.username is null or p.username = '';

create unique index if not exists profiles_username_unique_idx on public.profiles(lower(username));

alter table public.profiles
  alter column username set not null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_username text;
begin
  requested_username := coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1));

  insert into public.profiles (id, name, email, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    public.make_unique_username(requested_username, new.id)
  )
  on conflict (id) do update set
    name = excluded.name,
    email = excluded.email,
    username = coalesce(public.profiles.username, excluded.username),
    updated_at = now();
  return new;
end;
$$;

create or replace function public.get_login_email(p_identifier text)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select email
  from public.profiles
  where lower(email) = lower(trim(p_identifier))
     or lower(username) = lower(trim(p_identifier))
  limit 1;
$$;

grant execute on function public.get_login_email(text) to anon, authenticated;
