import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { Particles } from './particles.js';
import { mat, at, ico, merge, paintBy } from './geo.js';

export const ease = {
  out: (t) => 1 - (1 - t) ** 3,
  inOut: (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2),
  back: (t) => 1 + 2.7 * (t - 1) ** 3 + 1.7 * (t - 1) ** 2,
  lin: (t) => t,
};

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
    this.scene.add(new THREE.HemisphereLight('#b4ccff', '#9c6f94', 1.0));
    const rim = new THREE.DirectionalLight('#b48cff', 0.6);
    rim.position.set(8, 6, -12);
    this.scene.add(rim);

    this.sky();
    this.sea();
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
      fragmentShader: `varying vec3 v; uniform vec3 sun;
        void main(){ float h=v.y; vec3 c=mix(vec3(1.,.74,.62),vec3(.98,.60,.68),smoothstep(-.02,.12,h)); c=mix(c,vec3(.55,.45,.86),smoothstep(.08,.36,h)); c=mix(c,vec3(.22,.28,.68),smoothstep(.3,.85,h));
        float s=max(dot(normalize(v),sun),0.); c+=vec3(1.,.75,.4)*(pow(s,10.)*.28+pow(s,160.)*.7);
        gl_FragColor=vec4(pow(c,vec3(2.2)),1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        }`,
      uniforms: { sun: { value: new THREE.Vector3(-0.5, 0.32, -0.7).normalize() } },
    });
    this.skyMesh = new THREE.Mesh(g, this.skyMat);
    this.scene.add(this.skyMesh);
    // Nubes facetadas a la deriva.
    const puff = merge([[0, 0, 0, 1.5], [1.5, -0.2, 0.2, 1.1], [-1.5, -0.25, 0, 1.15], [0.6, 0.5, -0.3, 1.0], [-0.7, 0.35, 0.3, 0.95], [2.5, -0.45, 0, 0.65]].map(([x, y, z, s]) => paintBy(at(ico(s, 1), { s: [1, 0.72, 1], p: [x, y, z] }), (v) => (v.y > 0.2 ? '#fff4f2' : '#e9c3dc'))));
    this.clouds = new THREE.InstancedMesh(puff, mat, 16);
    this.cloudData = Array.from({ length: 16 }, (_, i) => ({ x: Math.random() * 130 - 30, y: 9 + Math.random() * 7, z: (i % 2 ? -1 : 0.95) * (24 + Math.random() * 26), s: 0.8 + Math.random() * 1.5, v: 0.15 + Math.random() * 0.3 }));
    this.clouds.frustumCulled = false;
    this.clouds.castShadow = false;
    this.scene.add(this.clouds);
  }

  sea() {
    const g = new THREE.PlaneGeometry(260, 200, 90, 70).rotateX(-Math.PI / 2);
    const m = new THREE.MeshStandardMaterial({ color: '#2f9fb5', flatShading: true, roughness: 0.75, metalness: 0 });
    m.onBeforeCompile = (s) => {
      s.uniforms.uT = this.seaT = { value: 0 };
      s.vertexShader = 'uniform float uT;\n' + s.vertexShader.replace('#include <begin_vertex>', 'vec3 transformed=position; transformed.y+=sin(position.x*.9+uT*1.1)*.11+sin(position.z*1.2+uT*.8+position.x*.4)*.1;');
    };
    const sea = new THREE.Mesh(g, m);
    sea.position.set(24, -0.28, 0);
    sea.receiveShadow = true;
    this.scene.add(sea);
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
    this.sun.position.set(sx - 13, 21, sz + 9);
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
