import React, { useState, useEffect } from 'react';
import MonsterPixelArt from '../components/MonsterPixelArt';
import { api } from '../utils/api';
import { resourcesForAction, getHatchState, canCareForMonster, canHealMonster } from '../utils/gameRules';
import { STAGE_NAMES, getMecha } from '../utils/monsterSprites';
import ShopModal from '../components/ShopModal';
import QuestModal from '../components/QuestModal';
import {PlayButton,ActionFeedback} from '../components/PlayButton';


export default function Dashboard({ 
  user, 
  monsters, 
  inventory, 
  refreshData, 
  activeMonster, 
  setActiveMonster, 
  setPage 
}) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showFeedMenu, setShowFeedMenu] = useState(false);
  const [showHealMenu, setShowHealMenu] = useState(false);
  const [actionEmote, setActionEmote] = useState(null);
  const [showShop, setShowShop] = useState(false);
  const [showQuests, setShowQuests] = useState(false);
  const [vehicle, setVehicle] = useState(false);
  const [showDetails,setShowDetails]=useState(false);

  const monster = activeMonster || monsters[0];
  const hatchState = getHatchState(user, monsters);

  // Changing selected pet must close action menus from the previous pet.
  useEffect(() => {
    setShowFeedMenu(false);
    setShowHealMenu(false);
    setVehicle(false);
    setShowDetails(false);
  }, [monster?.monster_id]);

  const handleAction = async (actionFn, ...args) => {
    setLoading(true);
    setMessage('');
    try {
      const data = await actionFn(...args);
      setMessage(data.message || '操作成功！');
      
      // Trigger Happy Emote on successful train/feed
      if ([api.train,api.feed,api.clean,api.heal,api.evolve].includes(actionFn)) {
        setActionEmote('happy');
        setTimeout(() => setActionEmote(null), 3000);
      }

      await refreshData(resourcesForAction(api,actionFn));
    } catch (err) {
      setMessage(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleHatch = async () => {
    setLoading(true);
    setMessage('');
    try {
      const data = await api.hatchEgg();
      setMessage(data.message);
      await refreshData(['profile','monsters']);
    } catch (err) {
      setMessage(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (monsters.length===0) return <div className="play-home flex flex-col items-center gap-4 py-4">
    <div className="flex justify-center gap-5 font-bold text-amber-300"><span aria-label={'金幣 '+user.gold}>🪙 {user.gold}</span><span aria-label={'體力 '+user.stamina}>⚡ {user.stamina}</span></div>
    <div className="play-pet-screen w-full"><div className="text-[110px] text-center" aria-hidden="true">🥚</div></div>
    <PlayButton icon="hatch" label={hatchState.label} short={hatchState.isRescue?'免費':'100'} onClick={handleHatch} disabled={loading||!hatchState.available} tone="green" className="w-full"/>
    <ActionFeedback message={message}/>
  </div>;

  if (!monster) return null;

  const getItemQty = (itemId) => {
    const item = inventory.find(i => i.item_id === itemId);
    return item ? item.quantity : 0;
  };

  // The database has a "name" column, but no "custom_name" column.
  // Preserve names chosen by players instead of replacing them with a species name.
  const mecha = getMecha(monster.family, monster.life_stage, monster.type);
  const isDefaultEggName = ['數位蛋','新生基因蛋','機械核心'].includes(monster.name);
  const speciesName = mecha.name;
  const displayName = isDefaultEggName ? speciesName : monster.name;

  const handleRename = async () => {
    const newName = prompt('請輸入新的怪獸名稱（最多30字）：', displayName);
    if (newName !== null && newName.trim() !== '') {
      setLoading(true);
      setMessage('');
      try {
        const data = await api.rename(monster.monster_id, newName.trim());
        setMessage(data.message || '改名成功！');
        await refreshData(['monsters']);
      } catch (err) {
        setMessage(`❌ ${err.message}`);
      } finally {
        setLoading(false);
      }
    }
  };

  const canBattle=!monster.is_dead&&Number(monster.life_stage)>=2&&!monster.is_frozen;
  const care=canCareForMonster(monster);
  const canTransform=!monster.is_dead&&monster.life_stage>=4;
  const index=monsters.findIndex(m=>m.monster_id===monster.monster_id);
  const choosePet=delta=>setActiveMonster(monsters[(Math.max(index,0)+delta+monsters.length)%monsters.length]);
  const foodChoices=[
    ['feed_basic','🔋','免費基礎飼料','免費','green'],
    ['meat_basic','🍖','基本肉',getItemQty('meat_basic'),'orange'],
    ['meat_premium','🥩','頂級肉',getItemQty('meat_premium'),'orange'],
    ['energy_drink','🥤','能量飲',getItemQty('energy_drink'),'blue']
  ];
  const healingChoices=[
    ['medicine_standard','💊','基礎特效藥',getItemQty('medicine_standard'),'green'],
    ['heal_basic','🌿','免費急救草藥，扣減20%生命','免費','orange']
  ];
  const doItem=(action,id)=>{
    if(id==='heal_basic'&&!window.confirm('免費急救草藥會扣減20%生命，確定使用？'))return;
    setShowFeedMenu(false);setShowHealMenu(false);handleAction(action,monster.monster_id,id);
  };
  const meter=(icon,label,value,color,low)=> <div className="play-meter" aria-label={label+' '+Math.round(value)+'%'}>
    <span className="text-2xl" aria-hidden="true">{icon}</span>
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.max(0,Math.min(100,Math.round(value||0)))} className="play-meter-track"><div className="play-meter-fill" style={{width:Math.max(0,Math.min(100,value||0))+'%',background:low?'#f59e0b':color}}/></div>
    <span className="sr-only">{Math.round(value)}%</span>
  </div>;
  return <div className="play-home flex flex-col gap-3 animate-fade-in pb-3">
    <div className="flex items-center justify-between gap-2">
      <div className="flex gap-3 text-sm font-bold tabular-nums">
       <span className="text-amber-300" aria-label={'金幣 '+user.gold}>🪙 {user.gold}</span>
       <span className="text-emerald-300" aria-label={'體力 '+user.stamina}>⚡ {user.stamina}</span>
      </div>
      <div className="flex gap-2">
       <PlayButton icon="shop" label="商城" tone="orange" onClick={()=>setShowShop(true)} className="play-small"/>
       <PlayButton icon="quest" label="任務" tone="purple" onClick={()=>setShowQuests(true)} className="play-small"/>
       <PlayButton icon="info" label="機體詳細資料" selected={showDetails} onClick={()=>setShowDetails(v=>!v)} className="play-small"/>
      </div>
    </div>
    <section className="play-pet-screen">
      <div className="flex items-center gap-2 justify-between">
        <button aria-label="上一隻機甲" title="上一隻機甲" className="play-arrow" disabled={monsters.length<2} onClick={()=>choosePet(-1)}>‹</button>
        <div className="min-w-0 text-center">
          <h2 className="truncate font-bold text-white text-base">{displayName}</h2>
          <div className="flex justify-center gap-1 mt-1" aria-label={STAGE_NAMES[monster.life_stage]}>{Array.from({length:6},(_,i)=><span key={i} className={'h-1.5 w-3 rounded-full '+(i<monster.life_stage?'bg-cyan-300':'bg-slate-700')}/>)}</div>
        </div>
        <button aria-label="下一隻機甲" title="下一隻機甲" className="play-arrow" disabled={monsters.length<2} onClick={()=>choosePet(1)}>›</button>
      </div>
      <div data-testid="mecha-screen" className="w-full max-w-[280px] mx-auto px-2">
        <MonsterPixelArt family={monster.family} stage={monster.life_stage} type={monster.type}
          isDead={monster.is_dead} isSick={monster.is_sick} isPoop={monster.cleanliness<40}
          isHappy={actionEmote==='happy'} isHungry={monster.fullness<30} displaySize={220} vehicle={vehicle&&canTransform}/>
      </div>
      <span data-testid="mecha-current-form" className="sr-only">目前形態：{vehicle&&canTransform?mecha.vehicle:'機器人'}</span>
      {monster.is_dead?<div role="status" aria-label="此怪獸已死亡，無法照顧或出戰" className="text-center text-3xl" title="此怪獸已死亡，無法照顧或出戰">💀</div>:
      <div className="grid grid-cols-2 gap-3 px-1">{meter('🔋','能源',monster.fullness,'#34d399',monster.fullness<30)}{meter('🧼','機體維護',monster.cleanliness,'#38bdf8',monster.cleanliness<40)}</div>}
    </section>
    {showDetails&&<section className="glass-card p-3 text-sm space-y-2" data-testid="mecha-details">
     <div className="flex items-center justify-between"><span>{mecha.factionName}・{mecha.roleName}</span><PlayButton icon="✏️" label="改名" onClick={handleRename} className="play-small"/></div>
     <div className="text-xs text-slate-400">{speciesName}・G{monster.generation}・{Math.floor(monster.age_days*10)/10} 天</div>
     {monster.is_rescue&&<div className="text-xs text-cyan-300">免費救援機體，放生不提供金幣。</div>}
     <div className="grid grid-cols-4 gap-1 text-center">{[['❤️','生命',monster.combat_hp],['⚔️','攻擊',monster.combat_atk],['🛡️','防禦',monster.combat_def],['⚡','速度',monster.combat_spd]].map(([icon,label,value])=><div key={label} aria-label={label+' '+Math.round(value)}>{icon}<div className="font-bold">{Math.round(value)}</div></div>)}</div>
     <div className="text-xs text-slate-400">🏆 {monster.wins||0}/{monster.battles||0}</div>
     {monster.life_stage===5&&<PlayButton icon="⬆️" label="究極進化（需核心、50戰及70%勝率）" short="進化" tone="purple" onClick={()=>handleAction(api.evolve,monster.monster_id)} disabled={loading || monster.is_dead || getItemQty('ultimate_core') === 0 || monster.battles < 50 || monster.wins/monster.battles<0.7} className="w-full"/>}
    </section>}
    <div className="grid grid-cols-3 gap-2" data-testid="care-actions">
      <PlayButton icon="feed" label="補充能源" short="餵" tone="green" onClick={()=>{setShowHealMenu(false);setShowFeedMenu(v=>!v)}} disabled={loading||!care} selected={showFeedMenu} className={monster.fullness<30&&care?'play-needed':''}/>
      <PlayButton icon="clean" label="打掃" short="洗" tone="blue" onClick={()=>handleAction(api.clean,monster.monster_id)} disabled={loading||!care} className={monster.cleanliness<40&&care?'play-needed':''}/>
      <PlayButton icon="heal" label="治療" short="醫" tone="red" onClick={()=>{setShowFeedMenu(false);setShowHealMenu(v=>!v)}} disabled={loading || !canHealMonster(monster)} selected={showHealMenu} className={monster.is_sick&&!monster.is_dead?'play-needed':''}/>
      <PlayButton icon="train" label="訓練" short="練" tone="orange" onClick={()=>handleAction(api.train,monster.monster_id)} disabled={loading||!care}/>
      <PlayButton icon="battle" label="開始戰鬥" short="打" tone="red" onClick={()=>setPage('arena')} disabled={loading||!canBattle}/>
      <PlayButton icon={vehicle?'🤖':'🚙'} label={vehicle?'切換機器人':'變形：'+(mecha.vehicle||'載具')} short="變" tone="purple" onClick={()=>setVehicle(v=>!v)} disabled={!canTransform||loading} selected={vehicle}/>
    </div>
    {(showFeedMenu||showHealMenu)&&!monster.is_dead&&<section className="glass-card p-3 grid grid-cols-2 gap-2" data-testid="item-menu">
     {(showFeedMenu?foodChoices:healingChoices).map(([id,icon,label,count,tone])=><PlayButton key={id} icon={icon} label={label} short={typeof count==='number'?'×'+count:count} tone={tone} onClick={()=>doItem(showFeedMenu?api.feed:api.heal,id)} disabled={loading||count===0||(showFeedMenu?!care:!canHealMonster(monster))}/>)}
     <PlayButton icon="shop" label="購買道具" short="買" onClick={()=>setShowShop(true)} tone="orange"/>
     <PlayButton icon="back" label="取消返回" short="返回" onClick={()=>{setShowFeedMenu(false);setShowHealMenu(false)}}/>
    </section>}
    {monster.life_stage===5&&!showDetails&&monster.battles>=50&&monster.wins/monster.battles>=0.7&&getItemQty('ultimate_core')>0&&!monster.is_dead&&<PlayButton icon="⬆️" label="查看進化" short="進化" tone="purple" onClick={()=>setShowDetails(true)}/>}
    <ActionFeedback message={message}/>
    {showShop&&<ShopModal user={user} onClose={()=>setShowShop(false)} refreshData={refreshData}/>}
    {showQuests&&<QuestModal user={user} onClose={()=>setShowQuests(false)} refreshData={refreshData}/>}
  </div>;
}
