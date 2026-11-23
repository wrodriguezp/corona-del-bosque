import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { Particles } from './particles.js';
import { mat, matGlow, at, ico, merge, paintBy } from './geo.js';

export const ease = {
  out: (t) => 1 - (1 - t) ** 3,
  inOut: (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2),
  back: (t) => 1 + 2.7 * (t - 1) ** 3 + 1.7 * (t - 1) ** 2,
  lin: (t) => t,
};

// Ambientes de luz: el cielo se mezcla suavemente entre uno y otro.
const MOODS = {
  day: { sun: '#ffdcae', sunI: 2.35, pos: [-13, 21, 9], sky: '#b4ccff', ground: '#9c6f94', hemi: 1.0, rim: 0.6, fog: '#f3c6c4', sea: '#2f9fb5', cloud: '#ffffff', env: 0.22, expo: 1.12, lamp: 0, stars: 0, dark: 0, glow: 0.55, c: [1, 0.74, 0.62, 0.98, 0.6, 0.68, 0.55, 0.45, 0.86, 0.22, 0.28, 0.68], disc: [1, 0.75, 0.4] },
  dusk: { sun: '#ff9a5c', sunI: 2.15, pos: [-20, 12, 6], sky: '#b9a6ff', ground: '#8a4f7d', hemi: 0.9, rim: 0.9, fog: '#e58f9a', sea: '#3c7fae', cloud: '#ffc4b0', env: 0.18, expo: 1.1, lamp: 0.35, stars: 0.25, dark: 0, glow: 0.75, c: [1, 0.55, 0.36, 0.9, 0.38, 0.5, 0.42, 0.28, 0.68, 0.13, 0.14, 0.46], disc: [1, 0.55, 0.25] },
  night: { sun: '#93aaff', sunI: 1.1, pos: [9, 20, 11], sky: '#5a72dd', ground: '#40307a', hemi: 0.82, rim: 0.9, fog: '#2f3474', sea: '#2b4f8c', cloud: '#7a83c4', env: 0.12, expo: 1.12, lamp: 1, stars: 1, dark: 0, glow: 1.15, c: [0.3, 0.3, 0.62, 0.2, 0.21, 0.52, 0.1, 0.11, 0.36, 0.03, 0.05, 0.2], disc: [0.75, 0.82, 1] },
  eclipse: { sun: '#e07bff', sunI: 0.95, pos: [-4, 22, 4], sky: '#7a55c8', ground: '#3d1f56', hemi: 0.75, rim: 1.4, fog: '#3a1f57', sea: '#3a3f8c', cloud: '#6b4a94', env: 0.1, expo: 1.1, lamp: 0.8, stars: 0.8, dark: 1, glow: 1.3, c: [0.75, 0.3, 0.45, 0.4, 0.15, 0.42, 0.16, 0.07, 0.3, 0.04, 0.02, 0.12], disc: [1, 0.5, 0.75] },
  frost: { sun: '#dff1ff', sunI: 1.9, pos: [-10, 20, 12], sky: '#cfe6ff', ground: '#8095c4', hemi: 1.15, rim: 0.8, fog: '#d3e4f7', sea: '#6fb3d0', cloud: '#ffffff', env: 0.24, expo: 1.12, lamp: 0, stars: 0, dark: 0, glow: 0.55, c: [0.9, 0.95, 1, 0.72, 0.84, 0.97, 0.5, 0.64, 0.9, 0.3, 0.42, 0.75], disc: [1, 1, 1] },
};

const flat = (m) => [
  ...['sun', 'sky', 'ground', 'fog', 'sea', 'cloud'].flatMap((k) => new THREE.Color(m[k]).toArray()),
  m.sunI, m.hemi, m.rim, m.env, m.expo, m.lamp, m.stars, m.dark, m.glow, ...m.c, ...m.disc, ...m.pos,
];

