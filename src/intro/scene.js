import { sampleSvgPaths } from './people-paths.js';
import { HAND } from './hand-paths.js';
import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { INTRO, ease, phase, ramp } from './config.js';
import { bottlePaths, labelPaths, labelPoint, peoplePaths, sprayPaths, ring } from './paths.js';

export function createLightFilm(root, onFailure, logo) {
  const mobile = root.clientWidth < INTRO.performance.mobileBreakpoint;
  const samples = mobile ? INTRO.lines.mobileSamples : INTRO.lines.samples;
  const targetPeople=peoplePaths(0,samples);
  const count=mobile?INTRO.lines.mobile:INTRO.lines.desktop;
  const logoWidth=mobile?3.55:4.8;
  const targetLogo=logo.sample(count,samples,logoWidth);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34,1,.05,80);
  const renderer = new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});
  renderer.setClearColor(INTRO.colors.black,0);
  renderer.setPixelRatio(Math.min(devicePixelRatio,mobile ? INTRO.performance.mobileDpr : INTRO.performance.maxDpr));
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.domElement.setAttribute('aria-hidden','true');
  root.prepend(renderer.domElement);
  const lost = event => { event.preventDefault(); onFailure(); };
  renderer.domElement.addEventListener('webglcontextlost',lost);
  const baseTarget = new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,samples:4});
  const composer = new EffectComposer(renderer,new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,samples:4}));
  const renderPass = new RenderPass(scene,camera);
  const bloom = new UnrealBloomPass(new THREE.Vector2(1,1),mobile ? INTRO.bloom.mobileStrength : INTRO.bloom.strength,INTRO.bloom.radius,INTRO.bloom.threshold);
  composer.addPass(renderPass); composer.addPass(bloom);
  // Composite the vignette AFTER bloom. Red never enters the bloom pipeline.
  // Re-tint the scalar light field with the exact cream palette, preventing pink haze.
  const composite = new ShaderPass({
    uniforms:{tDiffuse:{value:null},base:{value:null},burgundy:{value:new THREE.Color(INTRO.colors.burgundy).convertLinearToSRGB()},cream:{value:new THREE.Color(INTRO.colors.cream).convertLinearToSRGB()},aspect:{value:1}},
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`uniform sampler2D tDiffuse;uniform sampler2D base;uniform vec3 burgundy;uniform vec3 cream;uniform float aspect;varying vec2 vUv;
    void main(){vec2 p=(vUv-.5)*vec2(min(aspect,1.5),1.);float vignette=1.-smoothstep(.08,.79,length(p));vec4 original=texture2D(base,vUv);vec3 light=texture2D(tDiffuse,vUv).rgb;float intensity=clamp(max(light.r,max(light.g,light.b)),0.,1.);vec3 bg=burgundy*vignette*(1.-original.a);gl_FragColor=vec4(mix(bg,cream,intensity),1.);}`,
  });
  composite.uniforms.base.value=baseTarget.texture;
  composer.addPass(composite);
  const allLines=[];
  const bottle=new THREE.Group(); scene.add(bottle);
  const hand=new THREE.Group(); bottle.add(hand);
  const cap=new THREE.Group(); bottle.add(cap);
  const streams=new THREE.Group();scene.add(streams);
  const currentClock={value:0};
  let disposed=false;

  function makeLine(points,parent,{width=1,opacity=1}={}) {
    const geometry=new LineGeometry(); geometry.setPositions(points);
    const material=new LineMaterial({color:INTRO.colors.cream,linewidth:(mobile?INTRO.lines.mobileWidth:INTRO.lines.width)*width,transparent:true,opacity,depthWrite:false});
    material.toneMapped=false;
    const n=points.length/3;
    geometry.setAttribute('instancePhase',new THREE.InstancedBufferAttribute(Float32Array.from({length:n-1},(_,i)=>i/(n-1)),1));
    material.uniforms.uTime=currentClock;
    material.uniforms.uReveal={value:1};
    material.uniforms.uStep={value:1/(n-1)};
    material.vertexShader='attribute float instancePhase;varying float vProgress;uniform float uStep;\n'+material.vertexShader;
    material.vertexShader=material.vertexShader.replace('void main() {','void main() { vProgress = instancePhase + ((position.y < 0.5) ? 0.0 : uStep);');
    material.fragmentShader='varying float vProgress;uniform float uTime;uniform float uReveal;\n'+material.fragmentShader;
    material.fragmentShader=material.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      if(vProgress > uReveal) discard;
      float distanceToCurrent=abs(vProgress-fract(uTime*${INTRO.lines.currentSpeed.toFixed(4)}));
      float current=exp(-pow(distanceToCurrent/${INTRO.lines.currentWidth.toFixed(3)},2.));
      diffuseColor.rgb *= .83 + .40*current;`);
    const line=new Line2(geometry,material);line.frustumCulled=false;parent.add(line);
    const entry={line,geometry,material,points:Float32Array.from(points),original:Float32Array.from(points),opacity};
    allLines.push(entry);return entry;
  }
  function updatePoints(entry,points) {
    // Mutate existing interleaved GPU data; no per-frame geometry allocations.
    const start=entry.geometry.attributes.instanceStart;
    const end=entry.geometry.attributes.instanceEnd;
    for(let i=0;i<points.length/3-1;i++){start.setXYZ(i,points[i*3],points[i*3+1],points[i*3+2]);end.setXYZ(i,points[(i+1)*3],points[(i+1)*3+1],points[(i+1)*3+2]);}
    start.data.needsUpdate=true;
  }
  const handParts=HAND.map((part,partIndex)=>{
    const contours=sampleSvgPaths([part.contour||part.d,...part.details],samples,(x,y)=>[x*.01,-y*.01,part.depth??(part.behind?-1.2:1.24+partIndex*.035)]);
    const lines=contours.map((p,i)=>makeLine(p,hand,{width:i===0?.95:.62,opacity:i===0?.9:.55}));
    const outline=sampleSvgPaths([part.d],samples,(x,y)=>[x*.01,-y*.01,part.depth??(part.behind?-1.2:1.24+partIndex*.035)])[0];
    const shape=Array.from({length:samples},(_,i)=>new THREE.Vector2(outline[i*3],outline[i*3+1]));
    const triangles=THREE.ShapeUtils.triangulateShape(shape,[]).flat();
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(outline,3));geometry.setIndex(triangles);
    // Depth-only skin: behind it the compositor shows the exact vignette, not glass lines.
    const mask=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:true,side:THREE.DoubleSide}));mask.renderOrder=-3;hand.add(mask);
    return {...part,lines,mask,outline};
  });
  const bodyLines=bottlePaths(samples,mobile).map(points=>makeLine(points,bottle));
  const borderLines=labelPaths(samples).map(points=>makeLine(points,bottle,{width:.8}));
  const capLines=[ring(.58,1.10,samples),ring(.58,2.12,samples)].map(points=>makeLine(points,cap));
  for(const angle of [0,Math.PI/2,Math.PI,Math.PI*1.5]) capLines.push(makeLine([Math.cos(angle)*.58,1.10,Math.sin(angle)*.58,Math.cos(angle)*.58,2.12,Math.sin(angle)*.58],cap,{opacity:.7}));
  const capSolid=new THREE.Mesh(new THREE.CylinderGeometry(.576,.576,1.02,64),new THREE.MeshBasicMaterial({color:INTRO.colors.black,transparent:true}));
  capSolid.position.y=1.61; cap.add(capSolid);
  // Fine edge contours carry the glossy black cap, without colored illumination.
  const nozzleLines=[ring(.25,1.07,samples),ring(.25,1.25,samples)].map(points=>makeLine(points,bottle,{width:.8}));
  const nozzle=makeLine([-.25,1.07,0,-.25,1.25,0,.25,1.25,0,.25,1.07,0],bottle,{width:.8});
  nozzleLines.push(nozzle);
  // Visible lateral outlet: the plume starts exactly at this opening.
  nozzleLines.push(makeLine(Array.from({length:32},(_,i)=>{const a=i/31*Math.PI*2;return [.255,1.16+Math.sin(a)*.045,.10+Math.cos(a)*.045];}).flat(),bottle,{width:.9}));

  const labelCanvas=document.createElement('canvas');labelCanvas.width=1536;labelCanvas.height=1152;
  const ctx=labelCanvas.getContext('2d');ctx.fillStyle=INTRO.colors.cream;
  ctx.textBaseline='middle';
  ctx.font='400 55px DoxaFilm';ctx.textAlign='left';ctx.fillText(INTRO.copy.brand,118,145);
  ctx.textAlign='right';ctx.fillText(INTRO.copy.number,1418,145);
  ctx.textAlign='center';ctx.font='700 103px DoxaFilm';ctx.fillText(INTRO.copy.chapter,768,390,1350);
  ctx.font='italic 59px DoxaFilm';ctx.fillText('In the beginning, God created',768,565);ctx.fillText('the heavens and the earth.',768,650);
  ctx.font='400 49px DoxaFilm';['LIGHT','LIFE','EARTH'].forEach((word,i)=>ctx.fillText(word,320+i*448,825));
  ctx.font='400 45px DoxaFilm';ctx.fillText(INTRO.copy.size,768,1035);
  const labelTexture=new THREE.CanvasTexture(labelCanvas);labelTexture.colorSpace=THREE.SRGBColorSpace;
  const labelGeometry=new THREE.PlaneGeometry(1.72,1.29,40,1);
  const vertices=labelGeometry.attributes.position;
  for(let i=0;i<vertices.count;i++){const p=labelPoint(vertices.getX(i),vertices.getY(i)-.415);vertices.setXYZ(i,...p);}
  labelGeometry.computeVertexNormals();
  const labelMaterial=new THREE.MeshBasicMaterial({map:labelTexture,transparent:true,opacity:0,depthWrite:false,toneMapped:false,side:THREE.FrontSide});
  const label=new THREE.Mesh(labelGeometry,labelMaterial);bottle.add(label);
  // An invisible depth surface keeps the glass contours out of the label's lettering.
  const labelMask=new THREE.Mesh(labelGeometry.clone(),new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:true,side:THREE.FrontSide}));
  labelMask.position.z=-.008;labelMask.renderOrder=-1;bottle.add(labelMask);
  cap.position.y=.27;
  nozzleLines.forEach(e=>e.line.position.y=.27);
  const startSpray=sprayPaths(count,samples);

  const ribbons=startSpray.map((points,k)=>makeLine(points,streams,{width:.6+(k%7)/10,opacity:.3+(k%5)*.1}));
  const driftLines=Array.from({length:3},(_,k)=>makeLine(Array.from({length:samples},(_,i)=>{
    const u=i/(samples-1);return [(u-.5)*11,Math.sin(u*4+k*.7)*.55+(k-1)*.6,-1.5];
  }).flat(),scene,{opacity:.12,width:.7}));

  function resize(){
    if(disposed)return;
    const w=root.clientWidth,h=root.clientHeight;
    renderer.setSize(w,h);composer.setSize(w,h);
    baseTarget.setSize(Math.round(w*renderer.getPixelRatio()),Math.round(h*renderer.getPixelRatio()));
    camera.aspect=w/h;camera.updateProjectionMatrix();composite.uniforms.aspect.value=w/h;
    allLines.forEach(e=>e.material.resolution.set(w,h));
  }
  const observer=new ResizeObserver(resize);observer.observe(root);resize();
  function render(t){
    if(disposed)return;
    currentClock.value=t;
    const T=INTRO.timings,narrow=camera.aspect<.85;
    const draw=phase(t,T.cold,T.draw),orbit=ramp(t,T.cold,T.rotate);
    const opening=phase(t,T.rotate,T.capOut),enter=phase(t,T.handIn,T.handRest);
    const lift=phase(t,T.handRest,T.lift),press=phase(t,T.press,T.spray);
    const release=phase(t,T.release,T.release+.45),departure=phase(t,T.spray,T.bottleOut);
    const morph=phase(t,T.morphStart,T.morph),logoGather=phase(t,T.logoGather,T.logoForm);
    const logoRelease=phase(t,T.logoRelease,T.logoGather);
    const restingZ=narrow?16:10.4,close=.25*phase(t,T.rotate,T.capOut)+.75*phase(t,T.handRest,T.press);
    const macro=phase(t,T.spray,T.macroPeak)*(1-morph);
    const left=narrow?-.75:-1.4;
    const cameraX=left*close*(1-departure)+macro*2.4;
    const cameraY=.2+close*.55*(1-departure)+macro*1.7;
    const cameraZ=restingZ-close*(narrow?3.0:2.2)*(1-departure)-macro*(restingZ-3.3);
    const pulse=INTRO.camera.beatPush*Math.sin(t*Math.PI*INTRO.music.bpm/60)**4*(1-phase(t,T.logoRelease,T.logoForm));
    camera.position.set(cameraX,cameraY,cameraZ-pulse);camera.lookAt(cameraX,cameraY-.05,0);
    bottle.rotation.y=-.45+orbit*Math.PI*2+opening*.45;
    bottle.position.set(left*opening-departure*4,-.25+lift*.12-press*(1-release)*.025,0);
    bottle.visible=t<T.bottleOut;
    bottle.scale.setScalar(1);
    cap.position.set(opening*.3,.27+opening*4.5,opening*-.5);cap.rotation.z=-opening*.22;
    cap.visible=t>=T.cold&&t<T.capOut;
    const spring=Math.sin(release*Math.PI)*.018;
    nozzleLines.forEach(e=>e.line.position.y=.27-press*(1-release)*.12+spring);
    hand.position.set(-(1-enter)*3,-(1-enter)*2,0);
    hand.visible=t>=T.handIn&&t<T.bottleOut;
    for(const part of handParts){
      for(const entry of part.lines){
        entry.material.opacity=entry.opacity*enter*(1-departure);
        for(let i=0;i<samples;i++){
          const j=i*3,x=entry.original[j],y=entry.original[j+1];
          const fingerWeight=part.name==='index'?phase(x,-1.25,-.05):1;
          entry.points[j]=x+part.approach[0]*(1-enter);
          entry.points[j+1]=y-part.approach[1]*(1-enter)-part.press[1]*press*(1-release)*fingerWeight;
          entry.points[j+2]=entry.original[j+2];
        }
        updatePoints(entry,entry.points);
      }
      const points=part.outline,position=part.mask.geometry.attributes.position;
      for(let i=0;i<position.count;i++){
        const x=points[i*3],weight=part.name==='index'?phase(x,-1.25,-.05):1;
        position.setXYZ(i,x+part.approach[0]*(1-enter),points[i*3+1]-part.approach[1]*(1-enter)-part.press[1]*press*(1-release)*weight,points[i*3+2]-.01);
      }
      position.needsUpdate=true;
    }
    const bottleOut=1-departure;
    capSolid.material.opacity=draw*bottleOut;
    for(const [index,entry] of bodyLines.entries()){
      entry.material.uniforms.uReveal.value=phase(t,index===0?0:T.cold*.3+index*.055,T.cold+index*.08);
      entry.line.visible=entry.material.uniforms.uReveal.value>.005;
      entry.material.opacity=(index===0?1:phase(t,T.cold*.35,T.cold))*bottleOut;
      for(let i=0;i<samples;i++){const u=i/(samples-1),j=i*3;
        entry.points[j]=THREE.MathUtils.lerp((u-.5)*13,entry.original[j],draw);
        entry.points[j+1]=THREE.MathUtils.lerp(Math.sin(u*4+index*.25)*.45,entry.original[j+1],draw);
        entry.points[j+2]=THREE.MathUtils.lerp(-.4,entry.original[j+2],draw);
      }updatePoints(entry,entry.points);
    }
    borderLines.forEach((entry,i)=>{entry.line.visible=t>T.cold+.5;entry.material.uniforms.uReveal.value=phase(t,T.cold+.5+i*.04,T.draw+.2);entry.material.opacity=bottleOut;});
    capLines.forEach(entry=>{entry.material.uniforms.uReveal.value=phase(t,T.cold,T.draw);entry.material.opacity=entry.opacity*bottleOut;});
    nozzleLines.forEach(entry=>{entry.line.visible=opening>0;entry.material.opacity=opening*bottleOut;});
    label.visible=t>T.cold+1;
    labelMaterial.opacity=phase(t,T.cold+1,T.draw+.3)*bottleOut;
    labelMask.visible=t>T.cold+1;
    const sprayReveal=ramp(t,T.spray,T.spray+.45);
    // More bloom only as the figures settle; never a flash or a particle system.
    bloom.strength=(mobile?INTRO.bloom.mobileStrength:INTRO.bloom.strength)+Math.sin(morph*Math.PI)*.055;
    ribbons.forEach((entry,k)=>{
      entry.line.visible=t>=T.spray&&t<T.handover;
      if(!entry.line.visible)return;
      entry.material.uniforms.uReveal.value=sprayReveal;
      const person=k<targetPeople.length;
      const gather=phase(t,T.morphStart+(k>=targetPeople.length/2?.22:0),T.morph);
      const depth=(k%11)/10;
      const figureOpacity=person?(k%5===0?.9:.62):.018;
      const logoOpacity=k<logo.contours.length?.9:.025;
      entry.material.opacity=THREE.MathUtils.lerp(THREE.MathUtils.lerp(.18+depth*.4,figureOpacity,gather),logoOpacity,logoGather)*(1-phase(t,T.logoForm-.15,T.handover));
      entry.material.linewidth=(mobile?INTRO.lines.mobileWidth:INTRO.lines.width)*THREE.MathUtils.lerp(.5+depth*.7,person?.85:.45,gather);
      const target=targetPeople[k%targetPeople.length];
      for(let i=0;i<samples;i++){
        const u=i/(samples-1),j=i*3;
        const spread=u*u;
        const band=k/count-.5;
        const sprayX=bottle.position.x+.255+u*12;
        const sprayY=bottle.position.y+1.43-press*(1-release)*.12+Math.sin(u*4.5+band*2+t*.13)*u*.9+band*u*4.2+macro*u*(band*5+Math.sin(u*5+band*3)*.7);
        const sprayZ=.10+Math.sin(u*5+band*5)*spread*2;
                for(let axis=0;axis<3;axis++){
          const figure=target[j+axis]+(!person&&axis===2?-.5:0);
          const formed=THREE.MathUtils.lerp((axis===0?sprayX:axis===1?sprayY:sprayZ),figure,gather);
          // A rightward sweep releases the existing figure contours before gathering.
          const flowing=formed+(axis===0?logoRelease*2.5:axis===1?Math.sin(u*Math.PI*2+k*.1)*logoRelease*.8:0);
          entry.points[j+axis]=THREE.MathUtils.lerp(flowing,targetLogo[k][j+axis],logoGather);
        }
      }
      updatePoints(entry,entry.points);
    });
    driftLines.forEach((entry,k)=>{entry.material.opacity=t>T.morph&&t<T.logoRelease?.08:0;entry.line.position.y=Math.sin(t*.2+k)*.09;});
    renderer.setRenderTarget(baseTarget);renderer.clear();renderer.render(scene,camera);renderer.setRenderTarget(null);
    composer.render();
  }
  function dispose(){
    if(disposed)return;disposed=true;observer.disconnect();
    renderer.domElement.removeEventListener('webglcontextlost',lost);
    scene.traverse(object=>{object.geometry?.dispose();if(object.material){for(const mat of [].concat(object.material))mat.dispose();}});
    labelTexture.dispose();baseTarget.dispose();
    for(const pass of composer.passes)pass.dispose?.();composer.dispose();renderer.dispose();renderer.domElement.remove();
  }
  return { render, dispose, canvas:renderer.domElement, logoRect(){
    const h=logoWidth/logo.aspect;
    const a=new THREE.Vector3(-logoWidth/2,.15+h/2,0).project(camera),b=new THREE.Vector3(logoWidth/2,.15-h/2,0).project(camera);
    return {left:(a.x+1)*root.clientWidth/2,top:(1-a.y)*root.clientHeight/2,width:(b.x-a.x)*root.clientWidth/2,height:(a.y-b.y)*root.clientHeight/2};
  }};
}
