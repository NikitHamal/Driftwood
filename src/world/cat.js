import { damp, dampAngle, pick, rr } from '../core/util.js';
import { DECK } from './models.js';
import { animCat } from './characters.js';
import { T } from './raft.js';
import { raft } from '../render/stage.js';
import { cat } from './entities.js';
import { pl } from '../game/state.js';

export const catS = { x: -1.4, z: 2, tx: -1.4, tz: 2, t: 0, think: 2, sit: false, face: 0, sp: 0 };
export function updateCat(dt) {
  catS.t += dt;
  catS.think -= dt;
  const px = pl.l ? raft.house.ladder.x : pl.x,
    pz = pl.l ? raft.house.ladder.z + 0.4 : pl.z,
    dp = Math.hypot(px - catS.x, pz - catS.z);
  if (catS.think <= 0) {
    catS.think = rr(2.5, 6);
    if (dp > 3.5) {
      const a = Math.random() * 6.28;
      catS.tx = px + Math.cos(a) * 1.2;
      catS.tz = pz + Math.sin(a) * 1.2;
    } else if (Math.random() < 0.45) {
      const t = pick(raft.list());
      catS.tx = t[0] * T + rr(-0.8, 0.8);
      catS.tz = t[1] * T + rr(-0.8, 0.8);
    } else {
      catS.tx = catS.x;
      catS.tz = catS.z;
    }
    if (!raft.walkable(catS.tx, catS.tz, 0, 0.2)) {
      catS.tx = catS.x;
      catS.tz = catS.z;
    }
  }
  const dx = catS.tx - catS.x,
    dz = catS.tz - catS.z,
    d = Math.hypot(dx, dz);
  let sp = 0;
  if (d > 0.1) {
    sp = Math.min(d * 2, dp > 5 ? 2.6 : 1.3);
    const nx = catS.x + (dx / d) * sp * dt,
      nz = catS.z + (dz / d) * sp * dt;
    if (raft.walkable(nx, nz, 0, 0.18)) {
      catS.x = nx;
      catS.z = nz;
    } else catS.think = 0;
    catS.face = Math.atan2(dx, dz);
  } else if (dp < 3) {
    catS.face = dampAngle(catS.face, Math.atan2(px - catS.x, pz - catS.z), 2, dt);
  }
  if (!raft.walkable(catS.x, catS.z, 0, 0.1)) {
    const t = raft.list()[0];
    catS.x = t[0] * T + 0.9;
    catS.z = t[1] * T + 0.9;
  }
  catS.sp = damp(catS.sp, sp, 8, dt);
  cat.root.position.set(catS.x, DECK, catS.z);
  cat.root.rotation.y = dampAngle(cat.root.rotation.y, catS.face, 8, dt);
  animCat(cat, dt, catS.t, catS.sp, catS.sp < 0.05);
}
