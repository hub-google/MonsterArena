import React from 'react';
import {PlayButton,ActionFeedback,GameIcon} from '../PlayButton.jsx';
import {api} from '../../utils/api.js';

export default function TrainingDialog({setShowTrain,allocated,unspent,trainingFull,trainingBlocked,trainAction,monster,boostQty,ITEM_BY_ID,openCheckout,user,trainingStats,loading,trainMessage}){
  return (<div className="cockpit-overlay" role="dialog" aria-modal="true" aria-label="選擇訓練項目"><div className="cockpit-dialog">
       <div className="dialog-heading"><h2>機體訓練</h2><button aria-label="關閉訓練" onClick={()=>setShowTrain(false)}>×</button></div>
       <p className="text-sm">已分配 {allocated}/60 · <strong className="text-amber-300">可分配 {unspent} 點</strong></p>
       <p className="text-xs text-slate-400">每次訓練消耗 10 行動電力、10 能源。配點不額外消耗資源，單項上限 30。</p>
       <div className="grid grid-cols-2 gap-2">
         <PlayButton icon="train" label={trainingFull?'維持訓練':'開始訓練'} subtext={trainingFull?'完成每日任務':'獲得 1 點'} disabled={trainingBlocked} onClick={()=>trainAction(api.train,monster.monster_id,trainingFull?'practice':'pool',false)}/>
         <PlayButton icon="cpu" label="使用效能增幅器" tone="blue" subtext={allocated+unspent>=59?'剩餘點數不足':boostQty>0?'庫存 '+boostQty+' · 獲得 2 點':ITEM_BY_ID.vitamin.price+'G 購買並訓練 · +2 點'} disabled={trainingBlocked||allocated+unspent>=59} onClick={()=>boostQty>0?trainAction(api.train,monster.monster_id,'pool',true):openCheckout('vitamin','train')}/>
       </div>
       {(monster.is_sick||monster.fullness<20||monster.repair_until||user.stamina<10)&&<p className="text-xs text-amber-300">目前無法訓練，仍可分配已取得的點數。</p>}
       <h3 className="text-sm font-bold">分配屬性點數</h3>
       <div className="grid grid-cols-2 gap-2">{trainingStats.map(([k,n,icon])=><PlayButton key={k} icon={icon} label={n+' +1'} subtext={(monster['training_'+k]||0)+'/30'} disabled={loading||unspent<1||Number(monster['training_'+k]||0)>=30} onClick={()=>trainAction(api.allocateTraining,monster.monster_id,k)}/>)}</div>
       {trainMessage&&<ActionFeedback message={trainMessage}/>}
       </div></div>);
}
