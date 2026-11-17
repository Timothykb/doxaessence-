/* The Genesis — realtime WebGL hero.
   The bottle and cap are the supplied product photo; only the atomiser under
   the cap (not visible in the photo) is modelled.
   Scroll drives pose, camera and light; the spray is a short, time-based
   simulation (it never plays backwards into the nozzle). */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const SERIF = '"Cormorant Garamond Variable", "Cormorant Garamond", Georgia, serif';
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (p, a, b) => clamp((p - a) / (b - a));
const ease = x => x * x * (3 - 2 * x);
const easeInOut = x => (x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const lin = hex => new THREE.Color(hex); // THREE.Color converts sRGB hex to linear working space

/* ── The supplied product photo ── */
const P = { src: '/images/genesis-n1-bordeaux.webp', w: 546, h: 1208, capTop: 94, capBottom: 372, capL: 184, capR: 432, centerX: 308, baseY: 1178 };

async function loadPhoto() {
  const img = new Image();
  img.src = P.src;
  await img.decode();
  return img;
}

// Separate the bottle from its plain bordeaux background, and the cap from the bottle.
function keyPhoto(img) {
  const full = document.createElement('canvas');
  full.width = P.w; full.height = P.h;
  const c = full.getContext('2d', { willReadFrequently: true });
  c.drawImage(img, 0, 0, P.w, P.h);
  const data = c.getImageData(0, 0, P.w, P.h);
  const d = data.data;
  const alpha = new Float32Array(P.w * P.h);
  for (let y = 0; y < P.h; y++) {
    const l = y * P.w * 4, r = (y * P.w + P.w - 6) * 4;      // background at both edges of this row
    const br = (d[l + 20] + d[r]) / 2, bgc = (d[l + 21] + d[r + 1]) / 2, bb = (d[l + 22] + d[r + 2]) / 2;
    for (let x = 0; x < P.w; x++) {
      const i = (y * P.w + x) * 4;
      const dist = Math.hypot(d[i] - br, d[i + 1] - bgc, d[i + 2] - bb);
      alpha[y * P.w + x] = Math.min(1, Math.max(0, (dist - 18) / 28));
    }
  }
  const body = c.createImageData(P.w, P.h);
  for (let i = 0; i < alpha.length; i++) {
    const y = Math.floor(i / P.w);
    body.data.set(d.subarray(i * 4, i * 4 + 3), i * 4);
    body.data[i * 4 + 3] = y < P.capBottom ? 0 : Math.round(alpha[i] * 255);
  }
  const capW = P.capR - P.capL, capH = P.capBottom - P.capTop;
  const capImg = c.createImageData(capW, capH);
  for (let y = 0; y < capH; y++) for (let x = 0; x < capW; x++) {
    const src = (y + P.capTop) * P.w + x + P.capL, dst = y * capW + x;
    capImg.data.set(d.subarray(src * 4, src * 4 + 3), dst * 4);
    capImg.data[dst * 4 + 3] = Math.round(alpha[src] * 255);
  }
  const make = (image) => { const cv = document.createElement('canvas'); cv.width = image.width; cv.height = image.height; cv.getContext('2d').putImageData(image, 0, 0); return cv; };
  return { body: make(body), cap: make(capImg) };
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

  /* ── Bottle: the supplied product photo ─────────────
     The glass, liquid, label and cap are the real photograph. Only the
     atomiser hidden under the cap (not visible in the photo) is modelled. */
  const photo = await loadPhoto();
  const { body: bodyCanvas, cap: capCanvas } = keyPhoto(photo);
  const U = 2.58 / (P.baseY - P.capTop);                       // world units per photo pixel
  const BASE_WORLD = -1.28;
  const px2w = (x, y, z = 0) => new THREE.Vector3((x - P.centerX) * U, BASE_WORLD + (P.baseY - y) * U, z);
  const photoTexture = canvas2d => {
    const t = new THREE.CanvasTexture(canvas2d);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return t;
  };

  const stage = new THREE.Group();   // position/scale for layout
  const bottle = new THREE.Group();  // the photographed bottle + atomiser
  stage.add(bottle); scene.add(stage);

  const bodyUniforms = { uMap: { value: photoTexture(bodyCanvas) }, uLight: { value: 0 }, uSweep: { value: -.3 }, uSweepAmt: { value: 0 } };
  const photoShader = {
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: `
      uniform sampler2D uMap; uniform float uLight, uSweep, uSweepAmt; varying vec2 vUv;
      void main(){
        vec4 t = texture2D(uMap, vUv);
        vec3 c = t.rgb * mix(.32, 1., uLight);
        float band = exp(-pow((vUv.x + (vUv.y - .5) * .35 - uSweep) * 7., 2.));   // light gliding over glass and metal
        float lum = dot(t.rgb, vec3(.3, .59, .11));
        c += vec3(1., .9, .76) * band * uSweepAmt * (.12 + lum * .45);
        gl_FragColor = vec4(c, t.a);
        #include <colorspace_fragment>
      }`,
  };
  const body = new THREE.Mesh(new THREE.PlaneGeometry(P.w * U, P.h * U), new THREE.ShaderMaterial({ ...photoShader, uniforms: bodyUniforms, transparent: true, depthWrite: false }));
  body.position.copy(px2w(P.w / 2, P.h / 2));
  body.renderOrder = 1;
  bottle.add(body);

  const capUniforms = { uMap: { value: photoTexture(capCanvas) }, uLight: bodyUniforms.uLight, uSweep: bodyUniforms.uSweep, uSweepAmt: bodyUniforms.uSweepAmt };
  const cap = new THREE.Mesh(new THREE.PlaneGeometry((P.capR - P.capL) * U, (P.capBottom - P.capTop) * U), new THREE.ShaderMaterial({ ...photoShader, uniforms: capUniforms, transparent: true, depthWrite: false }));
  const CAP_HOME = px2w((P.capL + P.capR) / 2, (P.capTop + P.capBottom) / 2, .02);
  cap.position.copy(CAP_HOME);
  cap.renderOrder = 2;
  stage.add(cap);

  // Atomiser (hidden under the cap in the photo), sitting on the photographed collar
  const metal = new THREE.MeshPhysicalMaterial({ color: lin('#e4e5e8'), metalness: 1, roughness: .13, envMapIntensity: 1.5, clearcoat: .4 });
  const actuator = new THREE.Group();
  const ACT_Y = px2w(P.centerX, P.capBottom).y - .004;
  actuator.position.set(0, ACT_Y, 0);
  actuator.rotation.y = -1.22;                                  // nozzle faces left, slightly toward the viewer
  actuator.add(latheMetal([[0, 0], [.035, 0], [.035, .03], [.11, .03], [.122, .05], [.122, .16], [.11, .185], [.06, .195], [0, .195]], metal, 56));
  const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(.024, .024, .02, 24), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: .4 }));
  nozzle.rotation.x = Math.PI / 2; nozzle.position.set(0, .12, .118);
  actuator.add(nozzle);
  const nozzleTip = new THREE.Object3D(); nozzleTip.position.set(0, .12, .135); actuator.add(nozzleTip);
  actuator.visible = false;
  bottle.add(actuator);

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
    const float = .03 * ease(seg(p, 0, .4)) - .03 * ease(seg(p, .78, 1));
    bottle.position.y = float;
    const lift = ease(seg(p, .4, .48)), side = easeInOut(seg(p, .47, .58));
    cap.position.set(CAP_HOME.x + side * (layout.portrait ? .8 : .98), CAP_HOME.y + float + lift * .5 - side * 1.0, CAP_HOME.z + side * .06);
    cap.rotation.z = -.14 * side;
    actuator.visible = lift > .02;
    if (silent) return;
    const dolly = 1 - .06 * ease(seg(p, .05, .36)) + .06 * ease(seg(p, .44, .6)) + .06 * ease(seg(p, .74, 1));
    const rise = ease(seg(p, .44, .6)) * (1 - ease(seg(p, .76, .98)));   // meet the atomiser at eye level
    camera.position.set(0, .12 + rise * (layout.portrait ? .25 : .32), layout.dist * dolly);
    camera.lookAt(0, (layout.portrait ? .05 : 0) + rise * .32, 0);
    scene.environmentRotation.y = -.6 + p * 1.9;
    key.position.set(-3 + p * 2.5, 4, 5);
    const light = ease(intro);
    key.intensity = 2.2 * light; rim.intensity = 2.4 * (.3 + .7 * light); fill.intensity = .5 * light;
    scene.environmentIntensity = .25 + .5 * light;
    bodyUniforms.uLight.value = light;
    bodyUniforms.uSweep.value = -.25 + 1.5 * seg(p, .02, .42);
    bodyUniforms.uSweepAmt.value = light * (.55 + .45 * (1 - seg(p, .42, .5)));
    backdropUniforms.uGlow.value = light * (.7 + .2 * ease(seg(p, .5, .65))) * (.55 + .45 * layout.lightMul);
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
    actuator.position.y = ACT_Y - press * .03;
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
