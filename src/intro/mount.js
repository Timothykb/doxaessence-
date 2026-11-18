import './intro.css';
import { INTRO, conversationAt } from './config.js';
import { createIntroMusic } from './music.js';
import { loadLogo } from './logo.js';
import { createLogoHandover } from './handover.js';

export function initCinematicIntro(){
 const replay=document.querySelector('.intro-replay'),target=document.querySelector('[data-intro-logo-target]');
 const preference=matchMedia('(prefers-reduced-motion: reduce)');let active=false,seen=false;
 try{seen=sessionStorage.getItem(INTRO.sessionKey)==='seen';}catch{}
 async function play(){
  if(active)return;
  const remember=()=>{seen=true;try{sessionStorage.setItem(INTRO.sessionKey,'seen');}catch{}};
  if(preference.matches){remember();return;}
  active=true;
  const origin=document.activeElement,html=document.documentElement;
  const saved={overflow:html.style.overflow,gutter:html.style.scrollbarGutter,opacity:target?.style.opacity};
  html.style.scrollbarGutter='stable';html.style.overflow='hidden';
  if(target)target.style.opacity='0';
  const root=document.createElement('section');root.className='doxa-film';root.setAttribute('aria-label','Doxa Essence introduction');
  for(const [k,v]of Object.entries(INTRO.colors))root.style.setProperty(`--film-${k}`,v);
  root.innerHTML='<div class="doxa-film-start"><span>DOXA ESSENCE · CHAPTER I</span><h2>A story you can wear.</h2><button type="button" data-begin disabled>Begin with sound</button><button type="button" data-silent disabled>Continue without sound</button></div><p class="doxa-film-caption" aria-live="off"></p><div class="doxa-film-logo" aria-hidden="true"><img class="doxa-film-logo-art" alt=""></div><button class="doxa-film-sound" type="button"></button><button class="doxa-film-skip" type="button">Skip intro</button>';
  document.body.append(root);
  const caption=root.querySelector('.doxa-film-caption'),handover=createLogoHandover(root,target);
  const skip=root.querySelector('.doxa-film-skip'),sound=root.querySelector('.doxa-film-sound');skip.focus({preventScroll:true});
  const music=createIntroMusic(sound);
  let renderer,frame=0,start=null,elapsed=0,mounted=true,begun=false;
  const welcome=root.querySelector('.doxa-film-start'),begin=root.querySelector('[data-begin]'),silent=root.querySelector('[data-silent]');
  sound.hidden=true;
  async function beginFilm(withSound){
   if(begun||!renderer)return;begun=true;begin.disabled=silent.disabled=true;
   if(withSound)await music.start();
   if(!mounted)return;welcome.remove();sound.hidden=false;skip.focus({preventScroll:true});
   watchdog=setTimeout(cleanup,27000);frame=requestAnimationFrame(tick);
  }
  begin.addEventListener('click',()=>beginFilm(true));silent.addEventListener('click',()=>beginFilm(false));
  // A stalled GPU or font request must never trap the visitor behind an overlay.
  let watchdog=setTimeout(cleanup,27000);
  function cleanup(){
   if(!mounted)return;mounted=false;active=false;cancelAnimationFrame(frame);clearTimeout(watchdog);
   music.stop();renderer?.dispose();root.remove();if(target)target.style.opacity=saved.opacity;
   html.style.overflow=saved.overflow;html.style.scrollbarGutter=saved.gutter;
   document.removeEventListener('keydown',keyboard);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',cleanup);preference.removeEventListener('change',motion);
   remember();if(origin instanceof HTMLElement&&origin!==document.body)origin.focus({preventScroll:true});else replay?.focus({preventScroll:true});
  }
  function keyboard(e){if(e.key==='Escape')cleanup();if(e.key==='Tab'&&((document.activeElement===skip&&!e.shiftKey)||(document.activeElement===sound&&e.shiftKey))){e.preventDefault();cleanup();} }
  function visibility(){music.pause(document.hidden);}
  function motion(){if(preference.matches)cleanup();}
  skip.addEventListener('click',cleanup);document.addEventListener('keydown',keyboard);document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',cleanup);preference.addEventListener('change',motion);
  function tick(now){
   if(!mounted)return;if(start===null)start=now;elapsed=(now-start)/1000;
   if(elapsed>=INTRO.timings.finish){cleanup();return;}
   renderer.render(elapsed);music.update(elapsed);
   const line=conversationAt(elapsed);caption.textContent=line.text;caption.dataset.side=line.side;caption.classList.toggle('is-verse',line.verse);caption.style.opacity=line.opacity;
   handover.update(renderer,elapsed);
   frame=requestAnimationFrame(tick);
  }
  try{
   const [logo,{createLightFilm}]=await Promise.all([loadLogo(),import('./scene.js'),document.fonts.load('400 32px DoxaFilm'),document.fonts.load('italic 32px DoxaFilm'),document.fonts.load('700 32px DoxaFilm')]);
   if(!mounted)return;handover.setSource(logo.url);renderer=createLightFilm(root,cleanup,logo);renderer.render(0);clearTimeout(watchdog);begin.disabled=silent.disabled=false;begin.focus({preventScroll:true});
  }catch{cleanup();}
 }
 replay.hidden=false;replay.addEventListener('click',play);
 // Keep the signup visible immediately; visitors can play the 3D story on demand.
}
