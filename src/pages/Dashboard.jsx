import DetailsDialog from '../components/care/DetailsDialog.jsx';
import TrainingDialog from '../components/care/TrainingDialog.jsx';
import CareItemDialog from '../components/care/CareItemDialog.jsx';
import CheckoutDialog from '../components/care/CheckoutDialog.jsx';
import {useRepairCountdown} from '../hooks/useRepairCountdown.js';
import {getItemQuantity} from '../utils/inventory.js';
import React, { useState, useEffect } from 'react';
import MonsterPixelArt from '../components/MonsterPixelArt';
import { api, GAME_RULES_V2 } from '../utils/api';
import { resourcesForAction, getHatchState, canCareForMonster, canHealMonster, refreshAfterCommit } from '../utils/gameRules';
import { FACTIONS, getMecha, displayMonsterName } from '../utils/monsterSprites';
import {ITEM_BY_ID as LEGACY_ITEMS,BALANCED_ITEM_BY_ID} from '../utils/mechaVocabulary';
import ShopModal from '../components/ShopModal';
import QuestModal from '../components/QuestModal';
import SkinWardrobe from '../components/SkinWardrobe';
import {canWearSkin,wornSkin,appearance,appearanceMode,nextAppearanceMode} from '../utils/skins';
import {PlayButton,ActionFeedback,GameIcon} from '../components/PlayButton';


