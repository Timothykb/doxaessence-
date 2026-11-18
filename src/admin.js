import './admin.css';
import './admin-mobile.js';
import { refreshContacts, clearContacts } from './contacts.js';
import { refreshMail, clearMail } from './admin-mail.js';
import { loadSite, clearSite } from './site-editor.js';
import { refreshCommerce, clearCommerce } from './commerce.js';
import { supabase } from './supabase.js';
import { csvCell, searchTerm } from './admin-utils.js';
const $ = id => document.getElementById(id);
const pageSize = 25;
let visibleRows = [], deleting = false;
const selectedEmails = new Set();
function updateSelection() {
 say('selection-count', `${selectedEmails.size} geselecteerd`);
 $('delete-selected').disabled = !selectedEmails.size || deleting;
 $('select-page').disabled = !visibleRows.length || deleting;
 $('select-page').checked = visibleRows.length > 0 && selectedEmails.size === visibleRows.length;
 $('select-page').indeterminate = selectedEmails.size > 0 && selectedEmails.size < visibleRows.length;
}
function resetSelection() { selectedEmails.clear(); visibleRows = []; updateSelection(); }

let page = 0, count = 0, authorized = false, requestId = 0;
const date = value => new Date(value).toLocaleString('nl-NL', { dateStyle: 'medium', timeStyle: 'short' });
const say = (id, message) => { $(id).textContent = message; };
const timed = query => query.abortSignal(AbortSignal.timeout(15000));
function navigate() {
 const available = ['overview','contacts','website','audience','activity','products','customers','orders','emails','welcome','connections'];
 const current = available.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'overview';
 document.querySelectorAll('[data-page]').forEach(el => { el.hidden = el.dataset.page !== current; });
 document.querySelectorAll('nav a').forEach(el => { if (el.hash === '#' + current) el.setAttribute('aria-current','page'); else el.removeAttribute('aria-current'); });
 say('page-title', ({overview:'Overzicht',contacts:'Klantbestand',website:'Website beheren',audience:'Nieuwsbrief',activity:'Activiteit',products:'Producten',customers:'Klanten',orders:'Bestellingen',emails:'E-mails',welcome:'Automatische bedankmail',connections:'Koppelingen'})[current]);
}
window.addEventListener('hashchange', navigate); navigate();
function eventList(container, rows) {
 container.replaceChildren();
 if (!rows.length) { container.textContent = 'Nog geen inschrijvingen. Nieuwe inschrijvingen verschijnen hier.'; return; }
 rows.forEach(row => {
  const el = document.createElement('div'); el.className = 'event';
  const person = document.createElement('span'); person.textContent = row.first_name || 'Nieuwsbriefinschrijver';
  const email = document.createElement('small'); email.textContent = row.email; person.append(email);
  const time = document.createElement('time'); time.dateTime = row.created_at; time.textContent = date(row.created_at);
  el.append(person,time); container.append(el);
 });
}
function sourceQuery({head=false, total=false}={}) {
 const legacy = $('source').value === 'legacy';
 const columns = legacy ? 'id,email,newsletter,samples,consent_version,created_at' : 'id,email,first_name,email_consent,consent_version,created_at';
 let query = supabase.from(legacy ? 'doxa_waitlist' : 'doxa_launch_list').select(columns, total ? {count:'exact',head} : {});
 // PostgREST filters use a restricted search alphabet; never interpolate filter syntax.
 const term = searchTerm($('search').value);
 if (term) query = legacy ? query.ilike('email',`%${term}%`) : query.or(`email.ilike.%${term}%,first_name.ilike.%${term}%`);
 return query.order('created_at',{ascending:false}).order('id',{ascending:false});
}
function permission(row) { return 'email_consent' in row ? (row.email_consent?'Nieuwsbrief':'Geen nieuwsbrieftoestemming') : [row.newsletter && 'Nieuwsbrief',row.samples && 'Proefmonsters'].filter(Boolean).join(' · '); }
async function loadAudience() {
 const id = ++requestId; resetSelection(); $('rows').replaceChildren(); say('count','Inschrijvingen laden…'); $('export').disabled = true; $('previous').disabled = true; $('next').disabled = true;
 try {
  const {data,error,count:total} = await timed(sourceQuery({total:true}).range(page*pageSize,(page+1)*pageSize-1));
  if (id !== requestId || !authorized) return;
  if (error) throw error;
  count = total;
  if(page > 0 && page * pageSize >= count) { page = Math.max(0,Math.ceil(count/pageSize)-1); return loadAudience(); }
  visibleRows = data;
  for (const row of data) {
   const tr = document.createElement('tr');
   const cell = document.createElement('td'); cell.className = 'select-cell';
   const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.dataset.email = row.email; checkbox.setAttribute('aria-label',`Selecteer ${row.email}`);
   checkbox.addEventListener('change',()=>{ if(checkbox.checked) selectedEmails.add(row.email); else selectedEmails.delete(row.email); updateSelection(); });
   cell.append(checkbox); tr.append(cell);
   for (const value of [row.first_name || '—',row.email,permission(row),date(row.created_at)]) { const td = document.createElement('td'); td.textContent = value; tr.append(td); }
   $('rows').append(tr);
  }
  if (!data.length) { const tr = document.createElement('tr'); const td = document.createElement('td'); td.colSpan=5; td.textContent='Geen inschrijvingen gevonden.'; tr.append(td); $('rows').append(tr); }
  updateSelection();
  say('count',`${count} inschrijving${count === 1 ? '' : 'en'}`); say('page',`Pagina ${page+1} van ${Math.max(1,Math.ceil(count/pageSize))}`);
  $('previous').disabled = page===0; $('next').disabled = (page+1)*pageSize >= count; $('export').disabled = !count;
 } catch { if(id===requestId) { say('count','Inschrijvingen laden is niet gelukt. Vernieuw de gegevens.'); say('page',''); } }
}
async function refresh() {
 if (!authorized || deleting) return;
 $('refresh').disabled=true; say('status','Gegevens bijwerken…');
 try {
  const results = await Promise.all([
   timed(supabase.from('doxa_launch_list').select('id',{count:'exact',head:true})),
   timed(supabase.from('doxa_launch_list').select('id',{count:'exact',head:true}).gte('created_at',new Date(Date.now()-7*86400000).toISOString())),
   timed(supabase.from('doxa_waitlist').select('id',{count:'exact',head:true})),
   timed(supabase.from('doxa_launch_list').select('first_name,email,created_at').order('created_at',{ascending:false}).limit(20)),
  ]);
  if (!authorized) return;
  if(results.some(r=>r.error)) throw new Error('Data unavailable');
  ['total','recent','legacy'].forEach((key,i)=>say(key,results[i].count.toLocaleString('nl-NL')));
  eventList($('latest'),results[3].data.slice(0,5)); eventList($('events'),results[3].data);
  say('db-state','Verbonden — beheerderstoegang bevestigd'); say('status',`Laatst vernieuwd op ${date(new Date())}.`);
 } catch { say('status','Vernieuwen is niet gelukt. Controleer je verbinding en probeer opnieuw.'); say('db-state','Verbinding niet bevestigd'); ['total','recent','legacy'].forEach(key=>say(key,'—')); $('latest').replaceChildren(); $('events').replaceChildren(); }
 finally { $('refresh').disabled=false; }
 await Promise.all([loadAudience(), refreshCommerce(), refreshMail(), loadSite(), refreshContacts()]);
}
function clearPrivateData() {
 authorized=false; clearContacts(); clearSite(); clearCommerce(); clearMail(); requestId++; resetSelection(); if($('delete-dialog').open) $('delete-dialog').close(); $('delete-emails').replaceChildren(); $('studio').hidden=true; $('login').hidden=false;
 ['rows','latest','events'].forEach(id=>$(id).replaceChildren()); ['total','recent','legacy'].forEach(id=>say(id,'—'));
}
async function checkSession(session) {
 clearPrivateData();
 if (!session) return;
 say('login-status','Beheerderstoegang controleren…');
 try {
  const {data,error} = await timed(supabase.rpc('is_doxa_admin'));
  if(error || data !== true) { say('login-status','Dit account heeft geen beheerderstoegang of is nog niet geactiveerd.'); await supabase.auth.signOut({scope:'local'}); return; }
  authorized=true; say('admin-email',session.user.email); $('login').hidden=true; $('studio').hidden=false; say('login-status',''); await refresh();
 } catch { say('login-status','Toegang controleren is niet gelukt. Probeer opnieuw.'); }
}
$('login-form').addEventListener('submit',async event=>{
 event.preventDefault();
 if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test($('email').value.trim())) { say('login-status','Vul een geldig e-mailadres in.'); $('email').focus(); return; }
 $('magic').disabled=true; say('login-status','Inloglink aanvragen…');
 try { const {error}=await supabase.auth.signInWithOtp({email:$('email').value.trim(),options:{shouldCreateUser:false,emailRedirectTo:location.origin+'/admin/'}}); say('login-status',error ? 'De inloglink kon niet worden verstuurd. Controleer of je beheerdersaccount actief is en probeer later opnieuw.' : 'Bekijk je inbox voor de inloglink en open deze in deze browser. Over één minuut kun je een nieuwe link aanvragen.'); }
 catch { say('login-status','Versturen is niet gelukt. Probeer opnieuw.'); }
 finally { setTimeout(()=>{$('magic').disabled=false;},60000); }
});
$('logout').addEventListener('click',async()=>{ clearPrivateData(); const {error}=await supabase.auth.signOut({scope:'local'}); say('login-status',error ? 'Uitloggen is niet afgerond. Sluit deze browser en probeer opnieuw.' : 'Je bent uitgelogd.'); });
$('refresh').addEventListener('click',refresh);
$('source').addEventListener('change',()=>{page=0;loadAudience();});
let searchTimer; $('search').addEventListener('input',()=>{clearTimeout(searchTimer); requestId++; resetSelection(); $('export').disabled=true; searchTimer=setTimeout(()=>{page=0;loadAudience();},300);});
$('previous').addEventListener('click',()=>{if(page>0){page--;loadAudience();}}); $('next').addEventListener('click',()=>{if((page+1)*pageSize<count){page++;loadAudience();}});

