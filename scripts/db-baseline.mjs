import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';

if (existsSync('.env.local')) process.loadEnvFile('.env.local');

const migrationsFolder = 'drizzle';
const journalPath = join(migrationsFolder, 'meta', '_journal.json');

if (!existsSync(journalPath)) {
  console.error(`Journal migrasi tidak ditemukan di ${journalPath}.`);
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL belum diisi di .env.local. Lihat README bagian Drizzle.');
  process.exit(1);
}

const journal = JSON.parse(readFileSync(journalPath, 'utf8'));
const baselineTag = process.argv[2] || journal.entries[0]?.tag;
const entry = journal.entries.find((item) => item.tag === baselineTag);

if (!entry) {
  console.error(`Migrasi "${baselineTag}" tidak ditemukan di journal.`);
  process.exit(1);
}

const migrationPath = join(migrationsFolder, `${entry.tag}.sql`);
const sqlContent = readFileSync(migrationPath, 'utf8');
const hash = createHash('sha256').update(sqlContent).digest('hex');

const client = new pg.Client({ connectionString: databaseUrl });

try {
  await client.connect();
  await client.query('create schema if not exists drizzle');
  await client.query(
    'create table if not exists drizzle.__drizzle_migrations (id serial primary key, hash text not null, created_at bigint)'
  );

  const existing = await client.query('select id from drizzle.__drizzle_migrations where hash = $1', [hash]);

  if (existing.rowCount > 0) {
    console.log(`Migrasi "${entry.tag}" sudah ditandai sebagai applied. Tidak ada perubahan.`);
  } else {
    await client.query('insert into drizzle.__drizzle_migrations (hash, created_at) values ($1, $2)', [hash, entry.when]);
    console.log(`Migrasi "${entry.tag}" ditandai sebagai applied.`);
    console.log('Langkah berikutnya: npm run db:migrate untuk menerapkan migrasi custom (aman & idempotent).');
  }
} catch (error) {
  console.error(`Gagal menandai baseline: ${error.message}`);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
