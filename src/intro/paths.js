import { man, woman, sampleSvgPaths } from './people-paths.js';
import { CatmullRomCurve3, Vector3 } from 'three';

export const curve = (points, count = 80) => new CatmullRomCurve3(points.map(p => new Vector3(...p)), false, 'centripetal').getPoints(count - 1).flatMap(p => [p.x, p.y, p.z]);
export function ring(radius, y, count) {
  return Array.from({ length: count }, (_, i) => {
    const a = i / (count - 1) * Math.PI * 2;
    return [Math.cos(a) * radius, y, Math.sin(a) * radius];
  }).flat();
}
export const profile = [[.86,-1.55],[1.02,-1.51],[1.09,-1.39],[1.10,-1.17],[1.10,.22],[1.06,.46],[.91,.65],[.59,.81],[.41,.91],[.40,1.05]];
export function bottlePaths(count, mobile) {
  const paths = [];
  for (const [radius,y] of [[1.04,-1.48],[1.09,-1.31],[1.09,-1.18],[1.10,.2],[.42,.91],[.42,1.03]]) paths.push(ring(radius,y,count));
  const meridians = mobile ? 6 : 8;
  for (let k=0;k<meridians;k++) {
    const a = k/meridians*Math.PI*2;
    paths.push(curve(profile.map(([r,y]) => [Math.cos(a)*r,y,Math.sin(a)*r]),count));
  }
  return paths.map(p=>p.map((v,i)=>i%3===1?v*1.25:v));
}
export function labelPoint(x,y) { return [x,y*1.25,Math.sqrt(Math.max(.05,1.108**2-x*x))+.012]; }
export function labelPaths(count) {
  const paths=[];
  for (const inset of [0,.045]) {
    const x=.87-inset, y1=-1.06+inset,y2=.23-inset;
    // Square corners, sampled along the cylindrical surface rather than spline-rounded.
    const corners=[[-x,y1],[x,y1],[x,y2],[-x,y2],[-x,y1]];
    const points=[];
    for(let i=0;i<count;i++) { const t=i/(count-1)*4,j=Math.min(3,Math.floor(t)),f=t-j;points.push(...labelPoint(corners[j][0]*(1-f)+corners[j+1][0]*f,corners[j][1]*(1-f)+corners[j+1][1]*f)); }
    paths.push(points);
  }
  for(const y of [.035,-.58,-.84]) paths.push(Array.from({length:count},(_,i)=>labelPoint(-.76+1.52*i/(count-1),y)).flat());
  for(const x of [-.25,.25]) paths.push(Array.from({length:count},(_,i)=>labelPoint(x,-.6-.22*i/(count-1))).flat());
  return paths;
}
export function peoplePaths(count,samples) {
 const left=sampleSvgPaths(man,samples,(x,y)=>[-1.25+(x-100)*.006,2.05-y*.0052,0]);
 const right=sampleSvgPaths(woman,samples,(x,y)=>[1.25+(x-100)*.006,2.05-y*.0052,0]);
 return [...left,...right];
}
export function sprayPaths(count,samples) {
 return Array.from({length:count},(_,k)=>Array.from({length:samples},(_,i)=>{
 const u=i/(samples-1), band=(k/(count-1)-.5);
 return [-2.1+u*6,1.26+Math.sin(u*3.8+band)*u*.65+band*u*2,Math.sin(u*3+band)*u*.35];
 }).flat());
}
