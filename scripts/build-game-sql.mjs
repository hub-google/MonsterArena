// Assemble the CURRENT database function sources on demand; does not connect or deploy.
// Example: npm run db:sql > /tmp/arena-functions.sql
import { readFileSync } from 'node:fs';
import { GAME_FUNCTIONS } from '../supabase/schema/manifest.mjs';
import { buildCatalogSql } from './game-catalog-sql.mjs';

const prelude=readFileSync(new URL('../supabase/schema/game_rules_v2.sql',import.meta.url),'utf8').trim();
const chunks = GAME_FUNCTIONS.map(({ name }) => {
  const file = new URL(`../supabase/schema/functions/${name}.sql`, import.meta.url);
  return readFileSync(file, 'utf8').trim();
});
process.stdout.write([prelude,buildCatalogSql(),...chunks].join('\n\n') + '\n');
