export function mountGenesis(root = document, shell = document.body) {
const scene = root.querySelector('#scene');
const svgArrow = (down = false) => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('viewBox','0 0 24 24'); svg.setAttribute('aria-hidden','true');
  svg.classList.add('direction-arrow');
  const path = document.createElementNS('http://www.w3.org/2000/svg','path');
  path.setAttribute('d',down?'M12 3v17m-6-6 6 6 6-6':'M5 19 19 5M5 5h14v14');
  path.setAttribute('fill','none');path.setAttribute('stroke','currentColor');path.setAttribute('stroke-width','1.4');
  path.setAttribute('stroke-linecap','round');path.setAttribute('stroke-linejoin','round');svg.append(path);return svg;
};
root.querySelectorAll('a').forEach(link => {
  const walker=document.createTreeWalker(link,NodeFilter.SHOW_TEXT);
  const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
  nodes.forEach(node=>{if(!/[↗↓]/.test(node.textContent))return;const down=node.textContent.includes('↓');node.textContent=node.textContent.replace(/[↗↓]/g,'');link.append(svgArrow(down));});
});
scene.setAttribute('aria-label', 'Originele productfoto van Doxa Essence The Genesis');
const photo = document.createElement('img');
photo.src = '/images/genesis-original-reference.png';
photo.alt = 'Doxa Essence The Genesis N° 1: glazen parfumfles met amberkleurige inhoud en origineel crèmekleurig etiket.';
photo.className = 'original-bottle';
photo.fetchPriority = 'high';
const product = document.createElement('div');
product.className = 'photo-product';
const body = document.createElement('div');
body.className = 'photo-body';
body.append(photo);
const capLayer = document.createElement('div');
capLayer.className = 'hardware-cap';
capLayer.setAttribute('role', 'img');
capLayer.setAttribute('aria-label', 'Spiegelende zilveren parfumdop volgens de aangeleverde referentie');
const atomizer = document.createElement('div');
atomizer.className = 'hardware-atomizer';
atomizer.setAttribute('role', 'img');
atomizer.setAttribute('aria-label', 'Spiegelende zilveren spraykop met zichtbare ronde verstuiver');
const assembly = document.createElement('div');
assembly.className = 'bottle-assembly';
const collar = document.createElement('div');
collar.className = 'silver-neck-finish';
collar.setAttribute('aria-hidden', 'true');
assembly.append(body, collar, atomizer);
product.append(assembly, capLayer);
scene.append(product);
const ingredientNames = ['Bergamot', 'Roze peper', 'Groene kardemom', 'Kasjmierachtig houtakkoord', 'Iris', 'Wierook', 'Sandelhout', 'Amber', 'Vanille'];
const ingredientLayers = [];
for (let i = 0; i < 9; i++) {
  const item = document.createElement('div');
  item.className = 'ingredient ingredient-' + i;
  item.setAttribute('role', 'img');
  item.setAttribute('aria-label', ingredientNames[i]);
  item.style.setProperty('--sprite-x', (i % 3) * 50 + '%');
  item.style.setProperty('--sprite-y', Math.floor(i / 3) * 50 + '%');
  const sprite = document.createElement('div');
  sprite.className = 'ingredient-sprite';
  item.append(sprite);
  product.append(item);
  ingredientLayers.push(item);
}
const recipes = [[0, 1, 4, 6, 7, 8], [0, 1], [2, 3, 4, 5], [6, 7, 8]];
let activeStage = 0;
let scrollPosition = 0;
const ingredientOpacity = new Float32Array(9);
const ingredientAngles = [0, Math.PI, 0, Math.PI/2, Math.PI, Math.PI*1.5, 0, Math.PI*2/3, Math.PI*4/3];
let dragging = false, lastX = 0, angle = 0;
product.addEventListener('pointerdown', e => { dragging = true; lastX = e.clientX; product.setPointerCapture(e.pointerId); });
product.addEventListener('pointermove', e => {
  if (!dragging) return;
  angle = Math.max(-18, Math.min(18, angle + (e.clientX - lastX) * .12));
  product.style.setProperty('--turn', angle + 'deg');
  lastX = e.clientX;
});
product.addEventListener('pointerup', () => { dragging = false; });
product.addEventListener('pointercancel', () => { dragging = false; });
root.querySelector('.controls span').textContent = 'Sleep om het flesje te kantelen';
const button = root.querySelector('#rotate');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
let playing = !motion.matches;
function update(){
  scene.classList.toggle('motion-paused', !playing);
  button.textContent = playing ? 'Pauzeer beweging' : 'Start beweging';
  button.setAttribute('aria-pressed', String(playing));
}
button.onclick = () => { playing = !playing; update(); };
motion.addEventListener('change', () => { playing = !motion.matches; update(); });
update();
const links = [...root.querySelectorAll('.rail a')];
const chapters = [...root.querySelectorAll('.chapter')];
const mobileStory=document.createElement('div');mobileStory.className='mobile-story';
const mobileCopies=chapters.map(chapter=>{const copy=chapter.querySelector('.copy').cloneNode(true);copy.classList.add('mobile-copy');copy.querySelectorAll('[id]').forEach(e=>e.removeAttribute('id'));mobileStory.append(copy);return copy;});
scene.append(mobileStory);
let mobileTarget=0, mobileDisplayed=0;
function readScrollPosition() {
  const y = window.scrollY;
  let lower = 0;
  for (let i = 0; i < chapters.length - 1; i++) if (y >= chapters[i].offsetTop) lower = i;
  const start = chapters[lower].offsetTop;
  const end = chapters[Math.min(lower+1,chapters.length-1)].offsetTop;
  scrollPosition = lower + Math.max(0,Math.min(1,(y-start)/Math.max(1,end-start)));
  activeStage = Math.min(3,Math.round(scrollPosition));
  links.forEach((a,i) => {
    a.classList.toggle('active',i===activeStage);
    if(i===activeStage) a.setAttribute('aria-current','step'); else a.removeAttribute('aria-current');
  });
}
addEventListener('scroll',readScrollPosition,{passive:true});
addEventListener('resize',readScrollPosition);
readScrollPosition();

