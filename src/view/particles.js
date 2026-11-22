import * as THREE from 'three';

const VERT = `
attribute vec4 aColor; attribute float aSize; attribute float aSpin;
varying vec4 vColor; varying float vSpin;
uniform float uScale;
void main(){ vColor=aColor; vSpin=aSpin; vec4 mv=modelViewMatrix*vec4(position,1.); vColor.a*=smoothstep(1.5,4.,-mv.z); gl_Position=projectionMatrix*mv; gl_PointSize=aSize*uScale/-mv.z; }`;
// Formas dibujadas en el shader: chispa de cuatro puntas o faceta suave.
const FRAG = `
varying vec4 vColor; varying float vSpin; uniform float uSoft;
void main(){ vec2 p=(gl_PointCoord-.5)*2.; float c=cos(vSpin),s=sin(vSpin); p=mat2(c,-s,s,c)*p;
 float a;
 if(uSoft>.5){ float d=max(abs(p.x)*.866+abs(p.y)*.5,abs(p.y)); a=smoothstep(.95,.55,d)*.75; }
 else { float d=length(p); float spark=max(0.,1.-abs(p.x*p.y)*14.-d*.95); a=spark+smoothstep(.45,0.,d)*.9; }
 if(a<.01||vColor.a<=0.) discard; gl_FragColor=vec4(vColor.rgb,vColor.a*a);
 #include <colorspace_fragment>
}`;

export class Particles {
  constructor(scene, max, soft) {
    this.max = max;
    this.n = 0;
    this.list = Array.from({ length: max }, () => ({ life: 0 }));
    const g = (this.geo = new THREE.BufferGeometry());
    this.pos = new Float32Array(max * 3); this.col = new Float32Array(max * 4);
    this.size = new Float32Array(max); this.spin = new Float32Array(max);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(this.col, 4));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1));
    g.setAttribute('aSpin', new THREE.BufferAttribute(this.spin, 1));
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false,
      blending: soft ? THREE.NormalBlending : THREE.AdditiveBlending,
      uniforms: { uScale: { value: 600 }, uSoft: { value: soft ? 1 : 0 } },
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
    scene.add(this.points);
  }

  emit(o) {
    const p = this.list[(this.n = (this.n + 1) % this.max)];
    const c = new THREE.Color(o.color);
    Object.assign(p, { x: o.x, y: o.y, z: o.z, vx: o.vx || 0, vy: o.vy || 0, vz: o.vz || 0, g: o.g ?? 0, drag: o.drag ?? 0.5, life: o.life || 1, max: o.life || 1, size: o.size || 0.2, r: c.r, gr: c.g, b: c.b, spin: Math.random() * 6, w: (Math.random() - 0.5) * 5, grow: o.grow || 0, alpha: o.alpha ?? 1, swirl: o.swirl || 0, cx: o.cx ?? o.x, cz: o.cz ?? o.z, delay: o.delay || 0 });
  }

  burst(x, y, z, n, o) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283, u = Math.random() * 2 - 1, s = (o.speed || 2) * (0.35 + Math.random() * 0.65), h = Math.sqrt(1 - u * u);
      this.emit({ ...o, color: Array.isArray(o.color) ? o.color[i % o.color.length] : o.color, x, y, z, vx: Math.cos(a) * h * s, vy: (o.up || 0) + u * s * (o.flat ?? 1), vz: Math.sin(a) * h * s, life: (o.life || 1) * (0.5 + Math.random() * 0.7), size: (o.size || 0.2) * (0.5 + Math.random()) });
    }
  }

  update(dt, scale) {
    this.mat.uniforms.uScale.value = scale;
    for (let i = 0; i < this.max; i++) {
      const p = this.list[i];
      if (p.life <= 0) { this.col[i * 4 + 3] = 0; continue; }
      if (p.delay > 0) { p.delay -= dt; this.col[i * 4 + 3] = 0; continue; }
      p.life -= dt;
      const k = Math.exp(-p.drag * dt);
      p.vx *= k; p.vz *= k; p.vy = p.vy * k - p.g * dt;
      if (p.swirl) { const dx = p.x - p.cx, dz = p.z - p.cz; p.x += (-dz * p.swirl - dx * 0.6) * dt; p.z += (dx * p.swirl - dz * 0.6) * dt; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      p.spin += p.w * dt; p.size += p.grow * dt;
      const f = Math.max(0, p.life / p.max);
      this.pos.set([p.x, p.y, p.z], i * 3);
      this.col.set([p.r, p.gr, p.b, Math.min(1, f * 2.2, (1 - f) * 10 + 0.1) * p.alpha], i * 4);
      this.size[i] = p.size; this.spin[i] = p.spin;
    }
    for (const a of Object.values(this.geo.attributes)) a.needsUpdate = true;
  }
}
