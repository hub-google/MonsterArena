import React, { useState } from 'react';
import { api } from '../utils/api';
import { refreshAfterCommit, resourcesForAction } from '../utils/gameRules';
import { GUILD_SHOP } from '../utils/gameCatalog';

export default function Guild({ 
  user, 
  guilds, 
  myGuild, 
  refreshData, 
  setPage 
}) {
  const [guildName, setGuildName] = useState('');
  const [donationAmount, setDonationAmount] = useState('');
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

  const handleCreate = async () => {
    if (!guildName) return;
    if (await handleAction(api.createGuild, guildName)) setGuildName('');
  };

  const handleDonate = async () => {
    if (!/^[1-9]\d*$/.test(donationAmount)) { setMessage('❌ 請輸入正整數捐獻金額'); return; }
    if (await handleAction(api.donateGuild, Number(donationAmount))) setDonationAmount('');
  };

  const handleBuyShop = async (itemId) => {
    await handleAction(api.buyGuildShop, itemId);
  };

  return (
    <div className="h-full flex flex-col gap-4 animate-fade-in">
      {/* Header bar */}
      <div className="glass-card p-4 flex justify-between items-center text-sm font-bold">
        <span className="text-cyan-400">公會大廳</span>
        <span className="text-amber-400">💰 {user.gold}G</span>
      </div>

      {/* Main Content (Scrollable) */}
      <div className="flex-1 overflow-y-auto">
        
        {myGuild ? (
          /* User is in a guild - Show active guild view */
          <div className="flex flex-col gap-4">
            <div className="glass-card p-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
              
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="flex flex-col">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <span className="text-2xl">🏰</span> {myGuild.guild_name}
                  </h3>
                  <span className="text-indigo-400 text-sm font-bold mt-1">LV.{myGuild.level}</span>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-400">我的貢獻</div>
                  <div className="text-lg font-bold text-emerald-400">{myGuild.contribution} 分</div>
                </div>
              </div>
              
              <div className="flex justify-end border-t border-slate-700/50 pt-3 relative z-10">
                <button
                  onClick={() => {
                    const destructive=myGuild.role===2;
                    if (!destructive || window.confirm(`確定解散「${myGuild.guild_name}」？所有公會成員會被移除，無法恢復。`)) {
                      handleAction(api.leaveGuild);
                    }
                  }}
                  disabled={loading}
                  className="text-sm text-rose-400 hover:text-rose-300 font-bold px-3 py-1 bg-rose-500/10 rounded-lg transition-colors"
                >
                  {myGuild.role === 2 ? '解散公會' : '退出公會'}
                </button>
              </div>
            </div>

            {/* Gold Donation Form */}
            <div className="glass-card p-5">
              <h4 className="text-sm font-bold text-amber-400 mb-2">💰 捐獻金幣</h4>
              <p className="text-xs text-slate-400 mb-4">(1金幣 = 1公會貢獻點，貢獻點可用於商店兌換)</p>
              
              <div className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={donationAmount}
                  onChange={(e) => setDonationAmount(e.target.value)}
                  placeholder="輸入捐獻金額..."
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 outline-none text-white focus:border-amber-500 transition-colors"
                />
                <button
                  onClick={handleDonate}
                  disabled={loading || !donationAmount || user.gold < parseInt(donationAmount)}
                  className="neon-button bg-amber-600 hover:bg-amber-500 text-white px-6 shadow-amber-500/30 disabled:opacity-50 font-bold"
                >
                  捐獻
                </button>
              </div>
            </div>

            {/* Guild Shop items */}
            <div className="glass-card p-5 border-indigo-500/30">
              <h4 className="text-lg font-bold text-indigo-400 mb-4 flex items-center gap-2">
                <span className="text-2xl">🛍️</span> 公會專屬商店
              </h4>
              
              <div className="space-y-3">
                {GUILD_SHOP.map(item=><div key={item.id} className="bg-slate-900/50 border border-slate-700/50 p-4 rounded-xl flex justify-between items-center hover:border-indigo-500/30 transition-colors">
                  <div className="flex items-center gap-3"><span className="text-2xl">{item.icon}</span>
                    <div className="flex flex-col"><span className="font-bold text-white text-sm">{item.name}</span>
                      <span className="text-xs text-slate-400">{item.description}</span></div>
                  </div>
                  <button onClick={()=>handleBuyShop(item.id)} disabled={loading||myGuild.contribution<item.price}
                    className="neon-button bg-indigo-600 text-white px-4 py-2 text-sm shadow-indigo-500/20 disabled:opacity-50">{item.price} 貢獻</button>
                </div>)}
              </div>
            </div>

          </div>
        ) : (
          /* User is NOT in a guild - Show list and create forms */
          <div className="flex flex-col gap-6">
            {/* Create form */}
            <div className="glass-card p-5 border-cyan-500/30">
              <h3 className="text-lg font-bold text-cyan-400 mb-2">創建新公會</h3>
              <p className="text-xs text-slate-400 mb-4">創建公會需要支付 500G 費用。</p>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  value={guildName}
                  onChange={(e) => setGuildName(e.target.value)}
                  placeholder="輸入公會名稱..."
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 outline-none text-white focus:border-cyan-500 transition-colors"
                />
                <button
                  onClick={handleCreate}
                  disabled={loading || !guildName || user.gold < 500}
                  className="neon-button neon-button-primary px-6 font-bold disabled:opacity-50"
                >
                  創建公會
                </button>
              </div>
            </div>

            {/* Guild lists */}
            <div className="glass-card p-5">
              <h3 className="text-lg font-bold text-slate-300 mb-4 border-b border-slate-700 pb-2">🔍 推薦公會</h3>
              {guilds.length === 0 ? (
                <span className="block text-center italic mt-6 text-slate-500">目前伺服器上沒有任何公會。</span>
              ) : (
                <div className="space-y-3">
                  {guilds.map(g => (
                    <div key={g.guild_id} className="flex justify-between items-center p-4 bg-slate-900/50 border border-slate-700/50 rounded-xl hover:border-cyan-500/30 transition-colors">
                      <div className="flex flex-col">
                        <span className="font-bold text-white text-lg">{g.guild_name}</span>
                        <div className="flex gap-3 text-xs text-slate-400 mt-1">
                          <span className="text-indigo-400 font-bold">LV.{g.level}</span>
                          <span>•</span>
                          <span>會長: {g.leader_name}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleAction(api.joinGuild, g.guild_id)}
                        disabled={loading}
                        className="neon-button bg-slate-700 hover:bg-cyan-600 text-white px-4 py-2 text-sm transition-colors"
                      >
                        加入公會
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

      </div>

      {/* Log message output */}
      {message && (
        <div className="glass-card p-3 text-center text-sm font-medium animate-pulse text-indigo-200 border-indigo-500/50 bg-indigo-900/20 mt-auto">
          {message}
        </div>
      )}
    </div>
  );
}
