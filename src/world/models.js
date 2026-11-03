import * as THREE from '../../vendor/three.module.js';
import { box, cyl, M, mesh, rng, sph, vertexAO } from '../core/util.js';
import { clapTex, glowTex, leafTex, netTex, soilTex, woodTex } from '../render/textures.js';

export const TEX = {};
export const MAT = {};
export const timeU = { value: 0 };
export function initMaterials() {
  TEX.wood = woodTex(3);
  TEX.clap = clapTex(5);
  TEX.leaf = leafTex();
  TEX.soil = soilTex();
  TEX.net = netTex();
  TEX.glow = glowTex();
  MAT.plank = new THREE.MeshStandardMaterial({ map: TEX.wood, bumpMap: TEX.wood, bumpScale: 1.2, roughness: 0.9, color: 0xffffff });
  MAT.darkWood = new THREE.MeshStandardMaterial({ map: TEX.wood, roughness: 0.9, color: '#6e5a45' });
  MAT.stilt = new THREE.MeshStandardMaterial({ map: TEX.wood, roughness: 0.9, color: '#4f5a50' });
  MAT.wall = new THREE.MeshStandardMaterial({ map: TEX.clap, bumpMap: TEX.clap, bumpScale: 0.8, roughness: 0.8 });
  MAT.trim = M('#1d6a86', 0.7);
  MAT.frame = M('#f0e4c6', 0.7);
  MAT.roof = new THREE.MeshStandardMaterial({ map: TEX.wood, roughness: 0.95, color: '#5a4a3c' });
  MAT.glass = new THREE.MeshStandardMaterial({
    color: '#2b4a55',
    roughness: 0.15,
    metalness: 0.2,
    emissive: new THREE.Color('#ffb860'),
    emissiveIntensity: 0,
  });
  MAT.soil = new THREE.MeshStandardMaterial({ map: TEX.soil, roughness: 1 });
  MAT.terracotta = M('#c76b40', 0.85);
  MAT.rope = M('#cdb88a', 0.95);
  MAT.metal = M('#8a9399', 0.45, { metalness: 0.6, key: 'm' });
  MAT.red = M('#e04a3c', 0.6);
  MAT.white = M('#f4f1ea', 0.6);
  MAT.blue = M('#2f78b8', 0.55);
  MAT.drum = M('#3b6f86', 0.6);
  MAT.trunk = M('#6e4b2d', 0.95);
  MAT.leaf = new THREE.MeshStandardMaterial({
    map: TEX.leaf,
    alphaTest: 0.5,
    alphaToCoverage: true,
    side: THREE.DoubleSide,
    roughness: 0.85,
    color: 0xffffff,
  });
  MAT.leaf.onBeforeCompile = (s) => {
    s.uniforms.uTime = timeU;
    s.vertexShader =
      'uniform float uTime;\n' +
      s.vertexShader.replace(
        '#include <begin_vertex>',
        `vec3 transformed=vec3(position);
   #ifdef USE_INSTANCING
   vec4 wp0=instanceMatrix*vec4(0.,0.,0.,1.);
   #else
   vec4 wp0=vec4(0.);
   #endif
   transformed.x+=sin(uTime*2.1+wp0.x*4.+wp0.y*3.)*0.03;transformed.y+=cos(uTime*1.7+wp0.z*5.)*0.02;`,
      );
  };
  MAT.foliage = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
  MAT.lamp = new THREE.MeshStandardMaterial({
    color: '#ffd9a0',
    emissive: new THREE.Color('#ffb04a'),
    emissiveIntensity: 0.4,
    roughness: 0.4,
  });
}
const G = new THREE.Group();
// ---------------- foliage ----------------
function blobGeo(r, seed, col, detail = 3) {
  const g = new THREE.IcosahedronGeometry(r, detail),
    p = g.attributes.position,
    rnd = rng(seed),
    o = [rnd() * 10, rnd() * 10, rnd() * 10];
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = Math.sin(v.x * 6 + o[0]) * Math.sin(v.y * 5 + o[1]) * Math.sin(v.z * 6 + o[2]);
    v.multiplyScalar(1 + n * 0.12);
    if (v.y < -r * 0.3) v.y = -r * 0.3 + (v.y + r * 0.3) * 0.4;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  const c = new THREE.Color(col);
  vertexAO(g, -r * 0.4, r, 0.42, [c.r, c.g, c.b]);
  return g;
}
export function makeFoliage(
  parent,
  centers,
  seed = 1,
  leafCount = 260,
  cols = ['#5aa83a', '#4c9a30', '#6cbb44', '#3f8a2c'],
  leafSize = 0.34,
  core = 1,
) {
  const rnd = rng(seed);
  const leaves = new THREE.InstancedMesh(new THREE.PlaneGeometry(leafSize, leafSize), MAT.leaf, leafCount);
  leaves.castShadow = true;
  const d = new THREE.Object3D(),
    c = new THREE.Color();
  let k = 0;
  centers.forEach(([x, y, z, r], i) => {
    const m = mesh(blobGeo(r * core, seed + i, core < 1 ? '#3d7a26' : cols[i % cols.length]), MAT.foliage, x, y, z, parent);
    const per = Math.floor(leafCount / centers.length);
    for (let j = 0; j < per && k < leafCount; j++, k++) {
      const dir = new THREE.Vector3(rnd() - 0.5, rnd() - 0.25, rnd() - 0.5).normalize();
      d.position.set(x, y, z).addScaledVector(dir, r * (core < 1 ? 0.55 + rnd() * 0.6 : 0.85 + rnd() * 0.3));
      d.lookAt(d.position.clone().add(dir));
      d.rotateZ(rnd() * 6.28);
      d.scale.setScalar(0.7 + rnd() * 0.7);
      d.updateMatrix();
      leaves.setMatrixAt(k, d.matrix);
      c.set(cols[(rnd() * 4) | 0]).multiplyScalar(0.75 + 0.5 * (dir.y * 0.5 + 0.5));
      leaves.setColorAt(k, c);
    }
  });
  leaves.count = k;
  parent.add(leaves);
  return leaves;
}
export function makeTree(seed = 1) {
  const g = new THREE.Group();
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.06, 0.55, 0.03),
    new THREE.Vector3(-0.05, 1.1, 0.06),
    new THREE.Vector3(0.05, 1.55, 0),
  ]);
  const tg = new THREE.TubeGeometry(curve, 24, 0.085, 8, false),
    p = tg.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const seg = Math.floor(i / 9) / 24;
    const pt = curve.getPoint(seg);
    const s = 1.35 - seg * 0.6;
    p.setX(i, pt.x + (p.getX(i) - pt.x) * s);
    p.setZ(i, pt.z + (p.getZ(i) - pt.z) * s);
  }
  tg.computeVertexNormals();
  mesh(tg, MAT.trunk, 0, 0, 0, g);
  for (const [a, l, h] of [
    [0.4, 0.5, 1.15],
    [2.6, 0.45, 1.3],
    [4.4, 0.4, 1.0],
  ]) {
    const b = cyl(0.03, 0.05, l, MAT.trunk, 0, 0, 0, g, 6);
    b.position.set(Math.cos(a) * l * 0.4, h + 0.15, Math.sin(a) * l * 0.4);
    b.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9);
  }
  for (const [a, l, h, t] of [
    [1.2, 0.75, 1.35, 0.5],
    [3.6, 0.7, 1.45, 0.6],
    [5.4, 0.65, 1.25, 0.45],
    [0.0, 0.6, 1.6, 0.7],
  ]) {
    const b = cyl(0.025, 0.045, l, MAT.trunk, 0, 0, 0, g, 6);
    b.position.set(Math.cos(a) * l * 0.45, h + l * 0.3, Math.sin(a) * l * 0.45);
    b.rotation.set(Math.sin(a) * t * 1.6, 0, -Math.cos(a) * t * 1.6);
  }
  const TC = ['#7cc443', '#5fae36', '#9bd655', '#4a9a2e', '#b4e06a'];
  makeFoliage(
    g,
    [
      [0, 2.05, 0, 0.62],
      [0.62, 1.85, 0.12, 0.5],
      [-0.6, 1.9, -0.12, 0.52],
      [0.12, 1.8, 0.6, 0.48],
      [-0.12, 1.78, -0.62, 0.48],
      [0.25, 2.45, -0.12, 0.45],
      [-0.35, 2.32, 0.3, 0.42],
      [0.95, 1.7, -0.35, 0.36],
      [-0.95, 1.75, 0.35, 0.36],
      [0.45, 2.2, 0.55, 0.38],
      [-0.5, 2.25, -0.5, 0.38],
      [0.75, 2.2, -0.6, 0.33],
      [-0.75, 1.6, -0.7, 0.32],
      [0.0, 2.7, 0.1, 0.32],
      [1.25, 1.85, 0.3, 0.3],
      [-1.2, 1.95, -0.25, 0.3],
      [0.3, 1.95, -1.0, 0.32],
      [-0.3, 1.9, 1.0, 0.32],
    ].map(([x, y, z, r]) => [x * 1.15, y, z * 1.15, r]),
    seed,
    1900,
    TC,
    0.27,
    0.72,
  );
  return g;
}
// ---------------- plants ----------------
export function makePot(type = 0, seed = 1, scale = 1) {
  const g = new THREE.Group(),
    rnd = rng(seed);
  cyl(0.15, 0.11, 0.24, MAT.terracotta, 0, 0.12, 0, g, 14);
  const rim = mesh(new THREE.TorusGeometry(0.15, 0.022, 6, 18), MAT.terracotta, 0, 0.24, 0, g);
  rim.rotation.x = Math.PI / 2;
  cyl(0.135, 0.135, 0.02, MAT.soil, 0, 0.225, 0, g, 12);
  const lm = M(['#5fae3a', '#4a9a32', '#78c24a'][type % 3], 0.8);
  if (type === 0) {
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * 6.28 + rnd(),
        l = sph(0.06, lm, 0, 0, 0, g, 8, 6);
      l.scale.set(0.7, 2.6 + rnd(), 0.35);
      l.position.set(Math.cos(a) * 0.07, 0.38, Math.sin(a) * 0.07);
      l.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5);
    }
  } else if (type === 1) {
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * 6.28,
        s = cyl(0.008, 0.01, 0.3, lm, Math.cos(a) * 0.05, 0.38, Math.sin(a) * 0.05, g, 4);
      s.rotation.set(Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25);
      const f = sph(0.045, M(['#ffd23f', '#ff8a5c', '#ffffff'][i % 3], 0.6), Math.cos(a) * 0.09, 0.55, Math.sin(a) * 0.09, g, 8, 6);
      f.scale.y = 0.5;
    }
    for (let i = 0; i < 5; i++) {
      const l = sph(0.06, lm, 0, 0, 0, g, 8, 6);
      const a = i * 1.3;
      l.scale.set(1.2, 0.3, 0.6);
      l.position.set(Math.cos(a) * 0.09, 0.28, Math.sin(a) * 0.09);
    }
  } else {
    makeFoliage(
      g,
      [
        [0, 0.4, 0, 0.16],
        [0.07, 0.5, 0.03, 0.12],
      ],
      seed,
      24,
    );
  }
  g.scale.setScalar(scale);
  return g;
}
// ---------------- props ----------------
export function makeCrate(s = 0.6) {
  const g = new THREE.Group();
  box(s, s, s, MAT.plank, 0, s / 2, 0, g);
  const e = s * 0.08;
  for (const x of [-1, 1]) for (const z of [-1, 1]) box(e, s + 0.01, e, MAT.darkWood, x * (s / 2 - e / 2), s / 2, z * (s / 2 - e / 2), g);
  box(s + 0.01, e, s + 0.01, MAT.darkWood, 0, s - e / 2, 0, g);
  box(s + 0.01, e, s + 0.01, MAT.darkWood, 0, e / 2, 0, g);
  return g;
}
export function makeBarrel(mat = MAT.darkWood, h = 0.8, r = 0.3) {
  const g = new THREE.Group();
  const pts = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    pts.push(new THREE.Vector2(r * (0.86 + 0.14 * Math.sin(t * Math.PI)), t * h));
  }
  mesh(new THREE.LatheGeometry(pts, 18), mat, 0, 0, 0, g);
  cyl(r * 0.86, r * 0.86, 0.02, mat, 0, h, 0, g, 18);
  for (const y of [0.15, 0.85]) {
    const t = mesh(new THREE.TorusGeometry(r * (0.86 + 0.14 * Math.sin(y * Math.PI)) + 0.005, 0.015, 5, 24), MAT.metal, 0, y * h, 0, g);
    t.rotation.x = Math.PI / 2;
  }
  return g;
}
export function makeLifeRing() {
  const g = new THREE.Group();
  const t = new THREE.TorusGeometry(0.26, 0.075, 10, 28);
  const m = mesh(t, MAT.white, 0, 0, 0, g);
  for (let i = 0; i < 4; i++) {
    const s = mesh(new THREE.TorusGeometry(0.26, 0.078, 10, 6, Math.PI / 4), MAT.red, 0, 0, 0, g);
    s.rotation.z = (i * Math.PI) / 2;
  }
  return g;
}
export function makeLantern() {
  const g = new THREE.Group();
  box(0.16, 0.03, 0.16, MAT.darkWood, 0, 0.24, 0, g);
  box(0.16, 0.03, 0.16, MAT.darkWood, 0, 0, 0, g);
  const gl = box(0.12, 0.21, 0.12, MAT.lamp, 0, 0.12, 0, g);
  gl.castShadow = false;
  for (const x of [-1, 1]) for (const z of [-1, 1]) box(0.02, 0.24, 0.02, MAT.darkWood, x * 0.07, 0.12, z * 0.07, g);
  const r = mesh(new THREE.TorusGeometry(0.04, 0.008, 4, 10), MAT.metal, 0, 0.29, 0, g);
  return g;
}
export function rope(a, b, sag = 0.3, r = 0.012) {
  const pts = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    const p = a.clone().lerp(b, t);
    p.y -= Math.sin(t * Math.PI) * sag;
    pts.push(p);
  }
  return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, r, 5, false), MAT.rope);
}
// ---------------- house ----------------
export const DECK = 0.42,
  BAL = 2.6;
