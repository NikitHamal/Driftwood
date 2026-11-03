// The upgradable, enterable stilt house. Level 1 = hollow cabin with door/windows and furniture; level 2 adds a
// kitchen wing, level 3 a study wing with a telescope. Static meshes are merged per material (few draw calls) and a
// 10 cm walkability grid provides collision for the interior, the doorway and the balcony.
import * as THREE from '../../vendor/three.module.js';
import { box, sph } from '../core/util.js';
import { BAL, makeHouse, MAT, TEX } from './models.js';
import { furnishKitchen, furnishMain, furnishStudy } from './interiors.js';

export const HOUSE_LEVELS = [
  { name: 'Stilt Shack', desc: 'A snug one-room cabin with a bed and a drafting desk.', cost: null, perk: 'Rest at night to recover.' },
  {
    name: 'Cozy Cabin',
    desc: 'Adds a kitchen wing with a stove and hearth. Cook fish indoors, any time.',
    cost: { wood: 40, plastic: 12, fiber: 10, coins: 80 },
    perk: 'Hunger & thirst drain 10% slower · deeper sleep',
  },
  {
    name: 'Seaside Lodge',
    desc: 'Adds a study wing: bookshelves, a map desk and a brass telescope.',
    cost: { wood: 90, plastic: 30, fiber: 24, scrap: 20, coins: 220 },
    perk: 'Drain 20% slower · +15% renown · scout the horizon',
  },
];
const CY = BAL + 0.035,
  CH = 1.95,
  RY = CY + CH;

function uvScale(m, len, hh) {
  const uv = m.geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * len * 0.7, uv.getY(i) * hh * 0.6);
}
/** Axis-aligned wall with openings, outer clapboard + inner panelling. */
function wall(H, { ax, c, from, to, inward, open = [], h = CH, thick = 0.1 }) {
  const ops = [...open].sort((p, q) => p.a - q.a);
  const piece = (a, b, y0, y1, mat, t, off) => {
    if (b - a < 1e-3 || y1 - y0 < 1e-3) return;
    const len = b - a,
      hh = y1 - y0,
      mid = (a + b) / 2;
    const m =
      ax === 'x' ? box(len, hh, t, mat, mid, CY + y0 + hh / 2, c + off, H) : box(t, hh, len, mat, c + off, CY + y0 + hh / 2, mid, H);
    uvScale(m, len, hh);
  };
  const layers = [
    [MAT.wall, thick, 0],
    [MAT.panel, 0.03, inward * (thick / 2 + 0.014)],
  ];
  for (const [mat, t, off] of layers) {
    let cur = from;
    for (const o of ops) {
      piece(cur, o.a, 0, h, mat, t, off);
      if (o.y0 > 0) piece(o.a, o.b, 0, o.y0, mat, t, off);
      piece(o.a, o.b, o.y1, h, mat, t, off);
      cur = o.b;
    }
    piece(cur, to, 0, h, mat, t, off);
  }
}
function windowPane(H, ax, c, a, b, y0, y1) {
  const mid = (a + b) / 2,
    len = b - a,
    hh = y1 - y0,
    y = CY + y0 + hh / 2;
  const fr = (w, hgt, d, x, yy, z) => box(w, hgt, d, MAT.frame, x, yy, z, H);
  if (ax === 'x') {
    box(len, hh, 0.025, MAT.glass, mid, y, c, H);
    for (const dz of [-0.075, 0.075]) {
      fr(len + 0.1, 0.06, 0.05, mid, y + hh / 2, c + dz);
      fr(len + 0.1, 0.06, 0.05, mid, y - hh / 2, c + dz);
      fr(0.06, hh, 0.05, a, y, c + dz);
      fr(0.06, hh, 0.05, b, y, c + dz);
    }
    fr(0.03, hh, 0.04, mid, y, c);
    fr(len, 0.03, 0.04, mid, y, c);
    fr(len + 0.2, 0.05, 0.16, mid, y - hh / 2 - 0.04, c + 0.06);
  } else {
    box(0.025, hh, len, MAT.glass, c, y, mid, H);
    for (const dx of [-0.075, 0.075]) {
      fr(0.05, 0.06, len + 0.1, c + dx, y + hh / 2, mid);
      fr(0.05, 0.06, len + 0.1, c + dx, y - hh / 2, mid);
      fr(0.05, hh, 0.06, c + dx, y, a);
      fr(0.05, hh, 0.06, c + dx, y, b);
    }
    fr(0.04, hh, 0.03, c, y, mid);
    fr(0.04, 0.03, len, c, y, mid);
  }
}

