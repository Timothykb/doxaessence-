import { supabase } from './supabase.js';
import {adminRequest} from './admin-api.js';
import {safeLink} from '../shared/email.js';
import {realOrderSummary} from './launch-readiness.js';
import {PHOTO_BUCKET, validatePhoto, photoPath} from './product-photo.js';
const $ = id => document.getElementById(id);
const labels={draft:'Concept',active:'Actief',archived:'Gearchiveerd',new:'Nieuw',processing:'In behandeling',shipped:'Verzonden',cancelled:'Geannuleerd'};
const money = cents => new Intl.NumberFormat('nl-NL',{style:'currency',currency:'EUR'}).format(cents/100);
let products=[], customers=[], orders=[], shipments=[], mailJobs=[], shippingOrder=null, generation=0, ready=false, busy=false;
let photoUrl='', photoVersion=0, uploadedPhoto=null;
const photoUrls=new Map();
function resetPhoto() {
 photoVersion++; uploadedPhoto=null;
 if(photoUrl)URL.revokeObjectURL(photoUrl);photoUrl='';
 $('product-photo').value='';$('product-photo').setCustomValidity('');
 $('product-photo-preview').hidden=true;$('product-photo-preview').removeAttribute('src');
 message('product-photo-status','');
}
function showProductPhoto(product) {
 resetPhoto();
 const url=photoUrls.get(product.image_path);
 if(url){$('product-photo-preview').src=url;$('product-photo-preview').hidden=false;message('product-photo-status','Opgeslagen foto. Kies een nieuwe foto om deze te vervangen.');}
 else if(product.image_path)message('product-photo-status','Foto opgeslagen; voorbeeld kon niet worden geladen. Vernieuw de gegevens.');
}
$('product-photo').addEventListener('change',async()=>{
 const file=$('product-photo').files[0];const version=++photoVersion;
 uploadedPhoto=null;
 if(photoUrl)URL.revokeObjectURL(photoUrl);photoUrl='';
 $('product-photo-preview').hidden=true;
 let error=file?validatePhoto(file):'';
 if(file&&!error){try{const bitmap=await createImageBitmap(file);bitmap.close();}catch{error='Dit bestand kan niet als afbeelding worden geopend.';}}
 if(version!==photoVersion)return;
 $('product-photo').setCustomValidity(error);message('product-photo-status',error);
 if(file&&!error){photoUrl=URL.createObjectURL(file);$('product-photo-preview').src=photoUrl;$('product-photo-preview').hidden=false;message('product-photo-status','Nieuwe foto geselecteerd. Klik op Product opslaan om deze te bewaren.');}
});
const query = q => q.abortSignal(AbortSignal.timeout(15000));
function message(id,text) { $(id).textContent=text; }
function lock() { for(const id of ['product-form','customer-form','order-form']) for(const el of $(id).elements) el.disabled=!ready||busy; }
export function clearCommerce() {
 resetPhoto();photoUrls.clear();
 generation++; ready=false; products=[];customers=[];orders=[];shipments=[];mailJobs=[];shippingOrder=null;
 if($('shipping-dialog').open)$('shipping-dialog').close(); $('shipping-form').reset(); $('shipping-feedback').textContent='';
 for(const id of ['product-list','customer-list','order-list']) $(id).replaceChildren();
 for(const id of ['product-form','customer-form','order-form']) $(id).reset();
 for(const id of ['product-feedback','customer-feedback','order-feedback']) message(id,'');
 $('customer-search').value='';
 for(const name of ['customer','product']) $('order-form').elements[name].replaceChildren();
 message('commerce-state','Database controleren…'); lock();
}
function table(id,head,rows) {
 const root=$(id);root.replaceChildren();
 if(!rows.length) { root.textContent='Nog geen gegevens.';return; }
 const t=document.createElement('table'), h=t.createTHead().insertRow();
 for(const label of head) {const th=document.createElement('th'); th.textContent=label;h.append(th);}
 const body=t.createTBody();
 for(const row of rows) {const tr=body.insertRow();for(const value of row) {const td=tr.insertCell();if(value instanceof Node)td.append(value);else td.textContent=value;}}
 root.append(t);
}
function edit(form,row) {
 if(form===$('product-form'))showProductPhoto(row);
 for(const [key,value] of Object.entries(row)) if(form.elements.namedItem(key)) form.elements.namedItem(key).value=value;
 form.elements.namedItem('name').focus();form.scrollIntoView({behavior:'instant',block:'center'});
}
function button(label,action) {const b=document.createElement('button');b.className='secondary';b.textContent=label;b.disabled=busy;b.addEventListener('click',action);return b;}
function renderCustomers() {
 const term=$('customer-search').value.toLowerCase();
 table('customer-list',['Naam','E-mailadres','Notities','Bestellingen / totaal',''],customers.filter(c=>(c.name+' '+c.email).toLowerCase().includes(term)).map(c=>{
 const history=orders.filter(o=>o.customer_id===c.id);
 const summary=realOrderSummary(history),tests=history.filter(o=>o.test_mode).length;
 return [c.name,c.email,c.notes,`${summary.count} / ${money(summary.total)}${tests?' · '+tests+' proefbestelling(en)':''}`,button('Bewerken',()=>edit($('customer-form'),c))];
 }));
}
function render() {
 table('product-list',['Foto','Product / SKU','Prijs','Voorraad','Status',''],products.filter(p=>p.sku!=='DOXA-CHECKOUT-TEST').map(p=>{
 const image=document.createElement('img');image.className='product-photo-thumb';image.alt=`Productfoto ${p.name}`;
 const url=photoUrls.get(p.image_path);if(url)image.src=url;
 return [url?image:p.image_path?'Voorbeeld niet beschikbaar':'Geen foto',`${p.name} / ${p.sku}`,money(p.price_cents),p.stock,labels[p.status],button('Bewerken',()=>edit($('product-form'),{...p,price:(p.price_cents/100).toFixed(2)}))];
 }));
 renderCustomers();
 table('order-list',['Bestelling / datum','Klant','Product','Totaal','Status','Verzending','Acties'],orders.map(o=>{
 const actions=document.createElement('div');actions.className='order-actions';
 const next=o.test_mode?[]:o.status==='new'?['processing','cancelled']:o.status==='processing'?['shipped','cancelled']:[];
 for(const status of next)actions.append(button(status==='cancelled'?'Bestelling annuleren':`Markeer als ${labels[status].toLowerCase()}`,()=>mutate('order-feedback',()=>query(supabase.rpc('set_doxa_order_status',{order_id:o.id,next_status:status})))));
 const shipment=shipments.find(s=>s.order_id===o.id), mail=mailJobs.find(j=>j.order_id===o.id);
 if(!o.test_mode&&o.status!=='cancelled')actions.append(button(shipment?'Verzendgegevens':'Verzending',()=>openShipping(o,shipment)));
 const shipping=document.createElement('div');
 if(o.shipping_address){const address=document.createElement('p');address.textContent=[o.shipping_address.first_name+' '+o.shipping_address.last_name,o.shipping_address.street,o.shipping_address.postal_code+' '+o.shipping_address.city,o.shipping_address.country].join(' · ');actions.append(address);}
 if(o.sale_mode==='preorder'){const note=document.createElement('p');note.textContent='PRE-ORDER · verwacht verzenden vanaf '+o.dispatch_date+' · '+o.product_details;actions.append(note);}
 if(shipment){const link=document.createElement('a');link.textContent=shipment.barcode;link.href=safeLink(shipment.tracking_url);link.target='_blank';link.rel='noopener';shipping.append(link);const note=document.createElement('small');note.textContent=mail?.state==='accepted'?'Verzendmail aangenomen':mail?.state==='uncertain'?'Verzendmail niet bevestigd':'Verzendmail nog niet verstuurd';shipping.append(note);}
 else shipping.textContent='Nog geen label gekoppeld';
 return [`${o.id.slice(0,8)} / ${new Date(o.created_at).toLocaleDateString('nl-NL')}`,customers.find(c=>c.id===o.customer_id)?.email||'Klant niet beschikbaar',`${o.product_name} × ${o.quantity}`,money(o.quantity*o.unit_price_cents+(o.shipping_cents||0)),(o.test_mode?'TEST · geen echte betaling · ':o.mollie_payment_id?'Betaald · ':'Handmatig · ')+labels[o.status],shipping,actions];
 }));
 for(const [name,rows,label] of [['customer',customers,c=>`${c.name} (${c.email})`],['product',products.filter(p=>p.status==='active'&&p.stock>0),p=>`${p.name} · ${money(p.price_cents)} · ${p.stock} beschikbaar`]]) {
 const select=$('order-form').elements[name], previous=select.value;select.replaceChildren(new Option(`Kies een ${name==='customer'?'klant':'product'}…`,''));
 for(const row of rows)select.add(new Option(label(row),row.id));select.value=previous;
 }
}
export async function refreshCommerce() {
 const token=++generation;ready=false;lock();message('commerce-state','Database controleren…');
 try {
  // Page through complete datasets; never silently truncate at the API's row limit.
  async function all(table) {const rows=[];for(let offset=0;;offset+=500){const {data,error}=await query(supabase.from(table).select('*').order('created_at',{ascending:false}).order(table==='doxa_shipments'?'order_id':'id').range(offset,offset+499));if(error)throw error;if(token!==generation)throw Error('Session changed');rows.push(...data);if(data.length<500)return rows;}}
  const result=await Promise.all(['doxa_products','doxa_customers','doxa_orders','doxa_shipments','doxa_mail_jobs'].map(all));
  if(token!==generation)return;
  const paths=result[0].map(p=>p.image_path).filter(Boolean);
  const signed=paths.length?await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(paths,3600):{data:[]};
  if(token!==generation)return;
  photoUrls.clear();for(const item of signed.data||[])if(item.signedUrl)photoUrls.set(item.path,item.signedUrl);
  [products,customers,orders,shipments,mailJobs]=result;ready=true;render();message('commerce-state','Verbonden — producten, klanten en handmatige bestellingen');
 } catch {
  if(token!==generation)return;
  products=[];customers=[];orders=[];shipments=[];mailJobs=[];shippingOrder=null;
  for(const id of ['product-list','customer-list','order-list'])message(id,'De gegevens konden niet worden geladen. Controleer de database en beheerderstoegang en vernieuw de pagina.');
  message('commerce-state','Niet beschikbaar — controleer de database en toegang');
 } finally {if(token===generation)lock();}
}
async function mutate(feedback,action,onSuccess=()=>{}) {
 if(!ready||busy)return;busy=true;lock();render();message(feedback,'Opslaan…');const token=generation;
 try {const {error}=await action();if(error)throw error;if(token!==generation)return;onSuccess();message(feedback,'Opgeslagen.');await refreshCommerce();window.dispatchEvent(new Event('doxa-commerce-updated'));}
 catch {if(token===generation)message(feedback,'Opslaan kon niet worden bevestigd. Vernieuw de gegevens voordat je opnieuw probeert. Controleer de unieke SKU of het e-mailadres, de voorraad en je toegang.');}
 finally {busy=false;lock();if(ready)render();}
}
$('customer-search').addEventListener('input',renderCustomers);
for(const kind of ['product','customer']) {
 const form=$(kind+'-form');form.addEventListener('reset',()=>{form.elements.id.value='';if(kind==='product')resetPhoto();});
 form.addEventListener('submit',event=>{
  event.preventDefault();if(!form.reportValidity())return;const f=new FormData(form),id=f.get('id');
  const row=kind==='product'?{name:f.get('name').trim(),sku:f.get('sku').trim(),price_cents:Math.round(Number(f.get('price'))*100),stock:Number(f.get('stock')),status:f.get('status')}:{name:f.get('name').trim(),email:f.get('email').trim().toLowerCase(),notes:f.get('notes').trim()};
  if(!row.name||(kind==='product'&&!row.sku)){message(kind+'-feedback','Vul een naam in en bij producten ook een SKU.');return;}
  const file=kind==='product'?form.elements.photo.files[0]:null;
  if(file&&validatePhoto(file)){message('product-feedback',validatePhoto(file));return;}
  mutate(kind+'-feedback',async()=>{
   const uploadGeneration=generation;
   if(file){
    message('product-feedback','Productfoto uploaden…');
    if(uploadedPhoto?.file!==file){
     const bitmap=await createImageBitmap(file);bitmap.close();
     const path=photoPath(id||crypto.randomUUID(),file);
     const {error}=await supabase.storage.from(PHOTO_BUCKET).upload(path,file,{contentType:file.type,upsert:false});
     if(error){message('product-photo-status','Uploaden is niet gelukt. Controleer je verbinding en probeer opnieuw.');throw error;}
     if(uploadGeneration!==generation)throw Error('Session changed');
     uploadedPhoto={file,path};
    }
    row.image_path=uploadedPhoto.path;
   }
   const q=supabase.from(kind==='product'?'doxa_products':'doxa_customers');return query(id?q.update(row).eq('id',id).select().single():q.insert(row).select().single());
  },()=>form.reset());
 });
}
$('order-form').addEventListener('submit',event=>{
 event.preventDefault();const form=event.currentTarget;if(!form.reportValidity())return;const f=new FormData(form);
 mutate('order-feedback',()=>query(supabase.rpc('create_doxa_order',{customer:f.get('customer'),product:f.get('product'),amount:Number(f.get('amount'))})),()=>form.reset());
});

