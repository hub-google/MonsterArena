import React, { useState, useEffect, useRef } from 'react';
import MonsterPixelArt from '../components/MonsterPixelArt';
import { api } from '../utils/api';

import { getMecha } from '../utils/monsterSprites';
import {wornSkin} from '../utils/skins';

export default function Social({ user }) {
  const [subTab, setSubTab] = useState('plaza'); // 'plaza' or 'chat'
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Plaza State
  const [players, setPlayers] = useState([]);
  const [typeFilter, setTypeFilter] = useState('');

  // Chat State
  const [chatMessage, setChatMessage] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const [pendingGiftFriendId, setPendingGiftFriendId] = useState(null);
  const [chatLogs, setChatLogs] = useState([]);
  const logsEndRef = useRef(null);
  const refreshChatRef = useRef(null);
  const plazaRequestRef = useRef(0);

  // Friends State
  const [friendUUID, setFriendUUID] = useState('');
  const [friendsList, setFriendsList] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLogs]);

  useEffect(() => {
    if (subTab === 'plaza') {
      loadPlayers();
      return () => { plazaRequestRef.current++; };
    } else if (subTab === 'chat') {
      const unsubscribe = api.subscribeMessages('world', (msgs) => {
        setChatLogs(msgs);
      });
      refreshChatRef.current = unsubscribe.refresh;
      return () => {
        refreshChatRef.current = null;
        unsubscribe();
      };
    } else if (subTab === 'friends') {
      loadFriends();
    }
  }, [subTab, typeFilter]);

  const loadFriends = async () => {
    setLoading(true);
    try {
      const [list, requests] = await Promise.all([api.getFriends(),api.getFriendRequests()]);
      setFriendsList(list);
      setPendingRequests(requests);
    } catch (err) {
      setMessage(err.message);
    }
    setLoading(false);
  };

  const handleAddFriend = async () => {
    if (!friendUUID.trim()) return;
    setLoading(true);
    try {
      const res = await api.addFriend(friendUUID.trim());
      setMessage(res.message);
      setFriendUUID('');
      await loadFriends();
    } catch (err) {
      setMessage(err.message);
    }
    setLoading(false);
  };

  const loadPlayers = async () => {
    const requestId = ++plazaRequestRef.current;
    setLoading(true);
    try {
      const results = await api.searchPlayers(typeFilter);
      if (plazaRequestRef.current === requestId) setPlayers(results);
    } catch (err) {
      if (plazaRequestRef.current === requestId) setMessage(err.message);
    } finally {
      if (plazaRequestRef.current === requestId) setLoading(false);
    }
  };

  const handleSendChat = async (e) => {
    e.preventDefault();
    if (sendingChat || !chatMessage.trim()) return;
    const sentText = chatMessage.trim();
    setSendingChat(true);
    try {
      await api.sendMessage('world', sentText);
      setChatMessage(previous => previous.trim() === sentText ? '' : previous);
      refreshChatRef.current?.();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSendingChat(false);
    }
  };

  const handleGiftStamina = async friend => {
    if (pendingGiftFriendId !== null) return;
    setPendingGiftFriendId(friend.friend_id);
    try {
      await api.giftStamina(friend.friend_id);
      setMessage('已發送行動電力給 ' + friend.friend_name);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setPendingGiftFriendId(null);
    }
  };

  return (
    <div className="flex flex-col h-full animate-fade-in relative">
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setSubTab('plaza')}
          className={`flex-1 py-2 text-[11px] font-bold rounded-lg transition-colors border ${subTab === 'plaza' ? 'bg-cyan-600/30 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.3)]' : 'border-slate-700 text-slate-400 bg-slate-800/50'}`}
        >
          🔍 廣場
        </button>
        <button
          onClick={() => setSubTab('friends')}
          className={`flex-1 py-2 text-[11px] font-bold rounded-lg transition-colors border ${subTab === 'friends' ? 'bg-cyan-600/30 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.3)]' : 'border-slate-700 text-slate-400 bg-slate-800/50'}`}
        >
          👥 好友
        </button>
        <button
          onClick={() => setSubTab('chat')}
          className={`flex-1 py-2 text-[11px] font-bold rounded-lg transition-colors border ${subTab === 'chat' ? 'bg-cyan-600/30 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.3)]' : 'border-slate-700 text-slate-400 bg-slate-800/50'}`}
        >
          💬 頻道
        </button>
      </div>

      {message && (
        <div className="bg-emerald-900/50 border border-emerald-500/50 text-emerald-300 p-3 rounded-lg mb-4 text-sm text-center font-medium shadow-lg backdrop-blur-sm animate-fade-in">
          {message}
        </div>
      )}

      {subTab === 'plaza' && (
        <div className="flex-1 flex flex-col gap-4">
          <div className="flex gap-2 mb-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-slate-800/80 border border-slate-700 text-white p-2 rounded-lg text-sm outline-none focus:border-cyan-500 flex-1"
            >
              <option value="">全部陣營（公開玩家名單）</option>
              <option value="1">疾風族</option>
              <option value="2">鋼鐵族</option>
              <option value="3">蒼空族</option>
              <option value="4">星核族</option>
            </select>
            <button onClick={loadPlayers} disabled={loading} className="neon-button bg-cyan-700 hover:bg-cyan-600 text-white px-4 rounded-lg text-sm">
              重新整理
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pb-10">
            {loading ? (
              <p className="text-center text-slate-400 py-10">搜尋中...</p>
            ) : players.length === 0 ? (
              <p className="text-center text-slate-400 py-10">目前沒有找到符合條件的玩家。</p>
            ) : (
              players.map(p => (
                <div key={p.user_id} className="glass-card p-3 flex flex-col gap-2">
                  <div className="flex justify-between items-center border-b border-slate-700 pb-2">
                    <span className="font-bold text-cyan-300">{p.username}</span>
                  </div>
                  <div className="flex justify-around mt-2">
                    {p.monsters.map((m, idx) => (
                      <div key={idx} className="flex flex-col items-center gap-1">
                        <div className="w-16 h-16 bg-slate-800 rounded flex items-center justify-center overflow-hidden border border-slate-700">
                          <MonsterPixelArt family={m.family} stage={m.life_stage} type={m.type} skin={wornSkin(m)?.id} displaySize={64} />
                        </div>
                        <span className="text-[10px] text-slate-300 text-center max-w-[60px] truncate">
                          {wornSkin(m)?.name||m.name}
                        </span>
                        <span className="text-[9px] text-slate-500">{wornSkin(m)?'偽裝造型':getMecha(m.family,m.life_stage,m.type).factionName+'・'+getMecha(m.family,m.life_stage,m.type).roleName}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {subTab === 'friends' && (
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
      )}

      {subTab === 'chat' && (
        <div className="flex-1 flex flex-col glass-card overflow-hidden">
          <div className="bg-slate-800/80 p-2 text-center text-[10px] text-slate-400 border-b border-slate-700/50">
            全伺服器公共頻道<br/>(防範詐騙不法，您的對話將永久記錄以供稽核)
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px]">
            {chatLogs.map(log => {
              const isMe = log.user_id === user?.user_id;
              return (
                <div key={log.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <span className="text-[10px] text-slate-500 mb-0.5 mx-1">
                    {log.username} • {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <div className={`px-3 py-2 rounded-2xl max-w-[85%] text-sm shadow-md break-words ${
                    isMe 
                    ? 'bg-cyan-600/50 border border-cyan-500/30 text-white rounded-tr-sm' 
                    : 'bg-slate-700/50 border border-slate-600/30 text-slate-200 rounded-tl-sm'
                  }`}>
                    {log.text}
                  </div>
                </div>
              );
            })}
            <div ref={logsEndRef} />
          </div>
          <div className="p-3 bg-slate-800/80 border-t border-slate-700/50">
            <form onSubmit={handleSendChat} className="flex gap-2">
              <input
                type="text"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="輸入訊息..."
                className="flex-1 bg-slate-900 border border-slate-600 rounded-full px-4 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
                maxLength={100}
              />
              <button 
                type="submit" 
                disabled={sendingChat || !chatMessage.trim()}
                className="bg-cyan-600 hover:bg-cyan-500 text-white rounded-full w-10 h-10 flex items-center justify-center transition-colors disabled:opacity-50"
              >
                ➤
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
