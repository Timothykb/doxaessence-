/* Doxa Essence — intro (standalone add-on).
   First light draws the rule of the logo like a horizon; DOXA rises above it,
   ESSENCE settles below it; the horizon widens across the screen, the darkness
   parts along it and the logo lands on the header logo. About 3.4 seconds.
   Shown once per browser session, never with reduced motion, and the site
   always appears, also when an image or this script fails. */
(() => {
  const root = document.documentElement;
  const KEY = 'doxa-intro-seen';
  const BASE = window.DOXA_INTRO_BASE || (document.currentScript && document.currentScript.src.replace(/[^/]*$/, '')) || '/intro/';
  const LAYERS = ['doxa', 'rule', 'essence'];
  const RULE_Y = 0.5955;                      // vertical centre of the rule within the logo file
  const EASE_OUT = 'cubic-bezier(.22, 1, .36, 1)';
  const EASE_SCENE = 'cubic-bezier(.76, 0, .2, 1)';

  if (!root.classList.contains('doxa-intro-pending')) return;   // decided in <head>: already seen or reduced motion
  let finished = false;
  let intro = null;
  const animations = [];

  function finish(fast) {
    if (finished) return;
    finished = true;
    clearTimeout(watchdog);
    document.removeEventListener('keydown', onKey);
    root.classList.remove('doxa-intro-pending', 'doxa-intro-active');
    animations.forEach(a => { try { a.cancel(); } catch {} });
    if (!intro) return;
    if (fast) {
      intro.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, easing: 'ease-out', fill: 'forwards' })
        .finished.catch(() => {}).then(() => intro.remove());
    } else intro.remove();
  }
  // Whatever happens, the site is usable after 6 seconds.
  const watchdog = setTimeout(() => finish(true), 6000);
  const onKey = event => { if (event.key === 'Escape') finish(true); };

  function load(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = 'async'; img.alt = ''; img.draggable = false;
      img.onload = () => (img.decode ? img.decode().catch(() => {}) : Promise.resolve()).then(() => resolve(img));
      img.onerror = reject;
      img.src = src;
    });
  }
  const timeout = ms => new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms));

  async function start() {
    try { sessionStorage.setItem(KEY, '1'); } catch {}
    let images;
    try {
      images = await Promise.race([Promise.all(LAYERS.map(n => load(`${BASE}brand/doxa-logo-${n}.png`))), timeout(2500)]);
    } catch { finish(true); return; }
    if (finished || typeof Element.prototype.animate !== 'function') { finish(true); return; }

    intro = document.createElement('div');
    intro.id = 'doxa-intro';
    intro.innerHTML = '<div class="di-panel di-top"><div class="di-shade"></div></div><div class="di-panel di-bottom"><div class="di-shade"></div></div><div class="di-seam"></div><div class="di-logo" aria-hidden="true"><div class="di-glint"></div></div><button class="di-skip" type="button">Intro overslaan</button>';
    const logo = intro.querySelector('.di-logo');
    images.forEach((img, i) => { img.className = `di-${LAYERS[i]}`; logo.insertBefore(img, logo.querySelector('.di-glint')); });
    intro.querySelector('.di-skip').addEventListener('click', () => finish(true));
    document.addEventListener('keydown', onKey);
    document.body.prepend(intro);                 // first in tab order: the skip button is the first stop

    // Layout: centre the logo and put the seam exactly on the rule.
    const w = logo.offsetWidth, h = logo.offsetHeight;
    const left = (innerWidth - w) / 2, top = (innerHeight - h) / 2 - h * 0.04;
    logo.style.left = `${left}px`; logo.style.top = `${top}px`;
    const seamY = top + h * RULE_Y;
    intro.style.setProperty('--seam', `${seamY}px`);
    // the shade gradient centre must follow the seam within each panel
    intro.querySelector('.di-bottom .di-shade').style.background = `radial-gradient(ellipse 70% 60% at 50% 0, transparent 35%, rgb(30 0 0 / .55) 100%)`;
    intro.querySelector('.di-top .di-shade').style.background = `radial-gradient(ellipse 70% 60% at 50% 100%, transparent 35%, rgb(30 0 0 / .55) 100%)`;

    root.classList.add('doxa-intro-active');
    root.classList.remove('doxa-intro-pending');  // the intro now covers the page itself

    const [doxa, rule, essence] = images;
    const glint = intro.querySelector('.di-glint');
    const seam = intro.querySelector('.di-seam');
    const play = (el, frames, opts) => { const a = el.animate(frames, { fill: 'both', ...opts }); animations.push(a); return a; };

    // 1 · The first light: the rule is drawn from the centre outward.
    play(rule, [{ clipPath: 'inset(0 50% 0 50%)' }, { clipPath: 'inset(0 0% 0 0%)' }], { delay: 200, duration: 820, easing: EASE_OUT });
    play(glint, [{ opacity: 0, transform: 'scaleX(.05)' }, { opacity: 1, offset: .35 }, { opacity: 0, transform: 'scaleX(1)' }], { delay: 200, duration: 900, easing: 'ease-out' });
    // 2 · Heaven and earth: DOXA rises above the line, ESSENCE settles below it.
    play(doxa, [{ clipPath: 'inset(52.5% 0 0 0)', transform: 'translateY(9%)' }, { clipPath: 'inset(30% 0 0 0)', transform: 'translateY(0)' }], { delay: 720, duration: 980, easing: EASE_OUT });
    play(essence, [{ clipPath: 'inset(0 0 35.6% 0)', transform: 'translateY(-3.5%)', opacity: .2 }, { clipPath: 'inset(0 0 27% 0)', transform: 'translateY(0)', opacity: 1 }], { delay: 1020, duration: 880, easing: EASE_OUT });
    // darkness lifts a little as the name appears
    intro.querySelectorAll('.di-shade').forEach(el => play(el, [{ opacity: 1 }, { opacity: .55 }], { delay: 300, duration: 1600, easing: 'ease-out' }));

    // 3 · The horizon widens over the whole screen, then the darkness parts along it.
    const T_OPEN = 2250;
    play(seam, [{ opacity: 0, transform: `scaleX(${(w * 0.434) / innerWidth})` }, { opacity: .85, offset: .25 }, { opacity: .85, transform: 'scaleX(1)', offset: .8 }, { opacity: 0, transform: 'scaleX(1)' }], { delay: T_OPEN - 380, duration: 1100, easing: EASE_SCENE });
    play(intro.querySelector('.di-top'), [{ transform: 'translateY(0)' }, { transform: 'translateY(-100%)' }], { delay: T_OPEN, duration: 1050, easing: EASE_SCENE });
    play(intro.querySelector('.di-bottom'), [{ transform: 'translateY(0)' }, { transform: 'translateY(100%)' }], { delay: T_OPEN, duration: 1050, easing: EASE_SCENE });
    intro.querySelectorAll('.di-shade').forEach(el => play(el, [{ opacity: .55 }, { opacity: 0 }], { delay: T_OPEN - 200, duration: 500, easing: 'ease-out' }));
    setTimeout(() => intro && intro.classList.add('di-leaving'), T_OPEN - 300);

    // 4 · The logo lands exactly on the header logo (same file, same proportions).
    const target = document.querySelector('[data-intro-logo-target] img');
    const rect = target && target.getBoundingClientRect();
    const landing = rect && rect.width > 0
      ? play(logo, [{ transform: 'translate(0, 0) scale(1)' }, { transform: `translate(${rect.left - left}px, ${rect.top - top}px) scale(${rect.width / w})` }], { delay: T_OPEN + 60, duration: 1050, easing: EASE_SCENE })
      : play(logo, [{ opacity: 1 }, { opacity: 0 }], { delay: T_OPEN, duration: 600, easing: 'ease-out' });
    landing.finished.then(() => {
      if (finished) return;
      // hand over to the real header logo, then remove the intro
      root.classList.remove('doxa-intro-active');
      requestAnimationFrame(() => finish(false));
    }).catch(() => {});
  }

  const go = () => start().catch(() => finish(true));
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go, { once: true }); else go();
})();
