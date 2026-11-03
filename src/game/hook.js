import * as THREE from '../../vendor/three.module.js';
import { clamp, lerp } from '../core/util.js';
import { DECK } from '../world/models.js';
import { audio, parts } from '../render/stage.js';
import { fishLine, hookObj, lineGeo, P, PA } from '../world/entities.js';
import { G } from '../core/store.js';
import { pl } from './state.js';
import { give, hookRange } from './economy.js';
import { rollLoot } from './loot.js';
import { playerWorld } from '../world/spatial.js';
import { removeDebris } from '../world/debris.js';
import { fish } from './fishing.js';
import { toast } from '../ui/hud.js';

export const hk = { st: 'none', d: null, t: 0, from: new THREE.Vector3() };
export function throwHook(d) {
  const pw = playerWorld(),
    dist = Math.hypot(d.x - pw.x, d.z - pw.z);
  if (dist > hookRange()) {
    toast(`Too far — hook range is ${hookRange()} m`);
    return;
  }
  pl.face = Math.atan2(d.x - pw.x, d.z - pw.z);
  PA.play('throw', 0.5);
  audio.play('cast');
  hk.st = 'fly';
  hk.d = d;
  hk.t = 0;
  d.st = 'hooked';
  pl.lock = 0.5;
  hk.from.copy(P.lHand.getWorldPosition(new THREE.Vector3()));
}
export function updateHook(dt) {
  if (hk.st === 'none') return;
  hk.t += dt;
  const hand = P.lHand.getWorldPosition(new THREE.Vector3()),
    d = hk.d;
  if (!d.obj.parent) {
    hk.st = 'none';
    hookObj.visible = false;
    fishLine.visible = fish.st !== 'none';
    return;
  }
  if (hk.st === 'fly') {
    const k = clamp(hk.t / 0.4, 0, 1);
    const p = hand.clone().lerp(d.obj.position, k);
    p.y += Math.sin(k * Math.PI) * 2;
    hookObj.position.copy(p);
    hookObj.visible = true;
    if (k >= 1) {
      hk.st = 'pull';
      audio.play('splash');
      parts.splash(d.x, d.z, 0.6);
      PA.play('pull', 8);
    }
  } else {
    const pw = playerWorld(),
      dx = pw.x - d.x,
      dz = pw.z - d.z,
      dist = Math.hypot(dx, dz);
    const sp = Math.min(6, 1.5 + hk.t * 4);
    d.x += (dx / dist) * sp * dt;
    d.z += (dz / dist) * sp * dt;
    hookObj.position.copy(d.obj.position);
    if (Math.random() < 0.25)
      parts.emit({
        x: d.x,
        y: 0.05,
        z: d.z,
        count: 2,
        spread: 0.5,
        vel: [0, 0.8, 0],
        vr: 0.4,
        life: 0.6,
        size: [0.1, 0.04],
        color: '#f2fbff',
      });
    if (dist < 1.7 || hk.t > 8) {
      const loot = rollLoot(d.type);
      give(loot);
      G.st.stats.debris++;
      audio.play('pickup');
      parts.emit({
        x: d.x,
        y: DECK + 0.4,
        z: d.z,
        count: 14,
        spread: 0.4,
        vel: [0, 2.5, 0],
        vr: 1.2,
        life: 0.7,
        size: [0.08, 0.02],
        color: '#ffe08a',
        gravity: -4,
      });
      removeDebris(d);
      hk.st = 'none';
      hookObj.visible = false;
      fishLine.visible = fish.st !== 'none';
      PA.action = null;
    }
  }
  if (hookObj.visible) {
    fishLine.visible = true;
    const a = lineGeo.attributes.position,
      b = hookObj.position;
    for (let i = 0; i <= 20; i++) {
      const k = i / 20;
      a.setXYZ(i, lerp(hand.x, b.x, k), lerp(hand.y, b.y, k) - Math.sin(k * Math.PI) * 0.3, lerp(hand.z, b.z, k));
    }
    a.needsUpdate = true;
  }
}
