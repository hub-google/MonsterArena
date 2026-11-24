import {gameTable,gameRpc,getUid,throwIfError} from './backend.js';
import {action} from './transactions.js';

export const socialApi = {
  searchPlayers: async typeFilter => {
    // Public plaza exposes only a safe projection, never other players' private genes/stats.
    const { data, error } = await gameRpc('game_plaza_monsters', {
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
      const {data:users,error:ue} = await gameRpc('game_public_profiles',{p_user_ids:[...grouped.keys()]});
      throwIfError(ue);
      (users??[]).forEach(u=>{const p=grouped.get(u.user_id);if(p)p.username=u.username;});
    }
    return [...grouped.values()].slice(0,30);
  },
  getFriends: async (uid) => {
    uid = uid ?? await getUid();
    const { data, error } = await gameTable('friends').select('*')
      .eq('user_id',uid).eq('status',1);
    throwIfError(error);
    return (data??[]).map(f=>({...f,friend_id:f.friend_uid,friend_name:f.friend_name||'好友'}));
  },
  getFriendRequests: async () => {
    const uid=await getUid();
    const {data,error}=await gameTable('friends').select('friend_record_id,user_id,friend_uid,status')
      .eq('friend_uid',uid).eq('status',0);
    throwIfError(error);
    const incoming=data??[];
    if(!incoming.length)return [];
    const {data:people,error:peopleError}=await gameRpc('game_public_profiles',{p_user_ids:incoming.map(x=>x.user_id)});
    throwIfError(peopleError);
    const names=Object.fromEntries((people??[]).map(p=>[p.user_id,p.username]));
    return incoming.map(f=>({...f,friend_name:names[f.user_id]||'玩家'}));
  },
  addFriend: async target => {
    const uid=await getUid();
    const name=target.trim();
    if(!name)throw new Error('請輸入好友 UUID 或使用者名稱');
    const isUuid=/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(name);
    const {data:profiles,error}=await gameRpc('game_public_profiles',
      isUuid?{p_user_ids:[name]}:{p_username:name});
    throwIfError(error);
    const peer=profiles?.find(p=>p.username===name)||profiles?.[0];
    if(!peer)throw new Error('找不到該玩家');
    if(peer.user_id===uid)throw new Error('不能加自己');
    const {data,error:requestError}=await gameRpc('game_friend_action',{
      p_mode:'request',p_peer:peer.user_id
    });
    throwIfError(requestError);
    return data??{message:'好友邀請已送出'};
  },
  acceptFriend: async friend_id => {
    const {data,error}=await gameRpc('game_friend_action',{p_mode:'accept',p_peer:friend_id});
    throwIfError(error);
    return data??{message:'已接受好友邀請'};
  },
  giftStamina: friend_id => action('gift', { friend_id }),
  sendMessage: (channel,text) => {
    if(channel!=='world') throw new Error('不支援的頻道');
    return action('chat', {text});
  },
  subscribeMessages: (channel,callback) => {
    let disposed=false,running=false,queued=false;
    const load=async()=>{
      if(disposed || document.visibilityState==='hidden')return;
      if(running){queued=true;return;}
      running=true;
      try{
        // The UI only displays the most recent 50 messages. Fetch that exact
        // window instead of an incremental timestamp cursor that can stall on ties.
        const {data,error}=await gameTable('messages')
          .select('message_id,channel,user_id,username,text,timestamp')
          .eq('channel',channel).order('timestamp',{ascending:false})
          .order('message_id',{ascending:false}).limit(50);
        throwIfError(error);
        if(disposed)return;
        callback((data??[]).slice().reverse().map(m=>({...m,id:m.message_id})));
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
