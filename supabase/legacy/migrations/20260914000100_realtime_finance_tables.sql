-- Realtime sync untuk transaksi, alokasi anggaran, dan dompet keluarga.
-- Jalankan setelah 20260615000300_notifications.sql.

do $$
begin
  execute 'alter publication supabase_realtime add table public.transactions';
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

do $$
begin
  execute 'alter publication supabase_realtime add table public.budgets';
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

do $$
begin
  execute 'alter publication supabase_realtime add table public.accounts';
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

-- Replica identity penuh agar filter family_id tetap bekerja pada UPDATE/DELETE.
alter table public.transactions replica identity full;
alter table public.budgets replica identity full;
alter table public.accounts replica identity full;
