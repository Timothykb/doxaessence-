/* The Genesis — realtime 3D hero.
   Bottle, cap and atomiser are modelled from the supplied product photo.
   Scroll drives pose, camera and light; the spray is a short, time-based
   simulation (it never plays backwards into the nozzle). */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const SERIF = '"Cormorant Garamond Variable", "Cormorant Garamond", Georgia, serif';
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (p, a, b) => clamp((p - a) / (b - a));
const ease = x => x * x * (3 - 2 * x);
const easeInOut = x => (x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const lin = hex => new THREE.Color(hex); // THREE.Color converts sRGB hex to linear working space

/* ── Label artwork (re-typeset from the supplied bottle label) ── */
function drawLabel() {
  const W = 1000, H = 1100;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const c = canvas.getContext('2d');
  const paper = c.createRadialGradient(W * .5, H * .42, 80, W * .5, H * .5, W * .8);
  paper.addColorStop(0, '#fbf2e3'); paper.addColorStop(1, '#efdfc6');
  c.fillStyle = paper; c.fillRect(0, 0, W, H);
  // fine paper grain
  const grain = c.getImageData(0, 0, W, H);
  for (let i = 0; i < grain.data.length; i += 4) { const n = (Math.random() - .5) * 9; grain.data[i] += n; grain.data[i + 1] += n; grain.data[i + 2] += n; }
  c.putImageData(grain, 0, 0);
  const red = '#5f0a06';
  c.strokeStyle = '#b4532c'; c.lineWidth = 3; c.strokeRect(14, 14, W - 28, H - 28);
  c.strokeStyle = red; c.lineWidth = 1.6; c.strokeRect(26, 26, W - 52, H - 52);
  c.fillStyle = red; c.textBaseline = 'alphabetic';
  const text = (str, x, y, font, align = 'center', spacing = 0) => {
    c.font = font; c.textAlign = align;
    if ('letterSpacing' in c) c.letterSpacing = `${spacing}px`;
    c.fillText(str, x, y);
    if ('letterSpacing' in c) c.letterSpacing = '0px';
  };
  text('DOXA ESSENCE', 90, 150, `500 50px ${SERIF}`, 'left', 3);
  text('N°1', W - 90, 150, `500 50px ${SERIF}`, 'right', 1);
  c.fillRect(90, 196, W - 180, 2);
  text('THE GENESIS', W / 2, 400, `600 132px ${SERIF}`, 'center', 1);
  text('In the beginning God created', W / 2, 512, `italic 500 64px ${SERIF}`);
  text('the heaven and the earth.', W / 2, 590, `italic 500 64px ${SERIF}`);
  c.fillRect(90, 690, W - 180, 2);
  text('LIGHT', 255, 830, `500 64px ${SERIF}`, 'center', 3);
  text('EARTH', 500, 830, `500 64px ${SERIF}`, 'center', 3);
  text('LIFE', 735, 830, `500 64px ${SERIF}`, 'center', 3);
  c.fillRect(377, 770, 2, 80); c.fillRect(618, 770, 2, 80);
  text('EAU DE PARFUM · 50 ML ℮ / 1.7 FL.OZ.LIQ.', W / 2, 990, `500 38px ${SERIF}`, 'center', 1);
  return canvas;
}

/* ── Target points for "LIGHT · EARTH · LIFE" ── */
function sampleWords(count, lines) {
  const W = 1400, H = lines.length * 220;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const c = canvas.getContext('2d');
  c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle';
  if ('letterSpacing' in c) c.letterSpacing = '14px';
  let size = 200;
  c.font = `500 ${size}px ${SERIF}`;
  const widest = Math.max(...lines.map(line => c.measureText(line).width));
  size = Math.min(200, size * (W * .94) / widest);
  c.font = `500 ${size}px ${SERIF}`;
  lines.forEach((line, i) => c.fillText(line, W / 2, 110 + i * 220));
  const data = c.getImageData(0, 0, W, H).data;
  const hits = [];
  for (let y = 0; y < H; y += 3) for (let x = 0; x < W; x += 3) if (data[(y * W + x) * 4 + 3] > 140) hits.push(x, y);
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const j = Math.floor(Math.random() * (hits.length / 2)) * 2;
    out[i * 3] = (hits[j] / W - .5);
    out[i * 3 + 1] = -(hits[j + 1] / H - .5) * (H / W);
    out[i * 3 + 2] = (Math.random() - .5) * .02;
  }
  return out;
}

