import { reducedMotion, initHighlight } from './site.js';
import './home.css';

initHighlight();

/* ── Hero: pinned 3D scene with progressive enhancement ── */
const hero = document.querySelector('[data-hero]');
const canvas = hero.querySelector('.hero-canvas');
const copy = hero.querySelector('[data-hero-copy]');
const bar = hero.querySelector('[data-hero-bar]');
const steps = [...hero.querySelectorAll('[data-step]')];
const live = hero.querySelector('[data-hero-live]');
const momentNames = ['Het eerste licht', 'Ontdekking', 'De verstuiving', 'Het verhaal ontvouwt zich: LIGHT, EARTH, LIFE'];

function webglAvailable() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

let scene = null;
let progress = 0;
const isMobile = () => window.matchMedia('(max-width: 900px), (max-aspect-ratio: 9/10)').matches;

function heroProgress() {
  const rect = hero.getBoundingClientRect();
  const span = rect.height - window.innerHeight;
  return span > 0 ? Math.min(1, Math.max(0, -rect.top / span)) : 0;
}

let lastMoment = -1;
function syncHero() {
  progress = heroProgress();
  hero.style.setProperty('--hp', progress.toFixed(4));
  scene?.setProgress(progress);
  const copyHidden = progress > .54;
  if (copy.inert !== copyHidden) copy.inert = copyHidden;
  const barHidden = progress < .52;
  if (bar.inert !== barHidden) bar.inert = barHidden;
  const moment = progress < .2 ? 0 : progress < .5 ? 1 : progress < .8 ? 2 : 3;
  if (moment !== lastMoment) {
    lastMoment = moment;
    steps.forEach((step, i) => (i === moment ? step.setAttribute('aria-current', 'step') : step.removeAttribute('aria-current')));
    if (live && scene) live.textContent = momentNames[moment];
  }
}

function scrollToProgress(p) {
  const top = hero.offsetTop + p * (hero.offsetHeight - window.innerHeight);
  window.scrollTo({ top, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
}
steps.forEach(step => step.addEventListener('click', () => scrollToProgress(Number(step.dataset.step))));
hero.querySelector('[data-replay]').addEventListener('click', () => scene?.replaySpray());

async function startScene() {
  if (reducedMotion.matches || !webglAvailable()) return;
  hero.classList.add('is-3d');
  let frame = 0;
  window.addEventListener('scroll', () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; syncHero(); }); }, { passive: true });
  syncHero();
  try {
    const { createHero } = await import('./hero3d.js');
    scene = await createHero({ canvas, mobile: isMobile() });
    scene.jumpTo(heroProgress());
    hero.classList.add('is-ready');
    new IntersectionObserver(([entry]) => scene.setActive(entry.isIntersecting)).observe(hero);
    let resizeTimer;
    window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { scene.resize(); syncHero(); }, 120); });
    document.addEventListener('visibilitychange', () => scene.setActive(!document.hidden));
  } catch (error) {
    // 3D unavailable: the photo, copy and pre-order button remain the hero.
    console.warn('3D hero disabled', error);
    hero.classList.remove('is-3d');
    hero.style.removeProperty('--hp');
    copy.inert = false;
  }
}
const idle = window.requestIdleCallback || (cb => setTimeout(cb, 200));
if (document.readyState === 'complete') idle(startScene); else window.addEventListener('load', () => idle(startScene), { once: true });

// If the visitor prefers reduced motion mid-visit, fall back to the still image.
reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) location.reload(); });

/* ── Scent chapters: scroll-linked parallax variable ───── */
const chapters = [...document.querySelectorAll('[data-chapter]')];
chapters.forEach(chapter => chapter.querySelectorAll('.notes li').forEach((li, i) => li.style.setProperty('--n', i)));
const chapterObserver = new IntersectionObserver(entries => entries.forEach(entry => {
  if (entry.isIntersecting) entry.target.classList.add('is-in');
}), { threshold: .15 });
chapters.forEach(chapter => chapterObserver.observe(chapter));
if (!reducedMotion.matches) {
  let frame = 0;
  const update = () => {
    frame = 0;
    const vh = window.innerHeight;
    for (const chapter of chapters) {
      const rect = chapter.getBoundingClientRect();
      if (rect.bottom < -50 || rect.top > vh + 50) continue;
      const cp = Math.min(1, Math.max(0, (vh - rect.top) / (rect.height + vh)));
      chapter.style.setProperty('--cp', cp.toFixed(3));
    }
  };
  window.addEventListener('scroll', () => { if (!frame) frame = requestAnimationFrame(update); }, { passive: true });
  update();
}
