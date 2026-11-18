import assert from 'node:assert/strict';
import {preorderReady,formatDispatch} from '../shared/preorder.js';
import {checkoutApi} from '../worker/checkout-api.js';
import {adminApi} from '../worker/admin-api.js';
const settings={product_id:'product-1',sale_mode:'preorder',enabled:true,shipping_cents:495,merchant_email:'owner@example.invalid',preorder_dispatch_date:'2099-12-01',preorder_product_details:'Confirmed product specification',preorder_returns:'Confirmed cancellation and return information.',preorder_notes_confirmed:true};
assert.equal(preorderReady(settings,'2026-10-30'),true);
for(const changed of [{preorder_dispatch_date:null},{preorder_dispatch_date:'2026-10-29'},{preorder_dispatch_date:'2099-02-31'},{preorder_product_details:''},{preorder_returns:''},{preorder_notes_confirmed:false}])assert.equal(preorderReady({...settings,...changed},'2026-10-30'),false);
assert.match(formatDispatch('2099-12-01'),/1 December 2099/);
const original=globalThis.fetch;let calls=0,reservations=0,requestBody,live=true,isAdmin=false;
const env={MOLLIE_API_KEY:'test_mock',SUPABASE_SERVICE_ROLE_KEY:'mock',RESEND_API_KEY:'mock',MAIL_FROM:'mock'};
const body={id:'12345678-1234-4123-8123-123456789abc',token:'a'.repeat(64),quantity:1,email:'buyer@example.invalid',address:{first_name:'Test',last_name:'Buyer',street:'Teststraat 1',postal_code:'1234 AB',city:'Test',country:'NL'}};
globalThis.fetch=async(url,options={})=>{
 const address=String(url),data=options.body?JSON.parse(options.body):null;
 if(address.includes('/rpc/is_doxa_admin'))return Response.json(isAdmin);
 if(address.includes('api.mollie.com')){calls++;assert.deepEqual(data.amount,{currency:'EUR',value:'94.94'});return Response.json({id:'tr_mock123',_links:{checkout:{href:'https://www.mollie.com/checkout/test'}}});}
 if(address.includes('/rpc/begin_doxa_preorder_checkout')){reservations++;requestBody=data;return Response.json({...body,product_id:'product-1',unit_price_cents:8999,shipping_cents:495,sale_mode:'preorder',created_at:new Date().toISOString()});}
 if(address.includes('/rpc/bind_doxa_payment'))return Response.json(null);
 if(address.includes('/doxa_checkout_settings'))return Response.json([settings]);
 if(address.includes('/doxa_site'))return Response.json([{live,published:{home_mode:'preorder'}}]);
 if(address.includes('/doxa_products'))return Response.json([{id:'product-1',name:'The Genesis',sku:'CHANGED-SKU',price_cents:8999,stock:25,status:'active'}]);
 if(address.includes('/doxa_checkout_sessions'))return Response.json([]);
 throw Error('Unexpected request');
};
const create=data=>checkoutApi(new Request('https://doxaessence.com/api/checkout/create',{method:'POST',headers:{Origin:'https://doxaessence.com'},body:JSON.stringify(data)}),env);
const config=()=>checkoutApi(new Request('https://doxaessence.com/api/checkout/config'),env);
try{
 let c=await (await config()).json();assert.equal(c.ready,true);assert.equal(c.sale_mode,'preorder');assert.equal(c.dispatch_date,'2099-12-01');
 assert.equal((await create(body)).status,400);assert.equal(reservations,0);
 assert.equal((await create({...body,preorder_acknowledged:true,preorder_offer:'outdated'})).status,400);assert.equal(reservations,0);
 const offer=c.preorder_offer;settings.preorder_dispatch_date='2099-12-02';assert.equal((await create({...body,preorder_acknowledged:true,preorder_offer:offer})).status,400);assert.equal(calls,0);
 c=await (await config()).json();const response=await create({...body,preorder_acknowledged:true,preorder_offer:c.preorder_offer,price_cents:1});assert.equal(response.status,200);assert.equal(calls,1);assert.equal(reservations,1);assert.equal(requestBody.expected_unit_price_cents,8999);assert.equal(requestBody.expected_dispatch_date,'2099-12-02');assert.equal(requestBody.preorder_acknowledged,true);
 settings.preorder_notes_confirmed=false;assert.deepEqual(await (await config()).json(),{ready:false});assert.equal((await create({...body,preorder_acknowledged:true})).status,409);assert.equal(calls,1);
 settings.preorder_notes_confirmed=true;live=false;assert.deepEqual(await (await config()).json(),{ready:false});
 const previewRequest=authorization=>new Request('https://doxaessence.com/api/admin/preorder-preview',{headers:authorization?{Authorization:authorization}:{}});
 assert.equal((await adminApi(previewRequest(),env)).status,401);
 assert.equal((await adminApi(previewRequest('Bearer not-admin'),env)).status,403);
 isAdmin=true;const preview=await (await adminApi(previewRequest('Bearer admin'),env)).json();assert.equal(preview.preview,true);assert.equal(preview.ready,false);assert.equal(preview.unit_price_cents,8999);
 live=true;settings.sale_mode='regular';assert.deepEqual(await (await config()).json(),{ready:false});
 console.log('PASS: pre-order completeness, actual dates, owner confirmation, explicit customer acknowledgement, immutable offer price/dispatch/returns, changed offer rejected before reservation, real Mollie handoff payload, closed-site gate. No external calls.');
}finally{globalThis.fetch=original;}
