drop trigger if exists profiles_set_updated_at on public.profiles;--> statement-breakpoint
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();--> statement-breakpoint
drop trigger if exists families_set_updated_at on public.families;--> statement-breakpoint
create trigger families_set_updated_at before update on public.families for each row execute function public.set_updated_at();--> statement-breakpoint
drop trigger if exists accounts_set_updated_at on public.accounts;--> statement-breakpoint
create trigger accounts_set_updated_at before update on public.accounts for each row execute function public.set_updated_at();--> statement-breakpoint
drop trigger if exists transactions_set_updated_at on public.transactions;--> statement-breakpoint
create trigger transactions_set_updated_at before update on public.transactions for each row execute function public.set_updated_at();--> statement-breakpoint
drop trigger if exists budgets_set_updated_at on public.budgets;--> statement-breakpoint
create trigger budgets_set_updated_at before update on public.budgets for each row execute function public.set_updated_at();--> statement-breakpoint
drop trigger if exists saving_goals_set_updated_at on public.saving_goals;--> statement-breakpoint
create trigger saving_goals_set_updated_at before update on public.saving_goals for each row execute function public.set_updated_at();--> statement-breakpoint
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
drop trigger if exists transactions_prevent_creator_change on public.transactions;--> statement-breakpoint
create trigger transactions_prevent_creator_change before update on public.transactions for each row execute function public.prevent_transaction_creator_change();--> statement-breakpoint
drop trigger if exists on_auth_user_created on auth.users;--> statement-breakpoint
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();--> statement-breakpoint
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;--> statement-breakpoint
drop policy if exists avatars_select_public on storage.objects;--> statement-breakpoint
create policy avatars_select_public on storage.objects for select to public using (bucket_id = 'avatars');--> statement-breakpoint
drop policy if exists avatars_insert_own_folder on storage.objects;--> statement-breakpoint
create policy avatars_insert_own_folder on storage.objects for insert to authenticated with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);--> statement-breakpoint
drop policy if exists avatars_update_own_folder on storage.objects;--> statement-breakpoint
create policy avatars_update_own_folder on storage.objects for update to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text) with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);--> statement-breakpoint
drop policy if exists avatars_delete_own_folder on storage.objects;--> statement-breakpoint
create policy avatars_delete_own_folder on storage.objects for delete to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);--> statement-breakpoint
do $$
begin
  execute 'alter publication supabase_realtime add table public.notifications';
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;--> statement-breakpoint
do $$
begin
  execute 'alter publication supabase_realtime add table public.transactions';
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;--> statement-breakpoint
do $$
begin
  execute 'alter publication supabase_realtime add table public.budgets';
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;--> statement-breakpoint
do $$
begin
  execute 'alter publication supabase_realtime add table public.accounts';
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;--> statement-breakpoint
alter table public.transactions replica identity full;--> statement-breakpoint
alter table public.budgets replica identity full;--> statement-breakpoint
alter table public.accounts replica identity full;--> statement-breakpoint
insert into public.categories (family_id, name, type, is_default)
select null::uuid, v.name, v.type::public.transaction_type, true
from (values
  ('Gaji', 'income'),
  ('Bonus', 'income'),
  ('Usaha Sampingan', 'income'),
  ('Hadiah', 'income'),
  ('Lainnya', 'income'),
  ('Belanja Dapur', 'expense'),
  ('Transportasi', 'expense'),
  ('Pendidikan', 'expense'),
  ('Kesehatan', 'expense'),
  ('Cicilan', 'expense'),
  ('Hiburan', 'expense'),
  ('Makan di Luar', 'expense'),
  ('Tagihan', 'expense'),
  ('Donasi', 'expense'),
  ('Lainnya', 'expense')
) as v(name, type)
where not exists (
  select 1 from public.categories c
  where c.family_id is null
    and c.name = v.name
    and c.type = v.type::public.transaction_type
);
