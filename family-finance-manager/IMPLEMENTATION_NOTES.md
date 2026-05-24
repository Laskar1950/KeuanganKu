# Implementation Notes

## Versi ini

Versi ini adalah MVP frontend + backend Supabase untuk Family Finance Manager.

Perubahan dari versi localStorage sebelumnya:

- Auth login/register memakai Supabase Auth.
- Data aplikasi tersimpan di Supabase PostgreSQL.
- State React diisi dari query Supabase.
- CRUD transaksi, akun/dompet, anggaran, dan target tabungan sudah terhubung ke database.
- Schema database tersedia sebagai migration SQL.
- RLS aktif pada semua tabel data utama.

## Business Rules yang sudah diterapkan

- Nominal transaksi wajib lebih dari 0.
- Transaksi wajib memiliki tanggal, kategori, dan akun/dompet.
- Pengeluaran mengurangi saldo hasil kalkulasi.
- Pemasukan menambah saldo hasil kalkulasi.
- Anggaran hanya dibuat berdasarkan kategori pengeluaran dari UI.
- Satu kategori hanya boleh memiliki satu anggaran per bulan/tahun melalui unique constraint.
- Target tabungan memiliki progress berdasarkan current_amount / target_amount.

## Yang belum dibuat

- Invitation multi-member keluarga.
- Edit/hapus kategori custom dari UI.
- Edit target tabungan.
- Export PDF/Excel.
- Upload bukti transaksi.
- Recurring transaction.
- Backend server terpisah; saat ini frontend langsung mengakses Supabase dengan RLS.

## Rekomendasi tahap berikutnya

1. Tambah halaman manajemen kategori custom.
2. Tambah fitur invitation anggota keluarga.
3. Tambah dashboard desktop/tablet responsive.
4. Tambah test untuk fungsi perhitungan saldo, laporan, dan budget usage.
5. Tambah deployment Vercel + Supabase production checklist.
