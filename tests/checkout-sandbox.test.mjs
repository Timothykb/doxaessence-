import assert from 'node:assert/strict';
import {createMollieCheckout,syncPayment,startTestCheckout} from '../worker/checkout-api.js';
import {adminApi} from '../worker/admin-api.js';
const old=globalThis.fetch;
const env={MOLLIE_API_KEY:'live_mock',MOLLIE_TEST_API_KEY:'test_mock',SUPABASE_SERVICE_ROLE_KEY:'mock',RESEND_API_KEY:'mock',MAIL_FROM:'mock'};
const s={id:'12345678-1234-4123-8123-123456789abc',created_at:new Date().toISOString(),test_mode:true,quantity:1,unit_price_cents:100,shipping_cents:0,payment_id:'tr_test123'};
let mode='test',calls=0,finalized=0;
globalThis.fetch=async(url,options={})=>{
 if(String(url).includes('api.mollie.com')){calls++;assert.equal(options.headers.Authorization,'Bearer test_mock');return Response.json({id:s.payment_id,mode,metadata:{checkout_id:s.id},amount:{currency:'EUR',value:'1.00'},status:'paid',_links:{checkout:{href:'https://www.mollie.com/checkout/test'}}});}
 if(String(url).includes('finalize_doxa_payment')){finalized++;return Response.json({...s,state:'paid'});}
 if(String(url).includes('bind_doxa_payment'))return Response.json(null);
 if(String(url).includes('is_doxa_admin'))return Response.json(false);
 throw Error('Unexpected request');
};
try{
 await assert.rejects(()=>syncPayment({...env,MOLLIE_TEST_API_KEY:undefined},s));assert.equal(calls,0);
 await assert.rejects(()=>startTestCheckout(new Request('https://doxaessence.com/api/admin/test-checkout',{method:'POST',body:'{}'}),{...env,MOLLIE_TEST_API_KEY:'live_wrong'}));assert.equal(calls,0);
 await syncPayment(env,s);assert.equal(finalized,1);mode='live';await assert.rejects(()=>syncPayment(env,s));assert.equal(finalized,1);
 await createMollieCheckout(env,{...s,payment_id:null},'https://doxaessence.com');
 const request=new Request('https://doxaessence.com/api/admin/test-checkout',{method:'POST',headers:{Origin:'https://doxaessence.com'},body:'{}'});
 assert.equal((await adminApi(request,env)).status,401);
 const denied=new Request(request,{headers:{Origin:'https://doxaessence.com',Authorization:'Bearer fake'}});assert.equal((await adminApi(denied,env)).status,403);
 console.log('PASS: test payments use only test credential, missing/wrong key fails closed, live provider mode rejected, admin authentication required.');
}finally{globalThis.fetch=old;}
