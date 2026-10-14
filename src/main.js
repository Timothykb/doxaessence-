import './style.css';
import './storefront.css';
import { supabase } from './supabase.js';

const layers = {
  light: { number: '01', stage: 'TOPNOTEN / LIGHT', title: 'The warmth\nof light.', notes: 'Bergamot · Roze peper · Kardemom', copy: 'The moment darkness gave way to light.' },
  life: { number: '02', stage: 'HARTNOTEN / LIFE', title: 'The promise\nof life.', notes: 'Vijgenblad · Vijg · Iris · Oranjebloesem', copy: 'When water and earth took form, and life began.' },
  earth: { number: '03', stage: 'BASISNOTEN / EARTH', title: 'The stillness\nof earth.', notes: 'Sandelhout · Cederhout · Ambrette-musk · Zachte amber · Een vleugje vanille', copy: 'Fresh, warm, woody, and mysterious. Familiar, yet never ordinary.' },
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
  document.querySelector('.scent-stage').dataset.layer = tab.dataset.note;
  const chips = document.querySelector('.ingredient-chips');
  chips.replaceChildren(...layer.notes.split(' · ').map((note, index) => {
    const chip = document.createElement('span'); chip.textContent = note;
    chip.style.setProperty('--i', index); return chip;
  }));
  if (focus) tab.focus();
}
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => { pauseMotion(); selectLayer(tab); });
  tab.addEventListener('keydown', event => {
    let next;
    if (['ArrowDown', 'ArrowRight'].includes(event.key)) next = (index + 1) % tabs.length;
    if (['ArrowUp', 'ArrowLeft'].includes(event.key)) next = (index + tabs.length - 1) % tabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = tabs.length - 1;
    if (next !== undefined) { event.preventDefault(); pauseMotion(); selectLayer(tabs[next], true); }
  });
});
// Advance only while the scent section is visible; manual selection pauses the tour.
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
const motionButton = document.querySelector('#scent-motion');
let motionPaused = motionPreference.matches;
let scentVisible = false;
function syncMotion() {
  motionButton.setAttribute('aria-pressed', String(motionPaused));
  motionButton.textContent = motionPaused ? 'Play animation' : 'Pause animation';
  document.querySelector('.scent-stage').classList.toggle('motion-paused', motionPaused || !scentVisible || document.hidden);
}
function pauseMotion() { motionPaused = true; syncMotion(); }
motionButton.addEventListener('click', () => { motionPaused = !motionPaused; syncMotion(); });
motionPreference.addEventListener('change', () => { motionPaused = motionPreference.matches; syncMotion(); });
new IntersectionObserver(entries => { scentVisible = entries[0].isIntersecting; syncMotion(); }, { threshold: .25 }).observe(document.querySelector('.scent-stage'));
document.addEventListener('visibilitychange', syncMotion);
setInterval(() => {
  if (motionPaused || !scentVisible || document.hidden) return;
  const current = tabs.findIndex(tab => tab.getAttribute('aria-selected') === 'true');
  selectLayer(tabs[(current + 1) % tabs.length]);
}, 6500);
syncMotion();
// One real content query per page load. Local copy remains available on failure.
async function loadScentLayers() {
  try {
    const { data, error } = await supabase.from('scent_layers')
      .select('slug,number,stage,title,notes,copy')
      .abortSignal(AbortSignal.timeout(5000));
    if (error || !Array.isArray(data)) return;
    const fields = ['number', 'stage', 'title', 'notes', 'copy'];
    if (data.length !== 3 || !Object.keys(layers).every(slug =>
      data.some(row => row.slug === slug && fields.every(field =>
        typeof row[field] === 'string' && row[field].trim() && row[field].length <= 1000)))) return;
    for (const row of data) layers[row.slug] = row;
    selectLayer(tabs.find(tab => tab.getAttribute('aria-selected') === 'true') || tabs[0]);
    document.querySelectorAll('#notes-dialog .note-row p').forEach((node, index) => {
      node.textContent = layers[tabs[index].dataset.note].notes;
    });
    document.querySelector('#scent-panel').dataset.contentSource = 'supabase';
  } catch {
    // Network interruption or a paused project must not hide the fragrance notes.
  }
}
loadScentLayers();

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
  { title: 'C1 — The Genesis', description: 'The beginning of everything.', target: '#genesis', keywords: 'genesis chapter beginning perfume fragrance story light life earth bergamot cardamom fig fig leaf pink pepper iris orange blossom ambrette amber vanilla roze peper kardemom vijgenblad vijg oranjebloesem sandelhout cederhout vanille sandalwood cedarwood musk scent' },
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
