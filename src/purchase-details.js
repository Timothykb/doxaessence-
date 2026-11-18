import {formatDispatch} from '../shared/preorder.js';
export async function loadPurchaseDetails(){
 try{
  const response=await fetch('/api/checkout/config',{cache:'no-store'}),c=await response.json();if(!response.ok||!c.ready)return;
  const money=value=>new Intl.NumberFormat('en-NL',{style:'currency',currency:'EUR'}).format(value/100);
  const fill=(key,text)=>document.querySelectorAll('[data-content="'+key+'"]').forEach(el=>el.textContent=text);
  fill('product_price',money(c.unit_price_cents));fill('shipping_copy','Delivery within the Netherlands: '+money(c.shipping_cents)+'.');
  if(c.sale_mode==='preorder'){
   fill('buy_button','PRE-ORDER THE GENESIS ↗');fill('product_volume',c.product_details);fill('product_details',c.product_details);
   fill('checkout_notice','Pre-order — pay in full now. Expected dispatch from '+formatDispatch(c.dispatch_date)+'.');fill('availability_copy','Available to pre-order for later dispatch.');fill('returns_copy',c.returns_policy);
  }
 }catch{/* A closed checkout preserves the unpublished product presentation. */}
}