// Choreograph the natural ingredients around the original bottle, preserving its label.
let lastFrame = 0, elapsed = 0;
const introDuration = 10;
const introCanvas = document.createElement('canvas');
introCanvas.className = 'genesis-intro';
function sizeIntro() {
  const density=Math.min(devicePixelRatio || 1,2);
  introCanvas.width = Math.round(innerWidth*density);
  introCanvas.height = Math.round(innerHeight*density);
}
sizeIntro();
addEventListener('resize', sizeIntro);
introCanvas.setAttribute('aria-hidden', 'true');
const introOverlay = document.createElement('div');
introOverlay.className = 'fullscreen-intro';
introOverlay.setAttribute('aria-label', 'The Genesis — LIGHT, EARTH, LIFE');
const introBrand = document.createElement('div');
introBrand.className = 'intro-brand';
introBrand.textContent = 'DOXA ESSENCE';
const introNotes = document.createElement('div');
introNotes.className = 'intro-fragrance-notes';
const referenceNotes = [
  ['LIGHT', 'Bergamot · a touch of pink pepper'],
  ['EARTH', 'Green cardamom · cashmere woods · a touch of iris · soft incense'],
  ['LIFE', 'Creamy sandalwood · warm amber · Iso E Super · subtle vanilla']
];
const noteElements = referenceNotes.map(([title, copy], i) => {
  const note = document.createElement('div');
  note.className = 'intro-note intro-note-' + i;
  const name = document.createElement('b'); name.textContent = title;
  const text = document.createElement('span'); text.textContent = copy;
  note.append(name, text); introNotes.append(note); return note;
});
const introTag = document.createElement('div');
introTag.className = 'intro-tag';
const introTitle = document.createElement('em'); introTitle.textContent = 'The Genesis';
introTag.append(introTitle);
const introBackdrop = document.createElement('div');
introBackdrop.className = 'intro-backdrop';
introOverlay.append(introBackdrop, introCanvas, introBrand, introNotes, introTag);
root.append(introOverlay);
const introContext = introCanvas.getContext('2d');
const glowSprite = document.createElement('canvas');
glowSprite.width = glowSprite.height = 64;
const glowCtx = glowSprite.getContext('2d');
const glowGradient = glowCtx.createRadialGradient(32,32,0,32,32,32);
glowGradient.addColorStop(0, '#f5f1e8');
glowGradient.addColorStop(.2, '#f5f1e8');
glowGradient.addColorStop(1, 'rgba(245,241,232,0)');
glowCtx.fillStyle = glowGradient;
glowCtx.fillRect(0,0,64,64);
const introActions = document.createElement('div');
introActions.className = 'intro-actions';
const skipIntro = document.createElement('button');
skipIntro.textContent = 'Intro overslaan';
const replayIntro = document.createElement('button');
replayIntro.textContent = 'Speel lichtintro opnieuw';
introActions.append(skipIntro, replayIntro);
root.querySelector('.controls').append(introActions);
skipIntro.onclick = () => { elapsed = introDuration; };
replayIntro.onclick = () => { elapsed = 0; playing = true; update(); };
const introParticles = Array.from({length: 2000}, (_, i) => {
  const capPoint = i < 360;
  const y = capPoint ? .175 + Math.random() * .17 : .38 + Math.random() * .535;
  const halfWidth = capPoint ? .107 : y < .43 ? .11 + (y - .38) * 1.8 : .195;
  const edge = Math.random() < .28;
  const x = .5 + (edge ? (Math.random() < .5 ? -1 : 1) * halfWidth : (Math.random() * 2 - 1) * halfWidth);
  return {x, y, capPoint, a: Math.random() * Math.PI * 2, r: .24 + Math.random() * .2, layer: i % 3, size: .45 + Math.random() * .85, phase: Math.random() * 6.28};
});
function smooth(value) { const t = Math.max(0, Math.min(1, value)); return t*t*(3-2*t); }
function drawIntro(time) {
  const disabled = motion.matches;
  const reveal = disabled ? 1 : smooth((time - 8) / 1.6);
  assembly.style.opacity = String(reveal);
  capLayer.style.opacity = String(reveal);
  introCanvas.hidden = disabled || time >= introDuration;
  root.querySelector('.controls').hidden = introCanvas.hidden;
  introOverlay.hidden = introCanvas.hidden;
  introOverlay.style.opacity = '1';
  introOverlay.style.background = 'transparent';
  introBackdrop.style.opacity = String(1 - reveal);
  introBrand.style.opacity = String(1 - reveal);
  introTag.style.opacity = String(1 - smooth((time - 6.2) / 1.1));
  shell.classList.toggle('intro-active', !introCanvas.hidden);
  noteElements.forEach((note, i) => note.classList.toggle('on', time > 2.2 + i * .6 && time < 7.4));
  skipIntro.hidden = disabled || time >= introDuration;
  replayIntro.hidden = !disabled && time < introDuration;
  if (introCanvas.hidden) return reveal;
  const ctx = introContext, w = innerWidth, h = innerHeight;
  const density=introCanvas.width/w;
  ctx.setTransform(density,0,0,density,0,0);
  ctx.clearRect(0, 0, w, h);
  const spread = smooth((time - 1.2) / 1.6) * (1 - smooth((time - 6.4) / 1.6));
  const alpha = smooth(time / .65) * (1 - reveal);
  const landing = smooth((time - 6.4) / 1.6);
  const targetRect = product.getBoundingClientRect();
  ctx.globalCompositeOperation = 'lighter';
  for (let layer=0; layer<3; layer++) {
    const ringProgress = smooth((time - 1.2 - layer * .25) / 1.7);
    const ringOpacity = (Math.sin(ringProgress * Math.PI) * .5 + ringProgress * .25) * alpha * (1-smooth((time-6.3)/1.3));
    ctx.beginPath();
    ctx.ellipse(w * .5, h * [.28,.5,.72][layer], w * (.12 + ringProgress * .36), h * (.025 + ringProgress * .065), -.12 + layer * .1, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(245,241,232,${ringOpacity})`;
    ctx.lineWidth = 1.1;
    ctx.shadowColor = '#f5f1e8'; ctx.shadowBlur = 13; ctx.stroke();
  }
  ctx.shadowBlur = 0;
  for (const p of introParticles) {
    const angle = p.a + time * (.18 + p.layer * .07);
    const tx = .5 + Math.cos(angle) * p.r;
    const ty = [.3,.55,.78][p.layer] + Math.sin(angle) * .055;
    const bottleWidth = Math.min(w * .62, h * .58);
    const hx = .5 + (p.x - .5) * bottleWidth / w;
    const hy = .5 + (p.y - .54) * bottleWidth * 1.333 / h;
    const introX = (hx + (tx-hx) * spread) * w;
    const introY = (hy + (ty-hy) * spread) * h;
    // Land each particle on the exact photo coordinates, including the shortened cap.
    const photoY = p.capPoint ? .173 + (p.y - .175) * (.197 / .17) : p.y;
    const finalX = targetRect.left + p.x * targetRect.width;
    const finalY = targetRect.top + photoY * targetRect.height;
    const x = introX + (finalX - introX) * landing;
    const y = introY + (finalY - introY) * landing;
    const flicker = .45 + .55 * (.5 + .5 * Math.sin(time*2.4+p.phase));
    ctx.globalAlpha = alpha * flicker * .85;
    const size = p.size * 5;
    ctx.drawImage(glowSprite, x - size/2, y - size/2, size, size);
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  return reveal;
}
function animateIngredients(now) {
  const delta = lastFrame ? Math.min((now - lastFrame) / 1000, .05) : 0;
  lastFrame = now;
  if (playing) elapsed += delta;
  mobileTarget=scrollPosition;
  mobileDisplayed+=(mobileTarget-mobileDisplayed)*(motion.matches?1:1-Math.exp(-delta*16));
  mobileCopies.forEach((copy,i)=>{
    const distance=Math.abs(mobileDisplayed-i);
    const opacity=1-smooth(distance/.52);
    copy.style.opacity=String(opacity);
    copy.style.transform=`translateY(${(i-mobileDisplayed)*14}px)`;
    copy.style.pointerEvents=opacity>.55?'auto':'none';
    copy.setAttribute('aria-hidden',String(opacity<.5 || innerWidth>700));
  });
  const lowerStage = Math.min(3,Math.floor(scrollPosition));
  const upperStage = Math.min(3,lowerStage+1);
  const blend = smooth((scrollPosition - lowerStage - .12) / .76);
  const introReveal = drawIntro(elapsed);
  // The cap follows scrolling only: closed on arrival, open through the notes, closed at the end.
  const opening = smooth(scrollPosition / .8);
  const closing = smooth((scrollPosition - 3.12) / .76);
  const reveal = opening * (1 - closing);
  capLayer.style.transform = `translateY(${-37 * reveal}%) rotate(${3 * reveal}deg) scaleY(.78)`;
  assembly.style.transform = `translateY(${-6 * reveal}px) rotate(${-1.5 * reveal}deg)`;
  ingredientLayers.forEach((item, i) => {
    const lowerWeight = recipes[lowerStage].includes(i) ? 1 - blend : 0;
    const upperWeight = recipes[upperStage].includes(i) ? blend : 0;
    const targetOpacity = (lowerWeight + upperWeight) * introReveal * reveal * .95;
    const easeRate = motion.matches ? 1 : 1 - Math.exp(-Math.max(delta, .001) * 12);
    ingredientOpacity[i] += (targetOpacity - ingredientOpacity[i]) * easeRate;
    const visible = ingredientOpacity[i] > .02;
    item.setAttribute('aria-hidden', String(!visible));
    const phase = elapsed * .16 + ingredientAngles[i];
    const spread = .9 + ingredientOpacity[i] * .1;
    const x = 50 + Math.cos(phase) * (18 + 16 * reveal) * spread;
    const y = 57 + Math.sin(phase) * (10 + 14 * reveal) * spread;
    const depth = Math.sin(phase);
    item.style.opacity = String(ingredientOpacity[i]);
    item.style.left = x + '%';
    item.style.top = y + '%';
    item.style.zIndex = depth > .25 ? '3' : '0';
    item.style.transform = `translate(-50%, -50%) scale(${.8 + (depth + 1) * .15}) rotate(${Math.sin(phase + i) * 14}deg)`;
  });
  requestAnimationFrame(animateIngredients);
}
requestAnimationFrame(animateIngredients);

}
