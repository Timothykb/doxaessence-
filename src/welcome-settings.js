import {supabase} from './supabase.js';
import {renderMail} from '../shared/email.js';
import {welcomeState} from './launch-readiness.js';
const root=document.createElement('div');root.className='panel';root.innerHTML=`<h2>Huidige automatische bedankmail</h2><p>Nieuwe inschrijvers krijgen automatisch één welkom namens Timothy. Antwoorden komen binnen op info@doxaessence.com. Wie opnieuw inschrijft, krijgt de bedankmail alsnog als er nog geen bedankmail was klaargezet.</p><form class="commerce-form"><label>Onderwerp<input name="subject" maxlength="180" required></label><label>Persoonlijke tekst<textarea name="body" rows="14" maxlength="6000" required></textarea></label><p class="muted">Gebruik {{first_name}} voor de voornaam van de inschrijver. Je kunt de tekst en de ondertekening hier zelf aanpassen. Met Opslaan wordt dit direct de automatische e-mail voor nieuwe inschrijvers. Reeds klaargezette of verzonden e-mails veranderen niet.</p><button>Opslaan en gebruiken als automatische e-mail</button></form><p role="status"></p>`;
const previewPanel=document.createElement('div');previewPanel.className='welcome-mail-preview';previewPanel.innerHTML='<h3>Voorbeeld van je bedankmail</h3><p class="muted">{{first_name}} wordt hieronder als Alex getoond. Sla op om je wijzigingen voor nieuwe inschrijvers te gebruiken. Onderaan staan automatisch de links naar Instagram (@doxa.essence) en TikTok (@doxaessence).</p><p class="welcome-preview-subject"></p><div class="welcome-preview-frame"></div>';root.append(previewPanel);
const preview=previewPanel.querySelector('.welcome-preview-frame').attachShadow({mode:'open'});preview.addEventListener('click',event=>event.preventDefault());
const history=document.createElement('div');history.className='welcome-deliveries';root.append(history);
document.querySelector('[data-page="welcome"]').append(root);
const form=root.querySelector('form'),status=root.querySelector('[role="status"]');let generation=0,ready=false;
function renderPreview(){const subject=form.elements.subject.value.trim(),body=form.elements.body.value.replaceAll('{{first_name}}','Alex');previewPanel.querySelector('.welcome-preview-subject').textContent=subject;try{preview.innerHTML=renderMail({subject,includeSocial:true,blocks:[{type:'text',text:body}]});}catch{preview.textContent='Vul een onderwerp en bericht in om het voorbeeld te bekijken.';}}
form.addEventListener('input',renderPreview);
function lock(value){for(const el of form.elements)el.disabled=value;}
export function clearWelcome(){generation++;ready=false;form.reset();lock(true);status.textContent='Log in om de huidige automatische e-mail te laden.';history.replaceChildren();preview.replaceChildren();previewPanel.querySelector('.welcome-preview-subject').textContent='';}
export async function loadWelcome(){const token=++generation;ready=false;lock(true);status.textContent='Huidige automatische e-mail laden…';try{
 const {data,error}=await supabase.from('doxa_welcome_settings').select('subject,body').eq('id',1).single();if(token!==generation)return;if(error)throw error;
 form.elements.subject.value=data.subject;form.elements.body.value=data.body;ready=true;renderPreview();status.textContent='De huidige automatische e-mail is geladen. Dit is het bericht dat nieuwe inschrijvers ontvangen.';
 await loadHistory(token);
 }catch{if(token===generation)status.textContent='Bedankmail-instellingen konden niet worden geladen.';}finally{if(token===generation)lock(!ready);}}
form.addEventListener('submit',async event=>{event.preventDefault();if(!ready||!form.reportValidity())return;const token=generation;ready=false;lock(true);try{
 const saved={subject:form.elements.subject.value.trim(),body:form.elements.body.value.trim()};status.textContent='Automatische e-mail opslaan…';
 const {data,error}=await supabase.from('doxa_welcome_settings').update(saved).eq('id',1).select('subject,body').single();if(error||data?.subject!==saved.subject||data?.body!==saved.body)throw Error('Save not confirmed');if(token!==generation)return;
 form.elements.subject.value=data.subject;form.elements.body.value=data.body;renderPreview();status.textContent='Opgeslagen en actief. Nieuwe nieuwsbriefinschrijvers ontvangen vanaf nu deze automatische e-mail.';
 }catch{if(token===generation)status.textContent='Opslaan niet bevestigd. Vernieuw de gegevens.';}finally{if(token===generation){ready=true;lock(false);}}});
clearWelcome();
async function loadHistory(token){
 const {data,error}=await supabase.from('doxa_welcome_notifications').select('id,created_at,first_attempt_at,accepted_at,doxa_launch_list(first_name,email)').order('created_at',{ascending:false}).limit(10);
 if(token!==generation)return;
 history.replaceChildren();const heading=document.createElement('h3');heading.textContent='Laatste 10 automatische bedankmails';history.append(heading);
 if(error){const p=document.createElement('p');p.textContent='Verzendoverzicht kon niet worden geladen. De bedankmail-instellingen blijven beschikbaar.';history.append(p);return;}
 const hint=document.createElement('p');hint.className='muted';hint.textContent='Dit overzicht toont of de verzenddienst de mail heeft aangenomen. Aflevering en eventuele bounces controleer je bij Resend. Gebruik Gegevens vernieuwen om de status bij te werken.';history.append(hint);
 if(!data.length){const p=document.createElement('p');p.textContent='Er zijn nog geen automatische bedankmails klaargezet.';history.append(p);return;}
 for(const job of data){const row=document.createElement('div');row.className='event';const text=document.createElement('span');text.textContent=job.doxa_launch_list?.email||'Inschrijving';const small=document.createElement('small');small.textContent=new Date(job.created_at).toLocaleString('nl-NL')+' · '+welcomeState(job);text.append(small);row.append(text);history.append(row);}
}