function latheMetal(profile, material, segments = 72) {
  return new THREE.Mesh(new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), segments), material);
}

export async function createHero({ canvas, mobile = false }) {
  if (document.fonts) await Promise.all([
    document.fonts.load(`500 60px ${SERIF}`), document.fonts.load(`600 60px ${SERIF}`), document.fonts.load(`italic 500 60px ${SERIF}`),
  ]).catch(() => {});

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;
  if ('transmissionResolutionScale' in renderer) renderer.transmissionResolutionScale = mobile ? .5 : .8;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, .1, 60);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
  scene.environmentIntensity = .7;

  /* Backdrop: bordeaux field with a soft beam of first light behind the bottle */
  const backdropUniforms = {
    uBase: { value: lin('#620404') }, uEdge: { value: lin('#2c0000') }, uGlowCol: { value: lin('#c4642a') },
    uGlow: { value: 0 }, uGlowPos: { value: new THREE.Vector2(1, 0) }, uBeam: { value: 0 }, uBeamShift: { value: 0 },
    uAspect: { value: 1.6 },
  };
  const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(44, 26), new THREE.ShaderMaterial({
    uniforms: backdropUniforms, depthWrite: false,
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `
      uniform vec3 uBase, uEdge, uGlowCol; uniform float uGlow, uBeam, uBeamShift; uniform vec2 uGlowPos; varying vec3 vW;
      void main(){
        vec2 p = vW.xy;
        float vign = smoothstep(2.0, 9.5, length(p * vec2(.75, 1.05)));
        vec3 col = mix(uBase, uEdge, vign);
        float g = exp(-pow(length((p - uGlowPos) * vec2(.9, .62)), 2.) * .55);
        col = mix(col, uGlowCol, g * .62 * uGlow);
        // diagonal beam from the upper left
        vec2 dir = normalize(vec2(.62, -1.));
        vec2 rel = p - (uGlowPos + vec2(-.4 + uBeamShift, 4.5));
        float along = dot(rel, dir); float across = abs(rel.x * dir.y - rel.y * dir.x);
        float beam = exp(-across * across * 1.6) * smoothstep(-1., 3.5, along) * (1. - smoothstep(3.5, 9., along));
        col += uGlowCol * beam * .16 * uBeam;
        gl_FragColor = vec4(col, 1.);
        #include <colorspace_fragment>
      }`,
  }));
  backdrop.position.z = -3.4;
  backdrop.renderOrder = -1;
  scene.add(backdrop);

  /* Lights */
  const key = new THREE.DirectionalLight(lin('#fff1dc'), 2.2); key.position.set(-3, 4, 5);
  const rim = new THREE.DirectionalLight(lin('#ffd2a8'), 2.4); rim.position.set(3.5, 2.5, -3);
  const fill = new THREE.DirectionalLight(lin('#ffe6d0'), .5); fill.position.set(2, -1, 4);
  scene.add(key, rim, fill);

  /* ── Bottle ─────────────────────────────────────────── */
  const stage = new THREE.Group();   // position/scale for layout
  const bottle = new THREE.Group();  // rotates with scroll
  stage.add(bottle); scene.add(stage);
  const BODY_H = 1.86, BODY_W = 1, BODY_D = .6;
  bottle.position.y = -1.28;

  const glassShell = new THREE.MeshPhysicalMaterial({
    color: 0x000000, metalness: 0, roughness: .03, clearcoat: 1, clearcoatRoughness: .02, specularIntensity: 1,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 2.4,
  });
  glassShell.onBeforeCompile = shader => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `
      float fres = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 2.6);
      float lum = dot(outgoingLight, vec3(.3, .59, .11));
      outgoingLight += vec3(1., .93, .86) * fres * .22;
      diffuseColor.a = clamp(.025 + fres * .5 + lum * 1.1, 0., .92);
      #include <opaque_fragment>`);
  };
  const shell = new THREE.Mesh(new RoundedBoxGeometry(BODY_W, BODY_H, BODY_D, 6, .085), glassShell);
  shell.position.y = BODY_H / 2; shell.renderOrder = 3;
  bottle.add(shell);

  // Thick glass base — clear, refracting the light behind it
  const baseGlass = new THREE.Mesh(new RoundedBoxGeometry(.95, .33, .55, 4, .06), new THREE.MeshPhysicalMaterial({
    color: lin('#fff4f0'), transmission: 1, thickness: .55, roughness: .02, ior: 1.5, attenuationColor: lin('#f7ddd5'), attenuationDistance: 4,
    specularIntensity: 1, envMapIntensity: 1.6,
  }));
  baseGlass.position.y = .19;
  bottle.add(baseGlass);

  // Amber liquid with a visible surface just below the shoulder
  const liquid = new THREE.Mesh(new RoundedBoxGeometry(.88, 1.42, .48, 4, .06), new THREE.MeshPhysicalMaterial({
    color: lin('#ffe2b0'), transmission: 1, thickness: .7, roughness: .04, ior: 1.36,
    attenuationColor: lin('#d08a2c'), attenuationDistance: 1.1, specularIntensity: .8, envMapIntensity: 1.2,
    emissive: lin('#a8560e'), emissiveIntensity: .55,
  }));
  liquid.position.y = .36 + .71;
  bottle.add(liquid);

  // Dip tube, seen through the liquid
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, 1.5, 12), new THREE.MeshStandardMaterial({ color: lin('#f1e5d4'), roughness: .3, transparent: true, opacity: .55 }));
  tube.position.set(.02, 1.1, -.04);
  bottle.add(tube);

  // Label
  const labelTex = new THREE.CanvasTexture(drawLabel());
  labelTex.colorSpace = THREE.SRGBColorSpace;
  labelTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const label = new THREE.Mesh(new THREE.PlaneGeometry(.8, .88), new THREE.MeshStandardMaterial({ map: labelTex, roughness: .62, metalness: 0, envMapIntensity: .55, transparent: true }));
  label.position.set(0, 1.0, BODY_D / 2 + .003);
  bottle.add(label);

  // Silver collar (stays on the bottle), atomiser and nozzle
  const metal = new THREE.MeshPhysicalMaterial({ color: lin('#e4e5e8'), metalness: 1, roughness: .13, envMapIntensity: 1.5, clearcoat: .4 });
  const collar = latheMetal([[0, 0], [.255, 0], [.27, .012], [.27, .05], [.255, .066], [.16, .07], [.15, .09], [0, .09]], metal);
  collar.position.y = BODY_H;
  bottle.add(collar);
  const actuator = new THREE.Group();
  actuator.position.y = BODY_H + .07;
  const actuatorBody = latheMetal([[0, 0], [.11, 0], [.125, .02], [.125, .13], [.112, .158], [.06, .168], [0, .168]], metal, 56);
  actuator.add(actuatorBody);
  const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(.026, .026, .02, 24), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: .4 }));
  nozzle.rotation.x = Math.PI / 2; nozzle.position.set(0, .1, .121);
  actuator.add(nozzle);
  const nozzleTip = new THREE.Object3D(); nozzleTip.position.set(0, .1, .14); actuator.add(nozzleTip);
  bottle.add(actuator);

  // Cap
  const cap = new THREE.Group();
  const capBody = latheMetal([[0, .015], [.235, 0], [.272, .012], [.278, .04], [.278, .6], [.27, .633], [.25, .645], [0, .648]], metal, 96);
  cap.add(capBody);
  stage.add(cap);
  const CAP_Y = BODY_H + .07;

  // Soft contact shadow
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.6), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, uniforms: { uStrength: { value: .5 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: 'uniform float uStrength; varying vec2 vUv; void main(){ vec2 p = (vUv - .5) * vec2(2.6, 1.6); float d = length(p * vec2(1.55, 2.4)); float a = exp(-d * d * 2.2) * .9 + exp(-d * d * 14.) * .4; gl_FragColor = vec4(0.,0.,0., a * uStrength); }',
  }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = -1.279;
  stage.add(shadow);

  /* ── Mist: one short burst of fine droplets ─────────── */
  const MIST = mobile ? 2600 : 6500;
  const mistGeo = new THREE.BufferGeometry();
  const rand = new Float32Array(MIST * 4), dirs = new Float32Array(MIST * 3), delay = new Float32Array(MIST);
  for (let i = 0; i < MIST; i++) {
    for (let k = 0; k < 4; k++) rand[i * 4 + k] = Math.random();
    const outlier = Math.random() < .08;
    const theta = Math.sqrt(Math.random()) * (outlier ? .42 : .2);
    const phi = Math.random() * Math.PI * 2;
    dirs[i * 3] = Math.sin(theta) * Math.cos(phi); dirs[i * 3 + 1] = Math.sin(theta) * Math.sin(phi); dirs[i * 3 + 2] = Math.cos(theta);
    delay[i] = Math.pow(Math.random(), 1.7) * .17;
  }
  mistGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MIST * 3), 3));
  mistGeo.setAttribute('aRand', new THREE.BufferAttribute(rand, 4));
  mistGeo.setAttribute('aDir', new THREE.BufferAttribute(dirs, 3));
  mistGeo.setAttribute('aDelay', new THREE.BufferAttribute(delay, 1));
  const mistUniforms = {
    uTime: { value: -1 }, uOrigin: { value: new THREE.Vector3() }, uBasis: { value: new THREE.Matrix3() },
    uPixel: { value: 1000 }, uOpacity: { value: 1 }, uBack: { value: new THREE.Vector3(1.5, .5, -3) },
  };
  const mist = new THREE.Points(mistGeo, new THREE.ShaderMaterial({
    uniforms: mistUniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `
      attribute vec4 aRand; attribute vec3 aDir; attribute float aDelay;
      uniform float uTime, uPixel, uOpacity; uniform vec3 uOrigin, uBack; uniform mat3 uBasis;
      varying float vAlpha; varying float vScatter;
      void main(){
        float t = uTime - aDelay;
        if (t <= 0.) { gl_Position = vec4(2., 2., 2., 1.); gl_PointSize = 0.; vAlpha = 0.; return; }
        float haze = step(.965, aRand.w);
        float speed = mix(2.3, 5.4, aRand.x) * mix(1., .55, haze);
        float k = mix(2.7, 4.9, aRand.y);
        float d = speed * (1. - exp(-k * t)) / k;            // fast start, then drag
        vec3 local = aDir * d;
        float spread = (.05 + .2 * pow(t, 1.15)) * (.4 + aRand.z);
        local.x += sin(aRand.z * 31. + t * 1.9 + d * 2.3) * spread;
        local.y += sin(aRand.x * 17. + t * 1.4 + d * 1.9) * spread;
        local.z += sin(aRand.y * 23. + t * 1.2) * spread * .35;
        vec3 world = uOrigin + uBasis * local;
        world.y += (-.03 + haze * .07) * t * t;
        float life = mix(1.5, 3.4, aRand.w);
        float fade = smoothstep(0., .04, t) * (1. - smoothstep(life * .28, life, t));
        float thin = 1. / (1. + d * 1.1);
        float core = smoothstep(.0, .12, d);                  // the jet is narrow and clear at the nozzle
        vAlpha = fade * mix((.34 * thin + .06) * (.35 + .65 * core), .018, haze) * uOpacity;
        vec4 mv = viewMatrix * vec4(world, 1.);
        gl_Position = projectionMatrix * mv;
        float size = mix(.0045, .022, pow(aRand.x * aRand.z, .8));
        size = mix(size, mix(.12, .3, aRand.z) * smoothstep(.1, .6, d), haze) * (1. + t * .5);
        gl_PointSize = max(1.2, size * uPixel / -mv.z);
        vec3 toCam = normalize(cameraPosition - world);
        vec3 fromLight = normalize(world - uBack);
        vScatter = .45 + .95 * pow(max(dot(toCam, fromLight), 0.), 3.);
      }`,
    fragmentShader: `
      varying float vAlpha; varying float vScatter;
      void main(){
        vec2 c = gl_PointCoord - .5; float r2 = dot(c, c) * 4.;
        if (r2 > 1.) discard;
        float a = exp(-r2 * 3.2) * (1. - r2);
        gl_FragColor = vec4(vec3(1., .93, .83) * vScatter, a * vAlpha);
        #include <colorspace_fragment>
      }`,
  }));
  mist.frustumCulled = false; mist.visible = false;
  scene.add(mist);

  /* ── Dust that gathers into LIGHT · EARTH · LIFE ───── */
  const DUST = mobile ? 1500 : 3200;
  const dustGeo = new THREE.BufferGeometry();
  const dustStart = new Float32Array(DUST * 3), dustRand = new Float32Array(DUST * 2);
  for (let i = 0; i < DUST; i++) {
    const r = Math.cbrt(Math.random()), a = Math.random() * Math.PI * 2, b = Math.acos(2 * Math.random() - 1);
    dustStart[i * 3] = Math.random();                       // along the spray, 0..1
    dustStart[i * 3 + 1] = r * Math.sin(b) * Math.cos(a);
    dustStart[i * 3 + 2] = r * Math.sin(b) * Math.sin(a);
    dustRand[i * 2] = Math.random(); dustRand[i * 2 + 1] = Math.random();
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(DUST * 3), 3));
  dustGeo.setAttribute('aStart', new THREE.BufferAttribute(dustStart, 3));
  dustGeo.setAttribute('aRand', new THREE.BufferAttribute(dustRand, 2));
  dustGeo.setAttribute('aTarget', new THREE.BufferAttribute(new Float32Array(DUST * 3), 3));
  const dustUniforms = {
    uGather: { value: 0 }, uVisible: { value: 0 }, uOrigin: { value: new THREE.Vector3() }, uBasis: { value: new THREE.Matrix3() },
    uWords: { value: new THREE.Vector3() }, uWordsScale: { value: 3 }, uPixel: { value: 1000 },
  };
  const dust = new THREE.Points(dustGeo, new THREE.ShaderMaterial({
    uniforms: dustUniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `
      attribute vec3 aStart, aTarget; attribute vec2 aRand;
      uniform float uGather, uVisible, uPixel, uWordsScale; uniform vec3 uOrigin, uWords; uniform mat3 uBasis;
      varying float vAlpha;
      void main(){
        float along = .35 + aStart.x * 1.5;
        vec3 cloud = uOrigin + uBasis * vec3(aStart.y * (.15 + along * .28), aStart.z * (.12 + along * .22), along);
        cloud.y += (aRand.x - .5) * .1 * uGather;
        vec3 target = uWords + aTarget * uWordsScale;
        float f = clamp((uGather - aRand.y * .35) / .65, 0., 1.);
        f = f * f * (3. - 2. * f);
        vec3 mid = mix(cloud, target, .5) + vec3(0., .25 * sin(aRand.x * 6.28), .3 * (aRand.y - .5));
        vec3 p = mix(mix(cloud, mid, f), mix(mid, target, f), f);   // gentle arc
        vAlpha = uVisible * (.25 + .75 * f) * mix(.55, 1., aRand.x);
        vec4 mv = viewMatrix * vec4(p, 1.);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = max(1.4, mix(.012, .024, aRand.y) * uPixel / -mv.z);
      }`,
    fragmentShader: `
      varying float vAlpha;
      void main(){ vec2 c = gl_PointCoord - .5; float r2 = dot(c, c) * 4.; if (r2 > 1.) discard;
        gl_FragColor = vec4(vec3(1., .86, .62), exp(-r2 * 2.5) * vAlpha);
        #include <colorspace_fragment>
      }`,
  }));
  dust.frustumCulled = false;
  scene.add(dust);

  /* ── Layout ─────────────────────────────────────────── */
  const layout = { wordsLines: null };
  const sprayFrame = { origin: new THREE.Vector3(), basis: new THREE.Matrix3() };

  function nozzleFrame(target) {
    bottle.updateWorldMatrix(true, true);
    nozzleTip.getWorldPosition(target.origin);
    const dir = new THREE.Vector3(0, 0, 1).transformDirection(nozzleTip.matrixWorld).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(up, dir).normalize();
    up.crossVectors(dir, right).normalize();
    target.basis.set(right.x, up.x, dir.x, right.y, up.y, dir.y, right.z, up.z, dir.z);
    return target;
  }

  function resize() {
    const w = canvas.clientWidth || window.innerWidth, h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    const aspect = w / h;
    camera.aspect = aspect;
    const portrait = aspect < .9;
    const halfTan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const needH = portrait ? 4.6 : 3.3, needW = portrait ? 2.3 : 5.6;
    layout.dist = Math.max(needH / 2 / halfTan, needW / 2 / (halfTan * aspect));
    layout.portrait = portrait;
    layout.lightMul = portrait ? .45 : 1;
    stage.position.set(portrait ? 0 : 1.05, portrait ? -.92 : -.02, 0);
    stage.scale.setScalar(portrait ? .7 : 1);
    camera.updateProjectionMatrix();
    const pixel = renderer.getDrawingBufferSize(new THREE.Vector2()).y / (2 * halfTan);
    mistUniforms.uPixel.value = pixel; dustUniforms.uPixel.value = pixel;
    backdropUniforms.uGlowPos.value.set(stage.position.x * 1.5, stage.position.y * 1.5 + .2);
    mistUniforms.uBack.value.set(stage.position.x + .5, stage.position.y + .6, -2.5);
    // words
    const lines = portrait ? ['LIGHT', 'EARTH', 'LIFE'] : ['LIGHT · EARTH · LIFE'];
    if (layout.wordsLines !== lines.join('|')) {
      layout.wordsLines = lines.join('|');
      dustGeo.getAttribute('aTarget').array.set(sampleWords(DUST, lines));
      dustGeo.getAttribute('aTarget').needsUpdate = true;
    }
    dustUniforms.uWords.value.set(portrait ? 0 : -1.12, portrait ? 1.05 : .22, .3);
    dustUniforms.uWordsScale.value = portrait ? 1.6 : 2.55;
    // spray frame at the held spray pose
    applyPose(.62, true);
    nozzleFrame(sprayFrame);
    dustUniforms.uOrigin.value.copy(sprayFrame.origin);
    dustUniforms.uBasis.value.copy(sprayFrame.basis);
    dirty = true; kick();
  }

  /* ── Pose from scroll progress ──────────────────────── */
  let intro = 0, current = 0, target = 0, dirty = true;
  const spray = { t: 0, active: false, played: false };
  function applyPose(p, silent = false) {
    const turn = -.32 + .7 * easeInOut(seg(p, .04, .38)) - 1.5 * easeInOut(seg(p, .42, .57)) + .72 * easeInOut(seg(p, .8, 1));
    bottle.rotation.y = turn;
    bottle.rotation.x = .035 - .03 * ease(seg(p, .04, .38));
    bottle.position.y = -1.28 + .035 * ease(seg(p, 0, .4)) - .035 * ease(seg(p, .78, 1));
    const lift = ease(seg(p, .4, .48)), side = easeInOut(seg(p, .47, .58));
    cap.position.set(side * (layout.portrait ? .82 : 1.02), bottle.position.y + CAP_Y + lift * .55 - side * 1.05, -side * .35);
    cap.rotation.set(bottle.rotation.x * (1 - side), turn, -.12 * side);
    if (silent) return;
    const dolly = 1 - .07 * ease(seg(p, .44, .6)) + .09 * ease(seg(p, .74, 1));
    const rise = ease(seg(p, .44, .6)) * (1 - ease(seg(p, .76, .98)));   // meet the atomiser at eye level
    camera.position.set(0, .32 + rise * (layout.portrait ? .35 : .55), layout.dist * dolly);
    camera.lookAt(0, (layout.portrait ? .05 : 0) + rise * .28, 0);
    scene.environmentRotation.y = -.6 + p * 1.9;
    key.position.set(-3 + p * 2.5, 4, 5);
    const light = ease(intro);
    key.intensity = 2.2 * light; rim.intensity = 2.4 * (.3 + .7 * light); fill.intensity = .5 * light;
    scene.environmentIntensity = .25 + .5 * light;
    backdropUniforms.uGlow.value = light * (1 + .25 * ease(seg(p, .5, .65))) * (.55 + .45 * layout.lightMul);
    backdropUniforms.uBeam.value = light * (1 - .6 * seg(p, .55, .8)) * layout.lightMul;
    backdropUniforms.uBeamShift.value = p * 1.2;
    dustUniforms.uGather.value = ease(seg(p, .68, .93));
    dustUniforms.uVisible.value = seg(p, .63, .72);
    dust.visible = dustUniforms.uVisible.value > 0;
    // atomiser press — time based
    let press = 0;
    if (spray.active) {
      const t = spray.t;
      press = t < .09 ? ease(t / .09) : t < .22 ? 1 : 1 - ease(clamp((t - .22) / .25));
      mistUniforms.uTime.value = t - .075;            // droplets appear just after the press
      mistUniforms.uOpacity.value = 1 - seg(p, .82, .95) * .7;
    }
    actuator.position.y = BODY_H + .07 - press * .034;
    mist.visible = spray.active && mistUniforms.uTime.value > 0;
  }

  function startSpray() {
    nozzleFrame(sprayFrame);
    mistUniforms.uOrigin.value.copy(sprayFrame.origin);
    mistUniforms.uBasis.value.copy(sprayFrame.basis);
    spray.t = 0; spray.active = true; spray.played = true;
    kick();
  }

  /* ── On-demand render loop ──────────────────────────── */
  let raf = 0, last = 0, active = true;
  function frame(now) {
    raf = 0;
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    let busy = false;
    const diff = target - current;
    if (Math.abs(diff) > .0003) { current += diff * (1 - Math.exp(-dt * 7)); busy = true; } else current = target;
    if (intro < 1) { intro = Math.min(1, intro + dt / 1.8); busy = true; }
    if (!spray.played && current >= .6 && current <= .8) startSpray();
    if (spray.active) { spray.t += dt; busy = true; if (spray.t > 3.6) { spray.active = false; } }
    if (busy || dirty) { applyPose(current); renderer.render(scene, camera); dirty = false; }
    if (busy && active) { raf = requestAnimationFrame(frame); }
  }
  function kick() { if (!raf && active) { last = performance.now(); raf = requestAnimationFrame(frame); } }

  resize();
  applyPose(0);
  renderer.render(scene, camera);
  // Compile all shaders up front so the first spray does not stutter.
  mist.visible = true; dust.visible = true; renderer.compile(scene, camera); mist.visible = false;

  return {
    setProgress(p) { target = clamp(p); kick(); },
    jumpTo(p) { target = current = clamp(p); dirty = true; kick(); },
    replaySpray() { startSpray(); },
    get sprayPlayed() { return spray.played; },
    setActive(value) { active = value; if (value) { dirty = true; kick(); } else if (raf) { cancelAnimationFrame(raf); raf = 0; } },
    resize,
    dispose() { active = false; renderer.dispose(); },
  };
}
