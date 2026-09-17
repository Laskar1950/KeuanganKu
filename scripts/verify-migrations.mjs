import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';

const results = [];

function check(label, condition, detail = '') {
  results.push({ label, ok: Boolean(condition), detail });
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
}

const client = new PGlite();

await client.exec(`
  create schema if not exists auth;
  create schema if not exists storage;
  create role anon;
  create role authenticated;
  create role service_role;
  create publication supabase_realtime;

  create table auth.users (
    id uuid primary key,
    email text,
    raw_user_meta_data jsonb
  );

  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;

  create table storage.buckets (
    id text primary key,
    name text not null,
    public boolean default false,
    file_size_limit bigint,
    allowed_mime_types text[]
  );

  create table storage.objects (
    id uuid primary key default gen_random_uuid(),
    bucket_id text,
    name text
  );

  create function storage.foldername(name text) returns text[] language sql immutable as $$
    select string_to_array(name, '/')
  $$;

  grant usage on schema public to anon, authenticated;
  grant all on all tables in schema public to anon, authenticated;
  grant all on all sequences in schema public to anon, authenticated;
  grant execute on all functions in schema public to anon, authenticated;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;

  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on sequences to anon, authenticated;
  alter default privileges in schema public grant execute on functions to anon, authenticated;
  alter default privileges in schema storage grant all on tables to anon, authenticated;
  alter default privileges in schema storage grant all on sequences to anon, authenticated;
`);

const db = drizzle(client);

try {
  await migrate(db, { migrationsFolder: 'drizzle' });
  check('Migrasi baseline + custom diterapkan tanpa error', true);
} catch (error) {
  check('Migrasi baseline + custom diterapkan tanpa error', false, error.message);
  console.log('\nHasil: GAGAL');
  process.exit(1);
}

const tables = await client.query(
  "select tablename from pg_tables where schemaname = 'public' order by tablename"
);
check('10 tabel public dibuat', tables.rows.length === 10, tables.rows.map((row) => row.tablename).join(', '));

const policies = await client.query("select policyname from pg_policies where schemaname = 'public'");
check('35 RLS policy aktif', policies.rows.length === 35, `terdeteksi ${policies.rows.length}`);

const rlsTables = await client.query(
  "select relname, relrowsecurity from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r'"
);
check(
  'RLS aktif di semua tabel public',
  rlsTables.rows.every((row) => row.relrowsecurity),
  rlsTables.rows.filter((row) => !row.relrowsecurity).map((row) => row.relname).join(', ') || 'semua aktif'
);

const functions = await client.query(`
  select p.proname from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
  order by p.proname
`);
const functionNames = functions.rows.map((row) => row.proname);
const requiredFunctions = [
  'add_family_member_by_identifier',
  'get_account_balances',
  'create_family_with_onboarding',
  'generate_family_invite_code',
  'get_login_email',
  'handle_new_user',
  'is_family_admin_or_owner',
  'is_family_member',
  'is_family_owner',
  'join_family_by_invite_code',
  'make_unique_username',
  'prevent_transaction_creator_change',
  'remove_family_member',
  'set_updated_at',
  'slug_username',
  'update_family_member_role',
];
const missingFunctions = requiredFunctions.filter((name) => !functionNames.includes(name));
check('Semua function wajib tersedia', missingFunctions.length === 0, missingFunctions.join(', ') || `${functionNames.length} function`);

const triggers = await client.query('select tgname from pg_trigger where not tgisinternal');
const triggerNames = triggers.rows.map((row) => row.tgname);
const requiredTriggers = [
  'accounts_set_updated_at',
  'budgets_set_updated_at',
  'families_set_updated_at',
  'on_auth_user_created',
  'profiles_set_updated_at',
  'saving_goals_set_updated_at',
  'transactions_prevent_creator_change',
  'transactions_set_updated_at',
];
const missingTriggers = requiredTriggers.filter((name) => !triggerNames.includes(name));
check('Semua trigger wajib tersedia', missingTriggers.length === 0, missingTriggers.join(', ') || `${triggerNames.length} trigger`);

const buckets = await client.query("select id from storage.buckets where id = 'avatars'");
check('Bucket storage avatars dibuat', buckets.rows.length === 1);

const storagePolicies = await client.query(
  "select policyname from pg_policies where schemaname = 'storage' and tablename = 'objects'"
);
check('4 policy storage avatars dibuat', storagePolicies.rows.length === 4, `terdeteksi ${storagePolicies.rows.length}`);

const seed = await client.query('select count(*)::int as count from public.categories where family_id is null');
check('15 kategori bawaan ter-seed', seed.rows[0].count === 15, `terdeteksi ${seed.rows[0].count}`);

const publication = await client.query(`
  select tablename from pg_publication_tables where pubname = 'supabase_realtime' order by tablename
`);
const publishedTables = publication.rows.map((row) => row.tablename);
const requiredPublished = ['accounts', 'budgets', 'notifications', 'transactions'];
check(
  'Realtime publication berisi 4 tabel',
  requiredPublished.every((name) => publishedTables.includes(name)),
  publishedTables.join(', ')
);

