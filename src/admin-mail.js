import {supabase} from './supabase.js';
import {renderMail,validateMail} from '../shared/email.js';
import {adminRequest} from './admin-api.js';
const $=id=>document.getElementById(id), form=$('mail-form');
const preview=$('mail-preview').attachShadow({mode:'open'});
preview.addEventListener('click',e=>e.preventDefault());
let generation=0, drafts=[], jobs=[], customers=[], blocks=[], currentId='', ready=false, configured=false, busy=false, dirty=false, pendingRequest='', pendingJob='';
const timed=q=>q.abortSignal(AbortSignal.timeout(15000));
const say=text=>{$('mail-feedback').textContent=text;};
function fields(){return {title:form.elements.title.value.trim(),subject:form.elements.subject.value.trim(),kind:form.elements.kind.value,language:form.elements.language.value,customer_id:form.elements.customer_id.value||null,blocks:structuredClone(blocks)};}
function controls(){
 for(const el of form.elements)el.disabled=busy||!ready||el.dataset.staticDisabled==='true';
 $('mail-drafts').disabled=busy||!ready;$('mail-new').disabled=busy||!ready;
 $('mail-send').disabled=busy||!ready||!configured||dirty||!currentId||form.elements.kind.value!=='personal'||!form.elements.customer_id.value;
}
function showPreview(){
 const mail=fields();$('mail-preview-subject').textContent=mail.subject||'Onderwerp van je e-mail';
 try {preview.innerHTML=renderMail(mail);}catch{preview.replaceChildren();const p=document.createElement('p');p.textContent='Vul het onderwerp en de inhoud in om je voorbeeld te zien.';preview.append(p);}
}
function changed(){dirty=true;pendingRequest='';pendingJob='';showPreview();controls();}
function renderBlocks(){
 $('mail-blocks').replaceChildren();
 blocks.forEach((block,i)=>{
  const card=document.createElement('div');card.className='mail-block';
  const heading=document.createElement('div');heading.className='section-heading';const title=document.createElement('strong');title.textContent=`${i+1}. ${{heading:'Kop',text:'Tekst',button:'Knop'}[block.type]}`;heading.append(title);
  for(const [label,action,disabled] of [['Omhoog',()=>{[blocks[i-1],blocks[i]]=[blocks[i],blocks[i-1]];},i===0],['Omlaag',()=>{[blocks[i+1],blocks[i]]=[blocks[i],blocks[i+1]];},i===blocks.length-1],['Verwijderen',()=>blocks.splice(i,1),blocks.length===1]]){
   const b=document.createElement('button');b.type='button';b.className='secondary';b.textContent=label;b.disabled=disabled;b.dataset.staticDisabled=String(disabled);b.setAttribute('aria-label',`${label}: blok ${i+1}`);b.addEventListener('click',()=>{action();renderBlocks();changed();});heading.append(b);
  }
  card.append(heading);
  const label=document.createElement('label');label.textContent=block.type==='button'?'Knoptekst':'Inhoud';
  const input=document.createElement(block.type==='text'?'textarea':'input');input.value=block.text;input.required=true;input.maxLength=6000;if(block.type==='text')input.rows=5;input.addEventListener('input',()=>{block.text=input.value;changed();});label.append(input);card.append(label);
  if(block.type==='button'){const l=document.createElement('label');l.textContent='Link van de knop (https://)';const u=document.createElement('input');u.type='url';u.required=true;u.value=block.url||'';u.addEventListener('input',()=>{block.url=u.value;changed();});l.append(u);card.append(l);}
  $('mail-blocks').append(card);
 });
 controls();showPreview();
}
function newDraft(){currentId='';pendingRequest='';pendingJob='';form.reset();blocks=[{type:'heading',text:'A note from DOXA ESSENCE'},{type:'text',text:'Schrijf hier je eigen bericht.'}];$('mail-drafts').value='';dirty=true;renderBlocks();say('Nieuw concept. Je kunt de inhoud in het Nederlands of Engels schrijven.');}
function history(){
 $('mail-history').replaceChildren();
 if(!jobs.length){$('mail-history').textContent='Nog geen e-mails klaargezet.';return;}
 for(const job of jobs){
  const row=document.createElement('div');row.className='event';const text=document.createElement('span');text.textContent=job.subject;const small=document.createElement('small');small.textContent=job.recipient+' · '+({pending:'Klaargezet — nog niet verstuurd',accepted:'Aangenomen door e-maildienst',uncertain:'Verzending niet bevestigd — controle nodig'})[job.state];text.append(small);row.append(text);
  if(job.state!=='accepted'){const b=document.createElement('button');b.className='secondary';b.textContent='Verzending controleren';b.disabled=!configured||busy;b.addEventListener('click',()=>review(job));row.append(b);}
  $('mail-history').append(row);
 }
}
function review(job){pendingJob=job.id;$('mail-confirm-description').textContent=`Aan: ${job.recipient}. Onderwerp: ${job.subject}.`;preview.innerHTML=renderMail(job);$('mail-confirm').showModal();}
async function loadAll(table){const rows=[];for(let offset=0;;offset+=500){const {data,error}=await timed(supabase.from(table).select('*').order('created_at',{ascending:false}).order(table==='doxa_shipments'?'order_id':'id').range(offset,offset+499));if(error)throw error;rows.push(...data);if(data.length<500)return rows;}}
export function clearMail(){generation++;ready=false;configured=false;drafts=[];jobs=[];customers=[];currentId='';blocks=[];pendingRequest='';pendingJob='';form.reset();$('mail-blocks').replaceChildren();preview.replaceChildren();$('mail-history').replaceChildren();$('mail-preview-subject').textContent='';$('mail-drafts').replaceChildren(new Option('Nieuw concept',''));form.elements.customer_id.replaceChildren(new Option('Kies een klant…',''));if($('mail-confirm').open)$('mail-confirm').close();say('');controls();}
export async function refreshMail(){
 const token=++generation;
 try {
  const [d,j,c,service]=await Promise.all([loadAll('doxa_mail_drafts'),loadAll('doxa_mail_jobs'),loadAll('doxa_customers'),adminRequest('mail-status').catch(()=>({configured:false}))]);
  if(token!==generation)return;drafts=d;jobs=j;customers=c;configured=service.configured;ready=true;
  const previous=$('mail-drafts').value;$('mail-drafts').replaceChildren(new Option('Nieuw concept',''));for(const draft of drafts)$('mail-drafts').add(new Option(draft.title,draft.id));$('mail-drafts').value=previous;
  const customer=form.elements.customer_id.value;form.elements.customer_id.replaceChildren(new Option('Kies een klant…',''));for(const c of customers)form.elements.customer_id.add(new Option(`${c.name} (${c.email})`,c.id));form.elements.customer_id.value=customer;
  $('mail-service').textContent=configured?`Verzenddienst ingesteld: ${service.from}. Alleen individuele klantmails; campagneverzending is nog niet gekoppeld.`:'Verzenden is nog niet ingesteld. Je kunt e-mails vormgeven, concepten opslaan en HTML downloaden. Er wordt nog niets verstuurd.';
  $('mail-connection').textContent=configured?'Verzenddienst ingesteld — individuele klantmails':'Nog geen verzenddienst — concepten en vormgeving beschikbaar';
  if(!blocks.length)newDraft();history();controls();
 }catch{if(token===generation){ready=false;$('mail-service').textContent='Concepten konden niet worden geladen. Vernieuw de gegevens en controleer de databasekoppeling.';$('mail-connection').textContent='Conceptopslag niet beschikbaar';controls();}}
}
$('mail-new').addEventListener('click',()=>{if(dirty&&!confirm('Niet-opgeslagen wijzigingen laten vervallen?'))return;newDraft();});
$('mail-drafts').addEventListener('change',()=>{
 if(dirty&&!confirm('Niet-opgeslagen wijzigingen laten vervallen?')){$('mail-drafts').value=currentId;return;}
 const d=drafts.find(d=>d.id===$('mail-drafts').value);if(!d){newDraft();return;}currentId=d.id;pendingRequest='';pendingJob='';for(const k of ['title','subject','kind','language','customer_id'])form.elements[k].value=d[k]||'';blocks=structuredClone(d.blocks);dirty=false;renderBlocks();say('Concept geladen.');
});
form.addEventListener('input',e=>{if(e.target.closest('#mail-blocks'))return;changed();});
form.addEventListener('change',e=>{if(e.target.closest('#mail-blocks'))return;changed();});
document.querySelectorAll('[data-add-block]').forEach(b=>b.addEventListener('click',()=>{if(blocks.length>=20){say('Je kunt maximaal 20 blokken toevoegen.');return;}blocks.push({type:b.dataset.addBlock,text:'',...(b.dataset.addBlock==='button'?{url:''}:{})});renderBlocks();changed();}));
form.addEventListener('submit',async e=>{
 e.preventDefault();if(!ready||busy||!form.reportValidity())return;const row=fields();
 try{validateMail(row);if(!row.title)throw Error('Geef het concept een naam.');}catch(e){say(e.message);return;}
 busy=true;controls();say('Concept opslaan…');const token=generation;
 try{const q=supabase.from('doxa_mail_drafts');const {data,error}=await timed(currentId?q.update({...row,updated_at:new Date().toISOString()}).eq('id',currentId).select().single():q.insert(row).select().single());if(error)throw error;if(token!==generation)return;currentId=data.id;dirty=false;pendingRequest='';pendingJob='';await refreshMail();$('mail-drafts').value=currentId;say('Concept opgeslagen.');}catch{if(token===generation)say('Concept opslaan is niet gelukt. Je tekst staat nog in de editor.');}finally{busy=false;controls();}
});
$('mail-download').addEventListener('click',()=>{try{const html=renderMail(fields());const url=URL.createObjectURL(new Blob([html],{type:'text/html'}));const a=document.createElement('a');a.href=url;a.download='doxa-email.html';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){say(e.message);}});
$('mail-send').addEventListener('click',async()=>{
 if(!ready||busy||dirty||!configured||!currentId)return;busy=true;controls();const token=generation;
 try{pendingRequest ||= crypto.randomUUID();const {data,error}=await timed(supabase.rpc('prepare_doxa_mail',{draft:currentId,request_id:pendingRequest}));if(error)throw error;if(token!==generation)return;await refreshMail();const job=jobs.find(j=>j.id===data);if(!job)throw Error();review(job);}catch{if(token===generation)say('Verzending voorbereiden is niet gelukt. Vernieuw het overzicht.');}finally{busy=false;controls();}
});
$('mail-confirm-cancel').addEventListener('click',()=>$('mail-confirm').close());
$('mail-confirm-send').addEventListener('click',async()=>{
 if(!pendingJob||busy||!configured)return;busy=true;controls();$('mail-confirm-send').disabled=true;$('mail-confirm-cancel').disabled=true;
 const token=generation;try{await adminRequest('send-mail',{job_id:pendingJob});if(token!==generation)return;$('mail-confirm').close();say('De e-maildienst heeft het bericht aangenomen.');await refreshMail();}catch(e){if(token===generation){$('mail-confirm').close();say(e.message);await refreshMail();}}finally{busy=false;$('mail-confirm-send').disabled=false;$('mail-confirm-cancel').disabled=false;controls();history();}
});
$('mail-confirm').addEventListener('cancel',e=>{if(busy)e.preventDefault();});
window.addEventListener('doxa-commerce-updated',()=>{if(ready&&!busy)refreshMail();});
