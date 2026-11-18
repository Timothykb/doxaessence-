// One 25-second editorial timeline. All scene and sound cue boundaries live here.
export const INTRO = {
 sessionKey:'doxa-story-film-v5',
 colors:{burgundy:'#590000',black:'#000000',cream:'#F3EFE7',brown:'#5B3F18'},
 timings:{cold:.25,draw:2.6,rotate:5.5,capOut:6.6,handIn:6.6,handRest:7.6,lift:8,press:8.4,spray:9,release:9.45,bottleOut:11.5,macro:11.5,macroPeak:12.3,morphStart:12.5,morph:14,conversation:14,logoRelease:21,logoGather:22,logoForm:23.3,handover:23.5,finish:25},
 camera:{beatPush:.025},
 music:{musicSrc:'/assets/music/intro.mp3',masterVolume:.4,fadeIn:2,fadeOut:1.5,bpm:92},
 logo:{src:'/brand/doxa-logo.png',crop:{x:230,y:190,width:590,height:245}},
 bloom:{strength:.16,mobileStrength:.09,radius:.3,threshold:.78},
 lines:{desktop:240,mobile:100,samples:96,mobileSamples:64,width:1.1,mobileWidth:1,currentSpeed:.07,currentWidth:.16},
 performance:{maxDpr:1.5,mobileDpr:1.25,mobileBreakpoint:700},
 copy:{brand:'DOXA ESSENCE',chapter:'C1 THE GENESIS',number:'N° 1',verse:'In the beginning, God created the heavens and the earth.',notes:'LIGHT | LIFE | EARTH',size:'EAU DE PARFUM · 50 ML',skip:'Skip intro',conversation:[
 {start:14,end:15.5,side:'left',text:'What are you wearing?'},
 {start:15.5,end:18,side:'right',text:"It's The Genesis — a fragrance inspired by the story of creation."},
 {start:18,end:20,side:'right',text:'God created the heavens and the earth.'},
 {start:20,end:21,side:'right',text:'LIGHT · LIFE · EARTH'},
 ]},
};
export const clamp=x=>Math.max(0,Math.min(1,x));
export const ease=x=>{x=clamp(x);return x*x*(3-2*x);};
export const phase=(t,a,b)=>ease((t-a)/(b-a));
export const ramp=(t,a,b)=>1-(1-clamp((t-a)/(b-a)))**3;
export function conversationAt(t){const line=INTRO.copy.conversation.find(x=>t>=x.start&&t<x.end);return line?{...line,opacity:Math.min(phase(t,line.start,line.start+.12),1-phase(t,line.end-.10,line.end)),verse:line===INTRO.copy.conversation[2]}:{text:'',opacity:0,side:'left',verse:false};}
