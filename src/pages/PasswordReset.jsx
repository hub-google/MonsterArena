import React, {useState} from 'react';
import {api} from '../utils/api';

export default function PasswordReset({recoveryUid,onDone}) {
  const [password,setPassword]=useState('');
  const [confirm,setConfirm]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [changed,setChanged]=useState(false);
  const valid=recoveryUid && recoveryUid!=='pending' && recoveryUid!=='invalid';
  const finish=async()=>{
    try {await api.logout(); onDone();}
    catch {setError('登出未完成，請重試');}
  };
  const submit=async e=>{
    e.preventDefault();
    setError('');
    if(password.length<8){setError('密碼至少需要 8 個字元');return;}
    if(password!==confirm){setError('兩次輸入的密碼不一致');return;}
    setBusy(true);
    try{
      await api.resetPassword(password,recoveryUid);
      setChanged(true);setPassword('');setConfirm('');
      await finish();
    }catch(err){setError(err.message||'密碼重設失敗，請重新申請');}
    finally{setBusy(false);}
  };
  return <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950">
    <section className="glass-panel w-full max-w-md p-8 space-y-5">
      <h1 className="text-2xl font-bold text-cyan-400">重設密碼</h1>
      {changed ? <p role="status" className="text-emerald-300">密碼已更新，請使用新密碼登入。</p> :
      valid ? <form onSubmit={submit} className="flex flex-col gap-4">
        <label className="text-cyan-300">新密碼（至少 8 個字元）
          <input type="password" autoComplete="new-password" required minLength={8} value={password}
            onChange={e=>setPassword(e.target.value)} className="block w-full mt-2 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white"/>
        </label>
        <label className="text-cyan-300">再次輸入新密碼
          <input type="password" autoComplete="new-password" required minLength={8} value={confirm}
            onChange={e=>setConfirm(e.target.value)} className="block w-full mt-2 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white"/>
        </label>
        <button type="submit" disabled={busy} className="neon-button neon-button-primary py-3">{busy?'處理中…':'確認重設密碼'}</button>
      </form> : <p className="text-slate-300">{recoveryUid==='pending'?'正在驗證重設連結…':'連結無效或已過期，請返回登入重新申請。'}</p>}
      {error && <p role="alert" className="text-rose-400">{error}</p>}
      <button type="button" disabled={busy} onClick={finish} className="text-cyan-300 underline">{changed?'返回登入':'取消並返回登入'}</button>
    </section>
  </div>;
}
