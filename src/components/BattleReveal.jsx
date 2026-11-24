import React from 'react';
import MonsterPixelArt from './MonsterPixelArt';
export default function BattleReveal({monster,look={},revealing=false,dead=false,size=96}){
 return <div className={'battle-reveal'+(revealing?' battle-reveal-active':'')} data-testid={revealing?'battle-reveal':undefined}>
 <MonsterPixelArt family={monster?.family||1} stage={monster?.life_stage||4} type={monster?.type} isDead={dead} displaySize={size}/>
 {revealing&&<div className="battle-disguise"><MonsterPixelArt family={monster?.family||1} stage={monster?.life_stage||4} type={monster?.type} skin={look.skin} vehicle={look.vehicle} fitVehicle displaySize={size}/></div>}
 </div>;
}
