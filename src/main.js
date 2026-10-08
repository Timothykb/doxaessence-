import './style.css';
export { supabase } from './supabase.js';

const layers = {
  light: { number: '01', stage: 'THE OPENING', title: 'The warmth\nof light.', notes: 'Bergamot · Cardamom', copy: 'The moment darkness gave way to light.' },
  life: { number: '02', stage: 'THE HEART', title: 'The promise\nof life.', notes: 'Fig · Fig Leaf · Soft Florals', copy: 'When water and earth took form, and life began.' },
  earth: { number: '03', stage: 'THE FOUNDATION', title: 'The stillness\nof earth.', notes: 'Sandalwood · Cedarwood · Musk', copy: 'Fresh, warm, woody, and mysterious. Familiar, yet never ordinary.' },
};
const tabs = [...document.querySelectorAll('[data-note]')];
function selectLayer(tab, focus = false) {
  const layer = layers[tab.dataset.note];
  tabs.forEach(button => { const selected = button === tab; button.setAttribute('aria-selected', String(selected)); button.tabIndex = selected ? 0 : -1; });
  document.querySelector('#scent-panel').setAttribute('aria-labelledby', tab.id);
  document.querySelector('.scent-number').textContent = layer.number;
  document.querySelector('#note-stage').textContent = layer.stage;
  document.querySelector('#note-title').textContent = layer.title;
  document.querySelector('#note-list').textContent = layer.notes;
  document.querySelector('#note-copy').textContent = layer.copy;
  if (focus) tab.focus();
}
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectLayer(tab));
  tab.addEventListener('keydown', event => {
    let next;
    if (['ArrowDown', 'ArrowRight'].includes(event.key)) next = (index + 1) % tabs.length;
    if (['ArrowUp', 'ArrowLeft'].includes(event.key)) next = (index + tabs.length - 1) % tabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = tabs.length - 1;
    if (next !== undefined) { event.preventDefault(); selectLayer(tabs[next], true); }
  });
});
const dialogs = [...document.querySelectorAll('dialog')];
function openDialog(dialog) { dialogs.forEach(d => d.close()); dialog.showModal(); document.body.classList.add('dialog-open'); }
dialogs.forEach(dialog => {
  dialog.querySelector('.close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => { if (!dialogs.some(d => d.open)) document.body.classList.remove('dialog-open'); });
  dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
});
document.querySelector('#all-notes').addEventListener('click', () => openDialog(document.querySelector('#notes-dialog')));
const search = document.querySelector('#search');
const searchEntries = [
  { title: 'C1 — The Genesis', description: 'The beginning of everything.', target: '#genesis', keywords: 'genesis chapter beginning perfume fragrance story light life earth bergamot cardamom fig fig leaf soft florals sandalwood cedarwood musk scent' },
  { title: 'About Doxa Essence', description: 'Can a story have a scent?', target: '#about', keywords: 'about doxa essence story greek glory honor splendor memory emotion fragrance house' },
  { title: 'A Story You Can Wear', description: 'The Genesis is only the beginning.', target: '#your-story', keywords: 'wear story chapters beginning what are you wearing thank you' },
];
function renderSearch() {
  const query = search.value.toLowerCase().trim();
  const results = searchEntries.filter(entry => `${entry.title} ${entry.keywords}`.toLowerCase().includes(query));
  const container = document.querySelector('#search-results');
  container.replaceChildren();
  if (!results.length) { const empty = document.createElement('p'); empty.className = 'search-empty'; empty.textContent = 'No story found. Try Genesis, fig or sandalwood.'; container.append(empty); return; }
  results.forEach(entry => {
    const link = document.createElement('a'); link.className = 'search-result'; link.href = entry.target;
    const title = document.createElement('strong'); title.textContent = entry.title;
    const description = document.createElement('span'); description.textContent = `${entry.description} ↗`;
    link.append(title, description); link.addEventListener('click', () => document.querySelector('#search-dialog').close()); container.append(link);
  });
}
document.querySelector('.search-open').addEventListener('click', () => { openDialog(document.querySelector('#search-dialog')); renderSearch(); search.focus(); });
search.addEventListener('input', renderSearch);
const menu = document.querySelector('.mobile-menu');
const navigation = document.querySelector('#navigation');
function closeMenu() { navigation.classList.remove('open'); menu.setAttribute('aria-expanded', 'false'); menu.setAttribute('aria-label', 'Open menu'); }
menu.addEventListener('click', () => { const open = navigation.classList.toggle('open'); menu.setAttribute('aria-expanded', String(open)); menu.setAttribute('aria-label', open ? 'Close menu' : 'Open menu'); });
navigation.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
