// House progression: level perks, the interior stations (bed, blueprint desk, hearth, telescope) and upgrades.
import * as THREE from '../../vendor/three.module.js';
import { G } from '../core/store.js';
import { HOUSE_LEVELS } from '../world/house.js';
import { audio, parts, raft } from '../render/stage.js';
import { banner, toast } from '../ui/hud.js';
import { give, has, pay } from './economy.js';
import { sleep } from './interact.js';
import { openHouse } from '../ui/modals.js';
import { BAL } from '../world/models.js';
import { DAY } from './constants.js';

export const houseLevel = () => (G.st && G.st.house) || 1;
/** Multiplier on hunger/thirst drain granted by the house level. */
export const houseDrain = () => 1 - 0.1 * (houseLevel() - 1);
export const houseXp = () => (houseLevel() >= 3 ? 1.15 : 1);
export const sleepBonus = () => 40 + 10 * (houseLevel() - 1);

export function upgradeHouse() {
  const L = houseLevel(),
    next = HOUSE_LEVELS[L];
  if (!next) return false;
  if (!has(next.cost)) {
    toast('Not enough materials');
    audio.play('fail');
    return false;
  }
  pay(next.cost);
  G.st.house = L + 1;
  raft.house.setLevel(G.st.house);
  G.st.stats.houseLv = G.st.house;
  audio.play('build');
  audio.play('quest');
  banner('House upgraded', HOUSE_LEVELS[L].name, 'gold');
  const p = raft.group.localToWorld(new THREE.Vector3(L === 1 ? 2.2 : -2.2, BAL + 1.2, -0.5));
  parts.emit({
    x: p.x,
    y: p.y,
    z: p.z,
    count: 60,
    spread: 2.2,
    vel: [0, 1.4, 0],
    vr: 1,
    life: 1.4,
    size: [0.3, 0.7],
    color: '#e8dcc4',
    alpha: 0.5,
    gravity: 0.3,
    drag: 2,
  });
  G.hudDirty = true;
  return true;
}
function cookAtHearth() {
  const I = G.st.inv;
  if (I.rawFish < 1) return toast('You need raw fish to cook');
  if (I.wood < 1) return toast('You need 1 wood for the hearth');
  I.wood--;
  I.rawFish--;
  give({ cookedFish: 1 });
  audio.play('sizzle');
}
function scout() {
  const t = G.st.clock % 1,
    h = t * 24;
  const trader =
    t >= 0.375 && t < 0.625 ? 'Marlo is trading today — dock is open.' : `Marlo's sail returns at ${h < 9 ? '09:00' : 'tomorrow 09:00'}.`;
  const rain = G.st.weather.type === 'rain' ? 'Rain over the horizon.' : 'Clear skies ahead.';
  const day = Math.floor(G.st.clock);
  banner('Through the telescope', `${trader} ${rain} · Day ${day}`, null);
  audio.play('click');
  void DAY;
}
/** Adds house stations to the interaction candidates (called while the player is on the upper level). */
export function houseActions(add) {
  const S = raft.house.spots,
    L = houseLevel();
  const night = G.st.clock % 1 > 0.8 || G.st.clock % 1 < 0.22;
  const sp = (v, r, a, pri) => v && add(v.x, v.z, r, a, pri);
  sp(S.bed, 0.95, night ? { l: 'Sleep until morning', i: 'bed', f: sleep } : { l: 'Bed — you can sleep at night', i: 'bed', off: 1 });
  sp(
    S.desk,
    0.95,
    {
      l: L < HOUSE_LEVELS.length ? 'Drafting desk — upgrade your home' : 'Drafting desk — your home is complete',
      i: 'hammer',
      f: openHouse,
    },
    0.1,
  );
  if (L >= 2) sp(S.hearth, 1.0, { l: 'Hearth — cook a fish (1 wood)', i: 'fire', f: cookAtHearth }, 0.1);
  if (L >= 3) sp(S.scope, 0.95, { l: 'Look through the telescope', i: 'sun', f: scout }, 0.1);
}
