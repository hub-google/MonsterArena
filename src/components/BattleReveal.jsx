import React from 'react';
import MonsterPixelArt from './MonsterPixelArt';
export default function BattleReveal({monster,look={},revealing=false,restored=false,dead=false,size=96}){
 const disguise=Boolean(look.skin||look.vehicle);
 const showReveal=Boolean(revealing&&disguise);
 const showRestored=Boolean(restored&&disguise&&!monster?.is_dead);
 const core={family:monster?.family||1,stage:monster?.life_stage||4,type:monster?.type,displaySize:size};
 return <div className={'battle-reveal'+(showReveal?' battle-reveal-active':'')} data-testid={showReveal?'battle-reveal':showRestored?'battle-restored':undefined}>
 <MonsterPixelArt {...core} {...(showRestored?look:{})} fitVehicle isDead={monster?.is_dead||(!showRestored&&dead)}/>
 {showReveal&&['left','right'].map(side=><div key={side} aria-hidden="true" className={'battle-disguise battle-disguise-'+side}><MonsterPixelArt {...core} {...look} fitVehicle/></div>)}
 </div>;
}
