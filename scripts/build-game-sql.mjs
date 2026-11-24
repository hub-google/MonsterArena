// Assemble the CURRENT database function sources on demand; does not connect or deploy.
// Example: npm run db:sql > /tmp/arena-functions.sql
import { readFileSync } from 'node:fs';
import { GAME_FUNCTIONS } from '../supabase/schema/manifest.mjs';
import { buildCatalogSql } from './game-catalog-sql.mjs';
import { namespaceSql, previewBootstrapSql, previewHealthSql } from './preview-namespace.mjs';

const prelude=readFileSync(new URL('../supabase/schema/game_rules_v2.sql',import.meta.url),'utf8').trim();
const chunks = GAME_FUNCTIONS.map(({ name }) => {
  const file = new URL(`../supabase/schema/functions/${name}.sql`, import.meta.url);
  return readFileSync(file, 'utf8').trim();
});
const canonical=[prelude,buildCatalogSql(),...chunks].join('\n\n');
const mode=process.argv[2];
if(mode==='--preview-test'){
 const path=process.argv[3];
 if(!['tests/sql/game-rules-v2.sql','tests/sql/combat-balance.sql'].includes(path))throw Error('Unknown preview test');
 process.stdout.write(namespaceSql(readFileSync(new URL('../'+path,import.meta.url),'utf8')));
}else if(mode==='--preview-bootstrap'){
 const fixture=readFileSync(new URL('../tests/sql/fixture.sql',import.meta.url),'utf8');
 process.stdout.write([previewBootstrapSql(fixture),namespaceSql(canonical),previewHealthSql].join('\n\n')+'\n');
}else if(mode==='--preview'){
 process.stdout.write(namespaceSql(canonical)+'\n'+previewHealthSql+'\n');
}else if(!mode)process.stdout.write(canonical+'\n');
else throw Error('Unknown SQL output mode');
