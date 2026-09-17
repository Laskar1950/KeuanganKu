CREATE TYPE "public"."account_type" AS ENUM('cash', 'bank', 'ewallet', 'saving', 'other');--> statement-breakpoint
CREATE TYPE "public"."family_role" AS ENUM('owner', 'admin', 'member');--> statement-breakpoint
CREATE TYPE "public"."saving_goal_status" AS ENUM('active', 'completed');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('income', 'expense');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" "account_type" DEFAULT 'cash' NOT NULL,
	"initial_balance" numeric(14, 2) DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accounts_name_check" CHECK (length(btrim("accounts"."name")) > 0),
	CONSTRAINT "accounts_initial_balance_check" CHECK ("accounts"."initial_balance" >= 0)
);
--> statement-breakpoint
ALTER TABLE "accounts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "budgets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"name" text NOT NULL,
	"account_id" uuid NOT NULL,
	"category_id" uuid,
	"month" integer NOT NULL,
	"year" integer NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "budgets_name_check" CHECK (length(btrim("budgets"."name")) > 0),
	CONSTRAINT "budgets_month_check" CHECK ("budgets"."month" between 1 and 12),
	CONSTRAINT "budgets_year_check" CHECK ("budgets"."year" >= 2000),
	CONSTRAINT "budgets_amount_check" CHECK ("budgets"."amount" > 0)
);
--> statement-breakpoint
ALTER TABLE "budgets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid,
	"name" text NOT NULL,
	"type" "transaction_type" NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_family_id_name_type_key" UNIQUE("family_id","name","type"),
	CONSTRAINT "categories_name_check" CHECK (length(btrim("categories"."name")) > 0),
	CONSTRAINT "categories_check" CHECK (("categories"."family_id" is null) = "categories"."is_default")
);
--> statement-breakpoint
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "families" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"invite_code" text DEFAULT upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "families_name_check" CHECK (length(btrim("families"."name")) > 0),
	CONSTRAINT "families_check" CHECK (length(btrim("families"."invite_code")) = 8)
);
--> statement-breakpoint
ALTER TABLE "families" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "family_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "family_role" DEFAULT 'member' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "family_members_family_id_user_id_key" UNIQUE("family_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "family_members" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"user_id" uuid,
	"type" text DEFAULT 'general' NOT NULL,
	"title" text NOT NULL,
	"message" text,
	"target" text DEFAULT 'dashboard' NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notifications_title_check" CHECK (length(btrim("notifications"."title")) > 0)
);
--> statement-breakpoint
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"username" text NOT NULL,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_name_check" CHECK (length(btrim("profiles"."name")) > 0),
	CONSTRAINT "profiles_username_check" CHECK (length(btrim("profiles"."username")) >= 3)
);
--> statement-breakpoint
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "saving_goal_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"saving_goal_id" uuid NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"transaction_date" date NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "saving_goal_transactions_amount_check" CHECK ("saving_goal_transactions"."amount" > 0)
);
--> statement-breakpoint
ALTER TABLE "saving_goal_transactions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "saving_goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"name" text NOT NULL,
	"target_amount" numeric(14, 2) NOT NULL,
	"current_amount" numeric(14, 2) DEFAULT 0 NOT NULL,
	"target_date" date,
	"note" text,
	"status" "saving_goal_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "saving_goals_name_check" CHECK (length(btrim("saving_goals"."name")) > 0),
	CONSTRAINT "saving_goals_target_amount_check" CHECK ("saving_goals"."target_amount" > 0),
	CONSTRAINT "saving_goals_current_amount_check" CHECK ("saving_goals"."current_amount" >= 0)
);
--> statement-breakpoint
ALTER TABLE "saving_goals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"category_id" uuid,
	"budget_id" uuid,
	"created_by" uuid NOT NULL,
	"type" "transaction_type" NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"transaction_date" date NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transactions_amount_check" CHECK ("transactions"."amount" > 0),
	CONSTRAINT "transactions_check" CHECK (("transactions"."type" = 'income' and "transactions"."category_id" is not null and "transactions"."budget_id" is null) or ("transactions"."type" = 'expense' and "transactions"."category_id" is null and "transactions"."budget_id" is not null))
);
--> statement-breakpoint
ALTER TABLE "transactions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "families" ADD CONSTRAINT "families_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saving_goal_transactions" ADD CONSTRAINT "saving_goal_transactions_saving_goal_id_fkey" FOREIGN KEY ("saving_goal_id") REFERENCES "public"."saving_goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saving_goals" ADD CONSTRAINT "saving_goals_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "public"."budgets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accounts_family_id_idx" ON "accounts" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "budgets_family_month_year_idx" ON "budgets" USING btree ("family_id","month","year");--> statement-breakpoint
CREATE INDEX "budgets_account_id_idx" ON "budgets" USING btree ("account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "budgets_family_named_allocation_unique_idx" ON "budgets" USING btree ("family_id","month","year",lower(btrim("name")));--> statement-breakpoint
CREATE INDEX "categories_family_id_idx" ON "categories" USING btree ("family_id");--> statement-breakpoint
CREATE UNIQUE INDEX "families_invite_code_unique_idx" ON "families" USING btree (upper("invite_code"));--> statement-breakpoint
CREATE INDEX "family_members_user_id_idx" ON "family_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "family_members_family_role_idx" ON "family_members" USING btree ("family_id","role");--> statement-breakpoint
CREATE INDEX "notifications_family_created_idx" ON "notifications" USING btree ("family_id","created_at" desc);--> statement-breakpoint
CREATE INDEX "notifications_user_read_idx" ON "notifications" USING btree ("user_id","read_at");--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_username_unique_idx" ON "profiles" USING btree (lower("username"));--> statement-breakpoint
CREATE INDEX "saving_goals_family_id_idx" ON "saving_goals" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "transactions_family_date_idx" ON "transactions" USING btree ("family_id","transaction_date" desc);--> statement-breakpoint
CREATE INDEX "transactions_budget_id_idx" ON "transactions" USING btree ("budget_id");--> statement-breakpoint
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;--> statement-breakpoint
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
$$;--> statement-breakpoint
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
$$;--> statement-breakpoint
create or replace function public.is_family_admin_or_owner(target_family_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.family_members fm
    where fm.family_id = target_family_id
      and fm.user_id = auth.uid()
      and fm.role in ('owner', 'admin')
  );
$$;--> statement-breakpoint
create or replace function public.generate_family_invite_code()
returns text
language sql
as $$
  select upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
$$;--> statement-breakpoint
create or replace function public.slug_username(value text)
returns text
language sql
immutable
as $$
  select trim(both '_' from regexp_replace(lower(coalesce(value, 'user')), '[^a-z0-9_]+', '_', 'g'));
$$;--> statement-breakpoint
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
$$;--> statement-breakpoint
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
$$;--> statement-breakpoint
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
$$;--> statement-breakpoint
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
$$;--> statement-breakpoint
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
create or replace function public.join_family_by_invite_code(p_invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_family_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Anda harus login terlebih dahulu.';
  end if;

  select f.id
  into target_family_id
  from public.families f
  where upper(f.invite_code) = upper(trim(p_invite_code))
  limit 1;

  if target_family_id is null then
    raise exception 'Kode undangan keluarga tidak valid.';
  end if;

  insert into public.family_members (family_id, user_id, role)
  values (target_family_id, auth.uid(), 'member')
  on conflict (family_id, user_id) do nothing;

  return target_family_id;
end;
$$;--> statement-breakpoint
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
$$;--> statement-breakpoint
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
$$;--> statement-breakpoint
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
$$;--> statement-breakpoint
grant execute on function public.create_family_with_onboarding(text, text, text, numeric) to authenticated;--> statement-breakpoint
grant execute on function public.join_family_by_invite_code(text) to authenticated;--> statement-breakpoint
grant execute on function public.add_family_member_by_identifier(text, public.family_role) to authenticated;--> statement-breakpoint
grant execute on function public.update_family_member_role(uuid, public.family_role) to authenticated;--> statement-breakpoint
grant execute on function public.remove_family_member(uuid) to authenticated;--> statement-breakpoint
grant execute on function public.get_login_email(text) to anon, authenticated;--> statement-breakpoint
CREATE POLICY "accounts_select_member" ON "accounts" AS PERMISSIVE FOR SELECT TO "authenticated" USING (public.is_family_member("accounts"."family_id"));--> statement-breakpoint
CREATE POLICY "accounts_insert_manager" ON "accounts" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (public.is_family_admin_or_owner("accounts"."family_id"));--> statement-breakpoint
CREATE POLICY "accounts_update_manager" ON "accounts" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (public.is_family_admin_or_owner("accounts"."family_id")) WITH CHECK (public.is_family_admin_or_owner("accounts"."family_id"));--> statement-breakpoint
CREATE POLICY "accounts_delete_manager" ON "accounts" AS PERMISSIVE FOR DELETE TO "authenticated" USING (public.is_family_admin_or_owner("accounts"."family_id"));--> statement-breakpoint
CREATE POLICY "budgets_select_member" ON "budgets" AS PERMISSIVE FOR SELECT TO "authenticated" USING (public.is_family_member("budgets"."family_id"));--> statement-breakpoint
CREATE POLICY "budgets_insert_manager_matching_refs" ON "budgets" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (public.is_family_admin_or_owner("budgets"."family_id") and exists (select 1 from public.accounts a where a.id = "budgets"."account_id" and a.family_id = "budgets"."family_id") and ("budgets"."category_id" is null or exists (select 1 from public.categories c where c.id = "budgets"."category_id" and (c.family_id = "budgets"."family_id" or c.family_id is null))));--> statement-breakpoint
CREATE POLICY "budgets_update_manager_matching_refs" ON "budgets" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (public.is_family_admin_or_owner("budgets"."family_id")) WITH CHECK (public.is_family_admin_or_owner("budgets"."family_id") and exists (select 1 from public.accounts a where a.id = "budgets"."account_id" and a.family_id = "budgets"."family_id") and ("budgets"."category_id" is null or exists (select 1 from public.categories c where c.id = "budgets"."category_id" and (c.family_id = "budgets"."family_id" or c.family_id is null))));--> statement-breakpoint
CREATE POLICY "budgets_delete_manager" ON "budgets" AS PERMISSIVE FOR DELETE TO "authenticated" USING (public.is_family_admin_or_owner("budgets"."family_id"));--> statement-breakpoint
CREATE POLICY "categories_select_default_or_member" ON "categories" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("categories"."family_id" is null or public.is_family_member("categories"."family_id"));--> statement-breakpoint
CREATE POLICY "categories_insert_manager_custom" ON "categories" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("categories"."family_id" is not null and "categories"."is_default" = false and public.is_family_admin_or_owner("categories"."family_id"));--> statement-breakpoint
CREATE POLICY "categories_update_manager_custom" ON "categories" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("categories"."family_id" is not null and "categories"."is_default" = false and public.is_family_admin_or_owner("categories"."family_id")) WITH CHECK ("categories"."family_id" is not null and "categories"."is_default" = false and public.is_family_admin_or_owner("categories"."family_id"));--> statement-breakpoint
CREATE POLICY "categories_delete_manager_custom" ON "categories" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("categories"."family_id" is not null and "categories"."is_default" = false and public.is_family_admin_or_owner("categories"."family_id"));--> statement-breakpoint
CREATE POLICY "families_select_member" ON "families" AS PERMISSIVE FOR SELECT TO "authenticated" USING (public.is_family_member("families"."id"));--> statement-breakpoint
CREATE POLICY "families_insert_owner" ON "families" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("families"."owner_user_id" = auth.uid());--> statement-breakpoint
CREATE POLICY "families_update_owner" ON "families" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (public.is_family_owner("families"."id")) WITH CHECK ("families"."owner_user_id" = auth.uid());--> statement-breakpoint
CREATE POLICY "family_members_select_member" ON "family_members" AS PERMISSIVE FOR SELECT TO "authenticated" USING (public.is_family_member("family_members"."family_id"));--> statement-breakpoint
CREATE POLICY "family_members_insert_owner_self" ON "family_members" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("family_members"."user_id" = auth.uid() and "family_members"."role" = 'owner' and public.is_family_owner("family_members"."family_id"));--> statement-breakpoint
CREATE POLICY "notifications_select_member" ON "notifications" AS PERMISSIVE FOR SELECT TO "authenticated" USING (public.is_family_member("notifications"."family_id") and ("notifications"."user_id" is null or "notifications"."user_id" = auth.uid()));--> statement-breakpoint
CREATE POLICY "notifications_insert_member" ON "notifications" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (public.is_family_member("notifications"."family_id") and ("notifications"."user_id" is null or exists (select 1 from public.family_members fm where fm.family_id = "notifications"."family_id" and fm.user_id = "notifications"."user_id")));--> statement-breakpoint
CREATE POLICY "notifications_update_recipient" ON "notifications" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (public.is_family_member("notifications"."family_id") and ("notifications"."user_id" is null or "notifications"."user_id" = auth.uid())) WITH CHECK (public.is_family_member("notifications"."family_id") and ("notifications"."user_id" is null or "notifications"."user_id" = auth.uid()));--> statement-breakpoint
CREATE POLICY "profiles_select_own_or_family_peers" ON "profiles" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("profiles"."id" = auth.uid() or exists (select 1 from public.family_members mine join public.family_members peer on peer.family_id = mine.family_id where mine.user_id = auth.uid() and peer.user_id = "profiles"."id"));--> statement-breakpoint
CREATE POLICY "profiles_insert_own" ON "profiles" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("profiles"."id" = auth.uid());--> statement-breakpoint
CREATE POLICY "profiles_update_own" ON "profiles" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("profiles"."id" = auth.uid()) WITH CHECK ("profiles"."id" = auth.uid());--> statement-breakpoint
CREATE POLICY "saving_goal_transactions_select_member" ON "saving_goal_transactions" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (select 1 from public.saving_goals sg where sg.id = "saving_goal_transactions"."saving_goal_id" and public.is_family_member(sg.family_id)));--> statement-breakpoint
CREATE POLICY "saving_goal_transactions_insert_manager" ON "saving_goal_transactions" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (exists (select 1 from public.saving_goals sg where sg.id = "saving_goal_transactions"."saving_goal_id" and public.is_family_admin_or_owner(sg.family_id)));--> statement-breakpoint
CREATE POLICY "saving_goal_transactions_update_manager" ON "saving_goal_transactions" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (exists (select 1 from public.saving_goals sg where sg.id = "saving_goal_transactions"."saving_goal_id" and public.is_family_admin_or_owner(sg.family_id))) WITH CHECK (exists (select 1 from public.saving_goals sg where sg.id = "saving_goal_transactions"."saving_goal_id" and public.is_family_admin_or_owner(sg.family_id)));--> statement-breakpoint
CREATE POLICY "saving_goal_transactions_delete_manager" ON "saving_goal_transactions" AS PERMISSIVE FOR DELETE TO "authenticated" USING (exists (select 1 from public.saving_goals sg where sg.id = "saving_goal_transactions"."saving_goal_id" and public.is_family_admin_or_owner(sg.family_id)));--> statement-breakpoint
CREATE POLICY "saving_goals_select_member" ON "saving_goals" AS PERMISSIVE FOR SELECT TO "authenticated" USING (public.is_family_member("saving_goals"."family_id"));--> statement-breakpoint
CREATE POLICY "saving_goals_insert_manager" ON "saving_goals" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (public.is_family_admin_or_owner("saving_goals"."family_id"));--> statement-breakpoint
CREATE POLICY "saving_goals_update_manager" ON "saving_goals" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (public.is_family_admin_or_owner("saving_goals"."family_id")) WITH CHECK (public.is_family_admin_or_owner("saving_goals"."family_id"));--> statement-breakpoint
CREATE POLICY "saving_goals_delete_manager" ON "saving_goals" AS PERMISSIVE FOR DELETE TO "authenticated" USING (public.is_family_admin_or_owner("saving_goals"."family_id"));--> statement-breakpoint
CREATE POLICY "transactions_select_member" ON "transactions" AS PERMISSIVE FOR SELECT TO "authenticated" USING (public.is_family_member("transactions"."family_id"));--> statement-breakpoint
CREATE POLICY "transactions_insert_member_matching_refs" ON "transactions" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (public.is_family_member("transactions"."family_id") and "transactions"."created_by" = auth.uid() and exists (select 1 from public.accounts a where a.id = "transactions"."account_id" and a.family_id = "transactions"."family_id") and ("transactions"."category_id" is null or exists (select 1 from public.categories c where c.id = "transactions"."category_id" and (c.family_id = "transactions"."family_id" or c.family_id is null))) and ("transactions"."budget_id" is null or exists (select 1 from public.budgets b where b.id = "transactions"."budget_id" and b.family_id = "transactions"."family_id" and b.account_id = "transactions"."account_id")));--> statement-breakpoint
CREATE POLICY "transactions_update_manager_or_creator_matching_refs" ON "transactions" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (public.is_family_admin_or_owner("transactions"."family_id") or "transactions"."created_by" = auth.uid()) WITH CHECK (public.is_family_member("transactions"."family_id") and ("transactions"."created_by" = auth.uid() or public.is_family_admin_or_owner("transactions"."family_id")) and exists (select 1 from public.accounts a where a.id = "transactions"."account_id" and a.family_id = "transactions"."family_id") and ("transactions"."category_id" is null or exists (select 1 from public.categories c where c.id = "transactions"."category_id" and (c.family_id = "transactions"."family_id" or c.family_id is null))) and ("transactions"."budget_id" is null or exists (select 1 from public.budgets b where b.id = "transactions"."budget_id" and b.family_id = "transactions"."family_id" and b.account_id = "transactions"."account_id")));--> statement-breakpoint
CREATE POLICY "transactions_delete_manager" ON "transactions" AS PERMISSIVE FOR DELETE TO "authenticated" USING (public.is_family_admin_or_owner("transactions"."family_id"));