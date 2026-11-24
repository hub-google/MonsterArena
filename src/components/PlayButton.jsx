import React from 'react';
const shapes={
 home:'M3 11 12 3l9 8M5 10v11h5v-7h4v7h5V10',
 roster:'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M5 7h14l2 5v9H3v-9zM3 13h18M9 13v3h6v-3',
 battle:'M3 3l6 1 11 11-4 4L5 8zM21 3l-6 1-3 3M3 21l5-5M16 16l5 5M2 15l7 7M15 2l7 7',
 pokedex:'M12 5C9 3 5 3 2 5v15c3-2 7-2 10 0 3-2 7-2 10 0V5c-3-2-7-2-10 0zM12 5v15M5 8h4M15 8h4M5 12h4M15 12h4',
 more:'M5 12h.01M12 12h.01M19 12h.01',
 feed:'M7 4h10v3h2v14H5V7h2zM13 9l-4 6h4l-2 4 5-7h-4z',
 clean:'M5 14h14v7H5zM7 14V8l3-4M13 7l3-3M2 17h3M19 17h3M18 8h.01M14 10h.01',
 heal:'M8 3h8v5h5v8h-5v5H8v-5H3V8h5z',
 train:'M3 8v8M6 5v14M18 5v14M21 8v8M6 12h12',
 transform:'M20 8a8 8 0 0 0-14-3L3 8m0-5v5h5M4 16a8 8 0 0 0 14 3l3-3m0 5v-5h-5',
 shop:'M3 4h2l3 12h11l3-9H6M9 21h.01M18 21h.01',
 quest:'M3 9h18v4H3zM5 13v9h14v-9M12 9v13M12 9C3 9 5 1 9 4l3 5c9 0 7-8 3-5z',
 info:'M12 11v6M12 7h.01M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20',
 back:'M9 5l-7 7 7 7M3 12h18',
 hatch:'M12 2C7 2 3 11 3 15a9 7 0 0 0 18 0c0-4-4-13-9-13zM4 11l5 4 3-5 4 5 4-4',
 guild:'M12 2l8 3v7c0 5-4 8-8 10-4-2-8-5-8-10V5zM8 12l3 3 5-6',
 raid:'M3 7l5 5 4-8 4 8 5-5-2 12H5zM5 22h14',
 social:'M16 21v-3a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v3M10 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8M17 3a4 4 0 0 1 0 7M18 14a4 4 0 0 1 4 4v3',
 refresh:'M20 8a8 8 0 1 0 1 8M20 3v5h-5',logout:'M10 3H4v18h6M10 12h12M17 7l5 5-5 5',
 robot:'M5 7h14v12H5zM12 3v4M2 10v6M22 10v6M8 12h.01M16 12h.01M9 16h6',
 car:'M3 11l3-6h12l3 6v8H3zM3 12h18M7 15h.01M17 15h.01M5 19v3M19 19v3',
 edit:'M4 16 16 4l4 4L8 20H4zM13 7l4 4',
 lock:'M6 10V7a6 6 0 0 1 12 0v3M4 10h16v11H4zM12 14v3',
 unlock:'M6 10V7a6 6 0 0 1 11-3M4 10h16v11H4zM12 14v3',
 trash:'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7',
 evolve:'M4 14l8-8 8 8M4 7l8-6 8 6M12 6v15',
 chat:'M3 4h18v13H9l-6 5zM7 9h10M7 13h7',
 trophy:'M8 3h8v8a4 4 0 0 1-8 0zM8 5H3v3a5 5 0 0 0 5 5M16 5h5v3a5 5 0 0 1-5 5M12 15v5M7 21h10',
 tools:'M14 5a6 6 0 0 0-7 8L2 18l4 4 6-6a6 6 0 0 0 8-7l-4 4-4-4z',
 fusion:'M7 2c0 8 10 12 10 20M17 2C17 10 7 14 7 22M8 5h8M8 19h8M9 9h6M9 15h6',
 heart:'M12 21 3 12a6 6 0 0 1 9-8 6 6 0 0 1 9 8z',
 bolt:'M13 2 3 14h8l-1 8 11-13h-9z',
 coin:'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20M15 7h-5a2 2 0 0 0 0 4h4a2 2 0 0 1 0 4H9M12 5v12',
 check:'M4 12l5 5L20 6',
 alert:'M12 3 2 21h20zM12 9v4M12 17h.01',
 wing:'M2 12l20-9-7 18-3-7zM12 14 22 3',
 orbit:'M3 14c0-5 18-5 18 0s-18 5-18 0zM6 10l3-5h6l3 5M8 19l-2 3M16 19l2 3',
 clock:'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20M12 6v6l4 2',
 speed:'M3 17a9 9 0 1 1 18 0M12 14l5-5M6 17h12'
};
const aliases={'🤖':'robot','🚙':'car','🏎️':'car','✈️':'wing','🛸':'orbit','🛡️':'guild','📖':'pokedex','✏️':'edit','🔒':'lock','🔓':'unlock','🗑️':'trash','⬆️':'evolve','💬':'chat','🏆':'trophy','🔧':'tools','🧬':'fusion','🔋':'feed','🧼':'clean','💊':'heal','💚':'heart','❤️':'heart','⚔️':'battle','⚡':'bolt','🪙':'coin'};
export function GameIcon({name,className=''}){const path=shapes[aliases[name]||name];return path?<svg aria-hidden="true" className={'game-icon '+className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={path}/></svg>:<span aria-hidden="true" className={'game-icon game-item-icon '+className}>{name}</span>}
export function PlayButton({icon,label,short,onClick,disabled=false,tone='neutral',selected,children,className='',caption,subtext,...rest}){
 return <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled} aria-pressed={selected} className={'play-button play-'+tone+' '+className} {...rest}>
  <span className="play-symbol"><GameIcon name={icon}/></span>
  <span className="play-caption" aria-hidden="true">{caption||label}</span>
  {subtext&&<span className="play-subtext">{subtext}</span>}{children}
 </button>
}
export function ActionFeedback({message}){
 if(!message)return null;
 const error=/^❌|失敗|不足|不能|錯誤/.test(message);
 return <div role="status" className={'play-feedback '+(error?'text-rose-300':'text-emerald-300')}><GameIcon name={error?'alert':'check'}/><span>{message.replace(/^❌\s*/,'')}</span></div>
}
