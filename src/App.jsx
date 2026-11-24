import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import MobileLayout from './components/MobileLayout';
import Login from './pages/Login';
import PasswordReset from './pages/PasswordReset';
import TransactionRecoveryDialog from './components/TransactionRecoveryDialog';
import {useOnlineStatus} from './hooks/useOnlineStatus.js';
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Roster = lazy(() => import('./pages/Roster'));
const Arena = lazy(() => import('./pages/Arena'));
const Guild = lazy(() => import('./pages/Guild'));
const Raid = lazy(() => import('./pages/Raid'));
const Social = lazy(() => import('./pages/Social'));
const Pokedex = lazy(() => import('./pages/Pokedex'));
import { api } from './utils/api';
import { supabase, getRecoveryUid, recoveryLinkOpened } from './utils/supabaseClient';

export default function App() {
  const [user,setUser]=useState(null);
  const [passwordRecovery,setPasswordRecovery]=useState(()=>getRecoveryUid() || (recoveryLinkOpened ? 'pending' : null));
  const [monsters,setMonsters]=useState([]);
  const [inventory,setInventory]=useState([]);
  const [friends,setFriends]=useState([]);
  const [guilds,setGuilds]=useState([]);
  const [myGuild,setMyGuild]=useState(null);
  const [activeMonster,setActiveMonster]=useState(null);
  const [page,setPage]=useState('dashboard');
  const [loading,setLoading]=useState(true);
  const [loadError,setLoadError]=useState('');
  const [battleState,setBattleState]=useState(null);
  const [appearanceModes,setAppearanceModes]=useState({});
  const setAppearanceMode=(id,value)=>setAppearanceModes(old=>({...old,[id]:value}));
  const isOnline=useOnlineStatus();
  const authUidRef=useRef(null);
  const loadVersionRef=useRef({});
  const renderSession=loadVersionRef.current;
  const [transaction,setTransaction]=useState({busy:false,pending:null});
  const [recoveryError,setRecoveryError]=useState('');
  const [recoveryFlow,setRecoveryFlow]=useState(null);
  const [battleNavLocked,setBattleNavLocked]=useState(false);
  const [resourceErrors,setResourceErrors]=useState({});
  const scopedBattleState=useCallback(value=>{if(user?.user_id&&authUidRef.current===user.user_id&&loadVersionRef.current===renderSession)setBattleState(value);},[user?.user_id,renderSession]);
  const scopedBattleLock=useCallback(value=>{if(loadVersionRef.current===renderSession)setBattleNavLocked(value);},[renderSession]);
  const hasLoadedProfileRef=useRef(false);

  const clearUser=()=>{
    setUser(null);setMonsters([]);setInventory([]);setFriends([]);
    setGuilds([]);setMyGuild(null);setActiveMonster(null);
    setBattleState(null);setBattleNavLocked(false);setAppearanceModes({});setLoadError('');setResourceErrors({});setRecoveryError('');setRecoveryFlow(null);setPage('dashboard');
  };

  const loadUserData=async (resources=['profile','monsters','inventory','friends','guilds'])=>{
    const expectedUid=authUidRef.current;
    if(!expectedUid)return;
    const initial=!hasLoadedProfileRef.current;
    if(initial) resources=['profile','monsters','inventory','friends','guilds'];
    const versions=loadVersionRef.current;
    const isAccount=()=>authUidRef.current===expectedUid && loadVersionRef.current===versions;
    const tasks={
      profile:[()=>api.getMe(),profile=>{if(profile.user_id!==expectedUid)throw Error('登入帳號不符');setUser(profile);}],
      monsters:[()=>api.getMonsters(expectedUid),owned=>{
        setMonsters(owned);
        setActiveMonster(previous=>owned.find(m=>!m.is_dead && m.monster_id===previous?.monster_id)||owned.find(m=>!m.is_dead)||null);
      }],
      inventory:[()=>api.getInventory(expectedUid),setInventory],
      friends:[()=>api.getFriends(expectedUid),setFriends],
      guilds:[()=>api.getGuilds(expectedUid),info=>{setGuilds(info.guilds);setMyGuild(info.myGuild);}]
    };
    if(initial)setLoadError('');
    const run=async key=>{
      const version=(versions[key]||0)+1;
      versions[key]=version;
      const [read,apply]=tasks[key];
      try{
        const value=await read();
        if(isAccount()&&versions[key]===version){apply(value);setResourceErrors(old=>({...old,[key]:null}));}
      }catch(error){
        if(isAccount()&&versions[key]===version)setResourceErrors(old=>({...old,[key]:error.message||'資料讀取失敗'}));
        throw error;
      }
    };
    try{
      if(initial){
        await run('profile');
        if(!isAccount())return;
        await Promise.all(['monsters','inventory'].map(run));
        // Nonessential data must not delay the cockpit, even if requests hang.
        if(isAccount())void Promise.allSettled(['friends','guilds'].map(run));
      }else await Promise.all(resources.map(run));
      if(isAccount())hasLoadedProfileRef.current=true;
    }catch(err){
      if(isAccount()){
        console.error('Game data load failed:',err);
        if(initial)setLoadError(err.message||'資料載入失敗');
        else throw err;
      }
    }finally{if(isAccount())setLoading(false);}
  };

  const scopedRefresh=resources=>{
    if(loadVersionRef.current!==renderSession||authUidRef.current!==user?.user_id)throw Error('帳號已切換');
    return loadUserData(resources);
  };
  useEffect(()=>api.subscribeTransactions((uid,state)=>{if(authUidRef.current===uid)setTransaction(state);}),[]);
  useEffect(()=>{
    let ready=true;
    let previousAuthId=null;
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{
      if(!ready)return;
      const nextUid=session?.user?.id??null;
      const resetUid=_event==='PASSWORD_RECOVERY' ? nextUid : getRecoveryUid();
      if(resetUid && nextUid===resetUid){
        setPasswordRecovery(resetUid);
        setLoading(false);
        return;
      }
      if(recoveryLinkOpened && _event==='INITIAL_SESSION'){
        setPasswordRecovery('invalid');
        setLoading(false);
        return;
      }
      if(!nextUid){
        previousAuthId=null;
        authUidRef.current=null;
        api.setTransactionUser(null);setTransaction({busy:false,pending:null});
        loadVersionRef.current={};
        hasLoadedProfileRef.current=false;
        clearUser();
        setLoading(false);
        return;
      }
      if(previousAuthId===nextUid)return;
      previousAuthId=nextUid;
      authUidRef.current=nextUid;
      api.setTransactionUser(nextUid);setTransaction(api.transactionState(nextUid));
      loadVersionRef.current={};
      const sessionVersion=loadVersionRef.current;
      hasLoadedProfileRef.current=false;
      clearUser();
      setLoading(true);
      // Auth callbacks must not synchronously await Supabase database operations.
      setTimeout(()=>{if(ready && authUidRef.current===nextUid && loadVersionRef.current===sessionVersion)loadUserData();},0);
    });
    return ()=>{ready=false;loadVersionRef.current={};subscription.unsubscribe();};
  },[]);


  useEffect(()=>{
    if(!user)return;
    const id=setInterval(()=>{
      if(document.visibilityState==='visible')loadUserData(['profile','monsters']).catch(console.warn);
    },300000);
    return ()=>clearInterval(id);
  },[user?.user_id]);

  const nextRepair=monsters.reduce((earliest,m)=>m.repair_until&&!m.is_dead?Math.min(earliest,new Date(m.repair_until).getTime()):earliest,Infinity);
  useEffect(()=>{
    if(!user||!Number.isFinite(nextRepair))return;
    let timer, disposed=false, busy=false;
    const complete=async()=>{
      if(disposed||busy)return;
      busy=true;
      try{await loadUserData(['monsters']);}
      catch{if(!disposed)timer=setTimeout(complete,15000);}
      finally{busy=false;}
    };
    timer=setTimeout(complete,Math.max(0,nextRepair-Date.now())+500);
    const onVisible=()=>{if(document.visibilityState==='visible'&&Date.now()>=nextRepair){clearTimeout(timer);complete();}};
    document.addEventListener('visibilitychange',onVisible);
    return()=>{disposed=true;clearTimeout(timer);document.removeEventListener('visibilitychange',onVisible);};
  },[user?.user_id,nextRepair]);

  useEffect(()=>{
    if(!user || !hasLoadedProfileRef.current)return;
    if(page==='guild')loadUserData(['guilds']).catch(console.warn);
    if(page==='arena')loadUserData(['friends']).catch(console.warn);
  },[page,user?.user_id]);

  const handleLogout=async()=>{
    try {
      await api.logout();
      authUidRef.current=null;
      api.setTransactionUser(null);setTransaction({busy:false,pending:null});
      loadVersionRef.current={};
      hasLoadedProfileRef.current=false;
      clearUser();
      setLoading(false);
    } catch(err) {
      // Do not pretend logout succeeded while the Supabase session is still valid.
      setLoadError(`登出失敗：${err.message || '請重試'}`);
    }
  };

  const recoverTransaction=async()=>{
    const uid=authUidRef.current,session=loadVersionRef.current;
    const same=()=>authUidRef.current===uid&&loadVersionRef.current===session;
    setRecoveryError('');setRecoveryFlow({busy:true});
    let result;
    try{result=await api.recoverTransaction(uid);}
    catch(error){if(same()){setRecoveryFlow(null);setRecoveryError(error.message||'交易恢復失敗');if(!api.transactionState(uid).pending)setRecoveryFlow({message:'交易未成立：'+(error.message||'請重試')});}return;}
    if(!same())return;
    let warning='';
    try{await loadUserData(['profile','monsters','inventory']);}catch{warning='；資料更新失敗，請重新整理。';}
    if(same()){setRecoveryError('');setRecoveryFlow({message:'交易已恢復：'+(result.message||'操作成功')+warning});}
  };
  const discardExpired=async()=>{
    if(!window.confirm('交易已超過安全重送期限。請先核對戰績、金幣及庫存。確定清除本機紀錄？'))return;
    const uid=authUidRef.current;
    try{await loadUserData();api.discardExpiredTransaction(uid);setRecoveryError('');}catch(error){setRecoveryError(error.message);}
  };
  if(passwordRecovery)return <PasswordReset recoveryUid={passwordRecovery} onDone={()=>{
    // Reload without the recovery fragment so the regular login flow starts cleanly.
    window.location.replace(window.location.origin+window.location.pathname);
  }}/>;
  if(loading)return <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-cyan-400">
    <span className="text-4xl">🤖</span><span className="mt-4">載入遊戲數據中...</span>
  </div>;

  if(loadError)return <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-950 text-white p-6 text-center">
    <h2 className="text-xl font-bold">遊戲資料讀取失敗</h2>
    <p className="text-rose-400 max-w-md break-words">{loadError}</p>
    <button onClick={()=>loadUserData().catch(console.warn)} className="neon-button neon-button-primary px-6 py-3">重試載入</button>
    <button onClick={handleLogout} className="text-sm text-slate-400 underline">登出重新登入</button>
  </div>;

  if(!user)return <Login onLoginSuccess={()=>{ /* session loads through onAuthStateChange */ }} />;

  return <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950">
    <MobileLayout isConnected={isOnline} page={page} setPage={setPage} navigationLocked={battleNavLocked||transaction.busy||Boolean(transaction.pending)||Boolean(recoveryFlow)} onRefresh={()=>loadUserData().catch(console.warn)} onLogout={handleLogout}>
      {((page==='guild'&&resourceErrors.guilds)||(page==='arena'&&resourceErrors.friends))&&<div role="alert" className="text-amber-300 text-xs p-2">部分資料無法載入 <button onClick={()=>loadUserData([page==='guild'?'guilds':'friends']).catch(console.warn)} className="underline">重試</button></div>}
      <Suspense fallback={<div className="p-6 text-center text-cyan-400">載入功能中...</div>}>
      {page==='dashboard'&&<Dashboard user={user} monsters={monsters} inventory={inventory} refreshData={scopedRefresh}
        activeMonster={activeMonster} setActiveMonster={setActiveMonster} setPage={setPage} appearanceModes={appearanceModes} setAppearanceMode={setAppearanceMode}/>}
      {page==='roster'&&<Roster user={user} monsters={monsters} inventory={inventory} refreshData={scopedRefresh}
        activeMonster={activeMonster} setActiveMonster={setActiveMonster} setPage={setPage} appearanceModes={appearanceModes}/>}
      {page==='arena'&&<Arena user={user} monsters={monsters} friends={friends} activeMonster={activeMonster}
        battleState={battleState} appearanceModes={appearanceModes}
        setBattleState={scopedBattleState} setBattleNavLocked={scopedBattleLock} refreshData={scopedRefresh} setPage={setPage}/>}
      {page==='raid'&&<Raid user={user} monsters={monsters} activeMonster={activeMonster} appearanceModes={appearanceModes}
        refreshData={scopedRefresh} setPage={setPage}/>}
      {page==='guild'&&<Guild user={user} guilds={guilds} myGuild={myGuild}
        refreshData={scopedRefresh} setPage={setPage}/>}
      {page==='social'&&<Social user={user}/>}
      {page==='pokedex'&&<Pokedex setPage={setPage}/>}
      </Suspense>
    </MobileLayout>
    <TransactionRecoveryDialog recoveryFlow={recoveryFlow} transaction={transaction} recoveryError={recoveryError}
      transactionExpired={api.transactionExpired} onDismiss={()=>setRecoveryFlow(null)} onDiscard={discardExpired}
      onRecover={recoverTransaction} onLogout={handleLogout}/>
  </div>;
}
