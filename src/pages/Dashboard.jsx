import React, { useState, useEffect } from 'react';
import MonsterPixelArt from '../components/MonsterPixelArt';
import { api } from '../utils/api';
import { resourcesForAction, getHatchState, canCareForMonster, canHealMonster } from '../utils/gameRules';
import { STAGE_NAMES, FACTIONS, getMecha } from '../utils/monsterSprites';
import ShopModal from '../components/ShopModal';
import QuestModal from '../components/QuestModal';
import SkinWardrobe from '../components/SkinWardrobe';
import {canWearSkin,wornSkin} from '../utils/skins';
import {PlayButton,ActionFeedback,GameIcon} from '../components/PlayButton';


export default function Dashboard({ 
  user, 
  monsters, 
  inventory, 
  refreshData, 
  activeMonster, 
  setActiveMonster, 
  setPage, vehicleModes={}, setVehicleMode=()=>{} 
}) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showFeedMenu, setShowFeedMenu] = useState(false);
  const [showHealMenu, setShowHealMenu] = useState(false);
  const [actionEmote, setActionEmote] = useState(null);
  const [showShop, setShowShop] = useState(false);
  const [showQuests, setShowQuests] = useState(false);
  const [showWardrobe,setShowWardrobe]=useState(false);
  const [shopTab,setShopTab]=useState('items');
  const [showDetails,setShowDetails]=useState(false);

  const monster = activeMonster || monsters[0];
  const vehicle=Boolean(vehicleModes[monster?.monster_id]);
  const skin=wornSkin(monster);
  const hatchState = getHatchState(user, monsters);

  // Changing selected pet must close action menus from the previous pet.
  useEffect(() => {
    setShowFeedMenu(false);
    setShowHealMenu(false);
    setShowWardrobe(false);
    setShowDetails(false);
    setMessage('');
    setActionEmote(null);
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

  const equipSkin=async id=>{setLoading(true);setMessage('');try{await api.equipSkin(monster.monster_id,id);setVehicleMode(monster.monster_id,false);await refreshData(['monsters']);setShowWardrobe(false);}catch(err){setMessage('❌ '+err.message);setShowWardrobe(false);}finally{setLoading(false);}};
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
  const meter=(icon,label,value,color,low)=><div className="play-meter">
    <div className="meter-heading"><GameIcon name={icon}/><span>{label}</span><strong>{Math.round(value||0)}%</strong></div>
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.max(0,Math.min(100,Math.round(value||0)))} className="play-meter-track"><div className="play-meter-fill" style={{width:Math.max(0,Math.min(100,value||0))+'%',background:low?'#e9b05d':color}}/></div>
  </div>;
  const stats=[['heart','生命',monster.combat_hp],['battle','攻擊',monster.combat_atk],['guild','防禦',monster.combat_def],['speed','速度',monster.combat_spd]];
  const ready=monster.life_stage===5&&!monster.is_dead&&getItemQty('ultimate_core')>0&&monster.battles>=50&&monster.wins/monster.battles>=0.7;
  const factionColor=FACTIONS[mecha.faction-1]?.color||'#64c4d6';
  const closeItems=()=>{setShowFeedMenu(false);setShowHealMenu(false)};
  return <div className="play-home cockpit-home" data-testid="cockpit-home">
    <div className="cockpit-toolbar">
      <div className="cockpit-resources">
       <span aria-label={'金幣 '+user.gold}><GameIcon name="coin"/><strong>{user.gold}</strong></span>
       <span aria-label={'體力 '+user.stamina}><GameIcon name="bolt"/><strong>{user.stamina}</strong></span>
      </div>
      <div className="cockpit-tools">
       <PlayButton icon="shop" label="商城" onClick={()=>{setShopTab('items');setShowShop(true)}} className="play-small"/>
       <PlayButton icon="quest" label="任務" onClick={()=>setShowQuests(true)} className="play-small"/>
       <PlayButton icon="skin" label="皮膚衣櫃" caption="皮膚" disabled={!canWearSkin(monster)||loading} onClick={()=>setShowWardrobe(true)} className="play-small"/>
       <PlayButton icon="info" label="機體詳細資料" caption="詳情" selected={showDetails} onClick={()=>setShowDetails(v=>!v)} className="play-small"/>
      </div>
    </div>
    <section className="play-pet-screen cockpit-hero" style={{'--faction':factionColor}}>
      <div className="cockpit-identity">
        <button aria-label="上一隻機甲" title="上一隻機甲" className="play-arrow" disabled={monsters.length<2} onClick={()=>choosePet(-1)}>‹</button>
        <div className="min-w-0 text-center">
          <div className="cockpit-name"><h2 title={displayName} aria-label={displayName}>{displayName===speciesName?(mecha.type?mecha.roleName+'・'+mecha.stageName:mecha.stageName):displayName}</h2><button className="cockpit-edit" aria-label="改名" title="改名" disabled={loading} onClick={handleRename}><GameIcon name="edit"/></button></div>
          <div className="cockpit-species"><span>{mecha.factionName}{displayName!==speciesName?'・'+mecha.roleName:''}</span><span>G{monster.generation}{displayName!==speciesName?' '+STAGE_NAMES[monster.life_stage]:''}</span></div>
        </div>
        <button aria-label="下一隻機甲" title="下一隻機甲" className="play-arrow" disabled={monsters.length<2} onClick={()=>choosePet(1)}>›</button>
      </div>
      <div data-testid="mecha-screen" className="cockpit-art">
        <MonsterPixelArt family={monster.family} stage={monster.life_stage} type={monster.type}
          isDead={monster.is_dead} isSick={monster.is_sick} isPoop={monster.cleanliness<40}
          isHappy={actionEmote==='happy'} isHungry={monster.fullness<30} displaySize={220} fitVehicle vehicle={vehicle&&canTransform} skin={skin?.id}/>
      </div>
      <div className="cockpit-meta"><span data-testid="mecha-current-form">目前形態：{vehicle&&canTransform?mecha.vehicle:skin?.name||'機器人'}</span><span>{Math.max(index,0)+1}/{monsters.length}</span></div>
    </section>
    <div className="cockpit-console">
    <section className="cockpit-readouts">
      {monster.is_dead?<div role="status" aria-label="此怪獸已死亡，無法照顧或出戰" className="cockpit-dead"><GameIcon name="alert"/>核心失效，請切換其他機體</div>:<div className="cockpit-meters">{meter('feed','能源',monster.fullness,'#79cda6',monster.fullness<30)}{meter('clean','機體維護',monster.cleanliness,'#68c5dc',monster.cleanliness<40)}</div>}
      <div className="cockpit-stats" data-testid="combat-readouts">{stats.map(([icon,label,value])=><div key={label}><GameIcon name={icon}/><span>{label}</span><strong>{Math.round(value||0)}</strong></div>)}</div>
      <div className="cockpit-record"><span><GameIcon name="clock"/>養成 {Math.floor((monster.age_days||0)*10)/10} 天</span><span><GameIcon name="trophy"/>勝場 {monster.wins||0}/{monster.battles||0}</span>{monster.is_rescue&&<span>救援機體</span>}</div>
    </section>
    <div className="cockpit-actions" data-testid="care-actions">
      <PlayButton icon="feed" label="補充能源" tone="green" onClick={()=>{setShowHealMenu(false);setShowFeedMenu(v=>!v)}} disabled={loading||!care} selected={showFeedMenu} className={monster.fullness<30&&care?'play-needed':''}/>
      <PlayButton icon="clean" label="打掃" caption="清潔保養" tone="blue" onClick={()=>handleAction(api.clean,monster.monster_id)} disabled={loading||!care} className={monster.cleanliness<40&&care?'play-needed':''}/>
      <PlayButton icon="heal" label="治療" caption="修復治療" tone="red" onClick={()=>{setShowFeedMenu(false);setShowHealMenu(v=>!v)}} disabled={loading || !canHealMonster(monster)} className={monster.is_sick&&!monster.is_dead?'play-needed':''} selected={showHealMenu}/>
      <PlayButton icon="train" label="訓練" caption="機體訓練" tone="orange" onClick={()=>handleAction(api.train,monster.monster_id)} disabled={loading||!care}/>
      <PlayButton icon="battle" label="開始戰鬥" tone="blue" onClick={()=>setPage('arena')} disabled={loading||!canBattle} className="cockpit-primary"/>
      <PlayButton icon="transform" label={vehicle?(skin?'恢復偽裝':'切換機器人'):'變形：'+(mecha.vehicle||'載具')} caption={vehicle?(skin?'恢復偽裝':'切換機器人'):'機體變形'} tone="purple" onClick={()=>setVehicleMode(monster.monster_id,!vehicle)} disabled={!canTransform||loading} selected={vehicle}/>
    </div>
    <div className="cockpit-feedback-slot">{message?<ActionFeedback message={message}/>:<span>{loading?'處理中…':ready?'已達成終極進化條件':' '}</span>}{ready&&<button className="cockpit-link" onClick={()=>setShowDetails(true)}><GameIcon name="evolve"/>進化</button>}</div>
    </div>
    {showDetails&&<div className="cockpit-overlay" role="dialog" aria-modal="true" aria-label="機體詳細資料">
     <section className="cockpit-dialog" data-testid="mecha-details">
      <div className="dialog-heading"><h2>機體詳細資料</h2><button onClick={()=>setShowDetails(false)} aria-label="關閉詳細資料">×</button></div>
      <div className="text-sm">{mecha.factionName}・{mecha.roleName}</div><div className="text-sm text-slate-400">{speciesName}・G{monster.generation}・{Math.floor((monster.age_days||0)*10)/10} 天</div>
      {monster.is_rescue&&<div className="text-sm text-cyan-300">免費救援機體，放生不提供金幣。</div>}
      <div className="cockpit-stats">{stats.map(([icon,label,value])=><div key={label}><GameIcon name={icon}/><span>{label}</span><strong>{Math.round(value||0)}</strong></div>)}</div>
      <PlayButton icon="edit" label="改名" onClick={handleRename} className="play-compact w-full"/>
      {monster.life_stage===5&&<><PlayButton icon="evolve" label="究極進化（需核心、50戰及70%勝率）" caption="終極進化" tone="purple" onClick={()=>{setShowDetails(false);handleAction(api.evolve,monster.monster_id)}} disabled={loading || monster.is_dead || getItemQty('ultimate_core') === 0 || monster.battles < 50 || monster.wins/monster.battles<0.7} className="w-full"/><p className="text-xs text-slate-400">進化條件：核心、50 場戰鬥、70% 勝率</p></>}
     </section>
    </div>}
    {(showFeedMenu||showHealMenu)&&!monster.is_dead&&<div className="cockpit-overlay" role="dialog" aria-modal="true" aria-label={showFeedMenu?'選擇補給':'選擇修復道具'}>
     <section className="cockpit-dialog" data-testid="item-menu">
      <div className="dialog-heading"><h2>{showFeedMenu?'選擇補給':'選擇修復道具'}</h2><button onClick={closeItems} aria-label="取消返回">×</button></div>
      <div className="grid grid-cols-2 gap-2">{(showFeedMenu?foodChoices:healingChoices).map(([id,icon,label,count,tone])=><PlayButton key={id} icon={icon} label={label} caption={id==='heal_basic'?'急救草藥':label} subtext={id==='heal_basic'?'免費 · 生命 -20%':typeof count==='number'?'庫存 '+count:count} tone={tone} onClick={()=>doItem(showFeedMenu?api.feed:api.heal,id)} disabled={loading||count===0||(showFeedMenu?!care:!canHealMonster(monster))}/>)}</div>
      <PlayButton icon="shop" label="購買道具" onClick={()=>{closeItems();setShopTab('items');setShowShop(true)}} tone="blue" className="w-full play-compact"/>
     </section>
    </div>}
    {showWardrobe&&canWearSkin(monster)&&<SkinWardrobe monster={monster} inventory={inventory} loading={loading} onEquip={equipSkin} onClose={()=>setShowWardrobe(false)} onShop={()=>{setShowWardrobe(false);setShopTab('skins');setShowShop(true)}}/>}
    {showShop&&<ShopModal user={user} inventory={inventory} initialTab={shopTab} onClose={()=>setShowShop(false)} refreshData={refreshData}/>}
    {showQuests&&<QuestModal user={user} onClose={()=>setShowQuests(false)} refreshData={refreshData}/>}
  </div>;
}