function openShipping(order,shipment){
 shippingOrder=order.id;message('shipping-order',`Bestelling ${order.id.slice(0,8)} · ${customers.find(c=>c.id===order.customer_id)?.email||''}`);
 $('shipping-form').elements.barcode.value=shipment?.barcode||'';$('shipping-form').elements.tracking_url.value=shipment?.tracking_url||'';
 message('shipping-feedback',shipment?'Deze verzending is al gekoppeld. Nog niet verstuurde berichten staan onder E-mails.':'Er is nog geen verzendmail verstuurd.');
 $('shipping-form').querySelector('button:not([type])').textContent='Verzendgegevens opslaan';
 $('shipping-dialog').showModal();
 const token=generation;adminRequest('mail-status').then(service=>{if(token===generation&&shippingOrder===order.id&&$('shipping-dialog').open&&service.configured){$('shipping-form').querySelector('button:not([type])').textContent='Opslaan en verzendmail versturen';message('shipping-feedback','Na opslaan wordt de track-en-tracemail naar deze klant verstuurd. Controleer de barcode en link.');}}).catch(()=>{});
}
$('shipping-cancel').addEventListener('click',()=>{if(!busy)$('shipping-dialog').close();});
$('shipping-dialog').addEventListener('cancel',e=>{if(busy)e.preventDefault();});
$('shipping-form').addEventListener('submit',async e=>{
 e.preventDefault();const form=e.currentTarget;if(busy||!ready||!shippingOrder||!form.reportValidity())return;
 const tracking=safeLink(form.elements.tracking_url.value.trim());
 if(!tracking||!['jouw.postnl.nl','www.postnl.nl','postnl.nl'].includes(new URL(tracking).hostname)){message('shipping-feedback','Gebruik een volledige https-track-en-tracelink van PostNL.');return;}
 busy=true;lock();for(const el of form.elements)el.disabled=true;const token=generation;message('shipping-feedback','Verzendgegevens opslaan…');
 try{
  const {data,error}=await query(supabase.rpc('save_doxa_shipment',{selected_order:shippingOrder,tracking_barcode:form.elements.barcode.value.trim(),tracking_link:tracking}));
  if(error)throw Error('Opslaan is niet bevestigd. Controleer of er al andere verzendgegevens zijn gekoppeld.');if(token!==generation)return;
  const service=await adminRequest('mail-status').catch(()=>({configured:false}));
  if(service.configured){await adminRequest('send-mail',{job_id:data});if(token!==generation)return;message('shipping-feedback','Verzendgegevens opgeslagen. De e-maildienst heeft de track-en-tracemail aangenomen.');}
  else message('shipping-feedback','Verzendgegevens opgeslagen. De verzendmail staat klaar, maar is nog niet verstuurd: stel eerst de e-maildienst in.');
  await refreshCommerce();window.dispatchEvent(new Event('doxa-commerce-updated'));
 }catch(error){if(token===generation)message('shipping-feedback',error.message+' Vernieuw het bestel- en verzendoverzicht voordat je opnieuw probeert.');}
 finally{busy=false;lock();for(const el of form.elements)el.disabled=false;if(ready)render();}
});
