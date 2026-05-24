# Family Finance Manager

Web app mobile-first untuk mengelola keuangan keluarga: pemasukan, pengeluaran, akun/dompet, anggaran bulanan, target tabungan, dan laporan sederhana.

Project ini sudah memakai:

- React + Vite
- Supabase Auth untuk register/login/logout
- Supabase PostgreSQL sebagai database
- Row Level Security untuk isolasi data per keluarga/user
- Supabase migration SQL
- Local state dari data Supabase, bukan localStorage

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

4. Buka Project Settings > API.
5. Copy `Project URL` dan `anon public key`.
6. Copy `.env.example` menjadi `.env.local`.
7. Isi:

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
3. Isi onboarding:
   - Nama keluarga
   - Akun/dompet awal
   - Saldo awal
4. Masuk ke dashboard.
5. Tambahkan transaksi, anggaran, akun/dompet, dan target tabungan.

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
│   └── styles.css
├── supabase/
│   ├── config.toml
│   └── migrations/
│       └── 20260524000100_initial_schema.sql
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

- MVP memakai satu keluarga utama per user.
- Multi-member keluarga sudah disiapkan pada schema, tetapi invitation flow belum dibuat.
- Saldo akun dihitung di frontend dari saldo awal + transaksi.
- Data sensitif sudah diproteksi dengan RLS berbasis membership keluarga.
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
