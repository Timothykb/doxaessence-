import './style.css';
import './community.css';
import { supabase } from './supabase.js';

const form = document.querySelector('#story-form');
const body = document.querySelector('#story-body');
const status = document.querySelector('#form-status');
const left = document.querySelector('#stories-left');
const right = document.querySelector('#stories-right');
const feedStatus = document.querySelector('#feed-status');
const more = document.querySelector('#more-stories');
let filter = 'all';
let offset = 0;
let requestVersion = 0;
const pageSize = 12;
const prompts = [
  ['Een geur. Een herinnering.', 'Welke herinnering komt bij jou naar boven als je The Genesis draagt?'],
  ['Jouw eerste indruk.', 'Van de eerste verstuiving tot de geur op je huid. Hoe ervaar jij The Genesis?'],
  ['Wat raakt jou?', 'Een moment van hoop, geloof of verandering. Deel het verhaal dat jij wilt vertellen.'],
  ['Een verhaal dat blijft.', 'Soms begint een gesprek met één vraag: wat draag je? Wat is jouw antwoord?'],
];
function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function showPrompts() {
  prompts.forEach(([title, description], index) => {
    const card = element('article', undefined, 'story-card-community prompt-card');
    card.append(element('span', 'SCHRIJFINSPIRATIE', 'story-category'), element('h3', title), element('p', description));
    const link = element('a', 'DEEL JOUW VERHAAL ↗'); link.href = '#share'; card.append(link);
    (index % 2 ? right : left).append(card);
  });
}
function renderStory(story, index) {
  const card = element('article', undefined, 'story-card-community');
  card.append(element('span', story.kind === 'review' ? 'REVIEW / THE GENESIS' : 'GETUIGENIS / OUR STORIES', 'story-category'));
  if (story.kind === 'review' && story.rating) {
    const stars = element('p', '★'.repeat(story.rating) + '☆'.repeat(5 - story.rating), 'story-stars');
    stars.setAttribute('aria-label', `${story.rating} van 5 sterren`); card.append(stars);
  }
  card.append(element('blockquote', story.body));
  const author = element('div', undefined, 'story-author');
  const avatar = element('span', [...story.display_name][0].toUpperCase(), 'story-avatar'); avatar.setAttribute('aria-hidden', 'true');
  author.append(avatar, element('span', story.display_name)); card.append(author);
  (index % 2 ? right : left).append(card);
}
async function loadStories(reset = true) {
  const version = ++requestVersion;
  if (reset) { offset = 0; left.replaceChildren(); right.replaceChildren(); }
  more.disabled = true;
  feedStatus.textContent = 'Verhalen laden…';
  try {
    let query = supabase.from('community_stories').select('id,display_name,kind,body,rating,created_at', { count: 'exact' })
      .eq('status', 'approved').order('created_at', { ascending: false }).order('id', { ascending: false }).range(offset, offset + pageSize - 1);
    if (filter !== 'all') query = query.eq('kind', filter);
    const { data, count, error } = await query.abortSignal(AbortSignal.timeout(10000));
    if (version !== requestVersion) return;
    if (error) throw error;
    data.forEach((story, index) => renderStory(story, offset + index));
    offset += data.length;
    document.querySelector('#community-count').textContent = `${count} ${count === 1 ? 'verhaal' : 'verhalen'}`;
    more.hidden = offset >= count;
    if (!count) {
      showPrompts();
      feedStatus.textContent = 'Hier verschijnen straks de goedgekeurde verhalen. Deel jij de eerste? De kaarten hierboven zijn schrijfinspiratie.';
    } else feedStatus.textContent = 'Verhalen van bezoekers. Reviews zijn niet geverifieerd als aankoop.';
  } catch {
    if (version !== requestVersion) return;
    if (reset) showPrompts();
    document.querySelector('#community-count').textContent = 'Verhalen tijdelijk niet beschikbaar';
    feedStatus.textContent = 'We kunnen de verhalen nu niet laden. Probeer het opnieuw.';
    more.hidden = false; more.textContent = 'OPNIEUW PROBEREN ↻';
  } finally { if (version === requestVersion) more.disabled = false; }
}
more.addEventListener('click', () => { more.textContent = 'MEER VERHALEN ↓'; loadStories(offset === 0); });
document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
  filter = button.dataset.filter;
  document.querySelectorAll('[data-filter]').forEach(node => node.setAttribute('aria-pressed', String(node === button)));
  more.hidden = true; more.textContent = 'MEER VERHALEN ↓'; loadStories();
}));
function syncKind() {
  const review = form.elements.kind.value === 'review';
  document.querySelector('#rating-field').hidden = !review;
  form.querySelectorAll('[name=rating]').forEach(input => { input.required = review; input.disabled = !review; });
  body.placeholder = review ? 'Hoe ervaar jij The Genesis? Vertel over de geur en jouw ervaring…' : 'Er is een verhaal dat ik wil delen…';
}
form.querySelectorAll('[name=kind]').forEach(input => input.addEventListener('change', syncKind));
body.addEventListener('input', () => { document.querySelector('#character-count').textContent = `${body.value.length} / 1.500`; body.setCustomValidity(''); });
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (form.elements.website.value) return;
  const name = form.elements.display_name.value.trim();
  const story = body.value.trim();
  if (story.length < 20 || name.length < 2) { status.dataset.state = 'error'; status.textContent = 'Vul een naam van minimaal 2 tekens en een verhaal van minimaal 20 tekens in.'; return; }
  const submit = form.querySelector('[type=submit]');
  if (submit.disabled) return;
  submit.disabled = true;
  status.dataset.state = 'pending'; status.textContent = 'Je verhaal wordt verstuurd…';
  try {
    const kind = form.elements.kind.value;
    const { error } = await supabase.from('community_stories').insert({
      display_name: name, body: story, kind,
      rating: kind === 'review' ? Number(form.elements.rating.value) : null,
      consent: form.elements.consent.checked,
    }).abortSignal(AbortSignal.timeout(15000));
    if (error) throw error;
    form.reset(); syncKind(); document.querySelector('#character-count').textContent = '0 / 1.500';
    status.dataset.state = 'success'; status.textContent = 'Dank je wel. Je verhaal is ontvangen! We lezen het eerst; na goedkeuring verschijnt het hier.';
  } catch {
    status.dataset.state = 'error'; status.textContent = 'We kunnen de ontvangst nu niet bevestigen. Je tekst staat er nog. Probeer het later opnieuw of mail info@doxaessence.com.';
  } finally { submit.disabled = false; }
});
syncKind(); loadStories();
