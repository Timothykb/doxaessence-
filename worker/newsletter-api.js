import {dbClient} from './checkout-api.js';
import {renderMail,plainMail} from '../shared/email.js';
const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export async function deliverWelcomes(env){
 if(!env.RESEND_API_KEY||!env.MAIL_FROM||!env.SUPABASE_SERVICE_ROLE_KEY)return;
 const db=dbClient(env),cutoff=encodeURIComponent(new Date(Date.now()-23*3600000).toISOString());
 const rows=await db('doxa_welcome_notifications?accepted_at=is.null&or=(first_attempt_at.is.null,first_attempt_at.gt.'+cutoff+')&order=last_attempt_at.asc.nullsfirst&limit=20');
 for(const row of rows){try{
  const job=await db('rpc/claim_doxa_welcome',{notification_id:row.id});if(!job?.recipient)continue;
  const mail={subject:job.subject,includeSocial:true,blocks:[{type:'text',text:job.body}]};
  const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':'doxa-welcome/'+job.id},body:JSON.stringify({from:env.MAIL_FROM.replace(/^[^<]+</,'Timothy | DOXA ESSENCE <'),reply_to:env.MAIL_REPLY_TO||'info@doxaessence.com',to:[job.recipient],subject:job.subject,html:renderMail(mail),text:plainMail(mail)}),signal:AbortSignal.timeout(10000)});
  if(!response.ok)continue;const sent=await response.json();if(typeof sent.id!=='string')continue;
  await db('doxa_welcome_notifications?id=eq.'+job.id,{provider_id:sent.id,accepted_at:new Date().toISOString()},'PATCH');
 }catch{/* The durable queue retries without re-registering or resending accepted jobs. */}}
}
export async function newsletterApi(request,env,ctx){
 if(request.method!=='POST')return json({error:'Method not allowed'},405);
 if(request.headers.get('Origin')!==new URL(request.url).origin)return json({error:'Invalid origin'},403);
 if(env.CHECKOUT_LIMIT&&!(await env.CHECKOUT_LIMIT.limit({key:'newsletter:'+(request.headers.get('CF-Connecting-IP')||'unknown')})).success)return json({error:'Please try again later'},429);
 try{
  if(Number(request.headers.get('Content-Length')||0)>2000)return json({error:'Invalid signup'},413);
  const raw=await request.text();if(raw.length>2000)return json({error:'Invalid signup'},413);
  const input=JSON.parse(raw),email=String(input.email||'').trim().toLowerCase(),name=String(input.first_name||'').trim();
  if(input.website)return json({saved:true});
  if(input.consent!==true||!name||name.length>100||/[\x00-\x1f]/.test(name)||email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return json({error:'Invalid signup'},400);
  const response=await fetch('https://xjdvjdctwdswkcnpqqni.supabase.co/rest/v1/rpc/join_doxa_launch_list',{method:'POST',headers:{apikey:'sb_publishable_NItr0oozm0pqLzXT4l4ZgQ_p6EinU5-','Content-Type':'application/json'},body:JSON.stringify({email_address:email,first_name:name,email_consent:true}),signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw Error();
  ctx.waitUntil(deliverWelcomes(env).catch(()=>{}));
  return json({saved:true});
 }catch{return json({error:'Could not confirm signup. Please retry.'},503);}
}
