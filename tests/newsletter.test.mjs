import assert from 'node:assert/strict';
import {newsletterApi,deliverWelcomes} from '../worker/newsletter-api.js';
const env={SUPABASE_SERVICE_ROLE_KEY:'mock',RESEND_API_KEY:'mock',MAIL_FROM:'DOXA ESSENCE <orders@example.invalid>'};
const original=globalThis.fetch;let saved=0,accepted=false,sendCount=0,pending=[],fail=false;
globalThis.fetch=async(url,options={})=>{
 const u=String(url),body=options.body?JSON.parse(options.body):null;
 if(u.includes('rpc/join_doxa_launch_list')){saved++;assert.equal(body.email_address,'owner@example.invalid');return new Response(null,{status:204});}
 if(u.includes('rpc/claim_doxa_welcome'))return Response.json({id:'job',recipient:'owner@example.invalid',subject:'Welcome',body:'Hi <Timothy>,\nThank you.'});
 if(u.includes('doxa_welcome_notifications')){if(options.method==='PATCH'){accepted=true;return Response.json([]);}return Response.json(accepted?[]:[{id:'job'}]);}
 if(u==='https://api.resend.com/emails'){sendCount++;assert.equal(body.from,'Timothy | DOXA ESSENCE <orders@example.invalid>');assert.equal(body.reply_to,'info@doxaessence.com');assert.match(body.html,/&lt;Timothy&gt;/);for(const link of ['https://www.instagram.com/doxa.essence/','https://www.tiktok.com/@doxaessence']){assert.ok(body.html.includes('href="'+link+'"'));assert.ok(body.text.includes(link));}assert.equal(options.headers['Idempotency-Key'],'doxa-welcome/job');return fail?new Response('',{status:503}):Response.json({id:'provider'});}
 throw Error('Unexpected request');
};
const request=(body,origin='https://doxaessence.com')=>new Request('https://doxaessence.com/api/newsletter/signup',{method:'POST',headers:{Origin:origin},body:JSON.stringify(body)});
const input={first_name:'Timothy',email:'Owner@Example.invalid',consent:true};
try{
 assert.equal((await newsletterApi(request(input,'https://evil.invalid'),env,{waitUntil(){}})).status,403);assert.equal(saved,0);
 assert.equal((await newsletterApi(request({...input,consent:false}),env,{waitUntil(){}})).status,400);assert.equal(saved,0);
 assert.equal((await newsletterApi(request(input),env,{waitUntil:p=>pending.push(p)})).status,200);await Promise.all(pending);assert.equal(saved,1);assert.equal(sendCount,1);assert.equal(accepted,true);
 await deliverWelcomes(env);assert.equal(sendCount,1);
 accepted=false;fail=true;await deliverWelcomes(env);assert.equal(accepted,false);fail=false;await deliverWelcomes(env);assert.equal(accepted,true);
 console.log('PASS: same-origin signup, consent, normalized email, personalized escaped mail, reply-to, stable deduplication key, accepted jobs skipped, failures retried.');
}finally{globalThis.fetch=original;}
