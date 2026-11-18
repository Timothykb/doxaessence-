import { renderMail, plainMail } from '../shared/email.js';
import {startTestCheckout,preorderPreview} from './checkout-api.js';
const project='https://xjdvjdctwdswkcnpqqni.supabase.co';
const key='sb_publishable_NItr0oozm0pqLzXT4l4ZgQ_p6EinU5-';
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
export async function adminApi(request,env) {
 const url=new URL(request.url);
 if(!['GET','POST'].includes(request.method))return json({error:'Methode niet toegestaan.'},405);
 if(request.method==='POST'&&request.headers.get('Origin')!==url.origin)return json({error:'Ongeldige herkomst.'},403);
 const token=request.headers.get('Authorization');
 if(!token?.startsWith('Bearer '))return json({error:'Log opnieuw in.'},401);
 async function rpc(name,body) {
  const r=await fetch(`${project}/rest/v1/rpc/${name}`,{method:'POST',headers:{apikey:key,Authorization:token,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(12000)});
  if(!r.ok)throw Error('Databaseactie niet bevestigd. Controleer je toegang en vernieuw de gegevens.');
  return r.status===204?null:r.json();
 }
 try {
  if(await rpc('is_doxa_admin',{})!==true)return json({error:'Geen beheerderstoegang.'},403);
  if(url.pathname==='/api/admin/preorder-preview'&&request.method==='GET')return json(await preorderPreview(env));
  if(url.pathname==='/api/admin/test-checkout'&&request.method==='POST')return json(await startTestCheckout(request,env));
  if(url.pathname==='/api/admin/payment-status'&&request.method==='GET')return json({mollie:Boolean(env.MOLLIE_API_KEY),database:Boolean(env.SUPABASE_SERVICE_ROLE_KEY),mail:Boolean(env.RESEND_API_KEY&&env.MAIL_FROM)});
  const configured=Boolean(env.RESEND_API_KEY&&env.MAIL_FROM);
  if(url.pathname==='/api/admin/mail-status'&&request.method==='GET')return json({configured,from:configured?env.MAIL_FROM:null});
  if(url.pathname!=='/api/admin/send-mail'||request.method!=='POST')return json({error:'Niet gevonden.'},404);
  if(!configured)return json({error:'E-mailverzending is nog niet ingesteld. Je concepten en verzendgegevens blijven bewaard.'},503);
  if(Number(request.headers.get('Content-Length')||0)>10000)return json({error:'Verzoek te groot.'},413);
  const raw=await request.text();if(raw.length>10000)return json({error:'Verzoek te groot.'},413);
  const body=JSON.parse(raw);
  if(!/^[0-9a-f-]{36}$/i.test(body.job_id||''))return json({error:'Ongeldige e-mailreferentie.'},400);
  const job=await rpc('start_doxa_mail',{job_id:body.job_id});
  if(job.state==='accepted')return json({accepted:true,id:job.provider_id});
  const html=renderMail(job);
  const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':`doxa-mail/${job.id}`},body:JSON.stringify({from:env.MAIL_FROM,reply_to:env.MAIL_REPLY_TO||'info@doxaessence.com',to:[job.recipient],subject:job.subject,html,text:plainMail(job)}),signal:AbortSignal.timeout(15000)});
  if(!r.ok)return json({error:'De e-maildienst heeft verzending niet bevestigd. Controleer de dienst en probeer dezelfde e-mail opnieuw.'},502);
  const sent=await r.json();if(typeof sent.id!=='string')throw Error('Verzending niet bevestigd.');
  await rpc('finish_doxa_mail',{job_id:job.id,delivery_id:sent.id});
  return json({accepted:true,id:sent.id});
 } catch {return json({error:'De actie kon niet worden bevestigd. Vernieuw de gegevens en controleer de verzendstatus voordat je opnieuw probeert.'},502);}
}
