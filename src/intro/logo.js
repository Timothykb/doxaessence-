import { INTRO } from './config.js';
// Trace the supplied raster logo's actual ivory boundaries. No substitute lettering.
// Swap INTRO.logo.src/crop to use another local logo (PNG or rasterizable SVG).
export async function loadLogo(){
 const image=new Image();image.src=INTRO.logo.src;await image.decode();
 const crop=INTRO.logo.crop,w=590,h=245,canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
 const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,crop.x,crop.y,crop.width,crop.height,0,0,w,h);
 const pixels=ctx.getImageData(0,0,w,h),mask=new Uint8Array(w*h);
 for(let i=0;i<mask.length;i++){const j=i*4;mask[i]=pixels.data[j]>170&&pixels.data[j+1]>170&&pixels.data[j+2]>150?1:0;const alpha=Math.min(255,pixels.data[j+1]/239*255);pixels.data[j]=243;pixels.data[j+1]=239;pixels.data[j+2]=231;pixels.data[j+3]=alpha;}
 ctx.putImageData(pixels,0,0);
 const edges=new Map();const add=(x,y,a,b)=>edges.set(`${x},${y}`,[a,b]);const filled=(x,y)=>x>=0&&x<w&&y>=0&&y<h&&mask[y*w+x];
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(filled(x,y)){
 if(!filled(x,y-1))add(x,y,x+1,y);if(!filled(x+1,y))add(x+1,y,x+1,y+1);if(!filled(x,y+1))add(x+1,y+1,x,y+1);if(!filled(x-1,y))add(x,y+1,x,y);
 }
 const contours=[];
 while(edges.size){const key=edges.keys().next().value;let p=key.split(',').map(Number),points=[p];for(let i=0;i<w*h;i++){const k=p.join(','),next=edges.get(k);if(!next)break;edges.delete(k);points.push(next);p=next;if(p.join(',')===key)break;}if(points.length>18)contours.push(points);}
 contours.sort((a,b)=>b.length-a.length);
 return {url:canvas.toDataURL(),aspect:w/h,contours,sample(count,samples,width){return Array.from({length:count},(_,k)=>{const p=contours[k%contours.length];return Array.from({length:samples},(_,i)=>{const at=i/(samples-1)*(p.length-1),a=Math.floor(at),b=Math.min(p.length-1,a+1),f=at-a;return [((p[a][0]*(1-f)+p[b][0]*f)/w-.5)*width,(.5-(p[a][1]*(1-f)+p[b][1]*f)/h)*width*h/w+.15,0];}).flat();});}};
}
