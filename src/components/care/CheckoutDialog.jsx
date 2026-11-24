import React from 'react';
import {PlayButton,ActionFeedback,GameIcon} from '../PlayButton.jsx';

export default function CheckoutDialog({checkout,setCheckout,loading,user,checkoutMessage,buyMissing}){
  return (<div className="cockpit-overlay" role="dialog" aria-modal="true" aria-label="購買確認">
    <section className="cockpit-dialog" data-testid="quick-checkout">
      <div className="dialog-heading"><h2>購買確認</h2><button disabled={loading} onClick={()=>setCheckout(null)} aria-label="取消購買">×</button></div>
      <div className="flex items-center gap-3 text-cyan-300"><GameIcon name={checkout.icon}/><strong>{checkout.name}</strong></div>
      <p className="text-sm text-slate-300">{checkout.use==='train'?'購買 1 個效能增幅器並立即訓練，消耗 10 行動電力、10 能源，獲得 2 點可分配點數。':checkout.description}</p>
      <div className="grid grid-cols-2 gap-2 text-sm"><span>購買數量</span><strong className="text-right">1</strong><span>應付金額</span><strong className="text-right text-amber-300">{checkout.price}G</strong><span>目前金幣</span><strong className="text-right">{user.gold}G</strong></div>
      {Number(user.gold)<checkout.price&&<p role="status" className="text-rose-300 text-sm">金幣不足，還需 {checkout.price-Number(user.gold)}G</p>}
      {checkoutMessage&&<ActionFeedback message={checkoutMessage}/>}
      <button type="button" disabled={loading||Number(user.gold)<checkout.price} onClick={buyMissing} className="neon-button neon-button-primary w-full py-3">{loading?'交易處理中…':(checkout.use==='train'?'購買並訓練 ':checkout.use?'購買並使用 ':'確認購買 ')+checkout.price+'G'}</button>
      <button type="button" disabled={loading} onClick={()=>setCheckout(null)} className="neon-button w-full py-2">取消</button>
    </section></div>);
}
