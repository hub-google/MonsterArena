import {useEffect,useState} from 'react';

export function useOnlineStatus(){
  const [isOnline,setIsOnline]=useState(typeof navigator==='undefined' || navigator.onLine);
  useEffect(()=>{
    const online=()=>setIsOnline(navigator.onLine);
    window.addEventListener('online',online);window.addEventListener('offline',online);
    return ()=>{window.removeEventListener('online',online);window.removeEventListener('offline',online);};
  },[]);
  return isOnline;
}