export function makeHouse() {
  const g = new THREE.Group();
  const H = g;
  // stilts
  for (const x of [-1.15, 1.15])
    for (const z of [-1.2, 1.15]) {
      cyl(0.09, 0.11, BAL - DECK, MAT.stilt, x, DECK + (BAL - DECK) / 2, z, H, 8);
    }
  const brace = (x1, z1, x2, z2) => {
    const len = Math.hypot(x2 - x1, z2 - z1),
      h = BAL - DECK - 0.3;
    const l = Math.hypot(len, h);
    for (const s of [-1, 1]) {
      const b = box(0.07, l, 0.07, MAT.stilt, (x1 + x2) / 2, DECK + 0.15 + h / 2, (z1 + z2) / 2, H);
      const ang = Math.atan2(len, h) * s;
      if (Math.abs(x2 - x1) > 0.01) {
        b.rotation.z = ang;
      } else {
        b.rotation.x = ang;
      }
    }
  };
  brace(-1.15, -1.2, 1.15, -1.2);
  brace(-1.15, -1.2, -1.15, 1.15);
  brace(1.15, -1.2, 1.15, 1.15);
  // balcony
  for (let i = 0; i < 7; i++) {
    const b = box(0.42, 0.07, 3.0, MAT.plank, -1.5 + 0.21 + i * 0.43, BAL, 0, H);
    b.material = MAT.plank;
    b.position.y += (i % 2) * 0.005;
  }
  box(3.1, 0.14, 0.14, MAT.darkWood, 0, BAL - 0.09, 1.45, H);
  box(3.1, 0.14, 0.14, MAT.darkWood, 0, BAL - 0.09, -1.45, H);
  box(0.14, 0.14, 3.0, MAT.darkWood, -1.5, BAL - 0.09, 0, H);
  box(0.14, 0.14, 3.0, MAT.darkWood, 1.5, BAL - 0.09, 0, H);
  // railing (sides)
  for (const x of [-1.45, 1.45]) {
    for (const z of [-0.2, 0.6, 1.4]) box(0.05, 0.55, 0.05, MAT.darkWood, x, BAL + 0.3, z, H);
    box(0.05, 0.05, 1.7, MAT.darkWood, x, BAL + 0.58, 0.6, H);
  }
  for (const x of [-1.45, -0.75]) box(0.05, 0.55, 0.05, MAT.darkWood, x, BAL + 0.3, 1.4, H);
  box(0.75, 0.05, 0.05, MAT.darkWood, -1.1, BAL + 0.58, 1.4, H);
  // cabin
  const cw = 2.2,
    ch = 1.95,
    cz0 = -1.35,
    cz1 = 0.35,
    cd = cz1 - cz0,
    cy = BAL + 0.035;
  const wall = box(cw, ch, cd, MAT.wall, 0, cy + ch / 2, (cz0 + cz1) / 2, H);
  // uv repeat scale for walls
  const uv = wall.geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * 1.6);
  for (const x of [-1, 1]) for (const z of [cz0, cz1]) box(0.08, ch, 0.08, MAT.trim, (x * cw) / 2, cy + ch / 2, z, H);
  // window
  const wx = 0.42,
    wy = cy + 1.1;
  box(0.62, 0.62, 0.04, MAT.glass, wx, wy, cz1 + 0.01, H);
  box(0.72, 0.07, 0.07, MAT.frame, wx, wy + 0.33, cz1 + 0.03, H);
  box(0.72, 0.07, 0.07, MAT.frame, wx, wy - 0.33, cz1 + 0.03, H);
  box(0.07, 0.7, 0.07, MAT.frame, wx - 0.33, wy, cz1 + 0.03, H);
  box(0.07, 0.7, 0.07, MAT.frame, wx + 0.33, wy, cz1 + 0.03, H);
  box(0.04, 0.62, 0.05, MAT.frame, wx, wy, cz1 + 0.03, H);
  box(0.62, 0.04, 0.05, MAT.frame, wx, wy, cz1 + 0.03, H);
  box(0.8, 0.06, 0.16, MAT.frame, wx, wy - 0.38, cz1 + 0.07, H);
  // side window
  box(0.04, 0.5, 0.5, MAT.glass, cw / 2 + 0.01, wy, -0.5, H);
  box(0.06, 0.06, 0.6, MAT.frame, cw / 2 + 0.03, wy + 0.28, -0.5, H);
  box(0.06, 0.06, 0.6, MAT.frame, cw / 2 + 0.03, wy - 0.28, -0.5, H);
  // door
  box(0.62, 1.45, 0.05, MAT.trim, -0.55, cy + 0.73, cz1 + 0.02, H);
  box(0.7, 0.06, 0.07, MAT.frame, -0.55, cy + 1.48, cz1 + 0.03, H);
  sph(0.03, MAT.metal, -0.32, cy + 0.75, cz1 + 0.06, H, 8, 6);
  // roof
  const ry = cy + ch;
  box(2.7, 0.14, 2.25, MAT.roof, 0, ry + 0.07, (cz0 + cz1) / 2, H);
  box(2.74, 0.08, 0.08, MAT.darkWood, 0, ry + 0.18, (cz0 + cz1) / 2 + 1.12, H);
  // roof garden
  const soil = box(1.1, 0.18, 0.8, MAT.soil, -0.45, ry + 0.23, -0.6, H);
  box(1.18, 0.22, 0.06, MAT.darkWood, -0.45, ry + 0.25, -0.2, H);
  box(1.18, 0.22, 0.06, MAT.darkWood, -0.45, ry + 0.25, -1.0, H);
  const tree = makeTree(7);
  tree.position.set(-0.35, ry + 0.3, -0.6);
  tree.scale.setScalar(1.45);
  H.add(tree);
  [
    [0.6, 0.2, 0, 1.0],
    [0.95, -0.9, 1, 0.9],
    [-1.05, 0.15, 2, 1.1],
    [0.25, -0.85, 0, 0.8],
  ].forEach(([x, z, t, s], i) => {
    const p = makePot(t, i + 20, s);
    p.position.set(x, ry + 0.14, z);
    H.add(p);
  });
  const cr = makeCrate(0.35);
  cr.position.set(0.6, ry + 0.14, -0.5);
  H.add(cr);
  // balcony props
  [
    [-1.25, 1.2, 1, 1],
    [1.25, -1.2, 0, 1.1],
    [-1.25, -1.2, 2, 1],
  ].forEach(([x, z, t, s], i) => {
    const p = makePot(t, i + 40, s);
    p.position.set(x, BAL + 0.04, z);
    H.add(p);
  });
  const bench = new THREE.Group();
  box(0.9, 0.06, 0.3, MAT.darkWood, 0, 0.42, 0, bench);
  for (const x of [-0.38, 0.38]) box(0.06, 0.42, 0.26, MAT.darkWood, x, 0.21, 0, bench);
  bench.position.set(1.05, BAL + 0.03, 0.85);
  bench.rotation.y = -Math.PI / 2;
  H.add(bench);
  const ring = makeLifeRing();
  ring.position.set(-1.12, cy + 1.2, -0.4);
  ring.rotation.y = Math.PI / 2;
  H.add(ring);
  const lampW = makeLantern();
  lampW.position.set(-0.98, cy + 1.62, cz1 + 0.12);
  H.add(lampW);
  // ladder
  const lx = 0.62,
    lz = 1.52;
  for (const x of [-0.2, 0.2]) {
    const r = box(0.06, BAL - DECK + 0.6, 0.06, MAT.darkWood, lx + x, DECK + (BAL - DECK + 0.6) / 2, lz, H);
  }
  for (let y = DECK + 0.3; y < BAL + 0.2; y += 0.32) box(0.42, 0.04, 0.05, MAT.darkWood, lx, y, lz, H);
  // pole + lantern
  const px = 1.35,
    pz = -1.35;
  cyl(0.05, 0.07, 5.6, MAT.stilt, px, DECK + 2.8, pz, H, 8);
  const arm = box(0.7, 0.05, 0.05, MAT.stilt, px - 0.3, DECK + 5.4, pz, H);
  const lamp = makeLantern();
  lamp.position.set(px - 0.6, DECK + 4.85, pz);
  H.add(lamp);
  H.add(rope(new THREE.Vector3(px - 0.6, DECK + 5.4, pz), new THREE.Vector3(px - 0.6, DECK + 5.15, pz), 0, 0.008));
  H.add(rope(new THREE.Vector3(px, DECK + 5.5, pz), new THREE.Vector3(1.2, DECK + 0.05, 1.2), 0.15));
  H.add(rope(new THREE.Vector3(px, DECK + 5.0, pz), new THREE.Vector3(-0.9, ry + 0.1, 0.2), 0.5, 0.006));
  // flags/bunting lights
  for (let i = 1; i < 8; i++) {
    const t = i / 8;
    const a = new THREE.Vector3(px, DECK + 5.0, pz).lerp(new THREE.Vector3(-0.9, ry + 0.1, 0.2), t);
    a.y -= Math.sin(t * Math.PI) * 0.5;
    const b = sph(0.035, MAT.lamp, a.x, a.y - 0.04, a.z, H, 6, 5);
    b.castShadow = false;
  }
  // under-house clutter
  const br = makeBarrel(MAT.darkWood, 0.75, 0.28);
  br.position.set(-0.6, DECK, -0.55);
  H.add(br);
  const br2 = makeBarrel(MAT.drum, 0.8, 0.27);
  br2.position.set(0.1, DECK, -0.75);
  H.add(br2);
  const c1 = makeCrate(0.55);
  c1.position.set(0.7, DECK, -0.2);
  c1.rotation.y = 0.3;
  H.add(c1);
  const c2 = makeCrate(0.4);
  c2.position.set(0.7, DECK + 0.55, -0.2);
  c2.rotation.y = -0.2;
  H.add(c2);
  [
    [-0.95, 0.95, 0],
    [0.95, 0.95, 1],
    [-0.2, 0.85, 2],
  ].forEach(([x, z, t], i) => {
    const p = makePot(t, 60 + i, 1.1);
    p.position.set(x, DECK, z);
    H.add(p);
  });
  // decorative fishing rod leaning
  const rod = cyl(0.012, 0.02, 2.6, MAT.darkWood, -1.0, DECK + 1.25, 0.2, H, 5);
  rod.rotation.z = 0.35;
  decorate(H, { ry, cy, ch, cz0, cz1, cw, px, pz, wy });
  return { group: g, lanterns: [lamp, lampW], ladder: { x: lx, z: lz + 0.45, topZ: lz - 0.35 } };
}
// ---------------- set dressing (reference-level detail) ----------------
const _m = {};
const DM = (c, r = 0.8, o) => _m[c + r] || (_m[c + r] = M(c, r, o));
function bucket(g, x, y, z, col = '#5f8fa3') {
  const b = cyl(0.1, 0.08, 0.18, DM(col, 0.5, { metalness: 0.4 }), x, y + 0.09, z, g, 12);
  const h = mesh(new THREE.TorusGeometry(0.1, 0.006, 4, 16, Math.PI), MAT.metal, x, y + 0.18, z, g);
  return b;
}
function bulbs(g, a, b, sag, n) {
  g.add(rope(a, b, sag, 0.006));
  for (let i = 1; i < n; i++) {
    const t = i / n,
      p = a.clone().lerp(b, t);
    p.y -= Math.sin(t * Math.PI) * sag;
    const s = sph(0.028, MAT.lamp, p.x, p.y - 0.05, p.z, g, 6, 5);
    s.castShadow = false;
    cyl(0.008, 0.008, 0.04, MAT.darkWood, p.x, p.y - 0.015, p.z, g, 4);
  }
}
function bunting(g, a, b, sag, n) {
  g.add(rope(a, b, sag, 0.005));
  const cols = ['#e5533d', '#f29a38', '#f4cf4a', '#3d8fc4', '#4fb38a'];
  const tri = new THREE.BufferGeometry();
  tri.setAttribute('position', new THREE.Float32BufferAttribute([-0.055, 0, 0, 0.055, 0, 0, 0, -0.13, 0], 3));
  tri.computeVertexNormals();
  for (let i = 1; i < n; i++) {
    const t = i / n,
      p = a.clone().lerp(b, t);
    p.y -= Math.sin(t * Math.PI) * sag;
    const m = new THREE.Mesh(tri, DM(cols[i % 5], 0.8, { side: THREE.DoubleSide }));
    m.position.copy(p);
    m.lookAt(p.x, p.y, p.z + 1);
    m.rotation.z = Math.sin(i * 1.7) * 0.08;
    g.add(m);
  }
}
function coil(g, x, y, z) {
  for (let i = 0; i < 4; i++) {
    const t = mesh(new THREE.TorusGeometry(0.2 - i * 0.012, 0.022, 6, 22), MAT.rope, x, y + 0.022 + i * 0.04, z, g);
    t.rotation.x = Math.PI / 2;
  }
}
function bike(g, x, y, z, ry) {
  const b = new THREE.Group();
  const fm = DM('#d9b23a', 0.4, { metalness: 0.5 });
  for (const s of [-0.36, 0.36]) {
    const w = mesh(new THREE.TorusGeometry(0.23, 0.018, 6, 24), DM('#1c1c1c', 0.7), s, 0.25, 0, b);
    for (let k = 0; k < 4; k++) {
      const sp = cyl(0.003, 0.003, 0.44, MAT.metal, s, 0.25, 0, b, 3);
      sp.rotation.x = k * 0.785;
    }
  }
  const bar = (x1, y1, x2, y2) => {
    const l = Math.hypot(x2 - x1, y2 - y1),
      c = cyl(0.014, 0.014, l, fm, (x1 + x2) / 2, (y1 + y2) / 2, 0, b, 5);
    c.rotation.z = Math.atan2(x1 - x2, y2 - y1);
  };
  bar(-0.36, 0.25, 0, 0.27);
  bar(0, 0.27, 0.3, 0.55);
  bar(-0.36, 0.25, -0.05, 0.55);
  bar(-0.05, 0.55, 0.3, 0.55);
  bar(0.3, 0.55, 0.36, 0.25);
  bar(0, 0.27, -0.05, 0.55);
  box(0.16, 0.03, 0.06, DM('#3a2a1e', 0.7), -0.07, 0.6, 0, b);
  const hb = cyl(0.012, 0.012, 0.36, fm, 0.32, 0.66, 0, b, 5);
  hb.rotation.x = Math.PI / 2;
  box(0.18, 0.12, 0.16, DM('#9c7a4a', 0.8), 0.42, 0.62, 0, b);
  b.position.set(x, y, z);
  b.rotation.y = ry;
  b.traverse((m) => {
    if (m.isMesh) m.castShadow = true;
  });
  g.add(b);
}
function gridWindow(g, x, y, z, w, h, face, cols = 4, rows = 3) {
  const o = new THREE.Group();
  box(w, h, 0.03, DM('#1f4f86', 0.12, { metalness: 0.3, emissive: new THREE.Color('#ffb860'), emissiveIntensity: 0 }), 0, 0, 0, o);
  for (let i = 0; i <= cols; i++) box(0.03, h, 0.05, MAT.frame, -w / 2 + (i * w) / cols, 0, 0.01, o);
  for (let j = 0; j <= rows; j++) box(w, 0.03, 0.05, MAT.frame, 0, -h / 2 + (j * h) / rows, 0.01, o);
  box(w + 0.12, 0.05, 0.14, MAT.frame, 0, -h / 2 - 0.04, 0.05, o);
  o.position.set(x, y, z);
  o.rotation.y = face;
  g.add(o);
  return o;
}
function decorate(H, { ry, cy, ch, cz0, cz1, cw, px, pz, wy }) {
  const R = rng(77),
    zc = (cz0 + cz1) / 2;
  // roof deck: plank surface + low rail
  for (let i = 0; i < 6; i++) box(0.44, 0.03, 2.2, MAT.plank, -1.1 + i * 0.44, ry + 0.155, zc, H);
  for (const [x, z] of [
    [-1.3, cz0 - 0.22],
    [1.3, cz0 - 0.22],
    [-1.3, cz1 + 0.22],
    [1.3, cz1 + 0.22],
    [1.3, zc],
    [-1.3, zc],
  ])
    box(0.05, 0.3, 0.05, MAT.darkWood, x, ry + 0.3, z, H);
  box(0.05, 0.04, 2.25, MAT.darkWood, 1.3, ry + 0.45, zc, H);
  box(0.05, 0.04, 2.25, MAT.darkWood, -1.3, ry + 0.45, zc, H);
  box(2.64, 0.04, 0.05, MAT.darkWood, 0, ry + 0.45, cz0 - 0.22, H);
  // roof clutter
  [
    [1.05, 0.4, 1, 0.8],
    [0.25, 0.42, 2, 0.7],
    [-1.1, -1.5, 0, 0.75],
    [1.1, -1.5, 2, 0.9],
    [-0.95, 0.42, 1, 0.65],
    [0.55, -1.45, 0, 0.6],
  ].forEach(([x, z, t, s], i) => {
    const p = makePot(t, 90 + i, s);
    p.position.set(x, ry + 0.17, z);
    H.add(p);
  });
  bucket(H, -0.15, ry + 0.17, 0.4);
  const sol = new THREE.Group();
  box(0.6, 0.02, 0.42, DM('#24406a', 0.2, { metalness: 0.5 }), 0, 0, 0, sol);
  for (let i = 1; i < 4; i++) box(0.005, 0.025, 0.42, MAT.frame, -0.3 + i * 0.15, 0, 0, sol);
  box(0.6, 0.025, 0.005, MAT.frame, 0, 0, 0, sol);
  sol.position.set(0.85, ry + 0.38, -0.95);
  sol.rotation.x = -0.6;
  H.add(sol);
  cyl(0.012, 0.012, 0.25, MAT.metal, 0.85, ry + 0.27, -0.8, H, 4);
  const pl = box(0.5, 0.22, 0.22, MAT.darkWood, 0.6, ry + 0.28, 0.32, H);
  makeFoliage(
    H,
    [
      [0.47, ry + 0.47, 0.32, 0.11],
      [0.72, ry + 0.47, 0.32, 0.11],
    ],
    31,
    40,
  );
  // trailing vines over the roof edge
  const vm = DM('#4f9a34', 0.85);
  for (let i = 0; i < 9; i++) {
    const x = -1.25 + i * 0.31 + R() * 0.08,
      l = 0.25 + R() * 0.55;
    const v = cyl(0.008, 0.006, l, vm, x, ry - l / 2 + 0.1, cz1 + 0.3, H, 3);
    for (let k = 0; k < 4; k++) {
      const lf = sph(0.035, vm, x + (R() - 0.5) * 0.05, ry + 0.05 - (k * l) / 4, cz1 + 0.31, H, 5, 4);
      lf.scale.set(1, 0.6, 0.4);
    }
  }
  // string lights + bunting under roof edge
  bulbs(H, new THREE.Vector3(-1.32, ry - 0.02, cz1 + 0.3), new THREE.Vector3(1.32, ry - 0.02, cz1 + 0.3), 0.18, 10);
  bunting(H, new THREE.Vector3(-0.1, ry - 0.12, cz1 + 0.06), new THREE.Vector3(1.05, ry - 0.12, cz1 + 0.06), 0.1, 8);
  bulbs(H, new THREE.Vector3(1.48, BAL + 0.6, 1.45), new THREE.Vector3(1.48, BAL + 0.6, -1.45), 0.12, 8);
  // cabin details
  gridWindow(H, -cw / 2 - 0.02, wy, -0.5, 0.8, 0.55, -Math.PI / 2);
  box(0.24, 0.24, 0.02, MAT.glass, -0.55, cy + 1.15, cz1 + 0.05, H);
  for (let i = 0; i < 3; i++) box(0.012, 1.3, 0.012, DM('#16566e', 0.8), -0.7 + i * 0.15, cy + 0.68, cz1 + 0.05, H);
  box(0.24, 0.12, 0.02, DM('#7c8a90', 0.5, { metalness: 0.4 }), wx2(), cy + 0.62, cz1 + 0.03, H);
  for (let i = 0; i < 6; i++) box(0.012, ch, 0.012, DM('#1b5f7a', 0.85), -1.02 + i * 0.4 + 0.2, cy + ch / 2, cz1 + 0.012, H);
  const broom = cyl(0.012, 0.012, 1.2, DM('#b98a4e', 0.8), -0.98, BAL + 0.62, cz1 + 0.22, H, 5);
  broom.rotation.z = -0.22;
  const bh = mesh(new THREE.ConeGeometry(0.08, 0.2, 8), DM('#d9b65a', 0.95), -0.85, BAL + 0.08, cz1 + 0.22, H);
  box(0.5, 0.015, 0.32, DM('#a3713f', 0.95), -0.55, BAL + 0.045, cz1 + 0.25, H);
  const clock = cyl(0.06, 0.06, 0.02, MAT.white, -0.93, cy + 0.9, cz1 + 0.05, H, 14);
  clock.rotation.x = Math.PI / 2;
  // balcony life
  [
    [-1.3, 0.25, 1, 0.85],
    [1.3, 0.3, 2, 0.75],
    [0.05, 1.3, 0, 0.7],
    [-1.32, -0.6, 2, 0.8],
    [1.3, 1.35, 1, 0.7],
  ].forEach(([x, z, t, s], i) => {
    const p = makePot(t, 150 + i, s);
    p.position.set(x, BAL + 0.04, z);
    H.add(p);
  });
  const bp = makeBarrel(MAT.darkWood, 0.55, 0.22);
  bp.position.set(-1.25, BAL + 0.04, -1.2);
  H.add(bp);
  // flag on pole
  const fl = new THREE.Group();
  box(0.36, 0.26, 0.01, DM('#d9472f', 0.85, { side: THREE.DoubleSide }), 0.19, 0, 0, fl);
  const sun = cyl(0.06, 0.06, 0.012, DM('#f6c443', 0.7), 0.19, 0, 0, fl, 12);
  sun.rotation.x = Math.PI / 2;
  fl.position.set(px, DECK + 4.4, pz);
  fl.rotation.y = -0.6;
  H.add(fl);
  // deck clutter around the stilts
  coil(H, -1.35, DECK, 1.3);
  bike(H, -0.35, DECK, 1.25, 0.15);
  bucket(H, 1.35, DECK, 0.9, '#c9cfd2');
  bucket(H, -1.0, DECK, -1.45, '#4f7f93');
  const bb = makeBarrel(MAT.drum, 0.6, 0.24);
  bb.position.set(1.4, DECK, -0.6);
  H.add(bb);
  const wb = makeBarrel(MAT.darkWood, 0.45, 0.25);
  wb.position.set(-1.45, DECK, 0.3);
  H.add(wb);
  makeFoliage(H, [[-1.45, DECK + 0.62, 0.3, 0.2]], 41, 60);
  [
    [1.45, 1.45, 2, 0.9],
    [-1.5, -0.8, 1, 1],
    [0.35, 1.6, 0, 0.8],
    [-0.9, 1.6, 1, 0.75],
    [1.5, 0.2, 0, 0.85],
  ].forEach(([x, z, t, s], i) => {
    const p = makePot(t, 170 + i, s);
    p.position.set(x, DECK, z);
    H.add(p);
  });
  const c3 = makeCrate(0.32);
  c3.position.set(1.0, DECK, -1.45);
  c3.rotation.y = 0.5;
  H.add(c3);
  const jug = cyl(0.07, 0.08, 0.22, DM('#dfe9ec', 0.3, { transparent: true, opacity: 0.8 }), 0.3, DECK + 0.4, 0.75, H, 10);
  H.add(rope(new THREE.Vector3(-0.2, DECK + 0.9, 0.55), new THREE.Vector3(1.0, DECK + 0.9, 0.55), 0.12, 0.004));
  for (let i = 0; i < 4; i++) {
    const c = box(
      0.12,
      0.16,
      0.005,
      DM(['#f4f1ea', '#9cc7de', '#e8c46a', '#f4f1ea'][i], 0.9, { side: THREE.DoubleSide }),
      0.0 + i * 0.28,
      DECK + 0.72 - Math.sin(((i + 1) / 5) * Math.PI) * 0.1,
      0.55,
      H,
    );
    c.castShadow = true;
  }
}
function wx2() {
  return 0.42;
}
// ---------------- stations ----------------
export const BP = {
  foundation: { name: 'Foundation', desc: 'Expand your raft by one tile.', cost: { wood: 6, plastic: 2 }, icon: 'tile' },
  grill: { name: 'Grill', desc: 'Cook raw fish into hearty meals.', cost: { wood: 6, scrap: 2 }, icon: 'fire', r: 0.5 },
  purifier: {
    name: 'Water Purifier',
    desc: 'Boils seawater into drinkable water.',
    cost: { wood: 5, plastic: 4, scrap: 1 },
    icon: 'drop',
    r: 0.45,
  },
  planter: { name: 'Planter', desc: 'Grow potatoes and melons.', cost: { wood: 6, fiber: 3 }, icon: 'plant', r: 0.75 },
  rain: { name: 'Rain Catcher', desc: 'Collects fresh water when it rains.', cost: { wood: 4, plastic: 6 }, icon: 'rain', r: 0.45 },
  trap: { name: 'Fish Trap', desc: 'Passively catches fish over time.', cost: { wood: 4, fiber: 6, scrap: 1 }, icon: 'fish', edge: true },
  net: {
    name: 'Debris Net',
    desc: 'Catches drifting debris automatically.',
    cost: { wood: 5, fiber: 8, scrap: 2 },
    icon: 'net',
    edge: true,
  },
  still: {
    name: 'Solar Still',
    desc: 'Slowly produces fresh water from sunlight.',
    cost: { wood: 4, plastic: 8, scrap: 3 },
    icon: 'sun',
    r: 0.45,
    unlock: 'still',
  },
  smoker: {
    name: 'Smokehouse',
    desc: 'Slowly smokes raw fish into valuable smoked fish.',
    cost: { wood: 8, scrap: 3, fiber: 2 },
    icon: 'smoked',
    r: 0.5,
  },
  pearl: {
    name: 'Pearl Bed',
    desc: 'Oyster cages that grow pearls over time.',
    cost: { wood: 4, fiber: 6, plastic: 4 },
    icon: 'pearl',
    edge: true,
  },
  winch: {
    name: 'Auto Winch',
    desc: 'Automatically reels in drifting debris.',
    cost: { wood: 6, scrap: 4, fiber: 4 },
    icon: 'hook',
    edge: true,
  },
  sprinkler: {
    name: 'Sprinkler',
    desc: 'Waters planters on neighbouring tiles automatically.',
    cost: { plastic: 6, scrap: 2, wood: 2 },
    icon: 'drop',
    r: 0.3,
  },
  buoy: {
    name: 'Trade Buoy',
    desc: 'Auto-sells spare goods for coins, even offline.',
    cost: { wood: 4, plastic: 6, scrap: 2 },
    icon: 'coin',
    edge: true,
  },
  lamp: { name: 'Lantern Post', desc: 'Warm light for long nights.', cost: { wood: 3, scrap: 1 }, icon: 'lamp', r: 0.2 },
};
export function makeStation(type) {
  const g = new THREE.Group(),
    P = {};
  if (type === 'grill') {
    for (const [x, z] of [
      [-0.25, -0.18],
      [0.25, -0.18],
      [-0.25, 0.18],
      [0.25, 0.18],
    ]) {
      const l = cyl(0.02, 0.02, 0.5, MAT.metal, x, 0.25, z, g, 5);
    }
    const b = mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.7, 16, 1, true, 0, Math.PI), M('#3d3f42', 0.6), 0, 0.62, 0, g);
    b.rotation.set(0, 0, Math.PI / 2);
    b.scale.set(1, 1, 0.75);
    b.material.side = THREE.DoubleSide;
    P.coals = box(
      0.6,
      0.05,
      0.4,
      new THREE.MeshStandardMaterial({ color: '#331a10', emissive: new THREE.Color('#ff5a1a'), emissiveIntensity: 0 }),
      0,
      0.48,
      0,
      g,
    );
    const grate = box(0.66, 0.02, 0.46, M('#555', 0.5), 0, 0.62, 0, g);
    P.food = new THREE.Group();
    g.add(P.food);
    for (const x of [-0.14, 0.14]) {
      const f = sph(0.07, M('#8fb3c4', 0.5), x, 0.67, 0, P.food, 10, 8);
      f.scale.set(2.2, 0.6, 0.9);
    }
    P.food.visible = false;
  } else if (type === 'purifier') {
    box(0.6, 0.4, 0.5, M('#6f6a66', 0.8), 0, 0.2, 0, g);
    P.fire = box(
      0.3,
      0.15,
      0.02,
      new THREE.MeshStandardMaterial({ color: '#221', emissive: new THREE.Color('#ff6a20'), emissiveIntensity: 0 }),
      0,
      0.16,
      0.26,
      g,
    );
    cyl(0.2, 0.18, 0.3, MAT.metal, -0.08, 0.55, 0, g, 16);
    const lid = cyl(0.21, 0.21, 0.03, MAT.metal, -0.08, 0.71, 0, g, 16);
    const tube = cyl(0.015, 0.015, 0.5, MAT.metal, 0.12, 0.8, 0, g, 5);
    tube.rotation.z = -1.1;
    P.jug = cyl(
      0.09,
      0.1,
      0.25,
      new THREE.MeshStandardMaterial({ color: '#bfe6f5', roughness: 0.1, transparent: true, opacity: 0.6 }),
      0.38,
      0.52,
      0,
      g,
      12,
    );
    P.water = cyl(0.08, 0.09, 0.01, M('#4fc3f7', 0.2), 0.38, 0.4, 0, g, 12);
  } else if (type === 'planter') {
    box(1.3, 0.32, 0.8, MAT.plank, 0, 0.16, 0, g);
    box(1.2, 0.04, 0.7, MAT.soil, 0, 0.32, 0, g);
    for (const x of [-0.66, 0.66]) box(0.06, 0.36, 0.84, MAT.darkWood, x, 0.18, 0, g);
    P.crops = new THREE.Group();
    P.crops.position.y = 0.32;
    g.add(P.crops);
  } else if (type === 'rain') {
    const br = makeBarrel(MAT.blue, 0.7, 0.27);
    g.add(br);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * 6.28 + 0.78;
      const p = cyl(0.02, 0.02, 1.3, MAT.darkWood, Math.cos(a) * 0.42, 0.65, Math.sin(a) * 0.42, g, 5);
    }
    const funnel = mesh(
      new THREE.ConeGeometry(0.62, 0.4, 4, 1, true),
      new THREE.MeshStandardMaterial({ color: '#e8e2d0', side: THREE.DoubleSide, roughness: 0.7 }),
      0,
      1.15,
      0,
      g,
    );
    funnel.rotation.set(Math.PI, Math.PI / 4, 0);
    P.water = cyl(0.24, 0.24, 0.02, M('#4fc3f7', 0.2), 0, 0.4, 0, g, 14);
  } else if (type === 'still') {
    box(0.8, 0.2, 0.8, MAT.darkWood, 0, 0.1, 0, g);
    const gl = mesh(
      new THREE.ConeGeometry(0.52, 0.45, 4),
      new THREE.MeshStandardMaterial({ color: '#d8f3ff', roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.45 }),
      0,
      0.43,
      0,
      g,
    );
    gl.rotation.y = Math.PI / 4;
    P.water = cyl(0.3, 0.3, 0.02, M('#4fc3f7', 0.2), 0, 0.21, 0, g, 4);
  } else if (type === 'trap') {
    const c = new THREE.Group();
    g.add(c);
    c.position.set(0, -0.5, 1.55);
    const cage = mesh(
      new THREE.BoxGeometry(0.8, 0.6, 0.6),
      new THREE.MeshStandardMaterial({ map: TEX.net, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, color: '#cdbf95' }),
      0,
      -0.15,
      0,
      c,
    );
    for (const x of [-0.4, 0.4]) for (const z of [-0.3, 0.3]) box(0.04, 0.64, 0.04, MAT.darkWood, x, -0.15, z, c);
    const arm = box(0.06, 0.06, 1.0, MAT.darkWood, 0, 0.35, 1.05, g);
    const post = box(0.06, 0.5, 0.06, MAT.darkWood, 0, 0.25, 0.6, g);
    g.add(rope(new THREE.Vector3(0, 0.35, 1.55), new THREE.Vector3(0, -0.2, 1.55), 0, 0.01));
    P.buoy = sph(0.08, MAT.red, 0.3, 0.15, 0.3, c, 10, 8);
    P.cage = c;
    P.fish = new THREE.Group();
    c.add(P.fish);
  } else if (type === 'net') {
    const f = new THREE.Group();
    g.add(f);
    f.position.set(0, -0.38, 1.5);
    for (const x of [-1.1, 1.1]) cyl(0.04, 0.04, 1.1, MAT.darkWood, x, 0.1, 0, f, 6);
    box(2.25, 0.06, 0.06, MAT.darkWood, 0, 0.62, 0, f);
    const n = mesh(
      new THREE.PlaneGeometry(2.2, 0.95),
      new THREE.MeshStandardMaterial({ map: TEX.net, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, color: '#e8dbb0' }),
      0,
      0.15,
      0,
      f,
    );
    n.castShadow = false;
    for (let i = 0; i < 5; i++) {
      const fl = sph(0.06, i % 2 ? MAT.red : MAT.white, -1 + i * 0.5, 0.62, 0.02, f, 8, 6);
    }
    P.loot = new THREE.Group();
    f.add(P.loot);
    for (const x of [-1.1, 1.1]) box(0.06, 0.06, 0.5, MAT.darkWood, x, 0.2, 1.25, g);
  } else if (type === 'smoker') {
    box(0.7, 0.12, 0.6, MAT.darkWood, 0, 0.06, 0, g);
    box(0.62, 0.62, 0.52, MAT.plank, 0, 0.43, 0, g);
    const roof = mesh(new THREE.ConeGeometry(0.52, 0.32, 4), MAT.darkWood, 0, 0.9, 0, g);
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(1, 1, 0.85);
    cyl(0.06, 0.07, 0.4, MAT.metal, 0.16, 1.1, 0, g, 6);
    P.fire = box(
      0.3,
      0.12,
      0.02,
      new THREE.MeshStandardMaterial({ color: '#221', emissive: new THREE.Color('#ff6a20'), emissiveIntensity: 0 }),
      0,
      0.24,
      0.27,
      g,
    );
    P.fish = new THREE.Group();
    g.add(P.fish);
    for (let i = 0; i < 3; i++) {
      const f = sph(0.05, M('#c98a52', 0.6), -0.18 + i * 0.18, 0.62, 0.27, P.fish, 8, 6);
      f.scale.set(0.7, 2, 0.6);
    }
  } else if (type === 'pearl') {
    const f = new THREE.Group();
    g.add(f);
    f.position.set(0, -0.35, 1.5);
    for (const x of [-0.7, 0.7]) {
      const bu = sph(0.13, x < 0 ? MAT.red : MAT.white, x, 0.42, 0, f, 10, 8);
    }
    box(1.5, 0.05, 0.05, MAT.darkWood, 0, 0.42, 0, f);
    for (const x of [-0.45, 0, 0.45]) {
      g.add(rope(new THREE.Vector3(x, 0.07, 1.5), new THREE.Vector3(x, -0.75, 1.5), 0, 0.008));
      const cg = box(
        0.34,
        0.22,
        0.34,
        new THREE.MeshStandardMaterial({ map: TEX.net, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, color: '#bfae80' }),
        x,
        -0.5,
        0,
        f,
      );
      cg.castShadow = false;
    }
    for (const x of [-1, 1]) box(0.06, 0.06, 0.5, MAT.darkWood, x * 0.7, 0.2, 1.25, g);
    P.pearls = new THREE.Group();
    f.add(P.pearls);
  } else if (type === 'winch') {
    box(0.5, 0.1, 0.5, MAT.darkWood, 0, 0.05, 0.5, g);
    for (const x of [-0.2, 0.2]) box(0.06, 0.6, 0.06, MAT.darkWood, x, 0.35, 0.5, g);
    const dr = cyl(0.12, 0.12, 0.36, MAT.drum, 0, 0.5, 0.5, g, 12);
    dr.rotation.z = Math.PI / 2;
    P.drum = dr;
    for (const x of [-0.19, 0.19]) {
      const w = cyl(0.16, 0.16, 0.03, MAT.metal, x, 0.5, 0.5, g, 12);
      w.rotation.z = Math.PI / 2;
    }
    const crank = box(0.03, 0.2, 0.03, MAT.metal, 0.25, 0.44, 0.5, g);
    const arm = box(0.06, 0.06, 1.2, MAT.darkWood, 0, 0.62, 1.05, g);
    g.add(rope(new THREE.Vector3(0, 0.6, 1.62), new THREE.Vector3(0, -0.4, 2.4), 0.2, 0.01));
    const hk = mesh(new THREE.TorusGeometry(0.08, 0.02, 5, 10, Math.PI * 1.4), MAT.metal, 0, -0.45, 2.4, g);
    P.loot = new THREE.Group();
    g.add(P.loot);
    P.loot.position.set(0, 0.12, 0.15);
  } else if (type === 'sprinkler') {
    const br = makeBarrel(MAT.blue, 0.5, 0.2);
    g.add(br);
    cyl(0.015, 0.015, 0.6, MAT.metal, 0, 0.8, 0, g, 5);
    P.head = new THREE.Group();
    P.head.position.y = 1.1;
    g.add(P.head);
    for (const s of [-1, 1]) {
      const a = box(0.3, 0.02, 0.02, MAT.metal, s * 0.15, 0, 0, P.head);
      sph(0.03, MAT.metal, s * 0.3, 0, 0, P.head, 6, 5);
    }
  } else if (type === 'buoy') {
    const f = new THREE.Group();
    g.add(f);
    f.position.set(0, -0.3, 1.7);
    P.bob = f;
    const b = sph(0.32, MAT.red, 0, 0.1, 0, f, 14, 10);
    b.scale.y = 0.7;
    const band = cyl(0.33, 0.33, 0.07, MAT.white, 0, 0.12, 0, f, 14);
    cyl(0.03, 0.03, 0.8, MAT.metal, 0, 0.6, 0, f, 5);
    const flag = box(0.28, 0.18, 0.01, M('#f6c443', 0.7), 0.15, 0.9, 0, f);
    box(0.3, 0.25, 0.25, MAT.plank, 0, 0.42, 0, f);
    g.add(rope(new THREE.Vector3(0, 0.1, 1.25), new THREE.Vector3(0, -0.1, 1.7), 0.1, 0.01));
    box(0.06, 0.4, 0.06, MAT.darkWood, 0, 0.2, 1.2, g);
  } else if (type === 'lamp') {
    cyl(0.04, 0.05, 1.6, MAT.darkWood, 0, 0.8, 0, g, 6);
    box(0.4, 0.04, 0.04, MAT.darkWood, 0.15, 1.55, 0, g);
    const l = makeLantern();
    l.position.set(0.3, 1.22, 0);
    g.add(l);
    P.lamp = l;
  }
  return { group: g, parts: P };
}
// ---------------- crops ----------------
export function makeCrop(kind, stage) {
  // stage 0..1
  const g = new THREE.Group();
  const s = 0.25 + stage * 0.75;
  const lm = M(kind === 'melon' ? '#5da83c' : '#5f9e35', 0.8);
  if (stage < 0.15) {
    for (let i = 0; i < 2; i++) {
      const l = sph(0.04, lm, (i - 0.5) * 0.05, 0.05, 0, g, 6, 4);
      l.scale.set(1.2, 0.4, 0.6);
    }
    return g;
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * 6.28;
    const l = sph(0.07, lm, Math.cos(a) * 0.09 * s, 0.12 * s, Math.sin(a) * 0.09 * s, g, 8, 6);
    l.scale.set(1.3 * s + 0.3, 0.45 * s + 0.15, 0.8 * s + 0.2);
    l.rotation.y = -a;
  }
  if (kind === 'melon' && stage > 0.6) {
    const m = sph(0.13 * stage, M('#3f8a3a', 0.5), 0.15, 0.1, 0.08, g, 14, 10);
    m.scale.y = 0.85;
  }
  if (kind !== 'melon' && stage > 0.8) {
    for (let i = 0; i < 4; i++) sph(0.025, M('#ffffff', 0.6), Math.cos(i * 1.6) * 0.07, 0.3, Math.sin(i * 1.6) * 0.07, g, 6, 5);
  }
  return g;
}
// ---------------- debris ----------------
export const DEBRIS = {
  plank: { name: 'Driftwood Plank', loot: { wood: 2 }, w: 34 },
  bottle: { name: 'Plastic Bottles', loot: { plastic: 2 }, w: 24 },
  frond: { name: 'Palm Fronds', loot: { fiber: 2 }, w: 22 },
  barrel: { name: 'Floating Barrel', loot: 'barrel', w: 12 },
  crate: { name: 'Supply Crate', loot: 'crate', w: 8 },
};
export function makeDebris(type) {
  const g = new THREE.Group();
  if (type === 'plank') {
    box(1.4, 0.08, 0.28, MAT.plank, 0, 0.03, 0, g);
    box(0.9, 0.08, 0.24, MAT.darkWood, 0.2, 0.08, 0.25, g).rotation.y = 0.3;
  } else if (type === 'bottle') {
    const cols = ['#7fd0e8', '#9fe0b0', '#e8f4f8'];
    for (let i = 0; i < 3; i++) {
      const b = cyl(
        0.06,
        0.06,
        0.3,
        new THREE.MeshStandardMaterial({ color: cols[i], roughness: 0.15, transparent: true, opacity: 0.85 }),
        i * 0.13 - 0.13,
        0.04,
        (i % 2) * 0.1,
        g,
        10,
      );
      b.rotation.z = Math.PI / 2;
      b.rotation.y = i * 0.6;
      cyl(0.03, 0.03, 0.05, MAT.blue, b.position.x + 0.17, 0.04, b.position.z, g, 6).rotation.z = Math.PI / 2;
    }
  } else if (type === 'frond') {
    for (let i = 0; i < 3; i++) {
      const l = sph(0.2, M('#6fae3e', 0.8), 0, 0.02, 0, g, 10, 6);
      l.scale.set(3.2, 0.12, 0.7);
      l.rotation.y = i * 0.9;
    }
    cyl(0.015, 0.02, 1.2, MAT.trunk, 0, 0.05, 0, g, 5).rotation.z = Math.PI / 2;
  } else if (type === 'barrel') {
    const b = makeBarrel(MAT.drum, 0.8, 0.3);
    b.rotation.z = Math.PI / 2;
    b.position.set(-0.4, 0.05, 0);
    g.add(b);
  } else if (type === 'crate') {
    const c = makeCrate(0.6);
    c.position.y = -0.2;
    c.rotation.y = 0.4;
    g.add(c);
  }
  return g;
}
