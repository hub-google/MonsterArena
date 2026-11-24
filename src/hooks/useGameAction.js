import {useState} from 'react';
import {api} from '../utils/api.js';
import {refreshAfterCommit,resourcesForAction} from '../utils/gameRules.js';

// Shared mutation feedback: a failed refresh never turns a committed action into a failure.
export function useGameAction(refreshData){
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const handleAction = async (actionFn, ...args) => {
    setLoading(true);
    setMessage('');
    try {
      const data = await actionFn(...args);
      setMessage(data.message || '操作成功！');
      const warning=await refreshAfterCommit(refreshData,resourcesForAction(api,actionFn));
      if(warning)setMessage(warning);
      return true;
    } catch (err) {
      setMessage(`❌ ${err.message}`);
      return false;
    } finally {
      setLoading(false);
    }
  };
  return {loading,message,setMessage,handleAction};
}
