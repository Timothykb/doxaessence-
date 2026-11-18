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
  ['One scent. One memory.', 'What memory comes to mind when you wear The Genesis?'],
  ['Your first impression.', 'From the first spray to the scent on your skin. How do you experience The Genesis?'],
  ['What moves you?', 'A moment of hope, faith or change. Share the story you want to tell.'],
  ['A story that stays.', 'Sometimes a conversation starts with one question: what are you wearing? What is your answer?'],
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
    card.append(element('span', 'WRITING INSPIRATION', 'story-category'), element('h3', title), element('p', description));
    const link = element('a', 'SHARE YOUR STORY ↗'); link.href = '#share'; card.append(link);
    (index % 2 ? right : left).append(card);
  });
}
function renderStory(story, index) {
  const card = element('article', undefined, 'story-card-community');
  card.append(element('span', story.kind === 'review' ? 'REVIEW / THE GENESIS' : 'TESTIMONY / OUR STORIES', 'story-category'));
  if (story.kind === 'review' && story.rating) {
    const stars = element('p', '★'.repeat(story.rating) + '☆'.repeat(5 - story.rating), 'story-stars');
    stars.setAttribute('aria-label', `${story.rating} out of 5 stars`); card.append(stars);
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
  feedStatus.textContent = 'Loading stories…';
  try {
    let query = supabase.from('community_stories').select('id,display_name,kind,body,rating,created_at', { count: 'exact' })
      .eq('status', 'approved').order('created_at', { ascending: false }).order('id', { ascending: false }).range(offset, offset + pageSize - 1);
    if (filter !== 'all') query = query.eq('kind', filter);
    const { data, count, error } = await query.abortSignal(AbortSignal.timeout(10000));
    if (version !== requestVersion) return;
    if (error) throw error;
    data.forEach((story, index) => renderStory(story, offset + index));
    offset += data.length;
    document.querySelector('#community-count').textContent = `${count} ${count === 1 ? 'story' : 'stories'}`;
    more.hidden = offset >= count;
    if (!count) {
      showPrompts();
      feedStatus.textContent = 'Approved stories will appear here. Will you share the first? The cards above are writing prompts.';
    } else feedStatus.textContent = 'Stories from visitors. Reviews are not verified purchases.';
  } catch {
    if (version !== requestVersion) return;
    if (reset) showPrompts();
    document.querySelector('#community-count').textContent = 'Stories temporarily unavailable';
    feedStatus.textContent = 'We cannot load the stories right now. Please try again.';
    more.hidden = false; more.textContent = 'TRY AGAIN ↻';
  } finally { if (version === requestVersion) more.disabled = false; }
}
more.addEventListener('click', () => { more.textContent = 'MORE STORIES ↓'; loadStories(offset === 0); });
document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
  filter = button.dataset.filter;
  document.querySelectorAll('[data-filter]').forEach(node => node.setAttribute('aria-pressed', String(node === button)));
  more.hidden = true; more.textContent = 'MORE STORIES ↓'; loadStories();
}));
function syncKind() {
  const review = form.elements.kind.value === 'review';
  document.querySelector('#rating-field').hidden = !review;
  form.querySelectorAll('[name=rating]').forEach(input => { input.required = review; input.disabled = !review; });
  body.placeholder = review ? 'How do you experience The Genesis? Tell us about the scent and your experience…' : 'There is a story I would like to share…';
}
form.querySelectorAll('[name=kind]').forEach(input => input.addEventListener('change', syncKind));
body.addEventListener('input', () => { document.querySelector('#character-count').textContent = `${body.value.length} / 1,500`; body.setCustomValidity(''); });
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (form.elements.website.value) return;
  const name = form.elements.display_name.value.trim();
  const story = body.value.trim();
  if (story.length < 20 || name.length < 2) { status.dataset.state = 'error'; status.textContent = 'Enter a name with at least 2 characters and a story with at least 20 characters.'; return; }
  const submit = form.querySelector('[type=submit]');
  if (submit.disabled) return;
  submit.disabled = true;
  status.dataset.state = 'pending'; status.textContent = 'Sending your story…';
  try {
    const kind = form.elements.kind.value;
    const { error } = await supabase.from('community_stories').insert({
      display_name: name, body: story, kind,
      rating: kind === 'review' ? Number(form.elements.rating.value) : null,
      consent: form.elements.consent.checked,
    }).abortSignal(AbortSignal.timeout(15000));
    if (error) throw error;
    form.reset(); syncKind(); document.querySelector('#character-count').textContent = '0 / 1,500';
    status.dataset.state = 'success'; status.textContent = 'Thank you! We have received your story. It will appear here after review and approval.';
  } catch {
    status.dataset.state = 'error'; status.textContent = 'We cannot confirm receipt right now. Your text has been kept. Please try again later or email info@doxaessence.com.';
  } finally { submit.disabled = false; }
});
syncKind(); loadStories();
