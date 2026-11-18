import {loadPayments,clearPayments} from './payment-settings.js';
import {loadWelcome,clearWelcome} from './welcome-settings.js';
import {loadPreorders,clearPreorders} from './preorder-settings.js';
import { supabase } from './supabase.js';
import { fields, defaults } from './site-content.js';
const form=document.getElementById('site-form'), status=document.getElementById('site-feedback');
let ready=false, generation=0;
for(const [name,[label,,kind]] of Object.entries(fields)) {
 const wrapper=document.createElement('label');wrapper.textContent=({announcement:'Aankondiging',hero_title:'Kop op de homepage',hero_copy:'Introductie op de homepage',product_name:'Naam van het parfum',product_description:'Productomschrijving',product_details:'Inhoud, concentratie en prijs',top:'Topnoten / LIGHT',heart:'Hartnoten / LIFE',base:'Basisnoten / EARTH',story_title:'Kop van het merkverhaal',story:'Merkverhaal',founder_title:'Kop van Timothy’s verhaal',founder_story:'Timothy’s verhaal (vervang de tijdelijke tekst)',contact_copy:'Contactintroductie'})[name]||label;
 const input=document.createElement(name==='home_mode'?'select':kind==='image'?'input':'textarea');if(name==='home_mode'){input.append(new Option('Pre-orderpagina','preorder'),new Option('Volledige collectiepagina','collection'));}if(kind==='image'){input.type='text';input.placeholder='https://… of /images/…';}input.name=name;input.rows=name.includes('story')?6:3;input.maxLength=4000;wrapper.append(input);form.querySelector('#site-fields').append(wrapper);
 if(kind==='image'){
  const hint=document.createElement('small');hint.textContent='Plak een openbare https://-afbeeldingslink of een bestaand /images/-pad. De wijziging blijft een concept tot publicatie.';
  const preview=document.createElement('img');preview.className='editor-image-preview';preview.alt='Voorbeeld van '+label;preview.loading='lazy';
  const update=()=>{const valid=/^https:\/\//i.test(input.value)||/^\/(?!\/)/.test(input.value);preview.hidden=!valid;if(valid)preview.src=input.value;};
  input.addEventListener('input',update);input.addEventListener('change',update);wrapper.append(hint,preview);
 }

}
function lock(disabled){for(const el of form.elements)el.disabled=disabled;}
export function clearSite(){clearPayments();clearWelcome();clearPreorders();generation++;ready=false;form.reset();lock(true);status.textContent='';document.getElementById('site-state').textContent='Website controleren…';}
export async function loadSite(){await Promise.all([loadPayments(),loadWelcome(),loadPreorders()]);const token=++generation;ready=false;lock(true);try{
 const {data,error}=await supabase.from('doxa_site').select('draft,live').eq('id',1).abortSignal(AbortSignal.timeout(15000)).single();if(token!==generation)return;if(error)throw error;
 for(const [key,value] of Object.entries({...defaults,...data.draft}))if(form.elements.namedItem(key)){const input=form.elements.namedItem(key);input.value=value;input.dispatchEvent(new Event('change'));}
 document.getElementById('site-state').textContent=data.live?'De volledige website is zichtbaar. Opgeslagen wijzigingen blijven concept tot je publiceert.':'De inschrijfpagina is zichtbaar. De volledige website is privé.';ready=true;
 }catch{if(token===generation)status.textContent='Websitebeheer is niet beschikbaar. Controleer de database en beheerderstoegang.';}finally{if(token===generation)lock(!ready);}}
async function action(fn){if(!ready)return;ready=false;lock(true);const token=generation;status.textContent='Opslaan…';try{await fn();if(token===generation)status.textContent='Opgeslagen.';}catch{if(token===generation)status.textContent='De actie kon niet worden bevestigd. Vernieuw de gegevens voordat je opnieuw probeert.';}finally{if(token===generation){ready=true;lock(false);}}}
async function save(){for(const [key,[,,kind]] of Object.entries(fields)){const input=form.elements.namedItem(key);if(kind==='image'&&!/^https:\/\//i.test(input.value.trim())&&!/^\/(?!\/)/.test(input.value.trim())){input.focus();throw Error('Invalid image URL');}}const draft=Object.fromEntries(Object.keys(fields).map(key=>[key,form.elements.namedItem(key).value.trim()]));const {error}=await supabase.from('doxa_site').update({draft,updated_at:new Date().toISOString()}).eq('id',1).select('id').single();if(error)throw error;}
form.addEventListener('submit',event=>{event.preventDefault();action(save);});
document.getElementById('site-preview').addEventListener('click',()=>action(async()=>{
 await save();const {data:{session}}=await supabase.auth.getSession();if(!session)throw Error();
 const response=await fetch('/api/preview-session',{method:'POST',headers:{Authorization:`Bearer ${session.access_token}`}});if(!response.ok)throw Error();location.assign('/preview/');
}));
const dialog=document.getElementById('launch-dialog');
document.getElementById('site-launch').addEventListener('click',()=>dialog.showModal());
document.getElementById('launch-cancel').addEventListener('click',()=>dialog.close());
document.getElementById('launch-confirm').addEventListener('click',()=>{dialog.close();action(async()=>{await save();const {error}=await supabase.rpc('publish_doxa_site',{make_live:true});if(error)throw error;document.getElementById('site-state').textContent='De volledige website is gepubliceerd. Nieuwe wijzigingen worden pas zichtbaar na publicatie.';await loadPayments();});});
document.getElementById('site-hide').addEventListener('click',()=>action(async()=>{const {error}=await supabase.rpc('publish_doxa_site',{make_live:false});if(error)throw error;document.getElementById('site-state').textContent='De inschrijfpagina is zichtbaar. De volledige website is privé.';await loadPayments();}));
clearSite();
