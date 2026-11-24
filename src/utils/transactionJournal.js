// A durable, account-scoped receipt is written BEFORE sending a V2 mutation.
// Never persist credentials. Each UUID has its own storage key so tabs cannot
// overwrite each other's recovery records. The database owns idempotency.
export const REPLAY_WINDOW_MS=6*24*60*60*1000;
export class TransactionRejected extends Error {}
export class TransactionUncertain extends Error {}
export function createTransactionJournal({storage,scope,send,uuid=()=>crypto.randomUUID(),now=Date.now,lock=async(_key,fn)=>fn()}){
 const prefix='arena.tx.'+scope+'.';
 const busy=new Set(),listeners=new Set();
 const userPrefix=uid=>prefix+uid+'.';
 const key=(uid,id)=>userPrefix(uid)+id;
 function pending(uid){
  if(!uid)return [];
  const list=[];
  for(let i=0;i<storage.length;i++){
   const k=storage.key(i);
   if(!k?.startsWith(userPrefix(uid)))continue;
   const entry=JSON.parse(storage.getItem(k));
   if(!entry||entry.uid!==uid||k!==key(uid,entry.id)||!entry.action||entry.payload?.request_id!==entry.id||!Number.isFinite(entry.createdAt))throw Error('交易恢復紀錄異常，請勿重複操作');
   list.push(entry);
  }
  return list.sort((a,b)=>a.createdAt-b.createdAt||a.id.localeCompare(b.id));
 }
 function state(uid){
  try{return {busy:busy.has(uid),pending:pending(uid)[0]||null,unavailable:false};}
  catch{return {busy:busy.has(uid),pending:null,unavailable:true};}
 }
 function emit(uid){for(const fn of listeners){try{fn(uid,state(uid));}catch(e){console.warn(e);}}}
 function save(entry){storage.setItem(key(entry.uid,entry.id),JSON.stringify(entry));}
 function remove(entry){storage.removeItem(key(entry.uid,entry.id));}
 async function execute(entry){
  const uid=entry.uid;
  if(busy.has(uid))throw Error('已有交易處理中');
  busy.add(uid);emit(uid);
  try{
   return await lock(userPrefix(uid),async()=>{
    // A second tab may already have recovered this exact entry.
    if(!storage.getItem(key(uid,entry.id)))throw Error('交易已由另一個視窗處理，請重新整理');
    if(now()-entry.createdAt>=REPLAY_WINDOW_MS)throw Error('交易已超過安全重送期限，請先核對資產');
    try{
     const result=await send(entry);
     remove(entry);
     return result;
    }catch(error){
     if(error instanceof TransactionRejected)remove(entry);
     throw error;
    }
   });
  }finally{busy.delete(uid);emit(uid);}
 }
 function start(uid,action,payload={}){
  if(!uid)throw Error('請重新登入');
  if(busy.has(uid))throw Error('已有交易處理中');
  if(pending(uid).length)throw Error('請先處理尚未確認的交易');
  const id=payload.request_id||uuid();
  const entry={uid,id,action,payload:{...payload,request_id:id},createdAt:now()};
  try{save(entry);}catch{throw Error('無法保存交易恢復紀錄，本次操作未送出');}
  return execute(entry);
 }
 function recover(uid){
  const entry=pending(uid)[0];
  if(!entry)throw Error('沒有待恢復交易，請重新整理');
  return execute(entry);
 }
 function discardExpired(uid){
  const entry=pending(uid)[0];
  if(!entry||busy.has(uid)||now()-entry.createdAt<REPLAY_WINDOW_MS)throw Error('交易仍可安全恢復，不可清除');
  remove(entry);emit(uid);
 }
 return {start,recover,discardExpired,state,subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},matchesStorageKey:k=>k===null||k.startsWith(prefix)};
}
