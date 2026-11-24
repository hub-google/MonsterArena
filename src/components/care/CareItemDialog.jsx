import React from 'react';
import {PlayButton,ActionFeedback,GameIcon} from '../PlayButton.jsx';
import {api} from '../../utils/api.js';
import {canHealMonster} from '../../utils/gameRules.js';

export default function CareItemDialog({showFeedMenu,showHealMenu,closeItems,foodChoices,healingChoices,monster,ITEM_BY_ID,openCheckout,doItem,loading,care,message}){
  return (<div className="cockpit-overlay" role="dialog" aria-modal="true" aria-label={showFeedMenu?'選擇補給':'選擇修復道具'}>
     <section className="cockpit-dialog" data-testid="item-menu">
      <div className="dialog-heading"><h2>{showFeedMenu?'選擇補給':'選擇修復道具'}</h2><button onClick={closeItems} aria-label="取消返回">×</button></div>
      <div className="grid grid-cols-2 gap-2">{(showFeedMenu?foodChoices:healingChoices).map(([id,icon,label,count,tone])=><PlayButton key={id} icon={icon} label={label} caption={id==='heal_basic'?'緊急修復':label} subtext={id==='heal_basic'?monster.repair_until?'修復進行中':'免費 · 30 分鐘':count===0?'庫存 0 · '+ITEM_BY_ID[id].price+'G 購買':typeof count==='number'?'庫存 '+count:count} tone={tone} onClick={()=>count===0?openCheckout(id):doItem(showFeedMenu?api.feed:api.heal,id)} disabled={loading||(showFeedMenu?!care:!canHealMonster(monster))||(id==='heal_basic'&&Boolean(monster.repair_until))}/>)}</div>
      <p className="text-xs text-slate-400">{showHealMenu?'兩種方式均不扣減永久耐久；標準修復套件可立即完成，庫存不足可購買後立即修復。':'庫存不足時，確認購買後立即使用。'}</p>{message&&<ActionFeedback message={message}/>}
     </section>
    </div>);
}
