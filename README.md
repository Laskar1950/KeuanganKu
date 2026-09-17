# Family Finance Manager

Web app mobile-first untuk mengelola keuangan keluarga: pemasukan, pengeluaran, akun/dompet, anggaran bulanan, target tabungan, dan laporan sederhana.

Project ini sudah memakai:

- React + Vite + TypeScript (100% `.ts/.tsx`)
- Tailwind CSS v4 + komponen shadcn (`src/components/ui`) dengan token warna aplikasi
- Supabase Auth untuk register/login/logout (email atau username)
- Supabase PostgreSQL sebagai database
- Row Level Security untuk isolasi data per keluarga/user
- Drizzle ORM sebagai satu sumber kebenaran: tabel, constraint, index, RLS policy, function, trigger, storage, realtime, dan migrasi otomatis
- Local state dari data Supabase, bukan localStorage
- Glassmorphism UI refresh dengan loading state modern
- Kategori transaksi custom dan alokasi anggaran pengeluaran
- Realtime sync transaksi, alokasi, dan dompet antar anggota keluarga
- PWA (installable + offline cache) dengan registrasi service worker otomatis
- Grafik laporan (donut alokasi + tren arus kas 6 periode)

## 1. Prasyarat

Install:

- Node.js LTS
- npm
- Supabase account
- Supabase CLI, opsional tetapi direkomendasikan

## 2. Setup Supabase Cloud

1. Buat project baru di Supabase.
2. Buka Project Settings > API, copy `Project URL` dan `anon public key`.
3. Buka Connect, copy connection string **Session pooler**.
4. Copy `.env.example` menjadi `.env.local`, lalu isi ketiganya:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@[host]:5432/postgres
```

5. Install dependency dan terapkan seluruh database (tabel, RLS policy, function, trigger, storage, realtime, seed) dengan satu perintah:

```bash
npm install
npm run db:migrate
```

6. Opsional, validasi hasilnya di PostgreSQL lokal tanpa Docker:

```bash
npm run db:verify
```

## 3. Setup Database untuk Project yang Sudah Berjalan

Jika database sudah pernah dibuat memakai file SQL lama di `supabase/legacy/`, tandai migrasi baseline sebagai sudah diterapkan agar riwayat Drizzle sinkron:

```bash
npm run db:baseline
npm run db:migrate
```

`db:migrate` setelah baseline hanya menjalankan migrasi custom (trigger, storage, realtime, seed) yang aman dijalankan berulang.

### Local Supabase (opsional)

```bash
supabase start
npm run db:migrate
```

Isi `.env.local` dengan URL dan anon key dari output `supabase start`, arahkan `DATABASE_URL` ke `postgresql://postgres:postgres@127.0.0.1:54322/postgres`, lalu jalankan `npm run db:migrate`.

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