$('select-page').addEventListener('change',()=>{
 selectedEmails.clear();
 if($('select-page').checked) visibleRows.forEach(row=>selectedEmails.add(row.email));
 $('rows').querySelectorAll('input[type="checkbox"]').forEach(box=>{box.checked=selectedEmails.has(box.dataset.email);});
 updateSelection();
});
$('delete-selected').addEventListener('click',()=>{
 if(!authorized || deleting || !selectedEmails.size) return;
 $('delete-emails').replaceChildren();
 for(const email of selectedEmails) { const li=document.createElement('li'); li.textContent=email; $('delete-emails').append(li); }
 say('delete-error',''); $('delete-dialog').showModal(); $('delete-cancel').focus();
});
$('delete-cancel').addEventListener('click',()=>{if(!deleting) $('delete-dialog').close();});
$('delete-dialog').addEventListener('cancel',event=>{if(deleting)event.preventDefault();});
$('delete-confirm').addEventListener('click',async()=>{
 if(!authorized || deleting || !selectedEmails.size) return;
 const emails=[...selectedEmails]; deleting=true;
 for(const id of ['delete-confirm','delete-cancel','refresh','source','search','export','previous','next']) $(id).disabled=true;
 updateSelection(); say('delete-error','Geselecteerde contacten verwijderen…');
 let removed=false;
 try {
  const {data,error}=await timed(supabase.rpc('delete_doxa_registrations',{selected_emails:emails}));
  if(error || !Number.isInteger(data)) throw new Error('Deletion not confirmed');
  removed=true; $('delete-dialog').close(); $('delete-emails').replaceChildren();
  say('delete-result',`${data} inschrijving${data===1?'':'en'} definitief verwijderd uit beide lijsten.`);
 } catch { say('delete-error','Verwijderen kon niet worden bevestigd. Sluit dit venster en vernieuw de gegevens voordat je opnieuw probeert.'); }
 finally {
  deleting=false; for(const id of ['delete-confirm','delete-cancel','refresh','source','search','export']) $(id).disabled=false;
  $('previous').disabled=page===0; $('next').disabled=(page+1)*pageSize>=count; updateSelection();
 }
 if(removed && authorized) await refresh();
});

