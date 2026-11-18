import './future.js';
import './preorder.css';
import './signup.css';
import {initSignup} from './signup.js';
import {formatDispatch} from '../shared/preorder.js';
import {adminRequest} from './admin-api.js';
initSignup();
const dialog=document.getElementById('newsletter-dialog');let opener=null;
function openNewsletter(event){opener=event?.currentTarget||null;if(!dialog.open)dialog.showModal();try{sessionStorage.setItem('doxa-newsletter-popup-seen','yes');}catch{}}
function closeNewsletter(){dialog.close();opener?.focus();}
document.querySelectorAll('[data-open-newsletter]').forEach(button=>button.addEventListener('click',openNewsletter));
document.getElementById('newsletter-close').addEventListener('click',closeNewsletter);
document.getElementById('newsletter-not-now').addEventListener('click',closeNewsletter);
dialog.addEventListener('click',event=>{if(event.target===dialog){const box=dialog.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)closeNewsletter();}});
// Offer once per tab; never interrupt someone already filling a field or returning from signup.
setTimeout(()=>{try{if(!sessionStorage.getItem('doxa-newsletter-popup-seen')&&!sessionStorage.getItem('doxa-signup-complete')&&!['INPUT','SELECT','TEXTAREA','BUTTON'].includes(document.activeElement?.tagName))openNewsletter();}catch{}},8000);
const cta=document.getElementById('preorder-cta'),quantity=document.getElementById('purchase-quantity');
try{
 const preview=location.pathname.startsWith('/preview');
 const config=preview?await adminRequest('preorder-preview'):await (await fetch('/api/checkout/config',{cache:'no-store'})).json();
 if(!config.ready&&!preview)throw Error('Closed');
 if(typeof config.unit_price_cents!=='number')throw Error('No product');
 const money=value=>new Intl.NumberFormat('en-NL',{style:'currency',currency:'EUR'}).format(value/100);
 document.getElementById('preorder-price').textContent=money(config.unit_price_cents);
 if(config.product_details){document.getElementById('preorder-specification').textContent=config.product_details;document.getElementById('preorder-product-details').textContent=config.product_details;}
 if(config.dispatch_date)document.getElementById('preorder-dispatch').textContent='Expected dispatch from '+formatDispatch(config.dispatch_date)+'.';
 if(config.returns_policy)document.getElementById('preorder-returns').textContent=config.returns_policy;
 if(Number.isInteger(config.shipping_cents))document.getElementById('preorder-shipping').textContent='Delivery within the Netherlands: '+money(config.shipping_cents)+'. The total is shown again before payment.';
 if(preview||config.sale_mode!=='preorder'){document.getElementById('preorder-availability').textContent='Private preview. Pre-orders remain closed in this preview.';quantity.disabled=true;throw Error('Preview only');}
 document.getElementById('preorder-availability').textContent='Pre-orders are open. Expected dispatch from '+formatDispatch(config.dispatch_date)+'.';
 for(const option of [...quantity.options])if(Number(option.value)>config.max_quantity)option.remove();
 const prefix=location.pathname.startsWith('/preview')?'/preview/checkout/':import.meta.env.DEV?'/storefront/checkout/':'/checkout/';
 const update=()=>{cta.href=prefix+'?quantity='+quantity.value;};update();quantity.addEventListener('change',update);cta.textContent='PRE-ORDER THE GENESIS ↗';
}catch{quantity.disabled=true;}

const scentGallery=document.querySelector('.scent-gallery');
if(scentGallery){
 const tabs=[...document.querySelectorAll('[data-scent-index]')],previous=document.getElementById('scent-previous'),next=document.getElementById('scent-next');let active=0;
 const navigate=index=>scentGallery.scrollTo({left:Math.max(0,Math.min(2,index))*scentGallery.clientWidth,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
 tabs.forEach(button=>button.addEventListener('click',()=>navigate(Number(button.dataset.scentIndex))));
 previous.addEventListener('click',()=>navigate(active-1));next.addEventListener('click',()=>navigate(active+1));
 scentGallery.addEventListener('keydown',event=>{if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();navigate(active+(event.key==='ArrowRight'?1:-1));}});
 scentGallery.addEventListener('scroll',()=>{const index=Math.round(scentGallery.scrollLeft/scentGallery.clientWidth);if(index===active)return;active=index;tabs.forEach((button,i)=>{if(i===active)button.setAttribute('aria-current','true');else button.removeAttribute('aria-current');});previous.disabled=active===0;next.disabled=active===2;document.getElementById('scent-gallery-position').textContent=String(active+1).padStart(2,'0')+' / 03';},{passive:true});
}
