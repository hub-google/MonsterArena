import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import MobileLayout from './components/MobileLayout';
import Login from './pages/Login';
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Roster = lazy(() => import('./pages/Roster'));
const Arena = lazy(() => import('./pages/Arena'));
const Guild = lazy(() => import('./pages/Guild'));
const Raid = lazy(() => import('./pages/Raid'));
const Social = lazy(() => import('./pages/Social'));
const Pokedex = lazy(() => import('./pages/Pokedex'));
import { api } from './utils/api';
import { supabase } from './utils/supabaseClient';

export default function App() {
  const [user,setUser]=useState(null);
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
  const [isOnline,setIsOnline]=useState(typeof navigator==='undefined' || navigator.onLine);
  const authUidRef=useRef(null);
  const loadVersionRef=useRef({});
  const hasLoadedProfileRef=useRef(false);

  const clearUser=()=>{
    setUser(null);setMonsters([]);setInventory([]);setFriends([]);
    setGuilds([]);setMyGuild(null);setActiveMonster(null);
    setBattleState(null);setAppearanceModes({});setLoadError('');setPage('dashboard');
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
      const value=await read();
      if(isAccount() && versions[key]===version)apply(value);
    };
    try{
      if(initial){
        await run('profile');
        if(!isAccount())return;
        await Promise.all(resources.filter(key=>key!=='profile').map(run));
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

  useEffect(()=>{
    let ready=true;
    let previousAuthId=null;
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{
      if(!ready)return;
      const nextUid=session?.user?.id??null;
      if(!nextUid){
        previousAuthId=null;
        authUidRef.current=null;
        loadVersionRef.current={};
        hasLoadedProfileRef.current=false;
        clearUser();
        setLoading(false);
        return;
      }
      if(previousAuthId===nextUid)return;
      previousAuthId=nextUid;
      authUidRef.current=nextUid;
      loadVersionRef.current={};
      hasLoadedProfileRef.current=false;
      clearUser();
      setLoading(true);
      // Auth callbacks must not synchronously await Supabase database operations.
      setTimeout(()=>{if(ready && authUidRef.current===nextUid)loadUserData();},0);
    });
    return ()=>{ready=false;loadVersionRef.current={};subscription.unsubscribe();};
  },[]);

  useEffect(()=>{
    const online=()=>setIsOnline(navigator.onLine);
    window.addEventListener('online',online);window.addEventListener('offline',online);
    return ()=>{window.removeEventListener('online',online);window.removeEventListener('offline',online);};
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
      loadVersionRef.current={};
      hasLoadedProfileRef.current=false;
      clearUser();
      setLoading(false);
    } catch(err) {
      // Do not pretend logout succeeded while the Supabase session is still valid.
      setLoadError(`登出失敗：${err.message || '請重試'}`);
    }
  };

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
    <MobileLayout isConnected={isOnline} page={page} setPage={setPage} onRefresh={()=>loadUserData().catch(console.warn)} onLogout={handleLogout}>
      <Suspense fallback={<div className="p-6 text-center text-cyan-400">載入功能中...</div>}>
      {page==='dashboard'&&<Dashboard user={user} monsters={monsters} inventory={inventory} refreshData={loadUserData}
        activeMonster={activeMonster} setActiveMonster={setActiveMonster} setPage={setPage} appearanceModes={appearanceModes} setAppearanceMode={setAppearanceMode}/>}
      {page==='roster'&&<Roster user={user} monsters={monsters} inventory={inventory} refreshData={loadUserData}
        activeMonster={activeMonster} setActiveMonster={setActiveMonster} setPage={setPage} appearanceModes={appearanceModes}/>}
      {page==='arena'&&<Arena user={user} monsters={monsters} friends={friends} activeMonster={activeMonster}
        battleState={battleState} appearanceModes={appearanceModes}
        setBattleState={setBattleState} refreshData={loadUserData} setPage={setPage}/>}
      {page==='raid'&&<Raid user={user} monsters={monsters} activeMonster={activeMonster} appearanceModes={appearanceModes}
        refreshData={loadUserData} setPage={setPage}/>}
      {page==='guild'&&<Guild user={user} guilds={guilds} myGuild={myGuild}
        refreshData={loadUserData} setPage={setPage}/>}
      {page==='social'&&<Social user={user}/>}
      {page==='pokedex'&&<Pokedex setPage={setPage}/>}
      </Suspense>
    </MobileLayout>
  </div>;
}
