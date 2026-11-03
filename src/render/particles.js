import * as THREE from '../../vendor/three.module.js';

export class Particles {
  constructor(scene, max = 1600) {
    this.max = max;
    this.n = 0;
    this.pos = new Float32Array(max * 3);
    this.col = new Float32Array(max * 4);
    this.size = new Float32Array(max);
    this.v = new Float32Array(max * 3);
    this.life = new Float32Array(max);
    this.ml = new Float32Array(max);
    this.s0 = new Float32Array(max);
    this.s1 = new Float32Array(max);
    this.a0 = new Float32Array(max);
    this.gr = new Float32Array(max);
    this.dr = new Float32Array(max);
    const g = new THREE.BufferGeometry();
    this.pa = new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage);
    this.ca = new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage);
    this.sa = new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', this.pa);
    g.setAttribute('aCol', this.ca);
    g.setAttribute('aSize', this.sa);
    this.u = { uScale: { value: 600 } };
    const m = new THREE.ShaderMaterial({
      uniforms: this.u,
      transparent: true,
      depthWrite: false,
      vertexShader: `attribute vec4 aCol;attribute float aSize;uniform float uScale;varying vec4 vC;void main(){vC=aCol;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=aSize*uScale/-mv.z;gl_Position=projectionMatrix*mv;}`,
      fragmentShader: `varying vec4 vC;void main(){float d=length(gl_PointCoord-0.5);float a=smoothstep(0.5,0.1,d);gl_FragColor=vec4(vC.rgb,vC.a*a);
      #include <colorspace_fragment>
      }`,
    });
    this.points = new THREE.Points(g, m);
    this.points.frustumCulled = false;
    this.points.layers.set(1);
    this.points.renderOrder = 5;
    scene.add(this.points);
    this.g = g;
    this._c = new THREE.Color();
  }
  emit({
    x,
    y,
    z,
    count = 10,
    spread = 0.3,
    vel = [0, 2, 0],
    vr = 1,
    life = 1,
    size = [0.15, 0.05],
    color = '#ffffff',
    alpha = 0.9,
    gravity = -6,
    drag = 0.5,
  }) {
    this._c.set(color);
    for (let k = 0; k < count && this.n < this.max; k++) {
      const i = this.n++;
      this.pos[i * 3] = x + (Math.random() - 0.5) * spread;
      this.pos[i * 3 + 1] = y + (Math.random() - 0.5) * spread * 0.3;
      this.pos[i * 3 + 2] = z + (Math.random() - 0.5) * spread;
      this.v[i * 3] = vel[0] + (Math.random() - 0.5) * vr * 2;
      this.v[i * 3 + 1] = vel[1] + Math.random() * vr;
      this.v[i * 3 + 2] = vel[2] + (Math.random() - 0.5) * vr * 2;
      this.life[i] = 0;
      this.ml[i] = life * (0.7 + Math.random() * 0.6);
      this.s0[i] = size[0];
      this.s1[i] = size[1];
      this.a0[i] = alpha;
      this.gr[i] = gravity;
      this.dr[i] = drag;
      this.col[i * 4] = this._c.r;
      this.col[i * 4 + 1] = this._c.g;
      this.col[i * 4 + 2] = this._c.b;
    }
  }
  splash(x, z, s = 1) {
    this.emit({
      x,
      y: 0.1,
      z,
      count: (22 * s) | 0,
      spread: 0.4 * s,
      vel: [0, 2.6 * s, 0],
      vr: 1.1 * s,
      life: 0.8,
      size: [0.13 * s, 0.04],
      color: '#f2fbff',
      gravity: -9,
    });
  }
  update(dt) {
    let i = 0;
    while (i < this.n) {
      this.life[i] += dt;
      if (this.life[i] >= this.ml[i]) {
        this.n--;
        this._swap(i, this.n);
        continue;
      }
      const t = this.life[i] / this.ml[i],
        d = Math.exp(-this.dr[i] * dt);
      this.v[i * 3] *= d;
      this.v[i * 3 + 2] *= d;
      this.v[i * 3 + 1] = this.v[i * 3 + 1] * d + this.gr[i] * dt;
      for (let k = 0; k < 3; k++) this.pos[i * 3 + k] += this.v[i * 3 + k] * dt;
      this.size[i] = this.s0[i] + (this.s1[i] - this.s0[i]) * t;
      this.col[i * 4 + 3] = this.a0[i] * Math.min(1, t * 8) * (1 - t);
      i++;
    }
    this.g.setDrawRange(0, this.n);
    this.pa.needsUpdate = this.ca.needsUpdate = this.sa.needsUpdate = true;
  }
  _swap(a, b) {
    const A = [this.pos, this.v],
      B = [this.col];
    for (const arr of A) for (let k = 0; k < 3; k++) arr[a * 3 + k] = arr[b * 3 + k];
    for (let k = 0; k < 4; k++) this.col[a * 4 + k] = this.col[b * 4 + k];
    for (const arr of [this.size, this.life, this.ml, this.s0, this.s1, this.a0, this.gr, this.dr]) arr[a] = arr[b];
  }
}
export class Rain {
  constructor(scene, n = 1400) {
    this.n = n;
    const p = new Float32Array(n * 6);
    this.p = p;
    this.off = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      this.off[i * 3] = (Math.random() - 0.5) * 50;
      this.off[i * 3 + 1] = Math.random() * 30;
      this.off[i * 3 + 2] = (Math.random() - 0.5) * 50;
    }
    const g = new THREE.BufferGeometry();
    this.a = new THREE.BufferAttribute(p, 3).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', this.a);
    this.mat = new THREE.LineBasicMaterial({ color: 0xcfe3ee, transparent: true, opacity: 0, depthWrite: false });
    this.lines = new THREE.LineSegments(g, this.mat);
    this.lines.frustumCulled = false;
    this.lines.layers.set(1);
    scene.add(this.lines);
    this.intensity = 0;
  }
  update(dt, cam, target) {
    this.mat.opacity = 0.45 * this.intensity;
    this.lines.visible = this.intensity > 0.02;
    if (!this.lines.visible) return;
    const cx = cam.position.x,
      cz = cam.position.z;
    for (let i = 0; i < this.n; i++) {
      let y = this.off[i * 3 + 1] - dt * 22;
      if (y < 0) y += 30;
      this.off[i * 3 + 1] = y;
      const x = cx + this.off[i * 3],
        z = cz + this.off[i * 3 + 2];
      this.p[i * 6] = x;
      this.p[i * 6 + 1] = y;
      this.p[i * 6 + 2] = z;
      this.p[i * 6 + 3] = x + 0.05;
      this.p[i * 6 + 4] = y + 0.7;
      this.p[i * 6 + 5] = z + 0.02;
    }
    this.a.needsUpdate = true;
  }
}
