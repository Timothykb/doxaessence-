/* Doxa Essence — intro (standalone add-on).
   Points of light gather in the dark and, where they land, draw the rule of
   the logo like a horizon; DOXA rises above it,
   ESSENCE settles below it; the horizon widens across the screen, the darkness
   parts along it and the logo lands on the header logo. About 4 seconds.
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
    intro.innerHTML = '<div class="di-panel di-top"><div class="di-shade"></div></div><div class="di-panel di-bottom"><div class="di-shade"></div></div><canvas class="di-motes" aria-hidden="true"></canvas><div class="di-seam"></div><div class="di-logo" aria-hidden="true"><div class="di-glint"></div></div><button class="di-skip" type="button">Intro overslaan</button>';
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

    // 0 · Points of light in the dark gather on the horizon.
    const T_RULE = 900;                           // the rule starts where the first lights land
    const ruleW = w * 0.434;
    gatherLights(intro.querySelector('.di-motes'), innerWidth / 2, seamY, ruleW, T_RULE, 820);
    // 1 · The first light: the rule is drawn from the centre outward.
    play(rule, [{ clipPath: 'inset(0 50% 0 50%)' }, { clipPath: 'inset(0 0% 0 0%)' }], { delay: T_RULE, duration: 820, easing: EASE_OUT });
    play(glint, [{ opacity: 0, transform: 'scaleX(.05)' }, { opacity: 1, offset: .35 }, { opacity: 0, transform: 'scaleX(1)' }], { delay: T_RULE, duration: 900, easing: 'ease-out' });
    // 2 · Heaven and earth: DOXA rises above the line, ESSENCE settles below it.
    play(doxa, [{ clipPath: 'inset(52.5% 0 0 0)', transform: 'translateY(9%)' }, { clipPath: 'inset(30% 0 0 0)', transform: 'translateY(0)' }], { delay: T_RULE + 520, duration: 980, easing: EASE_OUT });
    play(essence, [{ clipPath: 'inset(0 0 35.6% 0)', transform: 'translateY(-3.5%)', opacity: .2 }, { clipPath: 'inset(0 0 27% 0)', transform: 'translateY(0)', opacity: 1 }], { delay: T_RULE + 820, duration: 880, easing: EASE_OUT });
    // darkness lifts a little as the light gathers and the name appears
    intro.querySelectorAll('.di-shade').forEach(el => play(el, [{ opacity: 1 }, { opacity: .55 }], { delay: 300, duration: 2200, easing: 'ease-out' }));

    // 3 · The horizon widens over the whole screen, then the darkness parts along it.
    const T_OPEN = T_RULE + 2050;
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

  /* Points of light: they appear softly, drift like dust in a beam, then
     gather on the horizon. Each one lands where the rule is being drawn at
     that moment (outer points later), so the lights become the line. */
  function gatherLights(canvas, cx, cy, ruleW, tRule, ruleDur) {
    const ctx = canvas.getContext && canvas.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = innerWidth, H = innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.scale(dpr, dpr);
    const sprite = document.createElement('canvas');
    sprite.width = sprite.height = 64;
    const sg = sprite.getContext('2d');
    const grad = sg.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,248,236,1)'); grad.addColorStop(.18, 'rgba(255,236,205,.55)'); grad.addColorStop(1, 'rgba(255,220,180,0)');
    sg.fillStyle = grad; sg.fillRect(0, 0, 64, 64);
    const rand = Math.random;
    const RX = Math.min(W * .44, 560), RY = Math.min(H * .34, 320);
    const n = W < 600 ? 44 : 76;
    const ease = x => (x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
    const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    const lights = Array.from({ length: n }, () => {
      const a = rand() * Math.PI * 2, r = .25 + Math.sqrt(rand()) * .75;
      const side = rand() - .5;                       // where on the line it lands, -0.5 … 0.5
      const land = tRule + Math.pow(Math.abs(side) * 2, .8) * ruleDur * .55 + rand() * 60;
      const travel = 520 + rand() * 260;
      return {
        sx: cx + Math.cos(a) * r * RX, sy: cy + Math.sin(a) * r * RY,
        tx: cx + side * ruleW, ty: cy,
        born: rand() * 480, start: land - travel, land,
        size: 1.1 + Math.pow(rand(), 2.2) * 2.6, bright: .4 + rand() * .6,
        ph: rand() * 6.283, wob: 3 + rand() * 9,
      };
    });
    const end = Math.max(...lights.map(l => l.land)) + 360;
    const t0 = performance.now();
    const frame = now => {
      if (finished) return;
      const t = now - t0;
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      for (const l of lights) {
        const appear = smooth(l.born, l.born + 420, t);
        const u = ease(Math.min(1, Math.max(0, (t - l.start) / (l.land - l.start))));
        const drift = 1 - u;
        const x = l.sx + (l.tx - l.sx) * u + Math.sin(t * .0011 + l.ph) * l.wob * drift;
        const y = l.sy + (l.ty - l.sy) * u + Math.cos(t * .0009 + l.ph) * l.wob * .7 * drift - t * .006 * drift;
        const fade = 1 - smooth(l.land - 60, l.land + 300, t);
        const alpha = appear * l.bright * fade * (.78 + .22 * Math.sin(t * .007 + l.ph)) * (1 + .6 * u * fade);
        if (alpha <= .01) continue;
        const d = l.size * 9 * (1 - .35 * u);
        ctx.globalAlpha = Math.min(1, alpha);
        ctx.drawImage(sprite, x - d / 2, y - d / 2, d, d);
      }
      if (t < end) requestAnimationFrame(frame); else canvas.remove();
    };
    requestAnimationFrame(frame);
  }

  const go = () => start().catch(() => finish(true));
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go, { once: true }); else go();
})();
