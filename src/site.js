import './base.css';

document.documentElement.classList.add('js');
export const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

/* ── Header: solid background once the page scrolls ─────── */
const header = document.querySelector('[data-header]');
function syncHeader() { header?.classList.toggle('is-solid', window.scrollY > 24); }
window.addEventListener('scroll', syncHeader, { passive: true });
syncHeader();

/* ── Mobile menu ────────────────────────────────────────── */
const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('#site-nav');
function setMenu(open) {
  if (!toggle) return;
  nav.classList.toggle('is-open', open);
  toggle.setAttribute('aria-expanded', String(open));
  toggle.querySelector('.sr-only').textContent = open ? 'Menu sluiten' : 'Menu openen';
  document.body.classList.toggle('menu-open', open);
  if (open) nav.querySelector('a')?.focus();
}
toggle?.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && toggle?.getAttribute('aria-expanded') === 'true') { setMenu(false); toggle.focus(); }
});
nav?.addEventListener('click', event => { if (event.target.closest('a')) setMenu(false); });
window.matchMedia('(min-width: 901px)').addEventListener('change', () => setMenu(false));

/* ── Reveal on enter (one-off, for decorative entrances) ── */
// Masked elements are clipped to nothing, so their parent is observed instead.
const revealTargets = new Map();
const revealObserver = new IntersectionObserver(entries => {
  for (const entry of entries) if (entry.isIntersecting) {
    revealTargets.get(entry.target)?.forEach(node => node.classList.add('is-in'));
    revealObserver.unobserve(entry.target);
  }
}, { rootMargin: '0px 0px -8% 0px', threshold: .05 });
document.querySelectorAll('.reveal, .reveal-mask').forEach(node => {
  const target = node.classList.contains('reveal-mask') ? node.parentElement : node;
  if (!revealTargets.has(target)) { revealTargets.set(target, []); revealObserver.observe(target); }
  revealTargets.get(target).push(node);
});

/* ── Scroll-linked highlight text ───────────────────────────
   Words light up in reading order as the text passes the reading line and
   fade back exactly when scrolling up. Progress is derived from the text's
   position on screen, so it stops the moment scrolling stops. */
function splitWords(container) {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) if (walker.currentNode.nodeValue.trim()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    const fragment = document.createDocumentFragment();
    for (const part of node.nodeValue.split(/(\s+)/)) {
      if (!part) continue;
      if (/^\s+$/.test(part)) { fragment.append(part); continue; }
      const span = document.createElement('span');
      span.className = 'w'; span.textContent = part;
      fragment.append(span);
    }
    node.replaceWith(fragment);
  }
  return [...container.querySelectorAll('.w')];
}

export function initHighlight(root = document) {
  const blocks = [...root.querySelectorAll('.highlight-text')].map(container => ({ container, words: splitWords(container), lines: [] }));
  if (!blocks.length) return;
  if (reducedMotion.matches) { blocks.forEach(block => block.words.forEach(word => word.style.setProperty('--p', 1))); return; }

  function measure() {
    for (const block of blocks) {
      const lines = [];
      for (const word of block.words) {
        const rect = word.getBoundingClientRect();
        const top = rect.top + window.scrollY;
        let line = lines.at(-1);
        if (!line || Math.abs(line.top - top) > rect.height * .5) { line = { top, height: rect.height, left: rect.left, right: rect.right, words: [] }; lines.push(line); }
        line.right = Math.max(line.right, rect.right);
        line.left = Math.min(line.left, rect.left);
        line.words.push({ el: word, left: rect.left, width: rect.width, value: -1 });
      }
      for (const line of lines) for (const word of line.words) word.x = (word.left + word.width / 2 - line.left) / Math.max(1, line.right - line.left);
      block.lines = lines;
      block.top = lines[0]?.top ?? 0;
      block.bottom = (lines.at(-1)?.top ?? 0) + (lines.at(-1)?.height ?? 0);
    }
    update();
  }
  let frame = 0;
  function update() {
    frame = 0;
    const vh = window.innerHeight;
    const anchor = window.scrollY + vh * .72;            // the reading line
    for (const block of blocks) {
      if (block.bottom < window.scrollY - vh || block.top > window.scrollY + vh * 2) continue;
      for (const line of block.lines) {
        const sweep = line.height * 2.2;                   // scroll distance to light one line
        const u = (anchor - line.top) / sweep;
        for (const word of line.words) {
          const value = Math.round(Math.min(1, Math.max(0, (u - word.x * .8) / .28)) * 100) / 100;
          if (value !== word.value) { word.value = value; word.el.style.setProperty('--p', value); }
        }
      }
    }
  }
  const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
  window.addEventListener('scroll', schedule, { passive: true });
  let resizeTimer;
  const remeasure = () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(measure, 80); };
  const observer = new ResizeObserver(remeasure);
  blocks.forEach(block => observer.observe(block.container));
  document.fonts?.ready.then(measure);
  measure();
}

/* ── Newsletter ─────────────────────────────────────────── */
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
document.querySelectorAll('[data-newsletter]').forEach(form => {
  const status = form.querySelector('.form-status');
  const email = form.elements.email;
  const consent = form.elements.consent;
  const button = form.querySelector('[type=submit]');
  const say = (state, text) => { status.dataset.state = state; status.textContent = text; };
  email.addEventListener('input', () => email.removeAttribute('aria-invalid'));
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (form.elements.company.value) return;
    const value = email.value.trim().toLowerCase();
    if (!emailPattern.test(value)) { email.setAttribute('aria-invalid', 'true'); email.focus(); say('error', 'Vul een geldig e-mailadres in, bijvoorbeeld naam@voorbeeld.nl.'); return; }
    if (!consent.checked) { consent.focus(); say('error', 'Vink aan dat je de nieuwsbrief wilt ontvangen.'); return; }
    if (button.dataset.loading === 'true') return;
    button.dataset.loading = 'true'; button.disabled = true;
    say('pending', 'Je inschrijving wordt opgeslagen…');
    try {
      const { supabase } = await import('./supabase.js');
      const { error } = await supabase.from('newsletter_subscribers')
        .insert({ email: value, consent: true, source: location.pathname.slice(0, 80) })
        .abortSignal(AbortSignal.timeout(12000));
      if (error && error.code !== '23505') throw error;
      form.reset();
      say('success', error ? 'Dit e-mailadres staat al op onze lijst. Je hoort van ons.' : 'Dank je wel. Je inschrijving is opgeslagen — je hoort van ons bij het volgende hoofdstuk.');
    } catch {
      say('error', 'Je inschrijving kon niet worden opgeslagen. Probeer het later opnieuw of mail info@doxaessence.com.');
    } finally { button.dataset.loading = 'false'; button.disabled = false; }
  });
});