1. Register akun dengan nama, username, email, dan password. Username dicek ketersediaannya secara langsung dan harus unik.
2. Login memakai **email atau username** + password. Lupa password juga bisa memakai username.
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
├── drizzle/
│   ├── schema.js
│   ├── <timestamp>_baseline.sql
│   ├── <timestamp>_custom.sql
│   └── meta/
├── scripts/
│   ├── db-baseline.mjs
│   └── verify-migrations.mjs
├── src/
│   ├── components/
│   │   ├── ui/                 # komponen shadcn (button, input, label, card, alert, auth-form, ...)
│   │   └── *.tsx               # BottomNav, TransactionSheet, TransactionList, dll
│   ├── context/
│   │   └── AppContext.tsx      # state global + aksi Supabase (bertipe lengkap)
│   ├── lib/
│   │   ├── mappers.ts
│   │   ├── supabaseClient.ts
│   │   └── utils.ts            # cn() helper shadcn
│   ├── pages/                  # 7 halaman (.tsx)
│   ├── utils/                  # format, calculations, budgetCycle, permissions
│   ├── index.css               # entry Tailwind: layer, preflight, token mapping, dark variant, base typography
│   ├── tokens.css              # design token (warna, radius, shadow, font)
│   ├── App.tsx
│   ├── main.tsx
│   └── types.ts                # tipe entitas bersama
├── supabase/
│   ├── config.toml
│   └── legacy/
│       ├── migrations/
│       └── keuanganku_complete_setup.sql
├── components.json             # konfigurasi shadcn CLI
├── tsconfig.json
├── .env.example
├── drizzle.config.js
├── package.json
└── README.md
```

> Folder `supabase/legacy/` hanya arsip SQL lama. Sejak Drizzle dipakai, semua perubahan database dikelola dari `drizzle/`.

### Konvensi frontend

- **Tailwind v4** dikonfigurasi di `src/index.css` (tanpa file `tailwind.config.js`). Urutan layer: `theme → base (preflight + typography) → components → utilities`. Warna Tailwind di-map ke token yang sama dengan mode gelap, jadi `bg-rose-strong`, `text-muted-foreground`, dll otomatis mengikuti tema.
- **Dark mode** memakai variant kustom `dark:` berbasis atribut `[data-theme="dark"]` yang diatur `src/theme.ts`.
- **Komponen shadcn** ada di `src/components/ui` dan diimpor dengan alias `@/components/ui/<nama>`. Tambah komponen baru dengan `npx shadcn@latest add <nama>`.
- **Styling 100% Tailwind** — hanya tersisa 2 file CSS: `index.css` (Tailwind + base) dan `tokens.css` (design token). Phone frame, FAB, dan seluruh UI memakai utility class.
- **Tipe entitas** bersama (Account, Transaction, Budget, dll) ada di `src/types.ts` dan dipakai di seluruh app; `useApp()` dari `AppContext` sudah bertipe.

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

### Catatan performa data

- Daftar transaksi memuat jendela **500 data terbaru**; transaksi lama dimuat on-demand lewat tombol "Muat transaksi lama" (server-side pagination dengan `range`).
- Saldo dompet dihitung di database lewat RPC `get_account_balances()` sehingga tetap akurat walau daftar transaksi dibatasi jendela.
- Query memakai kolom eksplisit (bukan `select *`) dan notifikasi dibatasi 50 baris terbaru.
- Host Supabase di-`preconnect` otomatis saat build dari `VITE_SUPABASE_URL`.

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

## 11. Drizzle ORM — Schema & Migrasi Otomatis

Drizzle adalah **satu sumber kebenaran** untuk seluruh database: tabel, kolom, constraint, index, RLS policy, function, trigger, storage bucket, realtime publication, dan seed data. Aplikasi tetap memakai `supabase-js` + RLS untuk akses data dari browser, karena Drizzle tidak boleh berjalan di client (kredensial database tetap di CLI).

### Yang dikelola Drizzle

| Objek database | Dikelola oleh | File |
| --- | --- | --- |
| Tabel, kolom, enum, constraint, index | `drizzle/schema.js` | `drizzle/schema.js` |
| RLS policy (35 policy) + `ENABLE ROW LEVEL SECURITY` | `drizzle/schema.js` | `drizzle/schema.js` |
| Function (RPC onboarding, role management, login via username) | Migrasi baseline + custom | `drizzle/<timestamp>_*.sql` |
| Trigger, storage bucket + policy, realtime publication, seed kategori | Migrasi custom | `drizzle/<timestamp>_triggers_storage_realtime_seed.sql` |

### Perintah

```bash
npm run db:migrate          # terapkan semua migrasi yang belum jalan
npm run db:baseline         # tandai DB existing sebagai sudah berada di baseline (sekali saja)
npm run db:generate         # schema.js berubah -> generate migrasi SQL otomatis
npm run db:generate:custom  # buat migrasi kosong untuk SQL manual (function/trigger baru)
npm run db:verify           # uji seluruh chain migrasi di PostgreSQL lokal (PGlite, tanpa Docker)
npm run db:pull             # introspect DB -> sinkronkan schema.js (termasuk RLS policy)
npm run db:studio           # GUI lihat/edit data
```

### Alur kerja harian

1. Ubah tabel, kolom, index, atau RLS policy di `drizzle/schema.js`.
2. `npm run db:generate` — file SQL migrasi baru muncul otomatis dengan nama timestamp ala Supabase.
3. `npm run db:migrate` — terapkan ke database.
4. `npm run db:verify` — opsional, memastikan seluruh chain tetap valid.

Untuk function/trigger baru yang tidak bisa dimodelkan di schema (PL/pgSQL), gunakan `npm run db:generate:custom -- --name=nama_migrasi`, isi SQL-nya, lalu `npm run db:migrate`. SQL tersebut tetap tercatat dan diterapkan otomatis oleh Drizzle.

### Catatan penting

- Migrasi baseline berisi `CREATE TABLE` tanpa `IF NOT EXISTS`, jadi **hanya dijalankan sekali** pada database kosong. Untuk database yang sudah ada, jalankan `npm run db:baseline` lebih dulu.
- Setelah menambah RLS policy baru di `schema.js`, jalankan `db:generate` + `db:migrate`. Policy lama yang sudah ada di database akan terdeteksi oleh Drizzle.
- `db:verify` memakai PGlite (PostgreSQL asli berbasis WASM) dan membuat database sementara — tidak menyentuh Supabase.
- Jangan commit `.env.local`; `DATABASE_URL` bersifat rahasia.