const ITEM_BY_ID=GAME_RULES_V2?BALANCED_ITEM_BY_ID:LEGACY_ITEMS;
export default function Dashboard({ 
  user, 
  monsters, 
  inventory, 
  refreshData, 
  activeMonster, 
  setActiveMonster, 
  setPage, appearanceModes={}, setAppearanceMode=()=>{} 
}) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showFeedMenu, setShowFeedMenu] = useState(false);
  const [showHealMenu, setShowHealMenu] = useState(false);
  const [actionEmote, setActionEmote] = useState(null);
  const [showShop, setShowShop] = useState(false);
  const [checkout,setCheckout]=useState(null);
  const [checkoutMessage,setCheckoutMessage]=useState('');
  const [showQuests, setShowQuests] = useState(false);
  const [showWardrobe,setShowWardrobe]=useState(false);
  const [wardrobeError,setWardrobeError]=useState('');
  const [shopTab,setShopTab]=useState('items');
  const [showDetails,setShowDetails]=useState(false);
  const [showTrain,setShowTrain]=useState(false);
  const [trainMessage,setTrainMessage]=useState('');

  const monster = activeMonster || monsters[0];
  const repairSeconds=useRepairCountdown(monster?.repair_until);
  const preferredMode=appearanceModes[monster?.monster_id];
  const look=appearance(monster,preferredMode);
  const currentMode=appearanceMode(monster,preferredMode);
  const nextMode=nextAppearanceMode(monster,preferredMode);
  const skin=wornSkin(monster);
  const hatchState = getHatchState(user, monsters);

  // Changing selected pet must close action menus from the previous pet.
  useEffect(() => {
    setShowFeedMenu(false);
    setShowHealMenu(false);
    setShowWardrobe(false);
    setWardrobeError('');
    setShowDetails(false);setShowTrain(false);setTrainMessage('');
    setMessage('');
    setActionEmote(null);setCheckout(null);setCheckoutMessage('');
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

      const warning=await refreshAfterCommit(refreshData,resourcesForAction(api,actionFn));
      if(warning)setMessage(warning);
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
      const warning=await refreshAfterCommit(refreshData,['profile','monsters']);
      if(warning)setMessage(warning);
    } catch (err) {
      setMessage(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (monsters.length===0) return <div className="play-home flex flex-col items-center gap-4 py-4">
    <div className="flex justify-center gap-5 font-bold text-amber-300"><span aria-label={'金幣 '+user.gold}>🪙 {user.gold}</span><span aria-label={'行動電力 '+user.stamina}>⚡ {user.stamina}</span></div>
    <div className="play-pet-screen w-full"><div className="text-[110px] text-center" aria-hidden="true">🔋</div></div>
    <PlayButton icon="hatch" label={hatchState.label} short={hatchState.isRescue?'免費':'100'} onClick={handleHatch} disabled={loading||!hatchState.available} tone="green" className="w-full"/>
    <ActionFeedback message={message}/>
  </div>;

  if (!monster) return null;

  const getItemQty = itemId => getItemQuantity(inventory,itemId);

  // The database has a "name" column, but no "custom_name" column.
  // Preserve names chosen by players instead of replacing them with a species name.
  const mecha = getMecha(monster.family, monster.life_stage, monster.type);
  const speciesName = mecha.modelName;
  const displayName = displayMonsterName(monster);

  const handleRename = async () => {
    const newName = prompt('請輸入新的機體名稱（最多30字）：', displayName);
    if (newName !== null && newName.trim() !== '') {
      setLoading(true);
      setMessage('');
      try {
        const data = await api.rename(monster.monster_id, newName.trim());
        setMessage(data.message || '改名成功！');
        const warning=await refreshAfterCommit(refreshData,['monsters']);
        if(warning)setMessage(warning);
      } catch (err) {
        setMessage(`❌ ${err.message}`);
      } finally {
        setLoading(false);
      }
    }
  };

  const equipSkin=async id=>{if(loading)return;setLoading(true);setWardrobeError('');try{await api.equipSkin(monster.monster_id,id);setAppearanceMode(monster.monster_id,id?'skin':'robot');const warning=await refreshAfterCommit(refreshData,['monsters']);setShowWardrobe(false);if(warning)setMessage(warning);}catch(err){setWardrobeError(err.message||'造型更新失敗');}finally{setLoading(false);}};
  const care=canCareForMonster(monster);
  const formLabel=nextMode==='skin'?'恢復偽裝':nextMode==='robot'?'切換機器人':'變形：'+(mecha.vehicle||'載具');
  const formCaption=nextMode==='skin'?'恢復偽裝':nextMode==='robot'?'切換機器人':'機體變形';
  const index=monsters.findIndex(m=>m.monster_id===monster.monster_id);
  const choosePet=delta=>setActiveMonster(monsters[(Math.max(index,0)+delta+monsters.length)%monsters.length]);
  const choice=id=>{const i=ITEM_BY_ID[id];return [id,i.icon,i.name,getItemQty(id),i.tone];};
  const foodChoices=[['feed_basic','feed','免費基礎充能','免費','green'],...['meat_basic','meat_premium','energy_drink'].map(choice)];
  const healingChoices=[choice('medicine_standard'),['heal_basic','tools','緊急修復','免費','orange']];
  const openCheckout=(id,use=showFeedMenu?'feed':showHealMenu?'heal':null)=>{setMessage('');setCheckoutMessage('');setCheckout({...ITEM_BY_ID[id],use});};
  const buyMissing=async()=>{
    if(loading||!checkout||Number(user.gold)<checkout.price)return;
    setLoading(true);setCheckoutMessage('');
    const use=checkout.use;
    const action=use==='feed'?api.feed:api.heal;
    let bought=false;
    try{
      if(use==='train'){const result=await api.train(monster.monster_id,'pool',true,true);setTrainMessage(result.message||'增幅訓練完成，可分配點數 +2');}
      else if(use&&GAME_RULES_V2) await action(monster.monster_id,checkout.id,true);
      else {
        await api.buyItem(checkout.id,1);bought=true;
        if(use)await action(monster.monster_id,checkout.id);
      }
      setCheckout(null);
      if(use==='train'){setActionEmote('happy');setTimeout(()=>setActionEmote(null),3000);}
      else if(use){setShowFeedMenu(false);setShowHealMenu(false);setMessage('購買並使用成功！');setActionEmote('happy');setTimeout(()=>setActionEmote(null),3000);}
      else setMessage('購買成功，可使用道具');
      const warning=await refreshAfterCommit(refreshData,use?['profile','monsters','inventory']:['profile','inventory']);
      if(warning){if(use==='train')setTrainMessage(warning);else setMessage(warning);}
    }catch(err){
      if(bought){setCheckout(null);setShowFeedMenu(false);setShowHealMenu(false);setMessage('已購買，但使用未確認：'+(err.message||'請重新整理庫存'));await refreshAfterCommit(refreshData,['profile','monsters','inventory']);}
      else setCheckoutMessage(err.message||'購買失敗');
    }finally{setLoading(false);}
  };
  const doItem=(action,id)=>{
    if(id==='heal_basic'&&monster.repair_until)return;
    setShowFeedMenu(false);setShowHealMenu(false);handleAction(action,monster.monster_id,id);
  };
  const meter=(icon,label,value,color,low)=><div className="play-meter">
    <div className="meter-heading"><GameIcon name={icon}/><span>{label}</span><strong>{Math.round(value||0)}%</strong></div>
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.max(0,Math.min(100,Math.round(value||0)))} className="play-meter-track"><div className="play-meter-fill" style={{width:Math.max(0,Math.min(100,value||0))+'%',background:low?'#e9b05d':color}}/></div>
  </div>;
  const unspent=Number(monster.training_unspent||0);
  const trainingStats=[['hp','耐久','guild'],['atk','攻擊','battle'],['def','防禦','guild'],['spd','速度','speed']];
  const allocated=trainingStats.reduce((sum,[k])=>sum+Number(monster['training_'+k]||0),0);
  const trainingFull=allocated+unspent>=60;
  const trainingBlocked=loading||user.stamina<10||monster.is_sick||monster.fullness<20||Boolean(monster.repair_until);
  const boostQty=getItemQty('vitamin');
  const trainAction=async(fn,...args)=>{
    if(loading)return;setLoading(true);setTrainMessage('');
    try{const result=await fn(...args);setTrainMessage(result.message||'操作成功');const warning=await refreshAfterCommit(refreshData,resourcesForAction(api,fn));if(warning)setTrainMessage(warning);}
    catch(err){setTrainMessage(err.message||'操作失敗');}finally{setLoading(false);}
  };
  const stats=[['guild','耐久',monster.combat_hp],['battle','攻擊',monster.combat_atk],['guild','防禦',monster.combat_def],['speed','速度',monster.combat_spd]];
  const ready=monster.life_stage===5&&!monster.is_dead&&!monster.repair_until&&getItemQty('ultimate_core')>0&&monster.battles>=50&&monster.wins/monster.battles>=0.7;
  const factionColor=FACTIONS[mecha.faction-1]?.color||'#64c4d6';
  const closeItems=()=>{setShowFeedMenu(false);setShowHealMenu(false)};
  return <div className="play-home cockpit-home" data-testid="cockpit-home">
    <div className="cockpit-toolbar">
      <div className="cockpit-resources">
       <span aria-label={'金幣 '+user.gold}><GameIcon name="coin"/><strong>{user.gold}</strong></span>
       <span aria-label={'行動電力 '+user.stamina}><GameIcon name="bolt"/><strong>{user.stamina}</strong></span>
      </div>
      <div className="cockpit-tools">
       <PlayButton icon="shop" label="商城" onClick={()=>{setShopTab('items');setShowShop(true)}} className="play-small"/>
       <PlayButton icon="quest" label="任務" onClick={()=>setShowQuests(true)} className="play-small"/>
       <PlayButton icon="skin" label="皮膚衣櫃" caption="皮膚" disabled={!canWearSkin(monster)||loading} onClick={()=>{setWardrobeError('');setShowWardrobe(true)}} className="play-small"/>
       <PlayButton icon="info" label="機體詳細資料" caption="詳情" selected={showDetails} onClick={()=>setShowDetails(v=>!v)} className="play-small"/>
      </div>
    </div>
    <section className="play-pet-screen cockpit-hero" style={{'--faction':factionColor}}>
      <div className="cockpit-identity">
        <button aria-label="上一隻機甲" title="上一隻機甲" className="play-arrow" disabled={monsters.length<2} onClick={()=>choosePet(-1)}>‹</button>
        <div className="min-w-0 text-center">
          <div className="cockpit-name"><h2 title={displayName} aria-label={displayName}>{displayName}</h2><button className="cockpit-edit" aria-label="改名" title="改名" disabled={loading} onClick={handleRename}><GameIcon name="edit"/></button></div>
          <div className="cockpit-species">{displayName!==speciesName&&<span className="cockpit-model">{speciesName}</span>}<span className="cockpit-faction">{mecha.factionName}</span><span>{mecha.roleName}・{mecha.stageName}・G{monster.generation}</span></div>
        </div>
        <button aria-label="下一隻機甲" title="下一隻機甲" className="play-arrow" disabled={monsters.length<2} onClick={()=>choosePet(1)}>›</button>
      </div>
      <div data-testid="mecha-screen" className="cockpit-art">
        <MonsterPixelArt family={monster.family} stage={monster.life_stage} type={monster.type}
          isDead={monster.is_dead} isSick={monster.is_sick} isPoop={monster.cleanliness<40}
          isHappy={actionEmote==='happy'} isHungry={monster.fullness<30} displaySize={220} fitVehicle {...look}/>
      </div>
      <div className="cockpit-meta"><span data-testid="mecha-current-form">目前形態：{monster.is_dead?'核心失效':Number(monster.life_stage)===1?'機械核心':currentMode==='vehicle'?mecha.vehicle:currentMode==='skin'?skin?.name:'機器人'}</span><span>{Math.max(index,0)+1}/{monsters.length}</span></div>
    </section>
    <div className="cockpit-console">
    <section className="cockpit-readouts">
      {monster.is_dead?<div role="status" aria-label="此機體核心已失效，無法維護或出戰" className="cockpit-dead"><GameIcon name="alert"/>核心失效，請切換其他機體</div>:<div className="cockpit-meters">{meter('feed','能源',monster.fullness,'#79cda6',monster.fullness<30)}{meter('clean','機體維護',monster.cleanliness,'#68c5dc',monster.cleanliness<40)}</div>}
      <div className="cockpit-stats" data-testid="combat-readouts">{stats.map(([icon,label,value])=><div key={label}><GameIcon name={icon}/><span>{label}</span><strong>{Math.round(value||0)}</strong></div>)}</div>
      <div className="cockpit-record"><span><GameIcon name="clock"/>養成 {Math.floor((monster.age_days||0)*10)/10} 天</span><span><GameIcon name="trophy"/>勝場 {monster.wins||0}/{monster.battles||0}</span>{monster.is_rescue&&<span>救援機體</span>}</div>
    </section>
    <div className="cockpit-actions" data-testid="care-actions">
      <PlayButton icon="feed" label="補充能源" tone="green" onClick={()=>{setShowHealMenu(false);setShowFeedMenu(v=>!v)}} disabled={loading||!care} selected={showFeedMenu} className={monster.fullness<30&&care?'play-needed':''}/>
      <PlayButton icon="clean" label="保養" caption="機體保養" tone="blue" onClick={()=>handleAction(api.clean,monster.monster_id)} disabled={loading||!care} className={monster.cleanliness<40&&care?'play-needed':''}/>
      <PlayButton icon="heal" label="修復" caption={monster.repair_until?'修復進行中':'系統修復'} tone="red" onClick={()=>{setShowFeedMenu(false);setShowHealMenu(v=>!v)}} disabled={loading || !canHealMonster(monster)} className={monster.is_sick&&!monster.is_dead?'play-needed':''} selected={showHealMenu}/>
      <PlayButton icon="train" label="訓練" caption="機體訓練" subtext={GAME_RULES_V2&&unspent>0?'可分配 '+unspent+' 點':undefined} tone="orange" onClick={()=>GAME_RULES_V2?(setTrainMessage(''),setShowTrain(true),setShowFeedMenu(false),setShowHealMenu(false)):handleAction(api.train,monster.monster_id)} disabled={loading||!care||(!GAME_RULES_V2&&Boolean(monster.repair_until))}/>
      <PlayButton icon="transform" label={formLabel} caption={formCaption} tone="purple" onClick={()=>setAppearanceMode(monster.monster_id,nextMode)} disabled={!nextMode||loading} selected={currentMode==='vehicle'}/>
    </div>
    <div className="cockpit-feedback-slot">{monster.repair_until?<span role="status">緊急修復中 · 剩餘 {Math.floor(repairSeconds/60)}:{String(repairSeconds%60).padStart(2,'0')} · 耐久不變</span>:message?<ActionFeedback message={message}/>:<span>{loading?'處理中…':ready?'已達成終極升級條件，請開啟詳情':' '}</span>}</div>
    </div>
    {showDetails&&!checkout&&<DetailsDialog {...{mecha,speciesName,monster,stats,setShowDetails,getItemQty,openCheckout,handleAction,loading}}/>}
    {showTrain&&GAME_RULES_V2&&!checkout&&<TrainingDialog {...{setShowTrain,allocated,unspent,trainingFull,trainingBlocked,trainAction,monster,boostQty,ITEM_BY_ID,openCheckout,user,trainingStats,loading,trainMessage}}/>}
    {(showFeedMenu||showHealMenu)&&!checkout&&!monster.is_dead&&<CareItemDialog {...{showFeedMenu,showHealMenu,closeItems,foodChoices,healingChoices,monster,ITEM_BY_ID,openCheckout,doItem,loading,care,message}}/>}
    {checkout&&<CheckoutDialog {...{checkout,setCheckout,loading,user,checkoutMessage,buyMissing}}/>}
    {showWardrobe&&canWearSkin(monster)&&<SkinWardrobe monster={monster} inventory={inventory} loading={loading} error={wardrobeError} onEquip={equipSkin} onClose={()=>setShowWardrobe(false)}/>}
    {showShop&&<ShopModal user={user} inventory={inventory} initialTab={shopTab} onClose={()=>setShowShop(false)} refreshData={refreshData}/>}
    {showQuests&&<QuestModal user={user} onClose={()=>setShowQuests(false)} refreshData={refreshData}/>}
  </div>;
}
