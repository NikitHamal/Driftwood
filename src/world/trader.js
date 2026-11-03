import { damp, dampAngle } from '../core/util.js';
import { waveGrad, waveHeight } from '../core/waves.js';
import { T } from './raft.js';
import { audio, raft } from '../render/stage.js';
import { boat, trader } from './entities.js';
import { G } from '../core/store.js';
import { playerWorld } from './spatial.js';
import { banner } from '../ui/hud.js';
import { closeModal } from '../ui/modals.js';

export const boatS = { st: 'away', x: 0, z: 80, tx: 0, tz: 0, t: 0 };
export function dockPoint() {
  let mz = 1;
  for (const [i, j] of raft.list()) if (Math.abs(i) <= 1) mz = Math.max(mz, j);
  return [0, (mz + 0.5) * T + 1.9];
}
export function updateBoat(dt) {
  const t = G.st.clock % 1,
    want = t >= 0.375 && t < 0.625 && G.mode === 'play';
  boatS.t += dt;
  if (boatS.st === 'away') {
    boat.group.visible = false;
    if (want) {
      const [x, z] = dockPoint();
      boatS.tx = x;
      boatS.tz = z;
      boatS.x = x - 70;
      boatS.z = z + 40;
      boatS.st = 'arrive';
      boat.group.visible = true;
      banner('A sail on the horizon', 'Marlo the merchant is coming to trade');
    }
  }
  if (boatS.st === 'arrive' || boatS.st === 'leave') {
    const dx = boatS.tx - boatS.x,
      dz = boatS.tz - boatS.z,
      d = Math.hypot(dx, dz),
      sp = Math.min(7, 0.6 + d * 0.4);
    if (d > 0.1) {
      boatS.x += (dx / d) * sp * dt;
      boatS.z += (dz / d) * sp * dt;
      boat.group.rotation.y = dampAngle(boat.group.rotation.y, Math.atan2(dx, dz), 1.5, dt);
    }
    if (boatS.st === 'arrive' && d < 0.4) {
      boatS.st = 'docked';
      audio.play('quest');
    }
    if (boatS.st === 'leave' && d < 1) {
      boatS.st = 'away';
    }
  }
  if (boatS.st === 'docked') {
    boat.group.rotation.y = dampAngle(boat.group.rotation.y, Math.PI / 2, 1.2, dt);
    const [x, z] = dockPoint();
    boatS.tx = x;
    boatS.tz = z;
    boatS.x = damp(boatS.x, x, 1, dt);
    boatS.z = damp(boatS.z, z, 1, dt);
    if (!want) {
      boatS.st = 'leave';
      boatS.tx = boatS.x + 110;
      boatS.tz = boatS.z + 30;
      if (G.curModal && G.curModal.shop) closeModal();
    }
  }
  if (boat.group.visible) {
    const h = waveHeight(boatS.x, boatS.z),
      [gx, gz] = waveGrad(boatS.x, boatS.z);
    boat.group.position.set(boatS.x, h * 0.8 - 0.12, boatS.z);
    boat.hull.rotation.set(gz * 0.6, 0, -gx * 0.6 + Math.sin(boatS.t * 0.9) * 0.03);
    const near = boatS.st === 'docked' && Math.hypot(playerWorld().x - boatS.x, playerWorld().z - boatS.z) < 6;
    trader.rSh.rotation.x = near ? -2.6 + Math.sin(boatS.t * 8) * 0.15 : -0.3;
    trader.rSh.rotation.z = near ? -0.3 : -0.1;
    trader.lSh.rotation.x = -0.5;
    trader.lEl.rotation.x = -0.8;
    trader.head.rotation.y = near ? -0.3 : Math.sin(boatS.t * 0.5) * 0.4;
    trader.chest.rotation.x = Math.sin(boatS.t * 1.5) * 0.02;
  }
}
