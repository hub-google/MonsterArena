// Main and the existing formal site share Auth only. Their game data and RPCs
// are isolated by explicit object names, never by a caller-supplied search_path.
export const PREVIEW_TABLES = Object.freeze(['users','guilds','monsters','user_inventory','game_chip_reserves','friends','guild_members','guild_applications','daily_quests','battle_records','gifts','messages','raid_boss']);
const objects = new Set([...PREVIEW_TABLES,'game_ensure_profile','game_public_profiles','game_age_monsters','game_rename_monster','game_friend_action','game_claim_gifts','game_plaza_monsters','game_action']);
export function namespaceSql(sql){
 return sql
  .replace(/\barena_internal\b/g,'arena_preview_internal')
  .replace(/\bpublic\.("?[a-z_][a-z_0-9]*"?)/gi,(all,identifier)=>{
    const name=identifier.replaceAll('"','');
    if(!objects.has(name))return all;
    return 'public.'+(identifier.startsWith('"')?'"arena_preview_'+name+'"':'arena_preview_'+name);
  })
  .replace(/\b(REFERENCES|RETURNS)\s+(users|guilds)\b/gi,(_,verb,name)=>verb+' public.arena_preview_'+name)
  .replace(/\bADD CONSTRAINT "([^"]+)"/g,(_,name)=>'ADD CONSTRAINT "arena_preview_'+name+'"')
  .replace(/\b(CREATE INDEX IF NOT EXISTS )arena_(\w+)/g,(_,head,name)=>head+'arena_preview_'+name);
}
const owner='user_id=(select auth.uid())';
const policies={
 users:owner,monsters:owner,user_inventory:owner,game_chip_reserves:owner,
 friends:owner+' OR friend_uid=(select auth.uid())',
 guilds:'true',
 guild_members:owner+' OR exists(select 1 from public.arena_preview_guilds g where g.guild_id=arena_preview_guild_members.guild_id and g.leader_id=(select auth.uid()))',
 guild_applications:owner+' OR exists(select 1 from public.arena_preview_guilds g where g.guild_id=arena_preview_guild_applications.guild_id and g.leader_id=(select auth.uid()))',
 daily_quests:owner,battle_records:owner,gifts:'sender=(select auth.uid())::text OR receiver=(select auth.uid())::text',
 messages:'true',raid_boss:'true'
};
export function previewBootstrapSql(fixture){
 const pos=fixture.indexOf('CREATE TABLE public.');
 if(pos<0)throw Error('Arena fixture table definitions missing');
 const ddl=namespaceSql(fixture.slice(pos));
 const snapshots=PREVIEW_TABLES.filter(t=>!['messages','raid_boss'].includes(t));
 const copy=`-- One-time snapshot; never writes to the original Arena tables.
DO $snapshot$
DECLARE src text; dst text; cols text;
BEGIN
 FOREACH src IN ARRAY ARRAY[${snapshots.map(t=>"'"+t+"'").join(',')}] LOOP
  dst:='arena_preview_'||src;
  SELECT string_agg(format('%I',c.column_name),',' ORDER BY c.ordinal_position) INTO cols
  FROM information_schema.columns c WHERE c.table_schema='public' AND c.table_name=dst
   AND EXISTS(SELECT 1 FROM information_schema.columns s WHERE s.table_schema='public' AND s.table_name=src AND s.column_name=c.column_name);
  IF cols IS NULL THEN RAISE EXCEPTION 'Missing snapshot columns for %',src; END IF;
  EXECUTE format('INSERT INTO public.%I (%s) SELECT %s FROM public.%I',dst,cols,cols,src);
 END LOOP;
END $snapshot$;`;
 const acl=PREVIEW_TABLES.map(t=>`ALTER TABLE public.arena_preview_${t} ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.arena_preview_${t} FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.arena_preview_${t} TO authenticated;
CREATE POLICY arena_preview_read ON public.arena_preview_${t} FOR SELECT TO authenticated USING (${policies[t]});`).join('\n');
 return [ddl,'ALTER TABLE public.arena_preview_monsters ADD COLUMN repair_until timestamptz, ADD COLUMN skin_id text;',acl,copy].join('\n\n');
}
export const previewHealthSql=`CREATE OR REPLACE FUNCTION public.arena_preview_health() RETURNS jsonb
LANGUAGE sql STABLE SET search_path TO pg_catalog,pg_temp AS $$
 SELECT jsonb_build_object('version',2,'combatBalance',3,'namespace','arena_preview')
$$;
REVOKE ALL ON FUNCTION public.arena_preview_health() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.arena_preview_health() TO anon, authenticated;
NOTIFY pgrst,'reload schema';`;