export class House {
  constructor(parent, level = 1) {
    this.root = new THREE.Group();
    parent.add(this.root);
    this.level = 0;
    this.glows = [];
    this.lights = [];
    this.setLevel(level);
  }
  dispose() {
    this.root.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
    });
    this.root.clear();
  }
  setLevel(level) {
    this.dispose();
    this.level = level;
    this.glows = [];
    this.lights = [];
    const ctx = { blockers: [], lanterns: [], lampSpots: [], spots: {}, rooms: [], fire: null };
    const Hc = new THREE.Group();
    this.ctx = ctx;
    const ext = makeHouse({ cabin: (H, d) => this._cabin(H, d, ctx) });
    this.lanterns = [...ext.lanterns, ...ctx.lanterns];
    this.ladder = ext.ladder;
    this.fire = ctx.fire;
    // keep animated / emissive things out of the merge, merge everything else per material
    for (const l of this.lanterns) l.userData.keep = true;
    ext.group.userData.root = true;
    this.root.add(ext.group);
    this._buildGrid(level);
    this._merge(ext.group);
    this._lights(ctx);
    this.spots = ctx.spots;
    void Hc;
  }
  _cabin(H, { cw, cz0, cz1 }, ctx) {
    const hx = cw / 2,
      L = this.level;
    const door = { a: 0.15, b: 0.85, y0: 0, y1: 1.6 };
    // front wall (door + window), back wall, side walls (archways into the wings)
    wall(H, { ax: 'x', c: cz1, from: -hx, to: hx, inward: -1, open: [door, { a: -0.85, b: -0.25, y0: 0.85, y1: 1.6 }] });
    windowPane(H, 'x', cz1, -0.85, -0.25, 0.85, 1.6);
    wall(H, { ax: 'x', c: cz0, from: -hx, to: hx, inward: 1, open: [{ a: -0.3, b: 0.3, y0: 0.9, y1: 1.6 }] });
    windowPane(H, 'x', cz0, -0.3, 0.3, 0.9, 1.6);
    const arch = { a: -0.85, b: -0.1, y0: 0, y1: 1.65 };
    wall(H, { ax: 'z', c: hx, from: cz0, to: cz1, inward: -1, open: [L >= 2 ? arch : { a: -0.9, b: -0.3, y0: 0.9, y1: 1.6 }] });
    if (L < 2) windowPane(H, 'z', hx, -0.9, -0.3, 0.9, 1.6);
    wall(H, { ax: 'z', c: -hx, from: cz0, to: cz1, inward: 1, open: [L >= 3 ? arch : { a: -0.9, b: -0.3, y0: 0.9, y1: 1.6 }] });
    if (L < 3) windowPane(H, 'z', -hx, -0.9, -0.3, 0.9, 1.6);
    for (const x of [-1, 1]) for (const z of [cz0, cz1]) box(0.1, CH, 0.1, MAT.trim, x * hx, CY + CH / 2, z, H);
    // open door leaf, mat, clock
    const leaf = new THREE.Group();
    box(0.7, 1.55, 0.05, MAT.trim, 0.35, 0.78, 0, leaf);
    box(0.5, 0.5, 0.02, MAT.glass, 0.35, 1.15, 0.03, leaf);
    sph(0.03, MAT.metal, 0.6, 0.8, 0.04, leaf, 8, 6);
    leaf.position.set(0.85, CY, cz1 + 0.06);
    leaf.rotation.y = -1.45;
    H.add(leaf);
    box(0.7, 0.02, 0.4, MAT.rope, 0.5, CY + 0.012, cz1 + 0.35, H);
    // ceiling with beams
    box(2.18, 0.04, 1.68, MAT.panel, 0, CY + CH - 0.02, (cz0 + cz1) / 2, H);
    for (let i = 0; i < 4; i++) box(0.08, 0.1, 1.7, MAT.darkWood, -0.8 + i * 0.53, CY + CH - 0.07, (cz0 + cz1) / 2, H);
    furnishMain(H, ctx, CY, RY);
    const wingRoof = (x) => {
      box(1.9, 0.14, 1.85, MAT.roof, x, RY + 0.07, -0.55, H);
      box(1.7, 0.04, 1.65, MAT.darkWood, x, CY + CH - 0.02, -0.55, H);
    };
    const wingFloor = (s) => {
      for (let i = 0; i < 4; i++) box(0.42, 0.07, 1.9, MAT.plank, s * (1.7 + i * 0.42), BAL, -0.5, H);
      box(1.7, 0.14, 0.14, MAT.darkWood, s * 2.35, BAL - 0.09, 0.42, H);
      box(1.7, 0.14, 0.14, MAT.darkWood, s * 2.35, BAL - 0.09, -1.42, H);
      for (const z of [-1.3, 0.3]) {
        const br = box(0.08, 1.35, 0.08, MAT.stilt, s * 1.75, BAL - 0.55, z, H);
        br.rotation.z = s * 0.95;
        box(0.1, 0.1, 0.5, MAT.stilt, s * 2.7, BAL - 0.2, z, H);
      }
    };
    const wingWalls = (s, openFront) => {
      const xe = s * 2.8;
      wall(H, { ax: 'x', c: cz0, from: Math.min(s * hx, xe), to: Math.max(s * hx, xe), inward: 1 });
      wall(H, {
        ax: 'x',
        c: cz1,
        from: Math.min(s * hx, xe),
        to: Math.max(s * hx, xe),
        inward: -1,
        open: [{ a: Math.min(s * 1.6, s * 2.3), b: Math.max(s * 1.6, s * 2.3), y0: 0.85, y1: 1.6 }],
      });
      windowPane(H, 'x', cz1, Math.min(s * 1.6, s * 2.3), Math.max(s * 1.6, s * 2.3), 0.85, 1.6);
      wall(H, { ax: 'z', c: xe, from: cz0, to: cz1, inward: -s, open: [{ a: -0.9, b: -0.3, y0: 0.85, y1: 1.6 }] });
      windowPane(H, 'z', xe, -0.9, -0.3, 0.85, 1.6);
      void openFront;
    };
    if (L >= 2) {
      wingFloor(1);
      wingWalls(1);
      wingRoof(2.0);
      furnishKitchen(H, ctx, CY, RY, 1);
    }
    if (L >= 3) {
      wingFloor(-1);
      wingWalls(-1);
      wingRoof(-2.0);
      furnishStudy(H, ctx, CY, RY, -1);
    }
  }
  _buildGrid(level) {
    // walkable rectangles (x0,z0,x1,z1) at balcony height
    const R = [
      [-1.38, 0.5, 1.38, 1.38],
      [0.18, 0.18, 0.82, 0.56],
      [-1.0, -1.25, 1.0, 0.25],
    ];
    if (level >= 2) R.push([0.95, -0.82, 1.35, -0.12], [1.3, -1.25, 2.75, 0.25]);
    if (level >= 3) R.push([-1.35, -0.82, -0.95, -0.12], [-2.75, -1.25, -1.3, 0.25]);
    const g = (this.grid = { x0: -3.2, z0: -1.6, n: 64, m: 32, res: 0.1, data: new Uint8Array(64 * 32) });
    for (let j = 0; j < g.m; j++)
      for (let i = 0; i < g.n; i++) {
        const x = g.x0 + (i + 0.5) * g.res,
          z = g.z0 + (j + 0.5) * g.res;
        const inR = R.some((r) => x >= r[0] && x <= r[2] && z >= r[1] && z <= r[3]);
        const blocked = this.ctx.blockers.some((b) => x >= b[0] && x <= b[2] && z >= b[1] && z <= b[3]);
        g.data[j * g.n + i] = inR && !blocked ? 1 : 0;
      }
    this.rects = R;
  }
  _cell(x, z) {
    const g = this.grid,
      i = Math.floor((x - g.x0) / g.res),
      j = Math.floor((z - g.z0) / g.res);
    return i >= 0 && j >= 0 && i < g.n && j < g.m && g.data[j * g.n + i] === 1;
  }
  walkable(x, z, rad = 0.2) {
    const r = Math.min(rad, 0.22);
    return this._cell(x, z) && this._cell(x + r, z) && this._cell(x - r, z) && this._cell(x, z + r) && this._cell(x, z - r);
  }
  /** Is (x,z) inside any enclosed room (cabin or wing)? */
  inRoom(x, z, pad = 0) {
    for (const r of this.ctx.rooms) if (x > r.x0 - pad && x < r.x1 + pad && z > r.z0 - pad && z < r.z1 + pad) return true;
    return false;
  }
  clampToRoom(v, maxY) {
    const rooms = this.ctx.rooms;
    let best = rooms[0],
      bd = 1e9;
    for (const r of rooms) {
      const d = Math.hypot(v.x - (r.x0 + r.x1) / 2, v.z - (r.z0 + r.z1) / 2);
      if (d < bd) {
        bd = d;
        best = r;
      }
    }
    v.x = Math.min(best.x1 - 0.12, Math.max(best.x0 + 0.12, v.x));
    v.z = Math.min(best.z1 - 0.12, Math.max(best.z0 + 0.12, v.z));
    v.y = Math.min(maxY, v.y);
  }
  _lights(ctx) {
    for (const l of this.lanterns) {
      const sp = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: TEX.glow,
          color: 0xffb060,
          blending: THREE.AdditiveBlending,
          transparent: true,
          depthWrite: false,
          opacity: 0,
        }),
      );
      sp.scale.setScalar(1.3);
      sp.position.y = 0.12;
      sp.layers.set(1);
      l.add(sp);
      this.glows.push(sp);
    }
    const lamp = new THREE.PointLight(0xffa850, 0, 14, 1.5);
    this.lanterns[0].add(lamp);
    lamp.position.y = 0.1;
    this.lights.push({ l: lamp, day: 0, night: 9 });
    for (const r of ctx.rooms) {
      const l = new THREE.PointLight(0xffc27a, 0, 5.5, 1.6);
      l.position.set(...r.light);
      this.root.add(l);
      this.lights.push({ l, day: 1.6, night: 3.2 });
    }
  }
  update(dt, night) {
    for (const g of this.glows) g.material.opacity = night * 0.9;
    for (const o of this.lights) o.l.intensity = o.day + (o.night - o.day) * night;
    if (this.fire) this.fire.material.emissiveIntensity = 1.1 + Math.sin(performance.now() * 0.012) * 0.4;
  }
  _merge(group) {
    // bake every plain mesh into one geometry per material; keep lanterns, instanced foliage and vertex-coloured meshes
    group.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(this.root.matrixWorld).invert();
    const buckets = new Map();
    const keepRoots = this.lanterns;
    const isKept = (o) => {
      for (let p = o; p; p = p.parent) if (keepRoots.includes(p)) return true;
      return false;
    };
    const list = [];
    group.traverse((o) => {
      if (
        o.isMesh &&
        !o.isInstancedMesh &&
        !o.geometry.attributes.color &&
        !isKept(o) &&
        o.material &&
        !Array.isArray(o.material) &&
        o.geometry.attributes.uv
      )
        list.push(o);
    });
    for (const o of list) {
      if (!buckets.has(o.material)) buckets.set(o.material, []);
      buckets.get(o.material).push(o);
    }
    const m4 = new THREE.Matrix4(),
      nm = new THREE.Matrix3();
    this.occluders = [];
    for (const [mat, meshes] of buckets) {
      if (meshes.length < 2) continue;
      let count = 0;
      const geos = meshes.map((o) => {
        const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
        count += g.attributes.position.count;
        return g;
      });
      const pos = new Float32Array(count * 3),
        nor = new Float32Array(count * 3),
        uv = new Float32Array(count * 2);
      let off = 0;
      meshes.forEach((o, k) => {
        const g = geos[k];
        m4.multiplyMatrices(inv, o.matrixWorld);
        nm.getNormalMatrix(m4);
        const p = g.attributes.position,
          n = g.attributes.normal,
          t = g.attributes.uv,
          v = new THREE.Vector3();
        for (let i = 0; i < p.count; i++) {
          v.fromBufferAttribute(p, i).applyMatrix4(m4);
          pos.set([v.x, v.y, v.z], (off + i) * 3);
          v.fromBufferAttribute(n, i).applyMatrix3(nm).normalize();
          nor.set([v.x, v.y, v.z], (off + i) * 3);
          uv.set([t.getX(i), t.getY(i)], (off + i) * 2);
        }
        off += p.count;
        g.dispose();
        o.parent.remove(o);
        o.geometry.dispose();
      });
      const bg = new THREE.BufferGeometry();
      bg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      bg.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      bg.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      bg.computeBoundingSphere();
      const merged = new THREE.Mesh(bg, mat);
      merged.castShadow = !mat.transparent;
      merged.receiveShadow = true;
      this.root.add(merged);
      if (mat === MAT.wall || mat === MAT.roof || mat === MAT.panel) this.occluders.push(merged);
    }
  }
}
