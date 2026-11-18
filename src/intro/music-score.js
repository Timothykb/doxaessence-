// Original 25-second cue: a recurring melody, light eighth-note movement,
// a lift at the spray and a spacious final cadence. No drums or low drone.
import { INTRO } from './config.js';
export const SCORE_BPM=INTRO.music.bpm;
const beat=60/SCORE_BPM;
const melody=[
 [.2,440,1.1],[.2+beat,523.25,1.1],[.2+beat*2,659.25,1.6],[.2+beat*4,587.33,.9],[.2+beat*5,523.25,1.5],
 [4.65,440,.9],[5.3,523.25,.9],[5.95,659.25,1.1],[6.6,783.99,1.4],[7.8,659.25,.8],
 [9.05,523.25,1.2],[9.7,659.25,1.1],[10.35,783.99,1.5],[11.65,739.99,1.3],[12.3,659.25,1.2],[13.6,587.33,1.2],[14.25,659.25,1.7],
 [16.2,523.25,2.0],[17.8,440,1.7],[19.25,493.88,1.8],
 [21.05,523.25,1.5],[21.7,659.25,1.4],[22.35,587.33,.9],[23,523.25,1.8],
].map(([t,f,d],i)=>[t,f,d,.052+(i%3===2?.008:0),(i%2?1:-1)*.12,'piano']);
const pulse=[];
for(const [start,end,chord]of [[.65,4.4,[261.63,329.63,440,329.63]],[4.65,7.8,[261.63,392,493.88,329.63]],[9,15.5,[293.66,392,493.88,392,440,392,329.63,392]],[21,23.6,[261.63,329.63,392,523.25]]]){
 for(let i=0,t=start;t<end;i++,t=start+i*beat/2)pulse.push([t,chord[i%chord.length],.65,i%4===0?.028:.018,i%2?.38:-.38,'pluck']);
}
export const SCORE=[...melody,...pulse].sort((a,b)=>a[0]-b[0]);
