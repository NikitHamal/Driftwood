import { clamp, damp, dampAngle, lerp, smooth } from '../core/util.js';
import { BAL, DECK } from '../world/models.js';
import { raft } from '../render/stage.js';
import { P, PA } from '../world/entities.js';
import { G } from '../core/store.js';
import { pl } from './state.js';
import { cancelFish, fish } from './fishing.js';
import { joy, keys } from '../input/controls.js';
import { cam } from '../input/camera.js';

export function updatePlayer(dt) {
  let ix = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0) + joy.x,
    iz = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) + joy.y;
  const len = Math.hypot(ix, iz);
  pl.lock = Math.max(0, pl.lock - dt);
  let speed = 0;
  if (pl.climb) {
    const c = pl.climb;
    c.t += dt / 1.1;
    const k = clamp(c.t, 0, 1);
    P.root.position.set(raft.house.ladder.x, lerp(c.y0, c.y1, k), lerp(c.z0, c.z1, smooth(0.7, 1, k)));
    pl.face = Math.PI;
    if (k >= 1) {
      pl.climb = null;
      pl.l = c.l;
      pl.x = raft.house.ladder.x;
      pl.z = c.z1;
      PA.action = null;
    }
    PA.update(dt, 0);
    return;
  }
  if (len > 0.1 && pl.lock <= 0 && G.mode === 'play' && !G.curModal) {
    const f = Math.min(1, len);
    ix /= len;
    iz /= len;
    const fx = -Math.sin(cam.yaw),
      fz = -Math.cos(cam.yaw),
      rx = Math.cos(cam.yaw),
      rz = -Math.sin(cam.yaw);
    let mx = rx * ix - fx * iz,
      mz = rz * ix - fz * iz;
    const m = Math.hypot(mx, mz);
    mx /= m;
    mz /= m;
    speed = (keys.has('ShiftLeft') || keys.has('ShiftRight') ? 5.2 : 3.3) * f;
    if (fish.st !== 'none') cancelFish();
    const nx = pl.x + mx * speed * dt,
      nz = pl.z + mz * speed * dt;
    if (raft.walkable(nx, nz, pl.l)) {
      pl.x = nx;
      pl.z = nz;
    } else if (raft.walkable(nx, pl.z, pl.l)) pl.x = nx;
    else if (raft.walkable(pl.x, nz, pl.l)) pl.z = nz;
    else speed *= 0.2;
    pl.face = Math.atan2(mx, mz);
  }
  pl.speed = damp(pl.speed, speed, 10, dt);
  P.root.position.set(pl.x, pl.l ? BAL + 0.035 : DECK, pl.z);
  P.root.rotation.y = dampAngle(P.root.rotation.y, pl.face, 12, dt);
  for (const k in P.tools) P.tools[k].visible = false;
  if (G.mode === 'title' || pl.tool === 'rod' || fish.st !== 'none') P.tools.rod.visible = true;
  else if (pl.tool === 'hook') P.tools.hook.visible = true;
  else if (pl.tool === 'hammer') P.tools.hammer.visible = true;
  PA.update(dt, pl.speed);
}
