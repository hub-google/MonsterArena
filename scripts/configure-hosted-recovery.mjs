// Apply only Arena recovery template and approved return URLs, using an authorized Management API token.
// Never log token, config contents, SMTP credentials or recovery links.
import {readFileSync} from 'node:fs';
const token=process.env.SUPABASE_ACCESS_TOKEN;
if(!token){console.error('BLOCKED: SUPABASE_ACCESS_TOKEN is not configured');process.exit(2)}
const url='https://api.supabase.com/v1/projects/fanffwnhkxpfhttylntw/config/auth';
const request=async(method,body)=>{
 const r=await fetch(url,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 if(!r.ok)throw Error('Management API '+method+' HTTP '+r.status);
 return r.json();
};
const subject='怪獸競技場 Monster Arena｜重設密碼';
const template=readFileSync(new URL('../supabase/templates/recovery.html',import.meta.url),'utf8');
if(!template.includes('{{ .ConfirmationURL }}'))throw Error('Recovery template missing confirmation URL');
const redirects=['https://arena.monsterport.com/','https://hub-google.github.io/MonsterArena/'];
const current=await request('GET');
const existing=(current.uri_allow_list||'').split(',').map(x=>x.trim()).filter(Boolean);
const allow=[...new Set([...existing,...redirects])].join(',');
const brandedAddress=/@(?:arena\.)?monsterport\.com$/i.test(current.smtp_admin_email||'');
const configured=Boolean(current.smtp_host&&current.smtp_user&&brandedAddress);
const patch={mailer_subjects_recovery:subject,mailer_templates_recovery_content:template,uri_allow_list:allow,...(configured?{smtp_sender_name:'Monster Arena｜怪獸競技場'}:{})};
await request('PATCH',patch);
const after=await request('GET');
if(after.mailer_subjects_recovery!==subject||after.mailer_templates_recovery_content.trim()!==template.trim()||!redirects.every(x=>(after.uri_allow_list||'').split(',').map(y=>y.trim()).includes(x)))throw Error('Hosted recovery config read-back mismatch');
console.log('PASS: hosted recovery subject, HTML and both redirect URLs verified');
if(configured&&after.smtp_sender_name===patch.smtp_sender_name)console.log('PASS: existing branded SMTP sender name verified');
else{console.error('BLOCKED: verified custom SMTP for monsterport.com is not configured; sender address unchanged');process.exitCode=3}