$('export').addEventListener('click',async()=>{
 $('export').disabled=true; $('source').disabled=true; $('search').disabled=true; say('status','Export voorbereiden…');
 try {
  const rows=[];
  for(let offset=0;;offset+=500){const {data,error}=await timed(sourceQuery().range(offset,offset+499));if(error || !authorized) throw new Error('Export failed');rows.push(...data);if(data.length<500)break;}
  const csv=[['Voornaam','E-mail','Nieuwsbrieftoestemming','Interesse in samples','Toestemmingsversie','Ingeschreven op'],...rows.map(r=>[r.first_name||'',r.email,('email_consent'in r?r.email_consent:r.newsletter)?'Ja':'Nee',r.samples?'Ja':'Nee',r.consent_version,r.created_at])].map(r=>r.map(csvCell).join(',')).join('\r\n');
  const url=URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'}));const link=document.createElement('a');link.href=url;link.download=`doxa-${$('source').value}-${new Date().toISOString().slice(0,10)}.csv`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);say('status',`Export gereed: ${rows.length} inschrijvingen.`);
 } catch { say('status','Exporteren is niet gelukt. Probeer opnieuw.'); }
 finally {$('export').disabled=false;$('source').disabled=false;$('search').disabled=false;}
});
// Auth callbacks remain synchronous to avoid deadlocks in Supabase's auth lock.
supabase.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT') clearPrivateData();if(event==='SIGNED_IN'&&!authorized) setTimeout(()=>checkSession(session),0);if(event==='TOKEN_REFRESHED'&&!session)clearPrivateData();});
try { const {data,error}=await supabase.auth.getSession(); if(error) throw error; await checkSession(data.session); } catch { say('login-status','Je sessie kon niet worden gecontroleerd. Log opnieuw in.'); }
