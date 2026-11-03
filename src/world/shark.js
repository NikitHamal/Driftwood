import { dampAngle, pick, rr } from '../core/util.js';
import { T } from './raft.js';
import { audio, ocean, parts, raft } from '../render/stage.js';
import { PA, shark } from './entities.js';
import { G } from '../core/store.js';
import { pl } from '../game/state.js';
import { worldPos } from './spatial.js';
import { respawnSpot } from '../game/session.js';
import { findB } from '../game/building.js';
import { spawnDebrisAt } from './debris.js';
import { banner } from '../ui/hud.js';

export const sh = { st: 'circle', ang: 0, x: 20, z: 0, tile: null, t: 0, hp: 0 };
export function sharkTiles() {
  return raft.list().filter(([i, j]) => !(i === 0 && j === 0) && raft.edgeDir(i, j));
}
export function updateShark(dt) {
  if (G.st.mode === 'cozy') {
    shark.root.visible = false;
    return;
  }
  shark.root.visible = true;
  const R = raft.bounds() + 6;
  sh.t += dt;
  let tx,
    tz,
    spd = 3;
  if (sh.st === 'circle') {
    sh.ang += dt * 0.16;
    tx = Math.cos(sh.ang) * R;
    tz = Math.sin(sh.ang) * R;
    spd = 3.2;
    if (G.mode === 'play' && !G.curModal) {
      G.st.sharkNext -= dt;
      if (G.st.sharkNext <= 0) {
        const c = sharkTiles();
        if (c.length) {
          sh.tile = pick(c);
          sh.st = 'approach';
          banner('Shark!', 'It’s heading for your raft — fend it off with E or the Hook', 'warn');
          audio.play('warn');
        }
        G.st.sharkNext = rr(180, 300);
      }
    }
  }
  if (sh.st === 'approach' || sh.st === 'attack') {
    const [i, j] = sh.tile,
      e = raft.edgeDir(i, j) || [0, 1];
    if (!raft.has(i, j)) {
      sh.st = 'flee';
      sh.t = 0;
    } else {
      tx = i * T + e[0] * 2.1;
      tz = j * T + e[1] * 2.1;
      spd = 4.5;
      if (sh.st === 'approach' && Math.hypot(sh.x - tx, sh.z - tz) < 0.6) {
        sh.st = 'attack';
        sh.t = 0;
      }
      if (sh.st === 'attack') {
        const key = raft.key(i, j);
        const h = (raft.health.get(key) ?? 100) - dt * 5.5;
        raft.health.set(key, h);
        if (Math.random() < 0.15) parts.splash(tx - e[0] * 0.6, tz - e[1] * 0.6, 0.8);
        if (Math.random() < 0.02) audio.play('hit');
        if (h <= 0) destroyTile(i, j);
      }
    }
  }
  if (sh.st === 'flee') {
    const a = Math.atan2(sh.z, sh.x);
    tx = Math.cos(a) * (R + 25);
    tz = Math.sin(a) * (R + 25);
    spd = 7;
    if (sh.t > 6) {
      sh.st = 'circle';
      sh.ang = a;
    }
  }
  const dx = tx - sh.x,
    dz = tz - sh.z,
    d = Math.hypot(dx, dz);
  if (d > 0.05) {
    const m = Math.min(d, spd * dt);
    sh.x += (dx / d) * m;
    sh.z += (dz / d) * m;
    shark.root.rotation.y = dampAngle(shark.root.rotation.y, Math.atan2(dx, dz), 4, dt);
  }
  const att = sh.st === 'attack';
  shark.root.position.set(sh.x, att ? -0.25 + Math.sin(sh.t * 9) * 0.12 : -0.42, sh.z);
  shark.body.rotation.z = att ? Math.sin(sh.t * 7) * 0.35 : 0;
  shark.tail.rotation.y = Math.sin(sh.t * (att ? 14 : 5)) * 0.45;
  for (const [k, v] of raft.health) if (!(att && sh.tile && k === raft.key(...sh.tile))) raft.health.set(k, Math.min(100, v + dt * 2));
}
export function scareShark() {
  if (sh.st !== 'attack' && sh.st !== 'approach') return false;
  sh.st = 'flee';
  sh.t = 0;
  G.st.stats.sharks++;
  audio.play('hit');
  audio.play('bigsplash');
  parts.splash(sh.x, sh.z, 1.6);
  banner('Shark scared off!', 'It won’t be back for a while', 'gold');
  PA.play('throw', 0.5);
  return true;
}
export function destroyTile(i, j) {
  const b = findB(i, j);
  if (b) {
    raft.removeBuilding(b.data.id);
    G.st.b = G.st.b.filter((x) => x.id !== b.data.id);
  }
  G.st.tiles = G.st.tiles.filter(([a, c]) => !(a === i && c === j));
  raft.setTiles(G.st.tiles);
  ocean.setFoam(G.st.tiles, T);
  raft.health.delete(raft.key(i, j));
  const p = worldPos(i * T, 0, j * T);
  parts.splash(p.x, p.z, 2);
  audio.play('bigsplash');
  banner('The shark wrecked a foundation', 'Keep your hook ready next time', 'warn');
  sh.st = 'flee';
  sh.t = 0;
  spawnDebrisAt(p.x, p.z);
  if (!raft.walkable(pl.x, pl.z, pl.l)) respawnSpot();
}
