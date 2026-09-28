# AGENTS.md

## Developer Commands & Verification
- `npm run dev`: Start Vite dev server (`http://localhost:5173`).
- `npm run build`: Production build via Vite + PWA service worker generation (`src/sw.ts`).
- `npm run lint`: ESLint with `--max-warnings 0`. Fails on unused vars and unescaped JSX quotes.
- `npx tsc --noEmit`: Typecheck TypeScript codebase.
- `npm run db:verify`: Runs local migration & schema verification in PGlite (WASM Postgres, no Docker).
- `npm run db:migrate`: Applies pending Drizzle migrations using `DATABASE_URL` in `.env.local`.
- `npm run db:baseline`: Marks initial baseline as applied on existing DB before running `db:migrate`.
- `npm run db:generate`: Generates SQL migration from schema changes in `drizzle/schema.js`.
- `npm run db:generate:custom -- --name=<name>`: Creates a blank custom migration file.

## Database & Drizzle Architecture
- `drizzle/schema.js` is the single source of truth for tables, constraints, indexes, and RLS policies (35+ policies).
- Client app never connects directly via Drizzle; it uses `@supabase/supabase-js` (`src/lib/supabaseClient.ts`) subject to RLS.
- SQL migration files in `drizzle/` **must** separate individual statements with `--> statement-breakpoint`. Without this delimiter, Drizzle migrator treats multiple statements as a single prepared statement and fails.
- All migrations must have a corresponding entry in `drizzle/meta/_journal.json`.
- Realtime publication `supabase_realtime` tracks 4 tables: `accounts`, `budgets`, `notifications`, `transactions`.

## Business Logic & Constraints
- Multi-tenancy is scoped by `family_id` via `public.is_family_member(family_id)`.
- Roles: `owner`, `admin`, `member`. Wallets/accounts, custom categories, budgets, and saving goals require manager role (`owner` or `admin`).
- Transactions rules:
  - `amount > 0`
  - `category_id` is **mandatory** for both `income` and `expense`.
  - `budget_id` is **optional** and only valid for `expense` (`type = 'expense' OR budget_id IS NULL`).
  - `created_by` cannot be updated on existing transactions (enforced by DB trigger).
- Transaction pagination: Loads a 500-item window (`TRANSACTION_WINDOW = 500`). Account balances are calculated on database via RPC `get_account_balances()`, not client-side summation.

## Frontend & Styling Conventions
- Tailwind CSS v4 configured via `@tailwindcss/vite` in `src/index.css` (no `tailwind.config.js`). Layer order: `theme → base → components → utilities`.
- Dark mode uses custom variant `dark:` keyed to `[data-theme="dark"]` managed by `src/theme.ts`.
- Layout: Mobile-first container `max-w-[430px]` with `pb-[116px]` bottom inset for `BottomNav` and FAB.
- Icons: `lucide-react` with 2px stroke only. No emojis anywhere in UI or code.
- Aliases: `@/*` resolves to `./src/*`. Shadcn UI components live in `src/components/ui/` (`components.json`).
- DB snake_case rows are mapped to camelCase TypeScript entities in `src/lib/mappers.ts`.

## Environment & Supabase Edge Functions
- Required in `.env.local`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `DATABASE_URL`.
- Edge Function `supabase/functions/push-notify/index.ts` handles Web Push:
  - Deploy command: `supabase functions deploy push-notify --no-verify-jwt`.
  - Required secrets: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
