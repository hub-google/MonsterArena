// Generated SQL catalog: no separate hard-coded server-side price or quest list.
import { SHOP_CATALOG, QUEST_CATALOG, GUILD_SHOP } from '../src/utils/gameCatalog.js';
const literal = s => "'" + String(s).replaceAll("'", "''") + "'";
const tuple = (...fields) => '('+fields.join(',')+')';
function lookup(name,returns,columns,rows,selected){
  return [
    'CREATE OR REPLACE FUNCTION arena_internal.'+name+'(p_id text)',
    'RETURNS TABLE('+returns+') LANGUAGE sql IMMUTABLE SET search_path TO pg_catalog,pg_temp AS $$',
    ' SELECT '+selected+' FROM (VALUES '+rows.join(',\n')+') AS v('+columns+') WHERE v.id=p_id;',
    '$$;',
    'REVOKE ALL ON FUNCTION arena_internal.'+name+'(text) FROM PUBLIC, anon, authenticated;'
  ].join('\n');
}
export function buildCatalogSql(){
  return [
    lookup('shop_catalog','price int,item_type int,cosmetic boolean','id,price,item_type,cosmetic',
      SHOP_CATALOG.map(x=>tuple(literal(x.id),x.price,x.itemType,String(x.cosmetic))), 'v.price,v.item_type,v.cosmetic'),
    lookup('quest_catalog','progress_key text,required int,reward int','id,progress_key,required,reward',
      QUEST_CATALOG.map(x=>tuple(literal(x.id),literal(x.key),x.target,x.reward)), 'v.progress_key,v.required,v.reward'),
    lookup('guild_catalog','price int,item_type int','id,price,item_type',
      GUILD_SHOP.map(x=>tuple(literal(x.id),x.price,x.itemType)), 'v.price,v.item_type')
  ].join('\n\n');
}
