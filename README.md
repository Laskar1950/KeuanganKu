# Family Finance Manager

Web app mobile-first untuk mengelola keuangan keluarga: pemasukan, pengeluaran, akun/dompet, anggaran bulanan, target tabungan, dan laporan sederhana.

Project ini sudah memakai:

- React + Vite
- Supabase Auth untuk register/login/logout
- Supabase PostgreSQL sebagai database
- Row Level Security untuk isolasi data per keluarga/user
- Supabase migration SQL
- Local state dari data Supabase, bukan localStorage
- Glassmorphism UI refresh dengan loading state modern
- Kategori transaksi custom dan alokasi anggaran pengeluaran

## 1. Prasyarat

Install:

- Node.js LTS
- npm
- Supabase account
- Supabase CLI, opsional tetapi direkomendasikan

## 2. Setup Supabase Cloud

1. Buat project baru di Supabase.
2. Buka menu SQL Editor.
3. Jalankan isi file:

```txt
supabase/migrations/20260524000100_initial_schema.sql
```

4. Jika project sudah menggunakan invite keluarga, jalankan juga:

```txt
supabase/migrations/20260524000200_family_invites.sql
```

5. Untuk mengaktifkan relasi transaksi ke alokasi anggaran, jalankan juga:

```txt
supabase/migrations/20260615000100_budget_allocations.sql
```

6. Buka Project Settings > API.
7. Copy `Project URL` dan `anon public key`.
8. Copy `.env.example` menjadi `.env.local`.
9. Isi:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## 3. Setup Supabase CLI

Alternatif jika menggunakan CLI:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

Untuk local Supabase:

```bash
supabase start
supabase db reset
```

Lalu isi `.env.local` dengan URL dan anon key dari output `supabase start`.

## 4. Jalankan Frontend

```bash
npm install
npm run dev
```

Buka:

```txt
http://localhost:5173
```

## 5. Flow Aplikasi

1. Register akun dengan email dan password.
2. Login.
3. Pilih buat keluarga baru atau gabung memakai kode undangan.
4. Jika membuat keluarga baru, isi:
   - Nama keluarga
   - Akun/dompet awal
   - Saldo awal
5. Masuk ke dashboard keluarga.
6. Tambahkan kategori pengeluaran custom dari Pengaturan atau langsung dari form transaksi.
7. Buat alokasi anggaran bulanan untuk kategori pengeluaran.
8. Saat mencatat pengeluaran, pilih alokasi agar nilai transaksi langsung mengurangi sisa anggaran tersebut.

## 6. Struktur Folder

```txt
family-finance-manager/
├── docs/
│   └── SUPABASE_SETUP.md
├── src/
│   ├── components/
│   ├── context/
│   │   └── AppContext.jsx
│   ├── lib/
│   │   ├── mappers.js
│   │   └── supabaseClient.js
│   ├── pages/
│   ├── utils/
│   ├── App.jsx
│   ├── main.jsx
│   ├── budget-allocation.css
│   └── styles.css
├── supabase/
│   ├── config.toml
│   └── migrations/
│       ├── 20260524000100_initial_schema.sql
│       ├── 20260524000200_family_invites.sql
│       └── 20260615000100_budget_allocations.sql
├── .env.example
├── package.json
└── README.md
```

## 7. Tabel Database

- `profiles`
- `families`
- `family_members`
- `accounts`
- `categories`
- `transactions`
- `budgets`
- `saving_goals`
- `saving_goal_transactions`

## 8. Catatan MVP

- MVP memakai keluarga/household sebagai ruang data bersama.
- Member keluarga dapat bergabung menggunakan kode undangan.
- Saldo akun dihitung dari saldo awal + transaksi pada masing-masing dompet.
- Total saldo keluarga dihitung dari seluruh saldo dompet aktif.
- Kategori custom keluarga bisa dibuat oleh owner dan langsung muncul pada dropdown transaksi sesuai jenisnya.
- Alokasi anggaran hanya untuk kategori pengeluaran dan satu kategori hanya boleh memiliki satu alokasi per bulan.
- Pengeluaran dapat dikaitkan ke alokasi anggaran melalui kolom `transactions.budget_id`.
- Data sensitif diproteksi dengan RLS berbasis membership keluarga.
- Fitur export PDF/Excel, OCR, integrasi bank, recurring transaction, dan reminder belum masuk MVP.

## 9. Build Production

```bash
npm run build
npm run preview
```

Untuk deploy ke Vercel/Netlify, tambahkan environment variable:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

## 10. Deployment Note

Commit ini dibuat untuk memastikan Vercel mengambil versi terbaru yang sudah mengekspor komponen `GlassLoading` dari `src/components/UI.jsx`.
