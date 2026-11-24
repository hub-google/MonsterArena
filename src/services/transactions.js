import {presentGameMessage} from '../utils/mechaVocabulary.js';
import {supabase,supabaseUrl,publishableKey} from '../utils/supabaseClient.js';
import {createTransactionJournal,REPLAY_WINDOW_MS,TransactionRejected} from '../utils/transactionJournal.js';
import {sendBoundTransaction} from '../utils/transactionTransport.js';
import {GAME_RULES_V2,gameResource,gameRpc,throwIfError} from './backend.js';

let transactionUid=null;
const journal=createTransactionJournal({
 storage:{get length(){return globalThis.localStorage.length;},key:i=>globalThis.localStorage.key(i),getItem:k=>globalThis.localStorage.getItem(k),setItem:(k,v)=>globalThis.localStorage.setItem(k,v),removeItem:k=>globalThis.localStorage.removeItem(k)},scope:supabaseUrl+'|'+gameResource('game_action'),
 send:entry=>sendBoundTransaction({entry,getSession:()=>supabase.auth.getSession(),url:supabaseUrl,key:publishableKey,resource:gameResource('game_action')}),
 lock:async(key,fn)=>globalThis.navigator?.locks?globalThis.navigator.locks.request(key,{ifAvailable:true},lock=>{if(!lock)throw Error('另一個視窗正在處理交易，請稍後恢復');return fn();}):fn()
});
const presentResult=data=>data?.message?{...data,message:presentGameMessage(data.message)}:data??{message:'操作成功！'};
export const action = async (p_action,p_data={})=>{
 if(GAME_RULES_V2&&!['capabilities','raid_status','pvp_list'].includes(p_action)){
  try{return presentResult(await journal.start(transactionUid,p_action,p_data));}
  catch(error){if(error instanceof TransactionRejected)throw new Error(presentGameMessage(error.message));throw error;}
 }
 const {data,error}=await gameRpc('game_action',{p_action,p_data});
 if(error&&!error.code&&/fetch|network|timeout/i.test(error.message??''))throw Error('操作結果尚未確認，請重新整理資料，不要立即重複操作。');
 throwIfError(error);return presentResult(data);
};

export const transactionApi = {
  setTransactionUser:uid=>{transactionUid=uid;},
  transactionState:uid=>GAME_RULES_V2?journal.state(uid):{busy:false,pending:null},
  subscribeTransactions:fn=>{
    const unsubscribe=journal.subscribe(fn);
    const changed=e=>{if(transactionUid&&journal.matchesStorageKey(e.key))fn(transactionUid,journal.state(transactionUid));};
    if(GAME_RULES_V2)window.addEventListener('storage',changed);
    return()=>{unsubscribe();window.removeEventListener('storage',changed);};
  },
  recoverTransaction:async uid=>presentResult(await journal.recover(uid)),
  discardExpiredTransaction:uid=>journal.discardExpired(uid),
  transactionExpired:entry=>Boolean(entry&&Date.now()-entry.createdAt>=REPLAY_WINDOW_MS),
};
