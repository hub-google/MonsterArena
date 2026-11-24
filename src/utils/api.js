import { supabase, supabaseUrl } from './supabaseClient';

// Rules V2 must use an explicitly configured isolated backend, never the shared Game project.
export const GAME_RULES_V2 = import.meta.env.VITE_ARENA_V2 === 'true' &&
  Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY) &&
  !supabaseUrl.includes('fanffwnhkxpfhttylntw');

// All economy mutations go through authenticated PostgreSQL transactions.
// Direct client updates are reserved for owner-controlled presentation state.
const getUid = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error('User not authenticated');
  return user.id;
};
const usernameEmail = name => `${name.toLowerCase().replace(/[^a-z0-9_]/g, '')}@monsterarena.app`;
const legacyUsernameEmail = name => `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}@monsterarena.app`;
const throwIfError = error => { if (error) throw new Error(error.message); };
const action = async (p_action, p_data = {}) => {
  const args={p_action,p_data:GAME_RULES_V2?{...p_data,request_id:crypto.randomUUID()}:p_data};
  let {data,error}=await supabase.rpc('game_action',args);
  // The isolated V2 server caches the transaction result under the same UUID.
  // Never retry legacy mutations or business-rule rejections.
  if(GAME_RULES_V2 && error && !error.code && /fetch|network|timeout/i.test(error.message??'')){
    ({data,error}=await supabase.rpc('game_action',args));
  }
  throwIfError(error);
  return data ?? { message: '操作成功！' };
};
const dateInTaiwan = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit'
}).format(new Date());
const getQuestId = uid => `${uid}_${dateInTaiwan()}`;

