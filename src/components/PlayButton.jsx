import React from 'react';
// Visible pictograms, short captions and accessible full names use the same action everywhere.
export const SYMBOLS={home:'🏠',roster:'🎒',battle:'⚔️',pokedex:'📖',more:'⋯',feed:'🔋',clean:'🧼',heal:'💊',train:'🏋️',transform:'🔄',shop:'🛒',quest:'🎁',info:'ℹ️',back:'↩',hatch:'🥚',guild:'🛡️',raid:'👑',social:'👥',refresh:'⟳',logout:'🚪'};
export function PlayButton({icon,label,short,onClick,disabled=false,tone='neutral',selected,children,className='',...rest}){
 return <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled} aria-pressed={selected} className={'play-button play-'+tone+' '+className} {...rest}>
  <span className="play-symbol" aria-hidden="true">{SYMBOLS[icon]||icon}</span>
  {short&&<span className="play-caption" aria-hidden="true">{short}</span>}
  {children}
 </button>
}
export function ActionFeedback({message}){
 if(!message)return null;
 const error=/^❌|失敗|不足|不能|錯誤/.test(message);
 return <div role="status" className={'play-feedback '+(error?'text-rose-300':'text-emerald-300')}>
  <span aria-hidden="true" className="text-2xl">{error?'❗':'✓'}</span>
  <details><summary className="cursor-pointer text-xs">{error?'未完成':'成功'}</summary><div className="text-xs break-words mt-1">{message}</div></details>
 </div>
}
