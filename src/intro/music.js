import { INTRO, phase } from './config.js';
const tracks=import.meta.glob('/public/assets/music/*.mp3',{eager:true,query:'?url',import:'default'});
import { SCORE } from './music-score.js';
const CHORDS=[[174.61,220,261.63,329.63,493.88],[261.63,329.63,392,493.88,587.33],[196,293.66,392,440],[174.61,220,261.63,329.63],[261.63,329.63,392,523.25]];
export function createIntroMusic(button){
 let context,master,filter,reverb,audio,stopped=false,started=false,starting=false,muted=false,time=0,soundStart=0,lastChord=-1,nextNote=0,pumped=false,sprayed=false,paused=false;
 const sources=new Set();let pads=[];
 try{muted=sessionStorage.getItem('doxa-film-muted')==='yes';}catch{}
 const icon='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4zM17 8q5 4 0 8"/></svg>';
 function label(blocked=false){button.innerHTML=icon+`<span>${blocked?'Tap for sound':started&&!muted?'Sound on':'Sound off'}</span>`;button.setAttribute('aria-pressed',String(started&&!muted));button.title='Play or mute the intro soundtrack';}
 function remember(){try{sessionStorage.setItem('doxa-film-muted',muted?'yes':'no');}catch{}}
 function envelope(value,seconds=.2){if(master&&context.state!=='closed')master.gain.setTargetAtTime(value,context.currentTime,seconds/4);}
 function voice(frequency,volume,duration,type='piano',pan=0){
  const now=context.currentTime,pad=duration>4,output=context.createGain();
  output.gain.value=1;const panner=context.createStereoPanner();panner.pan.value=pan;output.connect(panner).connect(filter);
  const partials=pad?[[1,.55,-3],[1,.45,3],[2,.06,0]]:(type==='pluck'?[[1,1,0],[2,.34,0],[3,.12,0],[4,.035,0]]:[[1,1,0],[2,.24,1],[3,.085,-1],[4,.025,0]]);
  let alive=partials.length;
  for(const [ratio,weight,detune]of partials){
   const o=context.createOscillator(),g=context.createGain();o.type='sine';o.frequency.value=frequency*ratio;o.detune.value=detune;
   const life=pad?duration:duration/(1+(ratio-1)*.6);
   g.gain.setValueAtTime(.00001,now);g.gain.exponentialRampToValueAtTime(volume*weight,now+(pad?.65:.016));
   g.gain.exponentialRampToValueAtTime(Math.max(.00002,volume*weight*.23),now+(pad?life*.65:Math.min(.22,life*.45)));g.gain.exponentialRampToValueAtTime(.00001,now+life);
   o.connect(g).connect(output);o.start();o.stop(now+life+.05);sources.add(o);
   o.onended=()=>{sources.delete(o);o.disconnect();g.disconnect();if(--alive===0){output.disconnect();panner.disconnect();}};
  }
  return output;
 }
 function chord(index){const now=context.currentTime;for(const pad of pads){pad.gain.cancelScheduledValues(now);pad.gain.setTargetAtTime(.00001,now,.35);}pads=CHORDS[index].map(f=>voice(f,.006,4.6,'sine'));}
 function whisper(){const duration=.6,buffer=context.createBuffer(1,context.sampleRate*duration,context.sampleRate),data=buffer.getChannelData(0);let seed=17;for(let i=0;i<data.length;i++){seed=(seed*16807)%2147483647;data[i]=(seed/2147483647*2-1)*Math.sin(i/data.length*Math.PI);}
  const source=context.createBufferSource(),high=context.createBiquadFilter(),gain=context.createGain();source.buffer=buffer;high.type='bandpass';high.frequency.value=2400;high.Q.value=.7;gain.gain.value=.012;source.connect(high).connect(gain).connect(master);source.start();sources.add(source);source.onended=()=>{sources.delete(source);source.disconnect();high.disconnect();gain.disconnect();};
 }
 async function start(){
  if(stopped||starting)return;starting=true;
  try{
   context ||= new (window.AudioContext||window.webkitAudioContext)();await context.resume();if(stopped)return;
   if(context.state!=='running'){label(true);return;}
   if(!master){
    master=context.createGain();master.gain.value=0;master.connect(context.destination);
    filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=3400;filter.connect(master);
    reverb=context.createConvolver();const length=context.sampleRate*1.4,impulse=context.createBuffer(2,length,context.sampleRate);let seed=23;for(let c=0;c<2;c++){const d=impulse.getChannelData(c);for(let i=0;i<length;i++){seed=(seed*16807)%2147483647;d[i]=(seed/2147483647*2-1)*(1-i/length)**3*.25;}}reverb.buffer=impulse;const wet=context.createGain();wet.gain.value=.18;filter.connect(reverb);reverb.connect(wet).connect(master);
    const track=tracks['/public'+INTRO.music.musicSrc];if(track){audio=new Audio(track);context.createMediaElementSource(audio).connect(master);audio.currentTime=time;await audio.play();}
   }
   if(stopped)return;
   started=true;soundStart=time;muted=false;remember();envelope(INTRO.music.masterVolume,INTRO.music.fadeIn);label();
  }catch{label(true);}finally{starting=false;}
 }
 function toggle(){if(!started){start();return;}muted=!muted;remember();envelope(muted?0:INTRO.music.masterVolume,.3);label();}
 button.addEventListener('click',toggle);label();
 return {
  start,
  update(t){time=t;if(!started||stopped||paused)return;
   const T=INTRO.timings;
   const index=t<T.capOut?0:t<T.macro?1:t<T.conversation?2:t<T.logoRelease?3:4;
   if(index!==lastChord){lastChord=index;if(!audio)chord(index);}
   while(nextNote<SCORE.length&&t>=SCORE[nextNote][0]){
    const [at,f,duration,velocity,pan,instrument]=SCORE[nextNote++];
    if(!audio&&t-at<.18){voice(f,velocity,duration,instrument,pan);}
   }
   if(t>=T.spray-.08&&!pumped){pumped=true;if(t<T.spray+.2)voice(740,.018,.065,'triangle');}
   if(t>=T.spray&&!sprayed){sprayed=true;if(t<T.spray+.3)whisper();}
   const swell=1+phase(t,T.press,T.spray)*.2*(1-phase(t,T.macro,T.conversation));
   envelope(muted?0:INTRO.music.masterVolume*phase(t,soundStart,soundStart+INTRO.music.fadeIn)*swell*(1-phase(t,T.handover,T.finish)),.25);
  },
  pause(hidden){paused=hidden;if(context&&context.state!=='closed'){if(hidden){context.suspend();audio?.pause();}else{context.resume();if(audio){audio.currentTime=time;audio.play().catch(()=>label(true));}}}},
  stop(){if(stopped)return;stopped=true;button.removeEventListener('click',toggle);envelope(0,.15);setTimeout(()=>{audio?.pause();for(const source of sources){try{source.stop();}catch{}}sources.clear();context?.close();},180);},
 };
}
