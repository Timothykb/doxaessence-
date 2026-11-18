import assert from 'node:assert/strict';
import {renderMail,validateMail,safeLink} from '../shared/email.js';
import {adminApi} from '../worker/admin-api.js';
const mail={subject:'Question <test>',blocks:[{type:'text',text:'<script>alert(1)</script>'},{type:'button',text:'Shop now',url:'https://doxaessence.com/?q="test"'}]};
const html=renderMail(mail);assert.ok(!html.includes('<script>'));assert.ok(html.includes('&lt;script&gt;'));assert.ok(html.includes('DOXA'));
for(const url of ['javascript:alert(1)','data:text/html,test','http://example.com','https://user:password@example.com'])assert.equal(safeLink(url),'');
assert.throws(()=>validateMail({...mail,subject:'test\nBcc: bad@example.com'}));
assert.throws(()=>validateMail({...mail,blocks:[{type:'button',text:'Click',url:'javascript:alert(1)'}]}));
const originalFetch=globalThis.fetch;let providerCalls=0;let accepted=false;
globalThis.fetch=async(url,options)=>{
 if(url.endsWith('/is_doxa_admin'))return Response.json(options.headers.Authorization==='Bearer admin');
 if(url.endsWith('/start_doxa_mail'))return Response.json({...mail,id:'00000000-0000-0000-0000-000000000001',recipient:'test@example.invalid',state:accepted?'accepted':'uncertain',provider_id:accepted?'receipt-1':null});
 if(url.endsWith('/finish_doxa_mail')){accepted=true;return new Response(null,{status:204});}
 if(url==='https://api.resend.com/emails'){providerCalls++;assert.equal(options.headers['Idempotency-Key'],'doxa-mail/00000000-0000-0000-0000-000000000001');const payload=JSON.parse(options.body);assert.deepEqual(payload.to,['test@example.invalid']);assert.ok(!payload.html.includes('<script>'));return Response.json({id:'receipt-1'});}
 throw Error('Unexpected request');
};
try{
 const url='https://doxaessence.com/api/admin/send-mail';
 const request=(auth,origin='https://doxaessence.com')=>new Request(url,{method:'POST',headers:{Origin:origin,Authorization:auth,'Content-Type':'application/json'},body:JSON.stringify({job_id:'00000000-0000-0000-0000-000000000001'})});
 assert.equal((await adminApi(request('Bearer admin','https://evil.example'),{})).status,403);
 assert.equal((await adminApi(request(''),{})).status,401);
 assert.equal((await adminApi(request('Bearer not-admin'),{})).status,403);
 assert.equal((await adminApi(request('Bearer admin'),{})).status,503);assert.equal(providerCalls,0);
 const env={RESEND_API_KEY:'fake',MAIL_FROM:'DOXA <test@example.invalid>'};
 assert.equal((await adminApi(request('Bearer admin'),env)).status,200);
 assert.equal((await adminApi(request('Bearer admin'),env)).status,200);assert.equal(providerCalls,1);
}finally{globalThis.fetch=originalFetch;}
console.log('PASS: escaped email HTML, safe links, subject validation, authorization, origin checks, disabled unconfigured transport and replay without duplicate send. No real email sent.');
