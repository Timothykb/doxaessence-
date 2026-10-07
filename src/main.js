import './style.css';
export { supabase } from './supabase.js';

const products = [
  { id: 'sola', name: 'SOLA', index: 0, type: 'warm', mood: 'WARM. STRALEND. ONBEVANGEN.', notes: ['Bergamot', 'Oranjebloesem', 'Amber'], description: 'Het gevoel van zonlicht op je huid. Een warm geurconcept waarin sprankelende citrus overgaat in zachte bloemen en gouden amber.' },
  { id: 'nocte', name: 'NOCTE', index: 1, type: 'deep', mood: 'DIEP. MAGNETISCH. ONVERGETELIJK.', notes: ['Zwarte peper', 'Cederhout', 'Vanille'], description: 'Voor het moment waarop de avond begint. Een donker, houtachtig geurconcept met kruidige spanning en een zachte, warme basis.' },
  { id: 'pure', name: 'PURE', index: 2, type: 'fresh', mood: 'FRIS. ZACHT. HELEMAAL JIJ.', notes: ['Neroli', 'Witte thee', 'Musk'], description: 'Een frisse start, een helder gevoel. Een licht geurconcept waarin witte thee, zachte bloemen en musk dicht bij de huid blijven.' },
];
const grid = document.querySelector('#products');
function photo(p) { return `<img class="product-photo" style="--index:${p.index}" src="/images/doxa-collection.png" alt="${p.name} conceptflacon van Doxa Essence" loading="lazy">`; }
function renderProducts(filter = 'all') {
  grid.innerHTML = products.filter(p => filter === 'all' || p.type === filter).map(p => `<article class="product-card"><button class="product-image" data-product="${p.id}" aria-label="Ontdek ${p.name}"><span class="product-tag">EAU DE PARFUM · CONCEPT</span>${photo(p)}<span class="round-arrow" aria-hidden="true">↗</span></button><div class="product-info"><div><h3>${p.name}</h3><p>${p.notes.join(' / ')}</p></div><span>BINNENKORT</span></div></article>`).join('');
}
renderProducts();
const dialogs = [...document.querySelectorAll('dialog')];
function openDialog(dialog) { dialogs.forEach(d => d.close()); dialog.showModal(); document.body.classList.add('dialog-open'); }
dialogs.forEach(dialog => {
  dialog.querySelector('.close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => { if (!dialogs.some(d => d.open)) document.body.classList.remove('dialog-open'); });
  dialog.addEventListener('click', e => { if (e.target === dialog) { const r = dialog.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close(); } });
});
function showProduct(id) {
  const p = products.find(p => p.id === id);
  if (!p) return;
  document.querySelector('#detail-content').innerHTML = `<div class="detail-photo">${photo(p)}</div><p class="eyebrow">${p.mood}</p><h2 id="detail-title">${p.name}</h2><p>${p.description}</p><div class="notes">${p.notes.map((note,i) => `<div><span>${['TOPNOOT','HARTNOOT','BASISNOOT'][i]}</span><strong>${note}</strong></div>`).join('')}</div><p class="concept-note">Dit is een geur- en verpakkingsconcept. De definitieve samenstelling, inhoud en prijs volgen later.</p><span class="detail-state">BINNENKORT — NOG NIET TE BESTELLEN</span>`;
  openDialog(document.querySelector('#detail-dialog'));
}
document.addEventListener('click', e => {
  const product = e.target.closest('[data-product]');
  if (product) showProduct(product.dataset.product);
  const choice = e.target.closest('[data-choice]');
  if (choice) showProduct(choice.dataset.choice);
  if (e.target.closest('[data-quiz]')) openDialog(document.querySelector('#quiz-dialog'));
});
document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('[data-filter]').forEach(b => { b.classList.toggle('active', b === button); b.setAttribute('aria-pressed', String(b === button)); });
  renderProducts(button.dataset.filter);
}));
const search = document.querySelector('#search');
function searchProducts() {
  const query = search.value.toLocaleLowerCase('nl').trim();
  const matches = products.filter(p => `${p.name} ${p.mood} ${p.notes.join(' ')} ${p.description}`.toLocaleLowerCase('nl').includes(query));
  document.querySelector('#search-results').innerHTML = matches.length ? matches.map(p => `<button class="search-result" data-product="${p.id}"><strong>${p.name}</strong><span>${p.notes.join(' · ')} ↗</span></button>`).join('') : '<p style="margin-top:25px">Geen geur gevonden. Probeer bijvoorbeeld amber, vanille of musk.</p>';
}
document.querySelector('.search-open').addEventListener('click', () => { openDialog(document.querySelector('#search-dialog')); searchProducts(); search.focus(); });
search.addEventListener('input', searchProducts);
const menu = document.querySelector('.mobile-menu');
const nav = document.querySelector('#navigation');
menu.addEventListener('click', () => { const open = nav.classList.toggle('open'); menu.setAttribute('aria-expanded',String(open)); menu.setAttribute('aria-label',open ? 'Menu sluiten':'Menu openen'); });
nav.addEventListener('click', e => { if (e.target.closest('a,button')) { nav.classList.remove('open'); menu.setAttribute('aria-expanded','false'); menu.setAttribute('aria-label','Menu openen'); } });
