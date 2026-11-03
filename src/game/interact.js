import * as THREE from '../../vendor/three.module.js';
import { houseActions, sleepBonus } from './home.js';
import { BAL, BP, DECK } from '../world/models.js';
import { T } from '../world/raft.js';
import { DAY } from './constants.js';
import { audio, parts, raft } from '../render/stage.js';
import { PA } from '../world/entities.js';
import { G } from '../core/store.js';
import { pl } from './state.js';
import { worldPos } from '../world/spatial.js';
import { simBuildings, stationAction } from './stations.js';
import { cancelFish } from './fishing.js';
import { scareShark, sh } from '../world/shark.js';
import { boatS } from '../world/trader.js';
import { catS } from '../world/cat.js';
import { banner } from '../ui/hud.js';
import { openShop } from '../ui/modals.js';
import { fadeOut, saveGame } from './session.js';

G.curAct = null;
export function gatherActions() {
  const out = [];
  const add = (x, z, r, a, pri = 0) => {
    const d = Math.hypot(pl.x - x, pl.z - z);
    if (d < r && a) out.push({ d: d - pri, ...a });
  };
  const L = raft.house.ladder;
  if (pl.climb || G.mode !== 'play') return null;
  if (pl.l === 0) {
    add(L.x, L.z, 1.0, {
      l: 'Climb up',
      i: 'ladder',
      f: () => {
        pl.climb = { t: 0, y0: DECK, y1: BAL + 0.035, z0: L.z - 0.33, z1: 1.05, l: 1 };
        pl.x = L.x;
        PA.play('climb', 1.1);
        cancelFish();
      },
    });
    for (const b of raft.bmap.values()) {
      const bx = b.data.tile[0] * T,
        bz = b.data.tile[1] * T,
        r = b.data.type === 'planter' ? 1.45 : BP[b.data.type].edge ? 1.7 : 1.25;
      add(bx, bz, r, stationAction(b));
    }
    add(
      catS.x,
      catS.z,
      1.2,
      {
        l: 'Pet Biscuit',
        i: 'cat',
        f: () => {
          PA.play('pet', 1.2);
          audio.play('meow');
          const p = worldPos(catS.x, DECK + 0.6, catS.z);
          parts.emit({
            x: p.x,
            y: p.y,
            z: p.z,
            count: 6,
            spread: 0.3,
            vel: [0, 1, 0],
            vr: 0.3,
            life: 1.2,
            size: [0.12, 0.05],
            color: '#ff8fa3',
            gravity: 0.5,
          });
          catS.think = 4;
          catS.tx = catS.x;
          catS.tz = catS.z;
        },
      },
      -0.2,
    );
    if (boatS.st === 'docked') {
      const lp = raft.group.worldToLocal(new THREE.Vector3(boatS.x, 0, boatS.z));
      add(lp.x, lp.z, 5.2, { l: 'Trade with Marlo', i: 'boat', f: openShop }, 0.5);
    }
    if (sh.st === 'attack' || sh.st === 'approach') {
      const lp = raft.group.worldToLocal(new THREE.Vector3(sh.x, 0, sh.z));
      add(lp.x, lp.z, 4.2, { l: 'Fend off the shark!', i: 'shark', f: scareShark }, 3);
    }
  } else {
    add(L.x, 1.05, 0.9, {
      l: 'Climb down',
      i: 'ladder',
      f: () => {
        pl.climb = { t: 0, y0: BAL + 0.035, y1: DECK, z0: L.z - 0.33, z1: L.z, l: 0 };
        PA.play('climb', 1.1);
      },
    });
    houseActions(add);
  }
  out.sort((a, b) => a.d - b.d);
  return out[0] || null;
}
export function interact() {
  if (!G.curAct || G.curAct.off || pl.lock > 0) return;
  audio.play('click');
  G.curAct.f();
  G.hudDirty = true;
  if (!['Climb up', 'Climb down'].includes(G.curAct.l) && !PA.action) PA.play('interact', 0.6);
}
export function sleep() {
  fadeOut(() => {
    const t = G.st.clock % 1,
      add = t > 0.5 ? 1 - t + 0.26 : 0.26 - t;
    simBuildings(add * DAY, false);
    G.st.clock += add;
    G.st.vit.hp = Math.min(100, G.st.vit.hp + sleepBonus());
    G.st.vit.food = Math.max(5, G.st.vit.food - 15);
    G.st.vit.water = Math.max(5, G.st.vit.water - 18);
    G.lastDay = Math.floor(G.st.clock);
    banner(`Day ${G.lastDay}`, 'You feel well rested');
    saveGame();
  });
}
