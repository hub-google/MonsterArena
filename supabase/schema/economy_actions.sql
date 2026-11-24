-- Private purchases, quests and guild economy. One rule implementation per domain.
CREATE OR REPLACE FUNCTION arena_internal.purchase_item(v_uid uuid,v_u public.users,p_data jsonb)
RETURNS jsonb LANGUAGE plpgsql SET search_path TO pg_catalog,pg_temp AS $domain$
DECLARE
  v_item text;
  v_qty int;
  v_cost int;
  v_price int;
  v_item_type int;
  v_cosmetic boolean;
BEGIN
    v_item := p_data->>'item_id';
    v_qty := (p_data->>'quantity')::int;
    if v_qty is null or v_qty<1 or v_qty>99 then raise exception '數量需為 1～99'; end if;
    select c.price,c.item_type,c.cosmetic into v_price,v_item_type,v_cosmetic from arena_internal.shop_catalog(v_item) c;
    if not found then raise exception '未知商品'; end if;
    if v_cosmetic then
      if v_qty<>1 then raise exception '皮膚每款只需購買一次'; end if;
      if exists(select 1 from public.user_inventory where user_id=v_uid and item_id=v_item and quantity>0) then raise exception '已收藏此皮膚'; end if;
    end if;
    v_cost := v_qty*v_price;
    if v_u.gold < v_cost then raise exception '金幣不足'; end if;
    update public.users set gold=gold-v_cost where user_id=v_uid;
    insert into public.user_inventory(user_id,item_id,item_type,quantity)
      values(v_uid,v_item,v_item_type,v_qty)
      on conflict(user_id,item_id) do update set quantity=public.user_inventory.quantity+excluded.quantity;
    RETURN jsonb_build_object('message','購買成功，花費 '||v_cost||'G');

END; $domain$;
REVOKE ALL ON FUNCTION arena_internal.purchase_item(uuid,public.users,jsonb) FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION arena_internal.claim_quest(v_uid uuid,v_date text,p_data jsonb)
RETURNS jsonb LANGUAGE plpgsql SET search_path TO pg_catalog,pg_temp AS $domain$
DECLARE
  v_count int;
  v_key text;
  v_quest public.daily_quests%rowtype;
  v_required int;
  v_reward int;
  v_text text;
BEGIN
    v_text:=p_data->>'quest_id';
    select c.progress_key,c.required,c.reward into v_key,v_required,v_reward from arena_internal.quest_catalog(v_text) c;
    if not found then raise exception '未知任務'; end if;
    insert into public.daily_quests(quest_id,user_id,date) values(v_uid::text||'_'||v_date,v_uid,v_date)
      on conflict(quest_id) do nothing;
    select * into v_quest from public.daily_quests where quest_id=v_uid::text||'_'||v_date for update;
    if v_text=any(coalesce(v_quest.claimed,array[]::text[])) then raise exception '獎勵已領取'; end if;
    v_count:=case v_key when 'feed_count' then v_quest.feed_count when 'clean_count' then v_quest.clean_count
      when 'train_count' then v_quest.train_count else v_quest.battle_count end;
    if coalesce(v_count,0)<v_required then raise exception '任務尚未完成'; end if;
    update public.daily_quests set claimed=array_append(coalesce(claimed,array[]::text[]),v_text)
      where quest_id=v_quest.quest_id;
    update public.users set gold=gold+v_reward where user_id=v_uid;
    RETURN jsonb_build_object('message','操作成功！');

END; $domain$;
REVOKE ALL ON FUNCTION arena_internal.claim_quest(uuid,text,jsonb) FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION arena_internal.guild_action(v_uid uuid,v_u public.users,p_action text,p_data jsonb)
RETURNS jsonb LANGUAGE plpgsql SET search_path TO pg_catalog,pg_temp AS $domain$
DECLARE
  v_item text;
  v_mon_id uuid;
  v_cost int;
  v_item_type int;
  v_guild public.guilds%rowtype;
  v_member public.guild_members%rowtype;
  v_text text;
