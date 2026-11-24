import {useState,useEffect} from 'react';

export function useRepairCountdown(repairUntil){
  const [repairClock,setRepairClock]=useState(Date.now);
  useEffect(()=>{
    if(!repairUntil)return;
    const id=setInterval(()=>setRepairClock(Date.now()),1000);
    return ()=>clearInterval(id);
  },[repairUntil]);
  const repairSeconds=repairUntil?Math.min(1800,Math.max(0,Math.ceil((new Date(repairUntil).getTime()-Math.max(repairClock,Date.now()))/1000))):0;
  return repairSeconds;
}
