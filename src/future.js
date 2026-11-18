import './style.css';
import './future.css';
import { defaults } from './site-content.js';
import { supabase } from './supabase.js';
let content = defaults;
if (location.pathname.startsWith('/preview')) {
 document.getElementById('preview-banner').hidden=false;
 const {data,error}=await supabase.from('doxa_site').select('draft').eq('id',1).single();
 if(error) { document.querySelector('main').textContent='Preview unavailable. Sign in through Studio and open the preview again.'; }
 else content={...defaults,...data.draft};
} else if (!import.meta.env.DEV) {
 try {const response=await fetch('/api/site',{cache:'no-store'});if(!response.ok)throw Error();content={...defaults,...await response.json()};}
 catch {document.querySelector('main').textContent='The website could not be loaded. Please refresh.';}
}
for(const el of document.querySelectorAll('[data-content]')) el.textContent=content[el.dataset.content] || '';
const isPreview=location.pathname.startsWith('/preview');
const home=isPreview?'/preview/':import.meta.env.DEV?'/storefront/preorder/':'/';
const product=isPreview?'/preview/products/the-genesis/':import.meta.env.DEV?'/storefront/genesis/':'/products/the-genesis/';
for(const el of document.querySelectorAll('[data-home-link]'))el.href=home+(el.dataset.homeAnchor?'#'+el.dataset.homeAnchor:'');
for(const el of document.querySelectorAll('[data-product-link]'))el.href=product;
for(const el of document.querySelectorAll('[data-image]')){
 const source=content[el.dataset.image];
 if(typeof source==='string' && (/^\/(?!\/)/.test(source) || /^https:\/\//i.test(source)))el.src=source;
 if(el.dataset.imageAlt)el.alt=content[el.dataset.imageAlt]||'';
}
const email=content.contact_email;
if(typeof email==='string' && /^[^\s@?&#]+@[^\s@?&#]+\.[^\s@?&#]+$/.test(email))for(const el of document.querySelectorAll('[data-contact-link]'))el.href=`mailto:${email}`;
if(document.querySelector('.product-detail'))document.title=`${content.product_name} — Doxa Essence`;

const checkout=isPreview?'/preview/checkout/':import.meta.env.DEV?'/storefront/checkout/':'/checkout/';
for(const el of document.querySelectorAll('[data-checkout-link]')){
 el.href=checkout;
 document.getElementById('purchase-quantity')?.addEventListener('change',event=>{el.href=checkout+'?quantity='+encodeURIComponent(event.target.value);});
}
const selectedQuantity=Number(new URLSearchParams(location.search).get('quantity'));
const quantityLabel=document.getElementById('checkout-quantity');
if(quantityLabel)quantityLabel.textContent=String(Number.isInteger(selectedQuantity)&&selectedQuantity>=1&&selectedQuantity<=5?selectedQuantity:1);

if(document.getElementById('checkout-form'))import('./checkout.js').then(module=>module.initCheckout());
if(document.querySelector('.product-detail'))import('./purchase-details.js').then(module=>module.loadPurchaseDetails());