BEGIN
    -- Own user is already locked. Shared guild row must precede member locks
    -- for donations, shopping, leaving, joining and leader disbanding.
    select * into v_member from public.guild_members where user_id=v_uid limit 1;
    if v_member.member_id is not null then
      perform 1 from public.guilds where guild_id=v_member.guild_id for update;
      select * into v_member from public.guild_members where user_id=v_uid limit 1 for update;
    end if;
    if p_action='guild_create' then
      if v_member.member_id is not null then raise exception '您已經加入公會'; end if;
      if v_u.gold<500 then raise exception '建立公會需要 500G'; end if;
      v_text:=trim(p_data->>'name');
      if length(coalesce(v_text,''))<2 or length(v_text)>30 then raise exception '公會名稱需 2～30 字'; end if;
      insert into public.guilds(guild_name,leader_id,level,total_contribution) values(v_text,v_uid,1,0) returning * into v_guild;
      insert into public.guild_members(guild_id,user_id,role,contribution) values(v_guild.guild_id,v_uid,2,0);
      update public.users set gold=gold-500 where user_id=v_uid;
    elsif p_action='guild_join' then
      if v_member.member_id is not null then raise exception '已加入其他公會'; end if;
      v_mon_id:=(p_data->>'guild_id')::uuid;
      perform 1 from public.guilds where guild_id=v_mon_id for update;
      if not found then raise exception '公會不存在'; end if;
      insert into public.guild_members(guild_id,user_id,role,contribution) values(v_mon_id,v_uid,0,0);
    else
      if v_member.member_id is null then raise exception '未加入公會'; end if;
      if p_action='guild_leave' then
        if v_member.role=2 then
          delete from public.guild_applications where guild_id=v_member.guild_id;
          delete from public.guild_members where guild_id=v_member.guild_id;
          delete from public.guilds where guild_id=v_member.guild_id and leader_id=v_uid;
        else
          delete from public.guild_members where member_id=v_member.member_id;
        end if;
      elsif p_action='guild_donate' then
        v_cost:=(p_data->>'amount')::int;
        if v_cost is null or v_cost<1 or v_cost>100000000 then raise exception '捐款金額需為正整數'; end if;
        if v_u.gold<v_cost then raise exception '金幣不足'; end if;
        update public.users set gold=gold-v_cost where user_id=v_uid;
        update public.guild_members set contribution=coalesce(contribution,0)+v_cost where member_id=v_member.member_id;
        update public.guilds set total_contribution=coalesce(total_contribution,0)+v_cost where guild_id=v_member.guild_id;
      elsif p_action='guild_buy' then
        v_item:=p_data->>'item_id';
        select c.price,c.item_type into v_cost,v_item_type from arena_internal.guild_catalog(v_item) c;
        if not found then raise exception '未知公會商品'; end if;
        if coalesce(v_member.contribution,0)<v_cost then raise exception '公會貢獻不足'; end if;
        update public.guild_members set contribution=contribution-v_cost where member_id=v_member.member_id;
        insert into public.user_inventory(user_id,item_id,item_type,quantity) values(v_uid,v_item,v_item_type,1)
          on conflict(user_id,item_id) do update set quantity=public.user_inventory.quantity+1;
      end if;
    end if;
    RETURN jsonb_build_object('message','操作成功！');
END; $domain$;
REVOKE ALL ON FUNCTION arena_internal.guild_action(uuid,public.users,text,jsonb) FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION arena_internal.progress_quest(v_uid uuid,v_date text,v_key text)
RETURNS void LANGUAGE plpgsql SET search_path TO pg_catalog,pg_temp AS $domain$
DECLARE

BEGIN
  if v_key is not null and v_key in ('feed_count','clean_count','train_count','battle_count') then
    insert into public.daily_quests(quest_id,user_id,date) values(v_uid::text||'_'||v_date,v_uid,v_date)
      on conflict(quest_id) do nothing;
    if v_key='feed_count' then
      update public.daily_quests set feed_count=coalesce(feed_count,0)+1 where quest_id=v_uid::text||'_'||v_date;
    elsif v_key='clean_count' then
      update public.daily_quests set clean_count=coalesce(clean_count,0)+1 where quest_id=v_uid::text||'_'||v_date;
    elsif v_key='train_count' then
      update public.daily_quests set train_count=coalesce(train_count,0)+1 where quest_id=v_uid::text||'_'||v_date;
    else
      update public.daily_quests set battle_count=coalesce(battle_count,0)+1 where quest_id=v_uid::text||'_'||v_date;
    end if;
  end if;

END; $domain$;
REVOKE ALL ON FUNCTION arena_internal.progress_quest(uuid,text,text) FROM PUBLIC, anon, authenticated;