await client.exec(`
  insert into auth.users (id, email, raw_user_meta_data)
  values ('11111111-1111-1111-1111-111111111111', 'test@example.com', '{"name":"Test User","username":"testuser"}'::jsonb)
`);
const profile = await client.query("select name, username from public.profiles where id = '11111111-1111-1111-1111-111111111111'");
check(
  'Trigger handle_new_user membuat profil otomatis',
  profile.rows[0]?.name === 'Test User' && profile.rows[0]?.username === 'testuser',
  JSON.stringify(profile.rows[0])
);

await client.exec("set role anon; set request.jwt.claim.sub = '';");
const loginEmail = await client.query("select public.get_login_email('testuser') as email");
check(
  'Login username: get_login_email menemukan email (dipanggil anon)',
  loginEmail.rows[0].email === 'test@example.com',
  String(loginEmail.rows[0].email)
);
const takenUsername = await client.query("select public.is_username_available('TestUser') as available");
check('Registrasi: username terpakai terdeteksi (case-insensitive)', takenUsername.rows[0].available === false);
const freeUsername = await client.query("select public.is_username_available('username_baru') as available");
check('Registrasi: username bebas terdeteksi', freeUsername.rows[0].available === true);
await client.exec('reset role');

await client.exec(`
  insert into public.families (id, name, owner_user_id)
  values ('22222222-2222-2222-2222-222222222222', 'Keluarga Test', '11111111-1111-1111-1111-111111111111');

  insert into public.family_members (family_id, user_id, role)
  values ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'owner');
`);

await client.exec("set role authenticated; set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';");
const memberFamilies = await client.query('select count(*)::int as count from public.families');
check('RLS: anggota melihat keluarganya', memberFamilies.rows[0].count === 1, `terlihat ${memberFamilies.rows[0].count}`);

await client.exec('reset role');

await client.exec(`
  insert into auth.users (id, email, raw_user_meta_data)
  values ('33333333-3333-3333-3333-333333333333', 'member@example.com', '{"name":"Member Biasa","username":"memberbiasa"}'::jsonb);

  insert into public.family_members (family_id, user_id, role)
  values ('22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 'member');
`);

await client.exec("set role authenticated; set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';");
let blocked = false;
try {
  await client.exec("insert into public.accounts (family_id, name) values ('22222222-2222-2222-2222-222222222222', 'Dompet Harus Gagal')");
} catch {
  blocked = true;
}
check('RLS: member tanpa role manager tidak bisa menambah dompet', blocked);

await client.exec("reset role; set role authenticated; set request.jwt.claim.sub = '99999999-9999-9999-9999-999999999999';");
const outsiderFamilies = await client.query('select count(*)::int as count from public.families');
check('RLS: non-anggota tidak melihat keluarga', outsiderFamilies.rows[0].count === 0, `terlihat ${outsiderFamilies.rows[0].count}`);
await client.exec('reset role');

await client.exec(`
  insert into public.accounts (id, family_id, name, type, initial_balance)
  values ('44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', 'Dompet Test', 'cash', 1000000);

  insert into public.budgets (id, family_id, name, account_id, month, year, amount)
  values ('55555555-5555-5555-5555-555555555555', '22222222-2222-2222-2222-222222222222', 'Belanja Test', '44444444-4444-4444-4444-444444444444', 8, 2026, 500000);

  insert into public.transactions (family_id, account_id, budget_id, created_by, type, amount, transaction_date)
  values ('22222222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'expense', 50000, '2026-09-10');
`);

let creatorBlocked = false;
try {
  await client.exec(`
    update public.transactions
    set created_by = '33333333-3333-3333-3333-333333333333'
    where account_id = '44444444-4444-4444-4444-444444444444'
  `);
} catch {
  creatorBlocked = true;
}
check('Trigger: created_by transaksi tidak bisa diubah', creatorBlocked);

const beforeUpdate = await client.query("select updated_at from public.accounts where id = '44444444-4444-4444-4444-444444444444'");
await client.exec("update public.accounts set name = 'Dompet Test 2' where id = '44444444-4444-4444-4444-444444444444'");
const afterUpdate = await client.query("select updated_at from public.accounts where id = '44444444-4444-4444-4444-444444444444'");
check(
  'Trigger: updated_at otomatis berubah',
  new Date(afterUpdate.rows[0].updated_at) > new Date(beforeUpdate.rows[0].updated_at)
);

let checkBlocked = false;
try {
  await client.exec(`
    insert into public.transactions (family_id, account_id, category_id, created_by, type, amount, transaction_date)
    values ('22222222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444', null, '11111111-1111-1111-1111-111111111111', 'income', 10000, '2026-09-10')
  `);
} catch {
  checkBlocked = true;
}
check('Constraint: pemasukan wajib punya kategori & tanpa alokasi', checkBlocked);

await client.exec("set role authenticated; set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';");
const balanceRows = await client.query('select account_id, balance from public.get_account_balances()');
const testAccountBalance = balanceRows.rows.find((row) => row.account_id === '44444444-4444-4444-4444-444444444444');
check(
  'RPC saldo: get_account_balances menghitung saldo dari saldo awal + transaksi',
  Number(testAccountBalance?.balance) === 950000,
  `balance=${testAccountBalance?.balance}`
);
await client.exec('reset role');

await client.close();

const failed = results.filter((result) => !result.ok);
console.log(`\nHasil: ${results.length - failed.length}/${results.length} pemeriksaan lulus`);
process.exitCode = failed.length ? 1 : 0;
