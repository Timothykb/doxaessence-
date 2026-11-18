import '../src/main.js';
import './style.css';
import animationHtml from '../genesis-demo/index.html?raw';
import animationCss from '../genesis-demo/style.css?inline';
import { mountGenesis } from '../genesis-demo/mount.js';

const host = document.querySelector('#genesis-experience');
const shadow = host.attachShadow({mode:'open'});
const template = new DOMParser().parseFromString(animationHtml, 'text/html');
template.querySelectorAll('script').forEach(script => script.remove());
const shell = document.createElement('div');
shell.className = 'animation-shell';
shell.innerHTML = template.body.innerHTML;
const style = document.createElement('style');
style.textContent = animationCss.replace(/:root/g,'.animation-shell').replace(/(?<![-\w])body\b/g,'.animation-shell').replace(/(?<![-\w])html\b/g,'.animation-shell') + `
:host{display:block;position:relative;background:#590000;color:#f5f1e8}
.animation-shell{position:relative;display:block;margin:0;font-family:Arial,sans-serif}
.animation-shell header{top:0}
`;
shadow.append(style,shell);
shell.querySelector('.closing-chapter .line-link').href = '#beginning';
shell.querySelector('.closing-chapter .line-link').textContent = 'ONTDEK DOXA ESSENCE ↓';
shell.querySelector('.demo').textContent = 'WEBSITE CONCEPTDEMO';
mountGenesis(shell,shell);
const scene = shell.querySelector('#scene');
const controls = shell.querySelector('.controls');
const rail = shell.querySelector('.rail');
function handover(){
  const remaining = host.getBoundingClientRect().bottom;
  const fade = Math.max(0,Math.min(1,remaining / innerHeight));
  for(const element of [scene,controls,rail]){
    element.style.opacity = String(fade);
    element.style.visibility = fade <= 0 ? 'hidden' : 'visible';
    element.style.pointerEvents = fade <= 0 ? 'none' : '';
  }
}
addEventListener('scroll',handover,{passive:true});
addEventListener('resize',handover);
handover();
shell.addEventListener('click',event=>{
  const link=event.target.closest('a[href^="#"]');
  if(!link)return;
  const hash=link.getAttribute('href');
  if(hash==='#beginning')return;
  const target=hash==='#'?shell:shell.querySelector(hash);
  if(!target)return;
  event.preventDefault();
  window.scrollTo({top:hash==='#'?0:target.offsetTop,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
});
// Keep this preview form reviewable without creating real newsletter registrations.
document.querySelector('#signup-form').addEventListener('submit',event=>{
  event.preventDefault();
  event.stopImmediatePropagation();
  document.querySelector('#signup-status').textContent='Dit is een demo. Je gegevens zijn niet verstuurd.';
},true);
