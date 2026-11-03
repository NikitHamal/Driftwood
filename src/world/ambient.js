import { rr } from '../core/util.js';
import { waveState } from '../core/waves.js';
import { DECK } from './models.js';
import { T } from './raft.js';
import { audio, parts, raft } from '../render/stage.js';
import { gulls, jumpFish } from './entities.js';
import { worldPos } from './spatial.js';
import { G } from '../core/store.js';

G.gullT = 8;
export let jump = { t: -1, next: 5, x: 0, z: 0, dx: 1, dz: 0 };
export function updateAmbient(dt) {
  const t = waveState.time;
  for (const g of gulls) {
    g.ang += dt * g.spd;
    const r = g.r + Math.sin(t * 0.1 + g.ph) * 3;
    const x = Math.cos(g.ang) * r,
      z = Math.sin(g.ang) * r;
    g.R.root.position.set(x, g.h + Math.sin(t * 0.6 + g.ph), z);
    g.R.root.rotation.y = -g.ang + Math.PI;
    g.R.root.rotation.z = -0.25;
    const glide = Math.sin(t * 0.3 + g.ph) > 0.3,
      f = glide ? 0.1 : Math.sin(t * 9 + g.ph) * 0.55;
    g.R.wings[0].rotation.z = f;
    g.R.wings[1].rotation.z = -f;
  }
  G.gullT -= dt;
  if (G.gullT < 0) {
    G.gullT = rr(14, 30);
    audio.play('gull');
  }
  jump.next -= dt;
  if (jump.next < 0 && jump.t < 0) {
    jump.t = 0;
    const a = rr(0, 6.28),
      r = rr(7, 22);
    jump.x = Math.cos(a) * r;
    jump.z = Math.sin(a) * r;
    const b = rr(0, 6.28);
    jump.dx = Math.cos(b);
    jump.dz = Math.sin(b);
    parts.splash(jump.x, jump.z, 0.5);
    jump.next = rr(6, 16);
  }
  if (jump.t >= 0) {
    jump.t += dt / 0.9;
    const k = jump.t;
    jumpFish.visible = true;
    jumpFish.position.set(jump.x + jump.dx * k * 2.2, Math.sin(k * Math.PI) * 1.1 - 0.1, jump.z + jump.dz * k * 2.2);
    jumpFish.rotation.set(-Math.cos(k * Math.PI) * 1.0, Math.atan2(jump.dx, jump.dz), 0);
    if (k >= 1) {
      parts.splash(jumpFish.position.x, jumpFish.position.z, 0.6);
      jump.t = -1;
      jumpFish.visible = false;
    }
  }
  // smoke & steam
  for (const b of raft.bmap.values()) {
    const s = b.data.s || {};
    if (Math.random() > dt * 8) continue;
    const p = worldPos(b.data.tile[0] * T, DECK, b.data.tile[1] * T);
    if (b.data.type === 'grill' && s.fish && s.t < 1)
      parts.emit({
        x: p.x,
        y: p.y + 0.8,
        z: p.z,
        count: 1,
        spread: 0.3,
        vel: [0, 0.8, 0],
        vr: 0.15,
        life: 2.2,
        size: [0.2, 0.7],
        color: '#d9d4cc',
        alpha: 0.35,
        gravity: 0.3,
        drag: 0.6,
      });
    if (b.data.type === 'purifier' && s.b)
      parts.emit({
        x: p.x - 0.08,
        y: p.y + 0.8,
        z: p.z,
        count: 1,
        spread: 0.15,
        vel: [0, 0.9, 0],
        vr: 0.1,
        life: 1.6,
        size: [0.12, 0.5],
        color: '#ffffff',
        alpha: 0.35,
        gravity: 0.3,
        drag: 0.6,
      });
  }
}
