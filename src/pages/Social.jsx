import PlazaPanel from '../components/social/PlazaPanel.jsx';
import FriendsPanel from '../components/social/FriendsPanel.jsx';
import ChatPanel from '../components/social/ChatPanel.jsx';
import React, { useState, useEffect, useRef } from 'react';
import { api } from '../utils/api';


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

      {subTab === 'plaza' && <PlazaPanel {...{typeFilter,setTypeFilter,loadPlayers,loading,players}}/>}

      {subTab === 'friends' && <FriendsPanel {...{user,setMessage,friendUUID,setFriendUUID,handleAddFriend,loading,pendingRequests,setLoading,loadFriends,friendsList,handleGiftStamina,pendingGiftFriendId}}/>}

      {subTab === 'chat' && <ChatPanel {...{user,chatLogs,logsEndRef,handleSendChat,chatMessage,setChatMessage,sendingChat}}/>}
    </div>
  );
}
