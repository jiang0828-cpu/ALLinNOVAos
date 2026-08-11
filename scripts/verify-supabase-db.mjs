import { Client } from 'pg';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is required.');
  process.exit(1);
}

const client = new Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

await client.connect();

try {
  await client.query(
    `insert into workspace (id, name, type, timezone, created_at, updated_at)
     values ($1, $2, $3, $4, now(), now())
     on conflict (id) do update set name = excluded.name, updated_at = now()`,
    ['ws_default', 'NOVA OS Workspace', 'PERSONAL', 'Asia/Shanghai'],
  );

  const workspace = await client.query(
    `select id, name, type, timezone from workspace where id = $1`,
    ['ws_default'],
  );

  const tables = await client.query(`
    select count(*)::int as count
    from information_schema.tables
    where table_schema = 'public'
      and table_type = 'BASE TABLE';
  `);

  console.log(JSON.stringify({
    ok: true,
    tables: tables.rows[0].count,
    workspace: workspace.rows[0],
  }));
} finally {
  await client.end();
}
