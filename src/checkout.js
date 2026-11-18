import {formatDispatch} from '../shared/preorder.js';
import {adminRequest} from './admin-api.js';
export async function initCheckout(){
 const form=document.getElementById('checkout-form'),button=document.getElementById('checkout-pay'),feedback=document.getElementById('checkout-feedback');
 const money=cents=>new Intl.NumberFormat('en-NL',{style:'currency',currency:'EUR'}).format(cents/100);
 const quantity=Number(document.getElementById('checkout-quantity').textContent)||1;
 let ready=false,request=null,locked=false,preorderOffer=null;
 const preview=location.pathname.startsWith('/preview');
 try{
  const config=preview?await adminRequest('preorder-preview'):await (await fetch('/api/checkout/config',{cache:'no-store'})).json();
  if((!config.ready&&!preview)||!Number.isInteger(config.unit_price_cents)||quantity>config.max_quantity){feedback.textContent='Checkout is not open yet, or the selected quantity is unavailable.';return;}
  const shippingKnown=Number.isInteger(config.shipping_cents);
  for(const el of document.querySelectorAll('[data-content="product_price"]'))el.textContent=money(config.unit_price_cents*quantity);
  for(const el of document.querySelectorAll('[data-content="checkout_delivery_value"]'))el.textContent=shippingKnown?money(config.shipping_cents):'To be confirmed';
  for(const el of document.querySelectorAll('[data-content="checkout_total_value"]'))el.textContent=shippingKnown?money(config.unit_price_cents*quantity+config.shipping_cents):'To be confirmed';
  for(const el of document.querySelectorAll('[data-content="checkout_notice"]'))el.textContent='Pay securely with Mollie. Your order is confirmed after your payment is verified.';
  for(const el of document.querySelectorAll('[data-content="shipping_copy"]'))el.textContent='Delivery within the Netherlands. '+(shippingKnown?money(config.shipping_cents):'Shipping costs to be confirmed.');
  for(const el of document.querySelectorAll('[data-content="checkout_payment_copy"]'))el.textContent='Choose your payment method on Mollie’s secure payment page.';
  for(const el of document.querySelectorAll('[data-content="checkout_data_copy"]'))el.textContent='Your details are used to process and deliver your order. Read our privacy policy for more information.';
  document.getElementById('checkout-security').textContent='You will leave Doxa Essence to complete your payment securely with Mollie.';
  if(config.sale_mode==='preorder'){
   preorderOffer=config.preorder_offer;
   const date=config.dispatch_date?formatDispatch(config.dispatch_date):'a date to be confirmed';
   for(const el of document.querySelectorAll('[data-content="checkout_notice"]'))el.textContent='PRE-ORDER — full payment now. Expected dispatch from '+date+'.';
   for(const el of document.querySelectorAll('[data-content="product_volume"]'))el.textContent=config.product_details||'Product specification to be confirmed.';
   const note=document.createElement('p');note.className='checkout-data-note';note.textContent=config.returns_policy||'Cancellation and return information to be confirmed.';form.append(note);
   const label=document.createElement('label');label.className='preorder-consent';const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.name='preorder_acknowledged';checkbox.required=true;
   const text=document.createElement('span');text.textContent='I understand this is a pre-order, paid in full now, with expected dispatch from '+date+'. I have read the cancellation and return information above.';label.append(checkbox,text);form.append(label);
  }
  button.textContent=preview?'PRIVATE PREVIEW — PAYMENT DISABLED':'PAY '+money(config.unit_price_cents*quantity+config.shipping_cents)+' WITH MOLLIE';button.disabled=preview;ready=!preview;
  if(preview)feedback.textContent='Private preview: you can review the form. No order or payment will be created.';
 }catch{feedback.textContent='Checkout is not available right now. Please try again later.';}
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(!ready||locked||!form.reportValidity())return;button.disabled=true;locked=true;
  try{
   // Reuse the exact request after an uncertain response; never create an accidental second payment.
   if(!request){const data=new FormData(form);const token=[...crypto.getRandomValues(new Uint8Array(32))].map(x=>x.toString(16).padStart(2,'0')).join('');request={id:crypto.randomUUID(),token,quantity,email:data.get('email'),preorder_acknowledged:data.has('preorder_acknowledged'),preorder_offer:preorderOffer,address:Object.fromEntries(['first_name','last_name','street','postal_code','city','country'].map(key=>[key,data.get(key)]))};sessionStorage.setItem('doxa-checkout/'+request.id,token);}
   feedback.textContent='Preparing your secure payment…';for(const input of form.elements)input.disabled=true;
   const response=await fetch('/api/checkout/create',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(request),signal:AbortSignal.timeout(30000)});const result=await response.json();
   if(!response.ok){if(response.status===400){sessionStorage.removeItem('doxa-checkout/'+request.id);request=null;for(const input of form.elements)input.disabled=false;}throw Error(result.error||'Could not prepare your payment.');}
   if(!/^https:\/\/([a-z0-9-]+\.)?mollie\.com\//.test(result.checkout_url||''))throw Error('Invalid payment link.');
   location.assign(result.checkout_url);
  }catch(error){feedback.textContent=error.message+(request?' Your details remain fixed for a safe retry. Contact us if they need correction.':' Please correct your details and try again.');button.disabled=false;button.textContent='RETRY THIS PAYMENT';locked=false;}
 });
}
