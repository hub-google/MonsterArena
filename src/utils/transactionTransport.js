import {TransactionRejected,TransactionUncertain} from './transactionJournal.js';
// A captured bearer token binds every attempt to the originating account, even
// if another tab signs out or changes accounts while the request is in flight.
export async function sendBoundTransaction({entry,getSession,fetcher=fetch,url,key,resource,timeoutMs=15000}){
 const {data,error}=await getSession();
 const session=data?.session;
 if(error||!session?.access_token||session.user?.id!==entry.uid)throw new TransactionUncertain('原交易帳號已離線，請以同一帳號重新登入');
 const args={p_action:entry.action,p_data:entry.payload};
 for(let attempt=0;attempt<2;attempt++){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
   const response=await fetcher(url+'/rest/v1/rpc/'+resource,{method:'POST',headers:{apikey:key,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:JSON.stringify(args),signal:controller.signal});
   const body=await response.json();
   if(response.ok&&body&&typeof body==='object')return body;
   // SQLSTATE from the actual game function is a definitive rejection after
   // its idempotency lookup. Gateway/auth/transport errors are NOT receipts.
   if(response.status>=400&&response.status<500&&/^[0-9A-Z]{5}$/.test(body?.code||'')&&!/^PGRST/.test(body.code))throw new TransactionRejected(body.message||'交易未成立');
  }catch(error){if(error instanceof TransactionRejected)throw error;}
  finally{clearTimeout(timer);}
 }
 throw new TransactionUncertain('交易結果尚未確認，請使用交易恢復；不要重新購買或重複挑戰');
}
