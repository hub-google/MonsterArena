import test from 'node:test';
import assert from 'node:assert/strict';
import {createTransactionJournal,TransactionRejected,TransactionUncertain,REPLAY_WINDOW_MS} from '../src/utils/transactionJournal.js';
import {sendBoundTransaction} from '../src/utils/transactionTransport.js';
const memory=()=>{const m=new Map();return{get length(){return m.size;},key:i=>[...m.keys()][i]??null,getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)}};
const make=(storage,send,extra={})=>createTransactionJournal({storage,send,scope:'test',uuid:()=> 'request-1',...extra});
test('journal persists before network and replays same UUID after page reload',async()=>{
 const storage=memory();let first;
 const a=make(storage,async entry=>{first=entry;assert.equal(storage.length,1);throw new TransactionUncertain('lost response')});
 await assert.rejects(a.start('alice','buy',{item_id:'x'}),TransactionUncertain);
 const b=make(storage,async entry=>{assert.deepEqual(entry,first);return {gold:420};});
 assert.equal(b.state('bob').pending,null);
 await assert.rejects(async()=>b.start('alice','buy',{item_id:'x'}),/尚未確認/);
 assert.deepEqual(await b.recover('alice'),{gold:420});
 assert.equal(storage.length,0);
});
test('concurrent click does not submit a second request',async()=>{
 let finish;const storage=memory();const a=make(storage,()=>new Promise(r=>finish=r));const pending=a.start('alice','hatch');
 assert.equal(a.state('alice').busy,true);
 await assert.rejects(async()=>a.start('alice','hatch'),/處理中/);
 finish({message:'ok'});await pending;assert.equal(storage.length,0);
});
test('definitive database rejection clears recovery; expired record cannot replay',async()=>{
 const storage=memory();let time=0;const a=make(storage,async()=>{throw new TransactionRejected('gold')},{now:()=>time});
 await assert.rejects(a.start('alice','buy'),TransactionRejected);assert.equal(storage.length,0);
 const b=make(storage,async()=>{throw new TransactionUncertain('lost')},{now:()=>time});await assert.rejects(b.start('alice','buy'));
 time=REPLAY_WINDOW_MS;await assert.rejects(b.recover('alice'),/安全重送期限/);b.discardExpired('alice');assert.equal(storage.length,0);
});
test('journal refuses to send a transaction if durable storage fails',async()=>{
 const storage=memory();storage.setItem=()=>{throw Error('quota')};let sent=false;
 const a=make(storage,async()=>{sent=true});await assert.rejects(async()=>a.start('alice','buy'),/未送出/);assert.equal(sent,false);
});
test('transport never sends to a different logged-in account',async()=>{
 const entry={uid:'alice',action:'buy',payload:{request_id:'a'}};let sent=false;
 await assert.rejects(sendBoundTransaction({entry,getSession:async()=>({data:{session:{user:{id:'bob'},access_token:'b'}}}),fetcher:async()=>{sent=true},url:'https://test.invalid',key:'public',resource:'game_action'}),TransactionUncertain);assert.equal(sent,false);
});
test('lost response retries identical request and captured bearer token',async()=>{
 const entry={uid:'alice',action:'buy',payload:{request_id:'same'}};const seen=[];
 const result=await sendBoundTransaction({entry,getSession:async()=>({data:{session:{user:{id:'alice'},access_token:'alice-token'}}}),url:'https://test.invalid',key:'public',resource:'game_action',fetcher:async(_,opts)=>{seen.push([opts.headers.Authorization,opts.body]);if(seen.length===1)throw Error('offline');return {ok:true,json:async()=>({gold:420})}}});
 assert.deepEqual(seen[0],seen[1]);assert.deepEqual(result,{gold:420});
});
test('gateway error is uncertain, but SQL business rejection is definitive',async()=>{
 const entry={uid:'alice',action:'buy',payload:{request_id:'same'}};
 const base={entry,getSession:async()=>({data:{session:{user:{id:'alice'},access_token:'token'}}}),url:'https://test.invalid',key:'public',resource:'game_action'};
 await assert.rejects(sendBoundTransaction({...base,fetcher:async()=>({ok:false,status:503,json:async()=>({code:'PGRST002'})})}),TransactionUncertain);
 await assert.rejects(sendBoundTransaction({...base,fetcher:async()=>({ok:false,status:400,json:async()=>({code:'P0001',message:'gold'})})}),TransactionRejected);
});
