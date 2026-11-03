import { T } from '../world/raft.js';
import { ITEM } from '../ui/icons.js';
import { $ } from '../ui/dom.js';
import { SAVE } from './constants.js';
import { camera, ocean, raft, scene, settings } from '../render/stage.js';
import { boat, bobber, fishLine, P, PA, shark } from '../world/entities.js';
import { CROP, INV0 } from './data.js';
import { freshState, pl, showcase } from './state.js';
import { G } from '../core/store.js';
import { debris, spawnDebris } from '../world/debris.js';
import { bState, simBuildings } from './stations.js';
import { cancelFish, fish } from './fishing.js';
import { hk } from './hook.js';
import { cancelBuild } from './building.js';
import { sh } from '../world/shark.js';
import { boatS } from '../world/trader.js';
import { cam, setCam } from '../input/camera.js';
import { catS } from '../world/cat.js';
import { banner, ic } from '../ui/hud.js';
import { head, openModal } from '../ui/modals.js';
import { crabCollectAll } from '../world/crab.js';
import { isTouch } from '../input/input.js';

export function applyState() {
  raft.setTiles(G.st.tiles);
  for (const id of [...raft.bmap.keys()]) raft.removeBuilding(id);
  for (const b of G.st.b) raft.addBuilding(b);
  ocean.setFoam(G.st.tiles, T);
  raft.health.clear();
  pl.x = G.st.player.x;
  pl.z = G.st.player.z;
  pl.l = G.st.player.l || 0;
  if (!raft.walkable(pl.x, pl.z, pl.l)) {
    pl.x = 0;
    pl.z = 2.5;
    pl.l = 0;
    if (!raft.walkable(pl.x, pl.z, 0)) respawnSpot();
  }
  pl.lock = 0;
  pl.climb = null;
  fish.st = 'none';
  hk.st = 'none';
  cancelBuild();
  catS.x = -1.4;
  catS.z = 2.0;
  for (const d of debris) scene.remove(d.obj);
  debris.length = 0;
  for (let i = 0; i < 10; i++) spawnDebris(true);
  shark.root.visible = G.st.mode !== 'cozy';
  sh.st = 'circle';
  boatS.st = 'away';
  boat.group.visible = false;
}
export function respawnSpot() {
  for (const [i, j] of raft.list()) {
    for (const [ox, oz] of [
      [0, 0],
      [0.6, 0.6],
      [-0.6, 0.6],
    ]) {
      const x = i * T + ox,
        z = j * T + oz;
      if (raft.walkable(x, z, 0)) {
        pl.x = x;
        pl.z = z;
        pl.l = 0;
        return;
      }
    }
  }
}
export const hasSave = () => {
  try {
    return JSON.parse(localStorage.getItem(SAVE) || 'null');
  } catch (e) {
    return null;
  }
};
export function saveGame() {
  if (G.mode !== 'play' || G.st.name === 'Showcase') return;
  G.st.player = { x: pl.x, z: pl.z, l: pl.l };
  G.st.saved = Date.now();
  try {
    localStorage.setItem(SAVE, JSON.stringify(G.st));
  } catch (e) {}
}
export function fadeOut(mid) {
  const f = $('#fade');
  f.classList.add('on');
  setTimeout(() => {
    mid && mid();
    setTimeout(() => f.classList.remove('on'), 120);
  }, 650);
}
export function migrate(s) {
  const f = freshState(s.name || 'World', s.mode || 'survival');
  for (const k in f) if (s[k] === undefined) s[k] = f[k];
  s.inv = { ...INV0, ...s.inv };
  for (const k in INV0) if (s.inv[k] == null) s.inv[k] = 0;
  s.stats = { ...f.stats, ...s.stats };
  s.up = { ...f.up, ...s.up };
  return s;
}
export function startGame(state, isNew) {
  fadeOut(() => {
    G.st = migrate(state);
    G.mode = 'play';
    G.lastDay = Math.floor(G.st.clock);
    G.warned = {};
    applyState();
    $('#title').hidden = true;
    $('#hud').hidden = false;
    G.hudDirty = true;
    cam.tyaw = cam.yaw = 0.5;
    setCam(settings.cam | 0, true);
    pl.tool = 'hook';
    PA.hold = null;
    cancelFish();
    bobber.visible = false;
    fishLine.visible = false;
    if (isNew) {
      banner(G.st.name, 'Stranded on an endless sea. Make it home.', 'gold');
      saveGame();
    } else {
      const away = Math.min(8 * 3600, (Date.now() - (G.st.saved || Date.now())) / 1000);
      if (away > 60) {
        const before = snap();
        simBuildings(away, false);
        const after = snap();
        if (G.st.up.crab) crabCollectAll(true);
        const gained = Object.keys(after)
          .filter((k) => after[k] > before[k])
          .map((k) => [k, after[k] - before[k]]);
        if (gained.length)
          setTimeout(
            () =>
              openModal(
                head('Welcome back!', `You were away for ${fmtDur(away)}. Your raft kept working:`) +
                  `<div class="away-list">${gained.map(([k, v]) => `<div class="it"><i style="color:${ITEM[k].color}">${ic(ITEM[k].icon)}</i><b>+${v}</b><span>${ITEM[k].name} ready</span></div>`).join('')}</div><p class="sub" style="margin-top:14px">Collect it from your stations with E.</p><div class="btns"><button class="btn pri" data-close>Let’s go</button></div>`,
              ),
            700,
          );
      } else banner(`Welcome back`, `${G.st.name} · Day ${Math.floor(G.st.clock)}`);
    }
    if (isTouch) {
      $('#joy').hidden = false;
      $('#mobUse').hidden = false;
      $('#hint').hidden = true;
    }
  });
}
export function snap() {
  const o = { coins: 0, rawFish: 0, cookedFish: 0, smokedFish: 0, pearl: 0, water: 0, potato: 0, melon: 0, wood: 0 };
  for (const b of raft.bmap.values()) {
    const s = bState(b);
    switch (b.data.type) {
      case 'trap':
        o.rawFish += s.n | 0;
        break;
      case 'grill':
        if (s.t >= 1) o.cookedFish += s.fish | 0;
        break;
      case 'rain':
      case 'still':
        o.water += s.n | 0;
        break;
      case 'purifier':
        o.water += s.done | 0;
        break;
      case 'planter':
        if (s.crop && s.grow >= 1) o[CROP[s.crop].item] += 1;
        break;
      case 'net':
        o.wood += (s.items || []).length;
        break;
      case 'smoker':
        o.smokedFish += s.done | 0;
        break;
      case 'winch':
        o.wood += (s.items || []).length;
        break;
      case 'buoy':
        o.coins = (o.coins || 0) + (s.c | 0);
        break;
      case 'pearl':
        o.pearl += s.n | 0;
        break;
    }
  }
  return o;
}
export const fmtDur = (s) => (s > 3600 ? `${Math.floor(s / 3600)} h ${Math.floor((s % 3600) / 60)} min` : `${Math.floor(s / 60)} min`);
export function toTitle() {
  fadeOut(() => {
    G.mode = 'title';
    P.root.visible = true;
    camera.fov = 48;
    camera.updateProjectionMatrix();
    G.st = showcase();
    applyState();
    $('#hud').hidden = true;
    $('#title').hidden = false;
    refreshTitle();
    cancelFish();
    PA.hold = 'rod';
    pl.x = 1.5;
    pl.z = 2.6;
    pl.face = 0.6;
  });
}
export function refreshTitle() {
  const s = hasSave(),
    b = $('#btnContinue');
  b.hidden = !s;
  if (s) {
    $('#contInfo').textContent = `${s.name} · Day ${Math.floor(s.clock)} · ${s.mode === 'cozy' ? 'Cozy' : 'Survival'}`;
    b.classList.add('primary');
  }
}
