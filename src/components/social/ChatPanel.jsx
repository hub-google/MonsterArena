import React from 'react';

export default function ChatPanel({user,chatLogs,logsEndRef,handleSendChat,chatMessage,setChatMessage,sendingChat}){
  return (
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
  );
}
