import * as THREE from '../../vendor/three.module.js';
import { dampAngle, rr } from '../core/util.js';
import { DECK } from './models.js';
import { T } from './raft.js';
import { ITEM } from '../ui/icons.js';
import { raft } from '../render/stage.js';
import { G } from '../core/store.js';
import { bStatus, stationAction } from '../game/stations.js';
import { toast } from '../ui/hud.js';

export const crab = { t: 0, tgt: null, x: 0.6, z: 0.4, face: 0, obj: null };
export function crabCollectAll(silent) {
  const got = {};
  const keep = G.st.inv;
  const snapInv = { ...keep };
  let n = 0;
  for (const b of raft.bmap.values()) {
    if (b.data.type === 'lamp' || b.data.type === 'planter') continue;
    const a = stationAction(b);
    if (a && !a.off && /^(Collect|Empty|Harvest)/.test(a.l)) {
      a.f();
      n++;
    }
  }
  if (n && !silent) {
    for (const k in keep) {
      const d = (keep[k] | 0) - (snapInv[k] | 0);
      if (d > 0) got[k] = d;
    }
    const txt = Object.entries(got)
      .map(([k, v]) => `+${v} ${ITEM[k] ? ITEM[k].name : k}`)
      .join(' · ');
    if (txt) toast(`Pip collected ${txt}`);
  }
  if (n) G.hudDirty = true;
  return n;
}
export function updateCrab(dt, now) {
  if (!crab.obj) return;
  crab.obj.visible = !!(G.st.up && G.st.up.crab) && G.mode === 'play';
  if (!crab.obj.visible) return;
  crab.t += dt * (G.st.up.crab > 1 ? 3 : 1);
  if (!crab.tgt || crab.t > 6) {
    crab.t = 0;
    const bs = [...raft.bmap.values()].filter((b) => {
      const x = bStatus(b);
      return x && x.ready;
    });
    const b = bs.length ? bs[(Math.random() * bs.length) | 0] : null;
    const tl = G.st.tiles[(Math.random() * G.st.tiles.length) | 0];
    crab.tgt = b ? [b.data.tile[0] * T + 0.7, b.data.tile[1] * T + 0.7, b] : [tl[0] * T + rr(-0.8, 0.8), tl[1] * T + rr(-0.8, 0.8), null];
  }
  const dx = crab.tgt[0] - crab.x,
    dz = crab.tgt[1] - crab.z,
    d = Math.hypot(dx, dz);
  if (d > 0.08) {
    const sp = Math.min(d, dt * (G.st.up.crab > 1 ? 2.4 : 0.9));
    crab.x += (dx / d) * sp;
    crab.z += (dz / d) * sp;
    crab.face = dampAngle(crab.face, Math.atan2(dx, dz) + Math.PI / 2, 8, dt);
  } else if (crab.tgt[2]) {
    const b = crab.tgt[2];
    crab.tgt[2] = null;
    if (raft.bmap.has(b.data.id)) {
      const a = stationAction(b);
      if (a && !a.off && /^(Collect|Empty|Harvest)/.test(a.l) && b.data.type !== 'planter') {
        const before = { ...G.st.inv };
        a.f();
        const got = Object.keys(G.st.inv)
          .filter((k) => (G.st.inv[k] | 0) > (before[k] | 0))
          .map((k) => `+${G.st.inv[k] - before[k]} ${ITEM[k] ? ITEM[k].name : k}`)
          .join(' · ');
        if (got) toast(`Pip collected ${got}`);
        G.hudDirty = true;
      }
    }
  }
  const o = crab.obj;
  o.position.set(crab.x, DECK + 0.02 + Math.abs(Math.sin(now * 0.02)) * 0.01 * (d > 0.08), crab.z);
  o.rotation.y = crab.face;
  o.children.forEach((c, i) => {
    if (c.userData.leg != null) c.rotation.z = Math.sin(now * 0.03 + c.userData.leg) * (d > 0.08 ? 0.5 : 0.05);
  });
}
export function makeCrabMesh() {
  const g = new THREE.Group(),
    sh = new THREE.MeshStandardMaterial({ color: '#d9643a', roughness: 0.6 }),
    shell = new THREE.MeshStandardMaterial({ color: '#e8c79a', roughness: 0.8 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), sh);
  body.scale.set(1.3, 0.6, 1);
  body.position.y = 0.07;
  g.add(body);
  const sp = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.18, 8), shell);
  sp.position.set(0, 0.17, -0.02);
  sp.rotation.x = -0.5;
  g.add(sp);
  for (const s of [-1, 1]) {
    const c = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), sh);
    c.scale.set(1.4, 0.8, 1);
    c.position.set(0.11, 0.08, s * 0.09);
    g.add(c);
    for (let i = 0; i < 3; i++) {
      const l = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.1, 0.012), sh);
      l.position.set(-0.05 + i * 0.045, 0.04, s * 0.09);
      l.rotation.x = s * 0.7;
      l.userData.leg = i * 2 + s;
      g.add(l);
    }
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.014, 6, 4), new THREE.MeshStandardMaterial({ color: '#111' }));
    e.position.set(0.1, 0.13, s * 0.03);
    g.add(e);
  }
  g.traverse((m) => {
    if (m.isMesh) m.castShadow = true;
  });
  return g;
}
crab.obj = makeCrabMesh();
raft.group.add(crab.obj);
crab.obj.visible = false;
