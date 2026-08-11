import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { Client } from 'pg';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is required.');
  process.exit(1);
}

const root = process.cwd();
const migrationsDir = path.join(root, 'packages', 'database', 'prisma', 'migrations');

const migrationDirs = fs
  .readdirSync(migrationsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

const client = new Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

function nowIso() {
  return new Date().toISOString();
}

async function ensureMigrationTable() {
  await client.query(`
    create table if not exists "_prisma_migrations" (
      "id" varchar(36) primary key,
      "checksum" varchar(64) not null,
      "finished_at" timestamptz,
      "migration_name" varchar(255) not null,
      "logs" text,
      "rolled_back_at" timestamptz,
      "started_at" timestamptz not null default now(),
      "applied_steps_count" integer not null default 0
    );
  `);
}

async function appliedMigrationNames() {
  const result = await client.query(
    `select migration_name from "_prisma_migrations" where finished_at is not null and rolled_back_at is null`,
  );
  return new Set(result.rows.map((row) => row.migration_name));
}

async function applyMigration(name) {
  const file = path.join(migrationsDir, name, 'migration.sql');
  const sql = fs.readFileSync(file, 'utf8');
  const id = crypto.randomUUID();

  console.log(`[${nowIso()}] Applying ${name}`);
  await client.query('begin');
  try {
    await client.query(sql);
    await client.query(
      `insert into "_prisma_migrations"
       (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
       values ($1, $2, now(), $3, null, null, now(), 1)`,
      [id, 'manual-supabase-deploy', name],
    );
    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  }
}

await client.connect();

try {
  await ensureMigrationTable();
  const applied = await appliedMigrationNames();

  for (const migrationName of migrationDirs) {
    if (applied.has(migrationName)) {
      console.log(`[${nowIso()}] Skipping ${migrationName}`);
      continue;
    }
    await applyMigration(migrationName);
  }

  const tables = await client.query(`
    select count(*)::int as count
    from information_schema.tables
    where table_schema = 'public'
      and table_type = 'BASE TABLE';
  `);

  console.log(`Done. public tables: ${tables.rows[0].count}`);
} finally {
  await client.end();
}
