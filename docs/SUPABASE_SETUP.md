# Supabase Setup Guide

## A. Authentication

Project ini memakai Supabase Auth email + password.

Di Supabase Dashboard:

1. Buka Authentication > Providers.
2. Pastikan Email provider aktif.
3. Untuk development, Anda boleh mematikan email confirmation agar onboarding bisa langsung diuji.
4. Untuk production, email confirmation sebaiknya aktif.

## B. Database Migration

Jalankan migration berikut:

```txt
supabase/migrations/20260524000100_initial_schema.sql
```

Migration ini akan membuat:

- enum role, account type, transaction type, saving goal status
- semua tabel MVP
- default kategori pemasukan/pengeluaran
- trigger profile saat user baru dibuat
- trigger `updated_at`
- index dasar
- Row Level Security policies

## C. Row Level Security

Aturan utama:

- User hanya bisa membaca/mengelola `profiles` miliknya sendiri.
- User hanya bisa mengakses data family jika menjadi member di `family_members`.
- Kategori default global dapat dibaca semua user yang login.
- Data `accounts`, `transactions`, `budgets`, dan `saving_goals` dibatasi berdasarkan `family_id` yang dimiliki user.

## D. Environment Variables

Buat `.env.local`:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Jangan commit `.env.local` ke GitHub.

## E. Testing Manual

Checklist awal:

1. Register user baru.
2. Login.
3. Buat keluarga dan dompet awal.
4. Tambah transaksi pengeluaran.
5. Tambah transaksi pemasukan.
6. Buat anggaran untuk kategori pengeluaran.
7. Buat target tabungan.
8. Tambah setoran tabungan.
9. Logout dan login ulang.
10. Pastikan data tetap ada dari Supabase.

## F. Catatan Production

Sebelum production:

- Aktifkan email confirmation.
- Gunakan domain production di Authentication > URL Configuration.
- Review RLS jika fitur multi-member/invitation diaktifkan.
- Pertimbangkan database function untuk transaksi saldo jika saldo ingin disimpan sebagai materialized value.
