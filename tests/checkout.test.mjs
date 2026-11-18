import assert from 'node:assert/strict';
import {checkoutApi,syncPayment,deliverNotifications,cents,validateCheckout} from '../worker/checkout-api.js';
assert.equal(cents('100.01'),10001);for(const value of ['1e3','10.001','-1.00',null])assert.throws(()=>cents(value));
const input={id:'12345678-1234-4123-8123-123456789abc',token:'a'.repeat(64),quantity:2,email:'Customer@Example.invalid',address:{first_name:'Test',last_name:'Buyer',street:'Teststraat 12',postal_code:'1234 AB',city:'Amsterdam',country:'NL'}};
assert.equal(validateCheckout(input).email,'customer@example.invalid');assert.throws(()=>validateCheckout({...input,quantity:0}));assert.throws(()=>validateCheckout({...input,address:{...input.address,country:'BE'}}));assert.throws(()=>validateCheckout({...input,address:{...input.address,street:'No house number'}}));
const env={MOLLIE_API_KEY:'test_mock',SUPABASE_SERVICE_ROLE_KEY:'service_mock',RESEND_API_KEY:'resend_mock',MAIL_FROM:'DOXA <orders@example.invalid>'};
let live=true,amount='205.00',paymentState='paid',providerCalls=0,finalized=0,emails=0,jobAccepted=false,paymentPayload,session={...input,email:'customer@example.invalid',token_hash:'',product_name:'The Genesis',unit_price_cents:10000,shipping_cents:500,created_at:new Date().toISOString(),payment_id:null,state:'creating'};
const oldFetch=globalThis.fetch;
globalThis.fetch=async(url,options={})=>{
 const address=String(url),body=options.body?JSON.parse(options.body):null;
 if(address.startsWith('https://api.mollie.com/')){providerCalls++;
  if(options.method==='POST'){paymentPayload=body;assert.equal(options.headers['Idempotency-Key'],input.id);return Response.json({id:'tr_mocked123',_links:{checkout:{href:'https://www.mollie.com/checkout/test'}}});}
  return Response.json({id:'tr_mocked123',mode:'test',metadata:{checkout_id:input.id},amount:{currency:'EUR',value:amount},status:paymentState});
 }
 if(address==='https://api.resend.com/emails'){emails++;assert.equal(body.to[0],'customer@example.invalid');assert.match(body.html,/DOXA/);assert.equal(options.headers['Idempotency-Key'],'doxa-order/job-1');return Response.json({id:'accepted-1'});}
 if(address.includes('/rpc/begin_doxa_checkout')){session.token_hash=body.access_hash;return Response.json(session);}
 if(address.includes('/rpc/bind_doxa_payment')){session.payment_id=body.provider_payment;session.checkout_url=body.payment_url;return Response.json(null);}
 if(address.includes('/rpc/finalize_doxa_payment')){finalized++;assert.equal(body.amount_cents,20500);return Response.json({...session,state:body.payment_state,order_id:body.payment_state==='paid'?'order-1':null});}
 if(address.includes('/rpc/claim_doxa_order_notification'))return Response.json({id:'job-1',audience:'customer',recipient:'customer@example.invalid',subject:'Order confirmation',blocks:[{type:'text',text:'Confirmed'}]});
 if(address.includes('/doxa_order_notifications')){if(options.method==='PATCH'){jobAccepted=true;return Response.json([]);}return Response.json(jobAccepted?[]:[{id:'job-1'}]);}
 if(address.includes('/doxa_checkout_sessions'))return Response.json(address.includes('payment_id=eq.')?(session.payment_id?[session]:[]):address.includes('select=id')?[]:[session]);
 if(address.includes('/doxa_checkout_settings'))return Response.json([{product_id:'product-1',enabled:true,shipping_cents:500,merchant_email:'merchant@example.invalid'}]);
 if(address.includes('/doxa_site'))return Response.json([{live}]);
 if(address.includes('/doxa_products')){assert.ok(address.includes('id=eq.product-1'));return Response.json([{id:'product-1',name:'The Genesis',price_cents:10000,stock:10,status:'active'}]);}
 throw Error('Unexpected URL '+address);
};
const request=(path,body,origin='https://doxaessence.com')=>new Request('https://doxaessence.com'+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
try{
 assert.equal((await checkoutApi(request('/api/checkout/create',input,'https://evil.test'),env)).status,403);assert.equal(providerCalls,0);
 assert.equal((await checkoutApi(request('/api/checkout/create',input),{})).status,503);
 live=false;assert.equal((await checkoutApi(request('/api/checkout/create',input),env)).status,409);assert.equal(providerCalls,0);live=true;
 const created=await checkoutApi(request('/api/checkout/create',{...input,price_cents:1,shipping_cents:0}),env);assert.equal(created.status,200);assert.equal((await created.json()).checkout_url,'https://www.mollie.com/checkout/test');
 assert.deepEqual(paymentPayload.amount,{currency:'EUR',value:'205.00'});assert.equal(paymentPayload.metadata.checkout_id,input.id);assert.ok(paymentPayload.redirectUrl.startsWith('https://doxaessence.com/order-status/'));assert.equal(finalized,0);
 amount='0.01';await assert.rejects(()=>syncPayment(env,session));assert.equal(finalized,0);amount='205.00';
 const pending=await syncPayment(env,session);assert.equal(pending.state,'paid');assert.equal(finalized,1);
 paymentState='pending';const waiting=await syncPayment(env,session);assert.equal(waiting.state,'pending');
 const originalSession={...session};session={...session,id:'00000000-1234-4123-8123-123456789abc'};await assert.rejects(()=>syncPayment(env,session));session=originalSession;
 await deliverNotifications(env);await deliverNotifications(env);assert.equal(emails,1);assert.equal(jobAccepted,true);
 console.log('PASS: validation, closed gate, same-origin, backend prices, Mollie idempotency, redirect does not mark paid, verified amount/metadata/mode, pending status, durable mail acceptance. No external calls or real payments.');
}finally{globalThis.fetch=oldFetch;}
