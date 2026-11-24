import React from 'react';
import {api} from '../../utils/api.js';

export default function FriendsPanel({user,setMessage,friendUUID,setFriendUUID,handleAddFriend,loading,pendingRequests,setLoading,loadFriends,friendsList,handleGiftStamina,pendingGiftFriendId}){
  return (
        <div className="flex-1 flex flex-col gap-4">
          <div className="glass-card p-4 flex flex-col gap-2">
            <h3 className="text-cyan-300 font-bold text-sm">我的 UUID (點擊複製)</h3>
            <div 
              className="bg-slate-900 border border-slate-700 p-2 rounded text-[10px] text-slate-400 cursor-pointer hover:bg-slate-800 break-all select-all"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(user.user_id);
                  setMessage('已複製 UUID 到剪貼簿！');
                } catch {
                  setMessage('無法自動複製，請手動選取上方 UUID。');
                }
              }}
            >
              {user.user_id}
            </div>
            
            <h3 className="text-cyan-300 font-bold text-sm mt-2">新增好友</h3>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="輸入好友 UUID 或帳號名稱" 
                value={friendUUID}
                onChange={e => setFriendUUID(e.target.value)}
                className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 text-xs text-white focus:border-cyan-500 outline-none"
              />
              <button 
                onClick={handleAddFriend}
                disabled={loading || !friendUUID.trim()}
                className="neon-button neon-button-primary px-4 py-2 text-xs"
              >
                加入
              </button>
            </div>
          </div>
          
          {pendingRequests.length > 0 && (
            <div className="glass-card p-4 border-cyan-500/30 flex flex-col gap-2">
              <h3 className="text-amber-400 font-bold text-sm">待確認好友邀請 ({pendingRequests.length})</h3>
              {pendingRequests.map(r => (
                <div key={r.friend_record_id} className="flex justify-between items-center gap-2">
                  <span className="text-sm text-slate-300">{r.friend_name}</span>
                  <button disabled={loading} className="neon-button neon-button-success px-3 py-2 text-xs"
                    onClick={async()=>{
                      setLoading(true);
                      try{ const result=await api.acceptFriend(r.user_id); setMessage(result.message); await loadFriends(); }
                      catch(err){setMessage(err.message);}
                      finally{setLoading(false);}
                    }}>接受邀請</button>
                </div>
              ))}
            </div>
          )}
          <h3 className="text-slate-300 font-bold text-sm">好友列表 ({friendsList.length})</h3>
          <div className="flex-1 overflow-y-auto space-y-3 pb-10">
            {loading ? (
              <p className="text-center text-slate-400 py-10">載入中...</p>
            ) : friendsList.length === 0 ? (
              <p className="text-center text-slate-400 py-10 text-xs">目前還沒有好友，趕快輸入 UUID 加入吧！</p>
            ) : (
              friendsList.map(f => (
                  <div key={f.friend_id} className="glass-card p-3 flex justify-between items-center">
                    <span className="font-bold text-cyan-300">{f.friend_name}</span>
                    <button 
                      onClick={() => handleGiftStamina(f)}
                      disabled={pendingGiftFriendId !== null} 
                      className="text-[10px] bg-slate-700 px-3 py-1.5 rounded hover:bg-slate-600 transition"
                    >
                      贈送行動電力
                    </button>
                  </div>
              ))
            )}
          </div>
        </div>
  );
}
