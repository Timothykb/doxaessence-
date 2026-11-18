import { INTRO, phase } from './config.js';
// Shared by the real overlay and the local keyframe inspector.
export function createLogoHandover(root,target){
 const node=root.querySelector('.doxa-film-logo'),art=node.querySelector('img');
 const swap=document.createElement('div');swap.className='doxa-film-logo-swap';node.append(swap);
 if(target){const clone=target.cloneNode(true);clone.removeAttribute('data-intro-logo-target');clone.removeAttribute('href');clone.removeAttribute('aria-label');clone.style.opacity='1';clone.setAttribute('tabindex','-1');swap.append(clone);}
 return {setSource(url){art.src=url;},update(film,t){
  const T=INTRO.timings,land=phase(t,T.handover,T.finish),a=film.logoRect(),b=target?.getBoundingClientRect()||a;
  node.style.opacity=phase(t,T.logoForm-.35,T.handover);
  // FLIP: interpolate from the projected wordmark bounds to the actual header bounds.
  for(const key of ['left','top','width','height'])node.style[key]=`${a[key]+(b[key]-a[key])*land}px`;
  const match=phase(t,T.finish-.25,T.finish);art.style.opacity=1-match;swap.style.opacity=match;
  root.style.background=land>0?'none':'';film.canvas.style.opacity=1-land;
 }};
}
