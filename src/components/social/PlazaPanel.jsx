import React from 'react';
import MonsterPixelArt from '../MonsterPixelArt.jsx';
import {getMecha,displayMonsterName} from '../../utils/monsterSprites.js';
import {wornSkin} from '../../utils/skins.js';

export default function PlazaPanel({typeFilter,setTypeFilter,loadPlayers,loading,players}){
  return (
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
                          {wornSkin(m)?.name||displayMonsterName(m)}
                        </span>
                        <span className="text-[9px] text-slate-500">{wornSkin(m)?'偽裝造型':getMecha(m.family,m.life_stage,m.type).modelName}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
  );
}
