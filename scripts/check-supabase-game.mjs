import { readFileSync } from 'node:fs';

const source=readFileSync(new URL('../src/utils/supabaseClient.js',import.meta.url),'utf8');
const project='fanffwnhkxpfhttylntw';
if(!source.includes(`https://${project}.supabase.co`)) {
  console.error('Unexpected Supabase project: existing game accounts must remain in the original project.');
  process.exit(1);
}
const key=source.match(/sb_publishable_[A-Za-z0-9_-]+/)?.[0];
if(!key) {
  console.error('Missing public Supabase publishable key.');
  process.exit(1);
}
const url=`https://${project}.supabase.co/auth/v1/health`;
try {
  const response=await fetch(url,{headers:{apikey:key},signal:AbortSignal.timeout(15000)});
  if(!response.ok) {
    console.error(`Supabase Auth unavailable (HTTP ${response.status})`);
    process.exit(1);
  }
  const body=await response.json();
  if(body.status && body.status !== 'ok') {
    console.error('Supabase Auth responded with a non-healthy state.');
    process.exit(1);
  }
  console.log('Supabase Auth is reachable for the existing Game project.');
  if(process.argv.includes('--preview')){
    const health=await fetch('https://'+project+'.supabase.co/rest/v1/rpc/arena_preview_health',{
      method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(15000)
    });
    if(!health.ok)throw Error('Arena preview endpoint unavailable: HTTP '+health.status);
    const info=await health.json();
    if(info.namespace!=='arena_preview'||info.version!==2||info.combatBalance!==3)throw Error('Wrong Arena preview rules');
    console.log('Arena preview V2 health endpoint confirmed.');
  }
} catch(error) {
  console.error('Supabase preflight failed:',error.message);
  process.exit(1);
}
