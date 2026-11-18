import {renderMail,plainMail} from '../shared/email.js';
import {preorderReady} from '../shared/preorder.js';
const database='https://xjdvjdctwdswkcnpqqni.supabase.co';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});
export const cents=value=>{if(typeof value!=='string'||!/^\d{1,8}\.\d{2}$/.test(value))throw Error('Invalid amount');return Number(value.replace('.',''));};
export function validateCheckout(body){
 if(!body||!uuid.test(body.id)||!/^\w{64}$/.test(body.token)||!Number.isInteger(body.quantity)||body.quantity<1||body.quantity>5)throw Error('Invalid checkout');
 const text=(value,max)=>{if(typeof value!=='string'||!value.trim()||value.trim().length>max||/[\x00-\x1f]/.test(value))throw Error('Invalid address');return value.trim();};
 const email=text(body.email,254).toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error('Invalid email');
 const a=body.address;if(!a||a.country!=='NL')throw Error('Delivery is available in the Netherlands only');
 const address={first_name:text(a.first_name,100),last_name:text(a.last_name,100),street:text(a.street,200),postal_code:text(a.postal_code,20).toUpperCase(),city:text(a.city,100),country:'NL'};
 if(!/^\d{4}\s?[A-Z]{2}$/.test(address.postal_code)||!/[0-9]/.test(address.street))throw Error('Enter a Dutch postal code and house number');
 return {...body,email,address};
}
async function digest(value){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(x=>x.toString(16).padStart(2,'0')).join('');}
export function dbClient(env){return async(path,body,method)=>{
 const response=await fetch(database+'/rest/v1/'+path,{method:method||(body?'POST':'GET'),headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:`Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,'Content-Type':'application/json',Prefer:'return=representation'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw Error('Database unavailable');return response.status===204?null:response.json();
};}
const configured=env=>Boolean(env.MOLLIE_API_KEY&&env.SUPABASE_SERVICE_ROLE_KEY&&env.RESEND_API_KEY&&env.MAIL_FROM);
async function mollie(env,path,body,id){
 const response=await fetch('https://api.mollie.com/v2/'+path,{method:body?'POST':'GET',headers:{Authorization:`Bearer ${env.MOLLIE_API_KEY}`,'Content-Type':'application/json',...(id?{'Idempotency-Key':id}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw Error('Payment provider unavailable');return response.json();
}
async function catalog(env){
 const db=dbClient(env);
 const [settings,site]=await Promise.all([db('doxa_checkout_settings?id=eq.1&select=*'),db('doxa_site?id=eq.1&select=live,published')]);
 const c=settings[0],products=c?.product_id?await db('doxa_products?id=eq.'+encodeURIComponent(c.product_id)+'&select=id,name,price_cents,stock,status'):[],p=products[0];
 return {ready:Boolean(configured(env)&&site[0]?.live&&c?.enabled&&Number.isInteger(c.shipping_cents)&&c.merchant_email&&p?.status==='active'&&p.price_cents>0&&p.stock>0&&preorderReady(c)&&(site[0].published?.home_mode!=='preorder'||c.sale_mode==='preorder')),product:p,settings:c};
}
async function preorderOffer(c){return digest(JSON.stringify([c.product.id,c.product.price_cents,c.settings.shipping_cents,c.settings.preorder_dispatch_date,c.settings.preorder_product_details,c.settings.preorder_returns]));}
export async function preorderPreview(env){
 const c=await catalog(env);if(!c.product)return {ready:false};
 return {ready:c.ready,preview:true,name:c.product.name,unit_price_cents:c.product.price_cents,shipping_cents:c.settings.shipping_cents,country:'NL',max_quantity:Math.max(1,Math.min(5,c.product.stock)),sale_mode:c.settings.sale_mode||'regular',dispatch_date:c.settings.preorder_dispatch_date,product_details:c.settings.preorder_product_details,returns_policy:c.settings.preorder_returns};
}
export async function syncPayment(env,session){
 env=paymentEnvironment(env,session);
 const payment=await mollie(env,'payments/'+encodeURIComponent(session.payment_id));
 if(payment.id!==session.payment_id||payment.metadata?.checkout_id!==session.id||payment.amount?.currency!=='EUR'||cents(payment.amount.value)!==session.unit_price_cents*session.quantity+session.shipping_cents)throw Error('Payment mismatch');
 const expectedMode=env.MOLLIE_API_KEY.startsWith('test_')?'test':'live';if(payment.mode!==expectedMode)throw Error('Payment mode mismatch');
 return dbClient(env)('rpc/finalize_doxa_payment',{session_id:session.id,provider_payment:payment.id,payment_state:payment.status,amount_cents:cents(payment.amount.value),currency_code:payment.amount.currency});
}
function paymentEnvironment(env,session){
 if(!session.test_mode)return env;
 if(!env.MOLLIE_TEST_API_KEY?.startsWith('test_'))throw Error('Test key unavailable');
 return {...env,MOLLIE_API_KEY:env.MOLLIE_TEST_API_KEY};
}
export async function createMollieCheckout(env,session,origin){
 env=paymentEnvironment(env,session);
 if(session.payment_id)return session.checkout_url;
 if(Date.now()-Date.parse(session.created_at)>45*60000)throw Error('Payment retry expired');
 const payment=await mollie(env,'payments',{amount:{currency:'EUR',value:((session.quantity*session.unit_price_cents+session.shipping_cents)/100).toFixed(2)},description:(session.test_mode?'TEST — ':session.sale_mode==='preorder'?'PRE-ORDER — ':'')+'DOXA ESSENCE '+session.id,redirectUrl:origin+'/order-status/?reference='+session.id,webhookUrl:origin+'/api/mollie/webhook',metadata:{checkout_id:session.id}},session.id);
 const link=payment._links?.checkout?.href;if(!/^https:\/\/([a-z0-9-]+\.)?mollie\.com\//.test(link||'')||!/^tr_[a-zA-Z0-9]{4,100}$/.test(payment.id||''))throw Error('Invalid provider response');
 await dbClient(env)('rpc/bind_doxa_payment',{session_id:session.id,provider_payment:payment.id,payment_url:link});
 return link;
}
export async function startTestCheckout(request,env){
 if(!env.MOLLIE_TEST_API_KEY?.startsWith('test_')||!configured(env))throw Error('Sandbox unavailable');
 const raw=await request.text();if(raw.length>1000)throw Error('Invalid request');
 const input=JSON.parse(raw);if(!uuid.test(input.id)||!/^\w{64}$/.test(input.token||''))throw Error('Invalid request');
 const session=await dbClient(env)('rpc/begin_doxa_test_checkout',{session_id:input.id,access_hash:await digest(input.token)});
 return {checkout_url:await createMollieCheckout(env,session,new URL(request.url).origin)};
}
export async function deliverNotifications(env,sessionId){
 if(!env.RESEND_API_KEY||!env.MAIL_FROM||!env.SUPABASE_SERVICE_ROLE_KEY)return;
 const cutoff=encodeURIComponent(new Date(Date.now()-23*3600000).toISOString());
 const db=dbClient(env), jobs=await db('doxa_order_notifications?accepted_at=is.null&or=(first_attempt_at.is.null,first_attempt_at.gt.'+cutoff+')&order=last_attempt_at.asc.nullsfirst&limit=20'+(sessionId?'&session_id=eq.'+encodeURIComponent(sessionId):''));
 for(const row of jobs){try{
  const job=await db('rpc/claim_doxa_order_notification',{notification_id:row.id});if(!job?.id)continue;
  const mail={...job,language:job.audience==='merchant'?'nl':'en'};
  const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':'doxa-order/'+job.id},body:JSON.stringify({from:env.MAIL_FROM,reply_to:env.MAIL_REPLY_TO||'info@doxaessence.com',to:[job.recipient],subject:job.subject,html:renderMail(mail),text:plainMail(mail)}),signal:AbortSignal.timeout(10000)});
  if(!response.ok)continue;const sent=await response.json();if(typeof sent.id!=='string')continue;
  await db('doxa_order_notifications?id=eq.'+job.id,{provider_id:sent.id,accepted_at:new Date().toISOString()},'PATCH');
 }catch{/* Durable outbox is retried by the scheduled handler. */}}
}
export async function reconcileCheckout(env){
 if(!env.SUPABASE_SERVICE_ROLE_KEY||!env.MOLLIE_API_KEY)return;
 const db=dbClient(env),rows=await db('doxa_checkout_sessions?state=in.(creating,open,pending,authorized)&payment_id=not.is.null&order=last_checked_at.asc.nullsfirst&limit=20');
 await Promise.allSettled(rows.map(async row=>{try{await syncPayment(env,row);}finally{await db('doxa_checkout_sessions?id=eq.'+row.id,{last_checked_at:new Date().toISOString()},'PATCH');}}));
 await deliverNotifications(env);
}
export async function checkoutApi(request,env,ctx={waitUntil:()=>{}}){
 const url=new URL(request.url), path=url.pathname;
 try{
  if(path==='/api/checkout/config'&&request.method==='GET'){
   if(!env.SUPABASE_SERVICE_ROLE_KEY)return json({ready:false});const c=await catalog(env);
   return json(c.ready?{ready:true,name:c.product.name,unit_price_cents:c.product.price_cents,shipping_cents:c.settings.shipping_cents,country:'NL',max_quantity:Math.min(5,c.product.stock),sale_mode:c.settings.sale_mode||'regular',dispatch_date:c.settings.preorder_dispatch_date,product_details:c.settings.preorder_product_details,returns_policy:c.settings.preorder_returns,...(c.settings.sale_mode==='preorder'?{preorder_offer:await preorderOffer(c)}:{})}:{ready:false});
  }
  if(path==='/api/mollie/webhook'&&request.method==='POST'){
   if(!env.MOLLIE_API_KEY||!env.SUPABASE_SERVICE_ROLE_KEY)return json({error:'Unavailable'},503);
   if(Number(request.headers.get('Content-Length')||0)>1000)return json({error:'Invalid webhook'},413);
   const raw=await request.text();if(raw.length>1000)return json({error:'Invalid webhook'},400);
   const id=new URLSearchParams(raw).get('id');if(!/^tr_[a-zA-Z0-9]{4,100}$/.test(id||''))return json({error:'Invalid payment'},400);
   const rows=await dbClient(env)('doxa_checkout_sessions?payment_id=eq.'+id+'&select=*');
   if(!rows[0])return json({error:'Not yet linked'},503);
   const session=await syncPayment(env,rows[0]);if(session.state==='paid')ctx.waitUntil(deliverNotifications(env,session.id));
   return json({received:true});
  }
  if(!['/api/checkout/create','/api/checkout/status'].includes(path)||request.method!=='POST')return json({error:'Not found'},404);
  if(request.headers.get('Origin')!==url.origin)return json({error:'Invalid origin'},403);
  if(env.CHECKOUT_LIMIT){const limited=await env.CHECKOUT_LIMIT.limit({key:path+':'+(request.headers.get('CF-Connecting-IP')||'unknown')});if(!limited.success)return json({error:'Too many attempts. Please wait a minute before retrying.'},429);}
  if(!env.SUPABASE_SERVICE_ROLE_KEY||!env.MOLLIE_API_KEY||(path==='/api/checkout/create'&&!configured(env)))return json({error:'Checkout is not open yet.'},503);
  if(Number(request.headers.get('Content-Length')||0)>6000)return json({error:'Request too large'},413);
  const raw=await request.text();if(raw.length>6000)return json({error:'Request too large'},413);
  let body;try{body=JSON.parse(raw);}catch{return json({error:'Invalid request'},400);}
  if(!uuid.test(body?.id)||!/^\w{64}$/.test(body?.token||''))return json({error:'Invalid checkout reference'},400);
  const db=dbClient(env),hash=await digest(body.token);
  if(path==='/api/checkout/status'){
   const rows=await db('doxa_checkout_sessions?id=eq.'+body.id+'&token_hash=eq.'+hash+'&select=*');if(!rows[0])return json({error:'Order not found'},404);
   let session=rows[0];if(session.payment_id&&session.state!=='paid')session=await syncPayment(env,session);
   if(session.state==='paid')ctx.waitUntil(deliverNotifications(env,session.id));
   return json({state:session.state,order_id:session.order_id,test_mode:session.test_mode===true,sale_mode:session.sale_mode,dispatch_date:session.dispatch_date});
  }
  let input;try{input=validateCheckout(body);}catch{return json({error:'Check your email, Dutch delivery address and quantity.'},400);}
  const existing=await db('doxa_checkout_sessions?id=eq.'+input.id+'&token_hash=eq.'+hash+'&select=id,sale_mode');
  const configuration=existing.length?null:await catalog(env);
  if(!existing.length && !configuration.ready)return json({error:'Checkout is not open or this perfume is unavailable.'},409);
  const preorder=(existing[0]?.sale_mode||configuration?.settings?.sale_mode)==='preorder';
  if(!existing.length&&!preorder&&input.preorder_offer)return json({error:'The sale type changed. Refresh checkout before placing your order.'},400);
  if(preorder&&input.preorder_acknowledged!==true)return json({error:'Confirm that this is a paid pre-order with a later expected dispatch date.'},400);
  if(preorder&&!existing.length&&input.preorder_offer!==await preorderOffer(configuration))return json({error:'The pre-order details changed. Refresh checkout and review the current price and dispatch information.'},400);
  const session=await db('rpc/'+(preorder?'begin_doxa_preorder_checkout':'begin_doxa_checkout'),{session_id:input.id,access_hash:hash,customer_email:input.email,delivery_address:input.address,item_quantity:input.quantity,...(preorder?{preorder_acknowledged:true,expected_dispatch_date:configuration?.settings.preorder_dispatch_date||null,expected_product_details:configuration?.settings.preorder_product_details||null,expected_returns_policy:configuration?.settings.preorder_returns||null,expected_unit_price_cents:configuration?.product.price_cents||null,expected_shipping_cents:configuration?.settings.shipping_cents??null}:{})});
  if(session.payment_id){if(!['creating','open','pending'].includes(session.state))return json({error:'This payment is closed. Check its status before starting again.'},409);return json({checkout_url:session.checkout_url});}
  // Keep the creation payload immutable across retries; never retry beyond Mollie's one-hour idempotency window.
  if(Date.now()-Date.parse(session.created_at)>45*60000)return json({error:'Payment needs review. Contact us before starting again.'},409);
  if(session.test_mode)return json({error:'Use the administrator test checkout.'},403);
  const link=await createMollieCheckout(env,session,url.origin);
  return json({checkout_url:link});
 }catch{return json({error:'We could not confirm this step. Please retry the same checkout or contact us before starting a new payment.'},503);}
}