export class Stage {
  constructor(canvas) {
    this.quality = 1;
    this.mobile = matchMedia('(pointer: coarse)').matches;
    const r = (this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }));
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.toneMapping = THREE.NeutralToneMapping;
    r.toneMappingExposure = 1.12;
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog('#f3c6c4', 26, 72);
    const env = new THREE.PMREMGenerator(r);
    this.scene.environment = env.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.22;
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 260);

    const sun = (this.sun = new THREE.DirectionalLight('#ffdcae', 2.35));
    sun.castShadow = true;
    sun.shadow.mapSize.setScalar(this.mobile ? 1024 : 2048);
    Object.assign(sun.shadow.camera, { left: -17, right: 17, top: 15, bottom: -15, near: 1, far: 70 });
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.035;
    this.scene.add(sun, sun.target);
    this.hemi = new THREE.HemisphereLight('#b4ccff', '#9c6f94', 1.0);
    this.scene.add(this.hemi);
    const rim = new THREE.DirectionalLight('#b48cff', 0.6);
    rim.position.set(8, 6, -12);
    this.scene.add((this.rim = rim));
    // Faroles de cada aventurero: solo alumbran de noche.
    this.lamps = ['#ffb765', '#8fb8ff'].map((c) => { const l = new THREE.PointLight(c, 0, 8, 1.6); this.scene.add(l); return l; });

    this.sky();
    this.sea();
    this.applyMood(flat(MOODS.day));
    this.sparks = new Particles(this.scene, this.mobile ? 1100 : 2400, false);
    this.smoke = new Particles(this.scene, this.mobile ? 350 : 700, true);

    // Calidad automática: 0 alta, 1 media, 2 ligera, 3 mínima.
    let gpu = '';
    try { const gl = r.getContext(); gpu = gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info')?.UNMASKED_RENDERER_WEBGL ?? gl.RENDERER) || ''; } catch {}
    this.quality = this.mobile || /Intel|SwiftShader|llvmpipe|Mali|Adreno/i.test(gpu) ? 1 : 0;
    this.slow = { n: 0, t: 0, warm: 60 };
    if (this.quality === 0) {
      const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4 });
      this.composer = new EffectComposer(r, rt);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.bloom = new UnrealBloomPass(new THREE.Vector2(4, 4), 0.32, 0.55, 0.92);
      this.composer.addPass(this.bloom);
      this.composer.addPass(new OutputPass());
    }

    // Cámara orbital propia: arrastrar mueve, botón derecho gira, rueda acerca.
    this.cam = { target: new THREE.Vector3(), pos: new THREE.Vector3(), yaw: 0, pitch: 0.82, dist: 13, wYaw: 0, wPitch: 0.82, wDist: 13, shake: 0, spin: 0 };
    this.tweens = [];
    this.updaters = [];
    this.time = 0;
    this.controls(canvas);
    this.resize();
    new ResizeObserver(() => this.resize()).observe(canvas.parentElement);
    let last = performance.now();
    r.setAnimationLoop((now) => {
      const raw = Math.max(0, (now - last) / 1000);
      last = now;
      if (this.manual) return;
      this.frame(Math.min(0.1, raw));
      this.adapt(raw);
    });
  }

  // Baja un escalón si el promedio de 45 cuadros no alcanza unos 35 por segundo.
  adapt(dt) {
    const s = this.slow;
    if (document.hidden || dt > 0.4) return; // pestaña en pausa, no es lentitud
    if (s.warm-- > 0) return;
    s.n++; s.t += dt;
    if (s.n < 45) return;
    if (s.t / s.n > 1 / 35 && this.quality < 3) this.setQuality(this.quality + 1);
    s.n = 0; s.t = 0;
  }

  setQuality(q) {
    this.quality = q;
    this.slow.warm = 40;
    if (q > 0 && this.composer) { this.composer.dispose(); this.composer = null; }
    if (q >= 2) {
      this.sun.shadow.mapSize.setScalar(1024);
      this.sun.shadow.map?.dispose();
      this.sun.shadow.map = null;
    }
    this.renderer.shadowMap.autoUpdate = q < 3;
    this.resize();
  }

  sky() {
    const g = new THREE.SphereGeometry(140, 32, 20);
    this.skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: 'varying vec3 v; void main(){ v=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: `varying vec3 v; uniform vec3 sun, c0, c1, c2, c3, disc; uniform float stars, dark, t;
        float hash(vec3 p){ return fract(sin(dot(p,vec3(12.99,78.23,37.72)))*43758.5453); }
        void main(){ float h=v.y; vec3 c=mix(c0,c1,smoothstep(-.02,.12,h)); c=mix(c,c2,smoothstep(.08,.36,h)); c=mix(c,c3,smoothstep(.3,.85,h));
        float s=max(dot(normalize(v),sun),0.); c+=disc*(pow(s,10.)*.28+pow(s,160.)*.7);
        c=mix(c,vec3(1.,.98,.9),smoothstep(.9962,.9968,s)*stars*(1.-dark)); // luna
        c=mix(c,vec3(.05,.01,.09),smoothstep(.9925,.9935,s)*dark);
        c+=disc*dark*smoothstep(.986,.993,s)*(1.-smoothstep(.9925,.9935,s))*.9;
        vec3 q=normalize(v)*70., id=floor(q); float r=hash(id);
        if(r>.972&&h>0.){ float d=length(fract(q)-.5); c+=vec3(.9,.93,1.)*smoothstep(.34,0.,d)*stars*(.55+.45*sin(t*2.+r*900.)); }
        gl_FragColor=vec4(pow(c,vec3(2.2)),1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        }`,
      uniforms: { sun: { value: new THREE.Vector3(-0.5, 0.32, -0.7).normalize() }, c0: { value: new THREE.Vector3() }, c1: { value: new THREE.Vector3() }, c2: { value: new THREE.Vector3() }, c3: { value: new THREE.Vector3() }, disc: { value: new THREE.Vector3() }, stars: { value: 0 }, dark: { value: 0 }, t: { value: 0 } },
    });
    this.skyMesh = new THREE.Mesh(g, this.skyMat);
    this.scene.add(this.skyMesh);
    // Nubes facetadas a la deriva.
    const puff = merge([[0, 0, 0, 1.5], [1.5, -0.2, 0.2, 1.1], [-1.5, -0.25, 0, 1.15], [0.6, 0.5, -0.3, 1.0], [-0.7, 0.35, 0.3, 0.95], [2.5, -0.45, 0, 0.65]].map(([x, y, z, s]) => paintBy(at(ico(s, 1), { s: [1, 0.72, 1], p: [x, y, z] }), (v) => (v.y > 0.2 ? '#fff4f2' : '#e9c3dc'))));
    this.clouds = new THREE.InstancedMesh(puff, (this.cloudMat = mat.clone()), 16);
    this.cloudData = Array.from({ length: 16 }, (_, i) => ({ x: Math.random() * 130 - 30, y: 9 + Math.random() * 7, z: (i % 2 ? -1 : 0.95) * (24 + Math.random() * 26), s: 0.8 + Math.random() * 1.5, v: 0.15 + Math.random() * 0.3 }));
    this.clouds.frustumCulled = false;
    this.clouds.castShadow = false;
    this.scene.add(this.clouds);
  }

  sea() {
    const g = new THREE.PlaneGeometry(260, 200, 90, 70).rotateX(-Math.PI / 2);
    const m = this.seaMat = new THREE.MeshStandardMaterial({ color: '#2f9fb5', flatShading: true, roughness: 0.75, metalness: 0 });
    m.onBeforeCompile = (s) => {
      s.uniforms.uT = this.seaT = { value: 0 };
      s.vertexShader = 'uniform float uT;\n' + s.vertexShader.replace('#include <begin_vertex>', 'vec3 transformed=position; transformed.y+=sin(position.x*.9+uT*1.1)*.11+sin(position.z*1.2+uT*.8+position.x*.4)*.1;');
    };
    const sea = new THREE.Mesh(g, m);
    sea.position.set(24, -0.28, 0);
    sea.receiveShadow = true;
    this.scene.add(sea);
  }

  // Cambia el ambiente mezclando colores en lineal; `dur` 0 lo aplica al instante.
  setMood(name, dur = 2.5) {
    if (this.moodName === name) return Promise.resolve();
    this.moodName = name;
    const to = flat(MOODS[name]), from = this.mood;
    const id = (this.moodId = (this.moodId || 0) + 1);
    if (!dur) { this.applyMood(to); return Promise.resolve(); }
    return this.tween(dur, (k) => { if (id === this.moodId) this.applyMood(from.map((a, i) => a + (to[i] - a) * k)); }, ease.inOut);
  }

  applyMood(a) {
    this.mood = a;
    this.moodName ??= 'day';
    let i = 0;
    const col = (c) => { c.setRGB(a[i], a[i + 1], a[i + 2]); i += 3; }, n = () => a[i++];
    const u = this.skyMat.uniforms;
    col(this.sun.color); col(this.hemi.color); col(this.hemi.groundColor); col(this.scene.fog.color); col(this.seaMat.color); col(this.cloudMat.color);
    this.sun.intensity = n(); this.hemi.intensity = n(); this.rim.intensity = n();
    this.scene.environmentIntensity = n(); this.renderer.toneMappingExposure = n();
    this.lamp = n(); u.stars.value = n(); u.dark.value = n(); matGlow.emissiveIntensity = n();
    for (const k of ['c0', 'c1', 'c2', 'c3', 'disc']) u[k].value.set(n(), n(), n());
    this.sunPos = [n(), n(), n()];
  }

  controls(el) {
    const ptr = new Map();
    let moved = 0, pinch = null;
    this.onTap = () => {};
    this.onHover = () => {};
    const pan = (dx, dy) => {
      const k = (this.cam.dist * 0.0014) * (900 / el.clientHeight);
      const c = Math.cos(this.cam.yaw), s = Math.sin(this.cam.yaw);
      this.cam.target.x -= (dx * c + dy * s) * k;
      this.cam.target.z -= (-dx * s + dy * c) * k * 1.15;
      this.clampTarget();
    };
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    el.addEventListener('pointerdown', (e) => {
      el.setPointerCapture?.(e.pointerId);
      ptr.set(e.pointerId, { x: e.clientX, y: e.clientY, b: e.button });
      if (ptr.size === 1) moved = 0; else moved = 99;
      pinch = null;
    });
    el.addEventListener('pointermove', (e) => {
      const p = ptr.get(e.pointerId);
      if (!p) { if (e.pointerType === 'mouse') this.onHover(this.ndc(e)); return; }
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      p.x = e.clientX; p.y = e.clientY;
      moved += Math.abs(dx) + Math.abs(dy);
      if (moved < 7 || this.locked) return;
      if (ptr.size === 2) {
        const [a, b] = [...ptr.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y), an = Math.atan2(a.y - b.y, a.x - b.x);
        if (pinch) {
          this.cam.wDist = THREE.MathUtils.clamp(this.cam.wDist * (pinch.d / d), 5, 90);
          let q = an - pinch.an; q = Math.atan2(Math.sin(q), Math.cos(q));
          this.cam.wYaw += q;
        }
        pinch = { d, an };
        pan(dx / 2, dy / 2);
      } else if (p.b === 2 || e.shiftKey) {
        this.cam.wYaw -= dx * 0.006;
        this.cam.wPitch = THREE.MathUtils.clamp(this.cam.wPitch + dy * 0.005, 0.3, 1.35);
      } else pan(dx, dy);
    });
    const up = (e) => {
      const p = ptr.get(e.pointerId);
      ptr.delete(e.pointerId);
      if (e.type === 'pointerup' && p && moved < 7 && p.b === 0) this.onTap(this.ndc(e));
    };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (!this.locked) this.cam.wDist = THREE.MathUtils.clamp(this.cam.wDist * Math.exp(e.deltaY * 0.001), 5, 90);
    }, { passive: false });
    this.el = el;
  }

  clampTarget() {
    const b = this.bounds;
    if (!b) return;
    this.cam.target.x = THREE.MathUtils.clamp(this.cam.target.x, b.x0, b.x1);
    this.cam.target.z = THREE.MathUtils.clamp(this.cam.target.z, b.z0, b.z1);
  }

  ndc(e) {
    const r = this.el.getBoundingClientRect();
    return new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  }

  project(v) {
    const p = v.clone().project(this.camera);
    return { x: (p.x * 0.5 + 0.5) * this.w, y: (-p.y * 0.5 + 0.5) * this.h, behind: p.z > 1 };
  }

  resize() {
    const p = this.el?.parentElement ?? this.renderer.domElement.parentElement;
    this.w = Math.max(1, p.clientWidth);
    this.h = Math.max(1, p.clientHeight);
    const dpr = Math.min(devicePixelRatio || 1, [2, 1.4, 1, 0.8][this.quality]);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(this.w, this.h, false);
    this.composer?.setPixelRatio(dpr);
    this.composer?.setSize(this.w, this.h);
    this.camera.aspect = this.w / this.h;
    this.portrait = this.camera.aspect < 0.85;
    this.camera.fov = this.portrait ? 50 : 38;
    this.camera.updateProjectionMatrix();
  }

  focus(v, { dist, yaw, pitch, dur = 0.9 } = {}) {
    const from = this.cam.target.clone(), to = v.clone();
    if (dist) this.cam.wDist = dist;
    if (yaw != null) this.cam.wYaw = yaw;
    if (pitch != null) this.cam.wPitch = pitch;
    this.focusId = (this.focusId || 0) + 1;
    const id = this.focusId;
    return this.tween(dur, (t) => { if (id === this.focusId) this.cam.target.lerpVectors(from, to, t); }, ease.inOut);
  }

  tween(dur, fn, e = ease.out) {
    return new Promise((res) => this.tweens.push({ t: 0, dur: Math.max(0.0001, dur), fn, e, res }));
  }

  wait(s) { return this.tween(s, () => {}, ease.lin); }

  shake(a = 0.35) { this.cam.shake = Math.max(this.cam.shake, a); }

  frame(dt) {
    this.time += dt;
    for (let i = this.tweens.length - 1; i >= 0; i--) {
      const w = this.tweens[i];
      w.t = Math.min(1, w.t + dt / w.dur);
      w.fn(w.e(w.t), w.t);
      if (w.t >= 1) { this.tweens.splice(i, 1); w.res(); }
    }
    for (const u of this.updaters) u(dt, this.time);

    const c = this.cam, k = 1 - Math.exp(-6 * dt);
    if (c.spin) c.wYaw += c.spin * dt;
    c.yaw += (c.wYaw - c.yaw) * k; c.pitch += (c.wPitch - c.pitch) * k; c.dist += (c.wDist - c.dist) * k;
    c.pos.lerp(c.target, 1 - Math.exp(-9 * dt));
    c.shake *= Math.exp(-5 * dt);
    const sh = () => (Math.random() - 0.5) * c.shake;
    this.camera.position.set(
      c.pos.x + Math.sin(c.yaw) * Math.cos(c.pitch) * c.dist + sh(),
      c.pos.y + Math.sin(c.pitch) * c.dist + sh(),
      c.pos.z + Math.cos(c.yaw) * Math.cos(c.pitch) * c.dist + sh());
    this.camera.lookAt(c.pos.x, c.pos.y + 0.5, c.pos.z);
    this.camera.updateMatrixWorld();

    // La sombra sigue a la cámara, ajustada a píxeles para que no tiemble.
    const ext = THREE.MathUtils.clamp(c.dist * 1.05, 12, 30), sc = this.sun.shadow.camera;
    if (Math.abs(sc.right - ext) > 0.8) { Object.assign(sc, { left: -ext, right: ext, top: ext, bottom: -ext }); sc.updateProjectionMatrix(); }
    const st = (2 * sc.right) / this.sun.shadow.mapSize.x * 4;
    const sx = Math.round(c.pos.x / st) * st, sz = Math.round(c.pos.z / st) * st;
    this.sun.target.position.set(sx, 0, sz);
    this.sun.position.set(sx + this.sunPos[0], this.sunPos[1], sz + this.sunPos[2]);
    this.skyMat.uniforms.t.value = this.time;
    this.scene.fog.near = c.dist + 14;
    this.scene.fog.far = c.dist + 60;
    this.skyMesh.position.copy(this.camera.position);
    if (this.seaT) this.seaT.value = this.time;
    const m = new THREE.Matrix4();
    this.cloudData.forEach((d, i) => {
      d.x += d.v * dt; if (d.x > 110) d.x = -40;
      this.clouds.setMatrixAt(i, m.makeScale(d.s, d.s, d.s).setPosition(d.x, d.y, d.z));
    });
    this.clouds.instanceMatrix.needsUpdate = true;
    const ps = (this.h * this.renderer.getPixelRatio()) / (2 * Math.tan((this.camera.fov * Math.PI) / 360));
    this.sparks.update(dt, ps);
    this.smoke.update(dt, ps);
    if (this.w < 2 || this.noDraw) return;
    if (this.quality === 3) this.renderer.shadowMap.needsUpdate = (this.tick = (this.tick || 0) + 1) % 2 === 0;
    if (this.composer) this.composer.render(dt); else this.renderer.render(this.scene, this.camera);
  }
}
