/* Doxa Essence — intro (standalone add-on).
   Each letter of the logo drifts in from its own direction and settles in
   place; the rule is drawn like a horizon; the horizon widens across the
   screen, the darkness
   parts along it and the logo lands on the header logo. About 4 seconds.
   Shown once per browser session, never with reduced motion, and the site
   always appears, also when an image or this script fails. */
(() => {
  const root = document.documentElement;
  const KEY = 'doxa-intro-seen';
  const BASE = window.DOXA_INTRO_BASE || (document.currentScript && document.currentScript.src.replace(/[^/]*$/, '')) || '/intro/';
  // Letter layers cut from the original logo file, all the same size and aligned.
  // from: direction the letter comes from (screen x, y); turn: starting rotation in degrees;
  // cx/cy: the letter's centre within the logo file (rotation pivot, %).
  const LETTERS = [
    { name: 'd0', from: [-.86, -.52], turn: -14, cx: 29.08, cy: 43.57 },
    { name: 'd1', from: [-.08, -1], turn: 9, cx: 43.97, cy: 43.62 },
    { name: 'd2', from: [.55, .84], turn: -11, cx: 58.14, cy: 43.72 },
    { name: 'd3', from: [.88, -.48], turn: 13, cx: 71.22, cy: 43.2 },
    { name: 'e0', from: [-1, .12], turn: -8, cx: 35.38, cy: 67.35 },
    { name: 'e1', from: [-.62, .78], turn: 10, cx: 40.2, cy: 67.35 },
    { name: 'e2', from: [-.2, 1], turn: -9, cx: 44.82, cy: 67.35 },
    { name: 'e3', from: [.12, 1], turn: 7, cx: 49.55, cy: 67.35 },
    { name: 'e4', from: [.42, .9], turn: -10, cx: 54.7, cy: 67.41 },
    { name: 'e5', from: [.78, .62], turn: 9, cx: 59.98, cy: 67.35 },
    { name: 'e6', from: [1, .1], turn: -7, cx: 64.98, cy: 67.35 },
  ];
  const LAYERS = [...LETTERS.map(l => l.name), 'rule'];
  const RULE_Y = 0.5955;                      // vertical centre of the rule within the logo file
  const EASE_OUT = 'cubic-bezier(.22, 1, .36, 1)';
  const EASE_SETTLE = 'cubic-bezier(.2, .9, .25, 1)';   // long, gentle deceleration
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
  const watchdog = setTimeout(() => finish(true), 7000);
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

    const rule = images[images.length - 1];
    const glint = intro.querySelector('.di-glint');
    const seam = intro.querySelector('.di-seam');
    const play = (el, frames, opts) => { const a = el.animate(frames, { fill: 'both', ...opts }); animations.push(a); return a; };

    // 1 · Each letter drifts in from its own direction, one after another, and settles.
    const reach = Math.max(innerWidth, innerHeight) * .7;
    LETTERS.forEach((l, i) => {
      const img = images[i];
      img.style.transformOrigin = `${l.cx}% ${l.cy}%`;
      const word = l.name[0] === 'd';
      const delay = word ? 120 + i * 160 : 700 + (i - 4) * 80;
      const duration = word ? 1600 : 1300;
      const dist = reach * (word ? 1 : .8);
      play(img, [
        { transform: `translate(${l.from[0] * dist}px, ${l.from[1] * dist}px) rotate(${l.turn}deg) scale(1.06)`, opacity: 0 },
        { opacity: 1, offset: .38 },
        { transform: 'translate(0, 0) rotate(0deg) scale(1)', opacity: 1 },
      ], { delay, duration, easing: EASE_SETTLE });
    });
    // 2 · Once the name is in place, the rule is drawn from the centre outward like a horizon.
    const T_RULE = 2150;
    play(rule, [{ clipPath: 'inset(0 50% 0 50%)' }, { clipPath: 'inset(0 0% 0 0%)' }], { delay: T_RULE, duration: 760, easing: EASE_OUT });
    play(glint, [{ opacity: 0, transform: 'scaleX(.05)' }, { opacity: 1, offset: .35 }, { opacity: 0, transform: 'scaleX(1)' }], { delay: T_RULE, duration: 860, easing: 'ease-out' });
    // darkness lifts a little as the name forms
    intro.querySelectorAll('.di-shade').forEach(el => play(el, [{ opacity: 1 }, { opacity: .55 }], { delay: 300, duration: 2200, easing: 'ease-out' }));

    // 3 · The horizon widens over the whole screen, then the darkness parts along it.
    const T_OPEN = T_RULE + 800;
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
