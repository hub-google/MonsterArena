import React from 'react';
import {PlayButton,ActionFeedback,GameIcon} from '../PlayButton.jsx';
import {api} from '../../utils/api.js';

export default function DetailsDialog({mecha,speciesName,monster,stats,setShowDetails,getItemQty,openCheckout,handleAction,loading}){
  return (<div className="cockpit-overlay" role="dialog" aria-modal="true" aria-label="機體詳細資料">
     <section className="cockpit-dialog" data-testid="mecha-details">
      <div className="dialog-heading"><h2>機體詳細資料</h2><button onClick={()=>setShowDetails(false)} aria-label="關閉詳細資料">×</button></div>
      <div className="text-sm">{mecha.factionName}・{mecha.roleName}</div><div className="text-sm text-slate-400">{speciesName}・G{monster.generation}・{Math.floor((monster.age_days||0)*10)/10} 天</div>
      {monster.is_rescue&&<div className="text-sm text-cyan-300">免費救援機體，拆解不提供金幣。</div>}
      <div className="cockpit-stats">{stats.map(([icon,label,value])=><div key={label}><GameIcon name={icon}/><span>{label}</span><strong>{Math.round(value||0)}</strong></div>)}</div>
      {monster.life_stage===5&&<><PlayButton icon="evolve" label="終極升級（需核心、50戰及70%勝率）" caption="終極升級" tone="purple" onClick={()=>{if(getItemQty('ultimate_core')===0){openCheckout('ultimate_core');return;}setShowDetails(false);handleAction(api.evolve,monster.monster_id)}} disabled={loading || monster.is_dead || Boolean(monster.repair_until) || monster.battles < 50 || monster.wins/monster.battles<0.7} className="w-full"/><p className="text-xs text-slate-400">升級條件：核心、50 場戰鬥、70% 勝率</p></>}
     </section>
    </div>);
}
