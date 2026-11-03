import * as THREE from '../../vendor/three.module.js';
import { rr } from '../core/util.js';
import { waveGrad, waveHeight, waveState } from '../core/waves.js';
import { makeDebris } from './models.js';
import { T } from './raft.js';
import { parts, raft, scene } from '../render/stage.js';
import { rollType } from '../game/loot.js';
import { G } from '../core/store.js';
import { CAP } from '../game/stations.js';

export const debris = [];
G.debrisT = 2;
export const CUR = new THREE.Vector2(0.62, 0.16);
export function spawnDebris(init) {
  if (debris.length >= 22) return;
  const type = rollType(),
    obj = makeDebris(type);
  obj.traverse((m) => {
    if (m.isMesh) {
      m.castShadow = true;
      m.userData.debris = true;
    }
  });
  scene.add(obj);
  let x, z;
  if (init) {
    x = rr(-45, 45);
    z = rr(-40, 40);
    if (Math.hypot(x, z) < raft.bounds() + 4) {
      x += 14 * Math.sign(x || 1);
    }
  } else {
    x = -50;
    z = rr(-38, 38);
  }
  const d = {
    type,
    obj,
    x,
    z,
    vx: CUR.x * rr(0.7, 1.3),
    vz: CUR.y * rr(-0.5, 1.5),
    rot: rr(0, 6.28),
    spin: rr(-0.15, 0.15),
    st: 'float',
    ph: rr(0, 6),
  };
  obj.userData.ref = d;
  debris.push(d);
}
export function removeDebris(d) {
  scene.remove(d.obj);
  const i = debris.indexOf(d);
  if (i >= 0) debris.splice(i, 1);
}
export function updateDebris(dt) {
  G.debrisT -= dt;
  if (G.debrisT <= 0) {
    spawnDebris(false);
    G.debrisT = rr(2, 4.5);
  }
  const lim = raft.bounds() + 0.6;
  for (let i = debris.length - 1; i >= 0; i--) {
    const d = debris[i];
    if (d.st === 'float') {
      d.x += d.vx * dt;
      d.z += d.vz * dt;
      d.rot += d.spin * dt;
      if (Math.abs(d.x) < lim && Math.abs(d.z) < lim) {
        const push = Math.sign(d.z || 1);
        d.z += push * dt * 1.5;
      }
      for (const b of raft.bmap.values()) {
        if (b.data.type !== 'net') continue;
        const s = b.data.s || (b.data.s = {});
        s.items = s.items || [];
        if (s.items.length >= 10 * CAP()) continue;
        const [di, dj] = b.data.dir,
          np = new THREE.Vector3(b.data.tile[0] * T + di * 1.5, 0, b.data.tile[1] * T + dj * 1.5);
        if (Math.hypot(d.x - np.x, d.z - np.z) < 2.2) {
          s.items.push(d.type);
          parts.splash(d.x, d.z, 0.6);
          removeDebris(d);
          break;
        }
      }
      if (d.x > 55 || Math.abs(d.z) > 60) {
        removeDebris(d);
        continue;
      }
    }
    if (!d.obj.parent) continue;
    const h = waveHeight(d.x, d.z),
      [gx, gz] = waveGrad(d.x, d.z);
    d.obj.position.set(d.x, h - 0.02, d.z);
    d.obj.rotation.set(gz * 0.8 + Math.sin(waveState.time + d.ph) * 0.04, d.rot, -gx * 0.8);
  }
}
export function spawnDebrisAt(x, z) {
  for (let k = 0; k < 2; k++) {
    spawnDebris(true);
    const d = debris[debris.length - 1];
    if (d) {
      d.x = x + rr(-1, 1);
      d.z = z + rr(-1, 1);
      d.type = 'plank';
    }
  }
}
