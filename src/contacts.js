import {supabase} from './supabase.js';
import {mergeContacts,filterContacts} from './contact-utils.js';
const $=id=>document.getElementById(id), pageSize=25;
let contacts=[],generation=0,page=0,active=false;
function render(){
 const rows=filterContacts(contacts,$('contacts-search').value,$('contacts-group').value);page=Math.min(page,Math.max(0,Math.ceil(rows.length/pageSize)-1));
 $('contacts-rows').replaceChildren();
 for(const c of rows.slice(page*pageSize,(page+1)*pageSize)){
  const tr=document.createElement('tr');
  const values=[c.name||'—',c.email,c.customer?'Ja':'Nee',c.newsletter?'Toestemming geregistreerd':'Geen toestemming geregistreerd',c.samples?'Ja':'Nee',c.sources.join(' · '),c.joined?new Date(c.joined).toLocaleDateString('nl-NL'):'—'];
  for(const value of values){const td=document.createElement('td');td.textContent=value;tr.append(td);}
  const cell=document.createElement('td'),a=document.createElement('a');a.href=c.customer?'#customers':'#audience';a.textContent=c.customer?'Klant beheren':'Inschrijving beheren';if(c.customer)a.addEventListener('click',()=>{$('customer-search').value=c.email;$('customer-search').dispatchEvent(new Event('input'));});cell.append(a);tr.append(cell);$('contacts-rows').append(tr);
 }
 if(!rows.length){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=8;td.textContent='Geen contacten gevonden.';tr.append(td);$('contacts-rows').append(tr);}
 $('contacts-count').textContent=`${rows.length} van ${contacts.length} unieke contacten`;
 $('contacts-page').textContent=`Pagina ${page+1} van ${Math.max(1,Math.ceil(rows.length/pageSize))}`;
 $('contacts-previous').disabled=page===0;$('contacts-next').disabled=(page+1)*pageSize>=rows.length;
 for(const [id,value] of [['contacts-total',contacts.length],['contacts-customers',contacts.filter(c=>c.customer).length],['contacts-newsletter',contacts.filter(c=>c.newsletter).length]])$(id).textContent=value.toLocaleString('nl-NL');
}
export function clearContacts(){generation++;active=false;contacts=[];page=0;$('contacts-search').value='';$('contacts-group').value='all';$('contacts-rows').replaceChildren();for(const id of ['contacts-total','contacts-customers','contacts-newsletter'])$(id).textContent='—';$('contacts-count').textContent='';$('contacts-page').textContent='';$('contacts-state').textContent='';for(const id of ['contacts-search','contacts-group','contacts-next','contacts-previous'])$(id).disabled=true;}
export async function refreshContacts(){
 const token=++generation;active=true;$('contacts-state').textContent='Klantbestand laden…';
 async function all(table,columns){const rows=[];for(let offset=0;;offset+=500){const {data,error}=await supabase.from(table).select(columns).order('created_at').order('id').range(offset,offset+499).abortSignal(AbortSignal.timeout(15000));if(error)throw error;if(token!==generation)throw Error('Session changed');rows.push(...data);if(data.length<500)return rows;}}
 try{const [customers,launch,legacy]=await Promise.all([all('doxa_customers','id,name,email,created_at'),all('doxa_launch_list','id,first_name,email,email_consent,created_at'),all('doxa_waitlist','id,email,newsletter,samples,created_at')]);if(token!==generation)return;contacts=mergeContacts(customers,launch,legacy);$('contacts-search').disabled=false;$('contacts-group').disabled=false;render();$('contacts-state').textContent='Klanten en inschrijvingen samengevoegd op e-mailadres. De oorspronkelijke lijsten blijven behouden.';}
 catch{if(token!==generation)return;contacts=[];$('contacts-rows').replaceChildren();for(const id of ['contacts-total','contacts-customers','contacts-newsletter'])$(id).textContent='—';for(const id of ['contacts-search','contacts-group','contacts-next','contacts-previous'])$(id).disabled=true;$('contacts-count').textContent='';$('contacts-page').textContent='';$('contacts-state').textContent='Klantbestand laden is niet gelukt. Vernieuw de gegevens om opnieuw te proberen.';}
}
for(const id of ['contacts-search','contacts-group'])$(id).addEventListener(id==='contacts-search'?'input':'change',()=>{page=0;render();});
$('contacts-previous').addEventListener('click',()=>{if(page>0){page--;render();}});$('contacts-next').addEventListener('click',()=>{page++;render();});
window.addEventListener('doxa-commerce-updated',()=>{if(active)refreshContacts();});
