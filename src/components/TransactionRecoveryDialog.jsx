import React from 'react';

// Pure presentation; the App session owns transaction recovery and account guards.
export default function TransactionRecoveryDialog({recoveryFlow,transaction,recoveryError,transactionExpired,onDismiss,onDiscard,onRecover,onLogout}) {
  return ((recoveryFlow||(transaction.pending&&!transaction.busy))&&<div role="dialog" aria-modal="true" aria-label="尚未確認的交易" className="fixed z-[100] inset-0 flex items-center justify-center bg-black/85 p-5"><div className="glass-card w-full max-w-sm p-5 space-y-4 text-white">
      <h2 className="text-lg font-bold">{recoveryFlow?.busy?'正在恢復交易':recoveryFlow?.message?'交易恢復結果':'尚未確認的交易'}</h2>
      {recoveryFlow?.busy?<p role="status">正在確認交易及最新資產…</p>:recoveryFlow?.message?<><p role="status" className="text-sm text-slate-300">{recoveryFlow.message}</p><button className="neon-button neon-button-primary w-full py-3" onClick={onDismiss}>返回遊戲</button></>:<>
        <p className="text-sm text-slate-300">{transactionExpired(transaction.pending)?'已超過安全重送期限，請核對金幣、庫存及戰績後再清除紀錄。':'上次操作可能已完成。使用相同交易識別碼恢復，不會重複扣款或計分。'}</p>
        {recoveryError&&<p role="alert" className="text-rose-300 text-sm">{recoveryError}</p>}
        {transactionExpired(transaction.pending)?<button className="neon-button w-full py-3" onClick={onDiscard}>核對後清除紀錄</button>:<button className="neon-button neon-button-primary w-full py-3" onClick={onRecover}>恢復交易</button>}
        <button className="neon-button w-full py-2" onClick={onLogout}>登出並保留恢復紀錄</button>
      </>}
    </div></div>);
}
