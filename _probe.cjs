const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const url = env.match(/DATABASE_URL="([^"]+)"/)[1];
const sql = neon(url);
(async () => {
  const t = await sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`;
  console.log('TABLES:', JSON.stringify(t));
  const a = await sql`SELECT indexname, tablename, indexdef FROM pg_indexes WHERE schemaname = 'public'`;
  console.log('ALL INDEXES:');
  a.forEach((x) => console.log('  ', x.indexname, '|', x.tablename, '|', x.indexdef));
  const v = await sql`SELECT extversion FROM pg_extension WHERE extname = 'vector'`;
  console.log('PGVECTOR VERSION:', JSON.stringify(v));
  const dbs = await sql`SELECT current_database() AS db, version() AS v`;
  console.log('DB:', JSON.stringify(dbs));
})().catch((e) => console.error('ERR:', e.message));