export const api = {
  register: async (username, email, password) => {
    const trimmed = username.trim();
    if (!/^[a-zA-Z0-9_]{3,24}$/.test(trimmed)) throw new Error('帳號需為 3–24 位英數字或底線');
    const finalEmail = email?.trim() || usernameEmail(trimmed);
    const { data, error } = await supabase.auth.signUp({
      email: finalEmail, password, options: { data: { username: trimmed } }
    });
    throwIfError(error);
    if (data.session) {
      const result = await supabase.rpc('game_ensure_profile');
      throwIfError(result.error);
    }
    return { user: data.user, requiresEmailConfirmation: !data.session };
  },
  login: async (usernameOrEmail, password) => {
    const input = usernameOrEmail.trim();
    const isEmail = input.includes('@');
    const email = isEmail ? input : usernameEmail(input);
    let { data, error } = await supabase.auth.signInWithPassword({ email, password });
    // Older username-only accounts stripped underscores from synthetic addresses.
    // A fallback must verify the account name to avoid logging into a collision.
    if (error && !isEmail && input.includes('_')) {
      const legacy = await supabase.auth.signInWithPassword({
        email: legacyUsernameEmail(input), password
      });
      if (!legacy.error) {
        const actualName = legacy.data.user?.user_metadata?.username;
        if (!actualName || actualName.toLowerCase() !== input.toLowerCase()) {
          await supabase.auth.signOut();
          throw new Error('帳號名稱不符，請使用註冊 Email 登入');
        }
        data = legacy.data;
        error = null;
      }
    }
    throwIfError(error);
    return { user: data.user };
  },
  logout: async () => {
    const { error } = await supabase.auth.signOut();
    throwIfError(error);
  },
  getMe: async () => {
    const { data, error } = await supabase.rpc('game_ensure_profile');
    throwIfError(error);
    const giftResult = await supabase.rpc('game_claim_gifts');
    throwIfError(giftResult.error);
    if (giftResult.data > 0) {
      const refresh = await supabase.from('users').select('*').eq('user_id',data.user_id).single();
      throwIfError(refresh.error);
      return refresh.data;
    }
    return data;
  },
  getMonsters: async (uid) => {
    uid = uid ?? await getUid();
    const aged=await supabase.rpc('game_age_monsters');
    throwIfError(aged.error);
    const { data, error } = await supabase.from('monsters').select('*').eq('user_id', uid);
    throwIfError(error);
    return (data ?? []).sort((a,b) => Number(a.is_dead)-Number(b.is_dead) || b.life_stage-a.life_stage);
  },
  hatchEgg: () => action('hatch'),
  feed: (monster_id, item_id) => action('feed', { monster_id, item_id }),
  clean: monster_id => action('clean', { monster_id }),
  heal: (monster_id, item_id = 'medicine_standard') => action('heal', { monster_id, item_id }),
  train: monster_id => action('train', { monster_id }),
  evolve: monster_id => action('evolve', { monster_id }),
  release: monster_id => action('release', { monster_id }),
  toggleLock: monster_id => action('lock', { monster_id }),
  equipChip: (monster_id, item_id, slot) => action('equip', { monster_id, item_id, slot }),
  unequipChip: (monster_id, slot) => action('unequip', { monster_id, slot }),
  breed: (parent1, parent2, useCatalyst=false) => action('breed', { parent1, parent2, useCatalyst }),
  getInventory: async (uid) => {
    uid = uid ?? await getUid();
    const { data, error } = await supabase.from('user_inventory').select('*').eq('user_id', uid).order('item_id');
    throwIfError(error);
    return data ?? [];
  },
  buyItem: (item_id, quantity=1) => action('buy', { item_id, quantity }),
  rename: async (monster_id, name) => {
    const {data,error}=await supabase.rpc('game_rename_monster',{p_monster_id:monster_id,p_name:name});
    throwIfError(error);
    return data;
  },
  trackQuestProgress: async () => {
    // Counts are updated atomically together with the corresponding game action.
  },
  getDailyQuests: async () => {
    const uid = await getUid();
    const { data, error } = await supabase.from('daily_quests').select('*')
      .eq('quest_id', getQuestId(uid)).maybeSingle();
    throwIfError(error);
    return data ?? { feed_count:0, clean_count:0, train_count:0, battle_count:0, claimed:[] };
  },
  claimQuest: quest_id => action('claim', { quest_id }),
  startBattle: (monster_id, encounter='wild', opponent_id) => action('battle', { monster_id, encounter, ...(opponent_id?{opponent_id}:{}) }),
  getPvp: () => action('pvp_list'),
  registerPvp: monster_id => action('pvp_register',{monster_id}),
  unregisterPvp: () => action('pvp_unregister'),
  claimRaid: boss_id => action('raid_claim',{boss_id}),
  getGuilds: async (uid) => {
    uid = uid ?? await getUid();
    const [guildResult, memberResult] = await Promise.all([
      supabase.from('guilds').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('guild_members').select('*,guilds(*)').eq('user_id', uid).maybeSingle()
    ]);
    throwIfError(guildResult.error);throwIfError(memberResult.error);
    const guilds = guildResult.data ?? [];
    const leaderIds = [...new Set(guilds.map(g => g.leader_id).filter(Boolean))];
    let usernames = {};
    if (leaderIds.length) {
      const { data, error } = await supabase.rpc('game_public_profiles',{p_user_ids:leaderIds});
      throwIfError(error);
      usernames = Object.fromEntries((data ?? []).map(u => [u.user_id,u.username]));
    }
    const membership = memberResult.data;
    const myGuild = membership?.guilds ? { ...membership.guilds,
      role: membership.role, contribution: membership.contribution } : null;
    return { guilds: guilds.map(g=>({...g,leader_name:usernames[g.leader_id]||'會長'})), myGuild };
  },
  createGuild: name => action('guild_create', { name }),
  joinGuild: guild_id => action('guild_join', { guild_id }),
  leaveGuild: () => action('guild_leave'),
  donateGuild: amount => action('guild_donate', { amount }),
  buyGuildShop: item_id => action('guild_buy', { item_id }),
  getRaidStatus: async () => {
    if(GAME_RULES_V2)return action('raid_status');
    const { data, error } = await supabase.from('raid_boss').select('*')
      .order('created_at', { ascending: false }).limit(1).maybeSingle();
    throwIfError(error);
    return data ?? { name:'機械紀元首領',current_hp:0,max_hp:500000,is_active:false };
  },
  attackRaidBoss: monster_id => action('raid', { monster_id }),
  searchPlayers: async typeFilter => {
    // Public plaza exposes only a safe projection, never other players' private genes/stats.
    const { data, error } = await supabase.rpc('game_plaza_monsters', {
      p_type: typeFilter ? 10 + Number(typeFilter) : null
    });
    throwIfError(error);
    const grouped = new Map();
    (data ?? []).forEach(m => {
      if (!m.user_id) return;
      if (!grouped.has(m.user_id)) grouped.set(m.user_id,{user_id:m.user_id,username:'玩家',monsters:[]});
      const group = grouped.get(m.user_id);
      if(group.monsters.length<3) group.monsters.push(m);
    });
    if (grouped.size) {
      const {data:users,error:ue} = await supabase.rpc('game_public_profiles',{p_user_ids:[...grouped.keys()]});
      throwIfError(ue);
      (users??[]).forEach(u=>{const p=grouped.get(u.user_id);if(p)p.username=u.username;});
    }
    return [...grouped.values()].slice(0,30);
  },
  getFriends: async (uid) => {
    uid = uid ?? await getUid();
    const { data, error } = await supabase.from('friends').select('*')
      .eq('user_id',uid).eq('status',1);
    throwIfError(error);
    return (data??[]).map(f=>({...f,friend_id:f.friend_uid,friend_name:f.friend_name||'好友'}));
  },
  getFriendRequests: async () => {
    const uid=await getUid();
    const {data,error}=await supabase.from('friends').select('friend_record_id,user_id,friend_uid,status')
      .eq('friend_uid',uid).eq('status',0);
    throwIfError(error);
    const incoming=data??[];
    if(!incoming.length)return [];
    const {data:people,error:peopleError}=await supabase.rpc('game_public_profiles',{p_user_ids:incoming.map(x=>x.user_id)});
    throwIfError(peopleError);
    const names=Object.fromEntries((people??[]).map(p=>[p.user_id,p.username]));
    return incoming.map(f=>({...f,friend_name:names[f.user_id]||'玩家'}));
  },
  addFriend: async target => {
    const uid=await getUid();
    const name=target.trim();
    if(!name)throw new Error('請輸入好友 UUID 或使用者名稱');
    const isUuid=/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(name);
    const {data:profiles,error}=await supabase.rpc('game_public_profiles',
      isUuid?{p_user_ids:[name]}:{p_username:name});
    throwIfError(error);
    const peer=profiles?.find(p=>p.username===name)||profiles?.[0];
    if(!peer)throw new Error('找不到該玩家');
    if(peer.user_id===uid)throw new Error('不能加自己');
    const {data,error:requestError}=await supabase.rpc('game_friend_action',{
      p_mode:'request',p_peer:peer.user_id
    });
    throwIfError(requestError);
    return data??{message:'好友邀請已送出'};
  },
  acceptFriend: async friend_id => {
    const {data,error}=await supabase.rpc('game_friend_action',{p_mode:'accept',p_peer:friend_id});
    throwIfError(error);
    return data??{message:'已接受好友邀請'};
  },
  giftStamina: friend_id => action('gift', { friend_id }),
  sendMessage: (channel,text) => {
    if(channel!=='world') throw new Error('不支援的頻道');
    return action('chat', {text});
  },
  subscribeMessages: (channel,callback) => {
    let disposed=false,running=false,queued=false,cursor=null;
    let messages=[];
    const load=async()=>{
      if(disposed || document.visibilityState==='hidden')return;
      if(running){queued=true;return;}
      running=true;
      try{
        const query=supabase.from('messages').select('message_id,channel,user_id,username,text,timestamp').eq('channel',channel);
        const {data,error}=cursor
          ? await query.gte('timestamp',cursor).order('timestamp',{ascending:true}).order('message_id',{ascending:true}).limit(100)
          : await query.order('timestamp',{ascending:false}).order('message_id',{ascending:false}).limit(50);
        throwIfError(error);
        if(disposed)return;
        const combined=new Map(messages.map(m=>[m.message_id,m]));
        for(const m of data??[])combined.set(m.message_id,m);
        messages=[...combined.values()].sort((a,b)=>a.timestamp.localeCompare(b.timestamp)||String(a.message_id).localeCompare(String(b.message_id))).slice(-50);
        cursor=messages.at(-1)?.timestamp??null;
        callback(messages.map(m=>({...m,id:m.message_id})));
        if(cursor && data?.length===100){
          if(data[0].timestamp===data.at(-1).timestamp)cursor=null;
          queued=true;
        }
      }catch(e){if(!disposed)console.warn('Chat read error:',e.message);}
      finally{running=false;if(queued&&!disposed){queued=false;load();}}
    };
    load();
    const interval=setInterval(load,30000);
    document.addEventListener('visibilitychange',load);
    const unsubscribe=()=>{disposed=true;clearInterval(interval);document.removeEventListener('visibilitychange',load);};
    unsubscribe.refresh=load;
    return unsubscribe;
  }
};
