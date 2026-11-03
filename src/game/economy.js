import { houseXp } from './home.js';
import { audio } from '../render/stage.js';
import { G } from '../core/store.js';
import { pl } from './state.js';
import { banner, pickup } from '../ui/hud.js';

export const tool = () => pl.tool;
export const has = (cost) => Object.entries(cost).every(([k, v]) => (G.st.inv[k] || 0) >= v);
export const pay = (cost) => {
  for (const k in cost) G.st.inv[k] -= cost[k];
};
export function give(items, silent) {
  let xp = 0;
  for (const k in items) {
    if (!items[k]) continue;
    G.st.inv[k] = (G.st.inv[k] || 0) + items[k];
    if (k !== 'coins' && items[k] > 0) xp += items[k];
    if (!silent) pickup(k, items[k]);
  }
  if (xp) addXP(xp);
  G.hudDirty = true;
}
export const lvlOf = (x) => Math.floor(Math.sqrt((x || 0) / 40)) + 1;
export const xpFor = (l) => (l - 1) * (l - 1) * 40;
export const SPD = () => 1 + 0.06 * (lvlOf(G.st.xp) - 1);
export function addXP(n) {
  if (G.st.name === 'Showcase') return;
  const a = lvlOf(G.st.xp);
  G.st.xp = (G.st.xp || 0) + Math.round(n * houseXp());
  const b = lvlOf(G.st.xp);
  if (b > a && G.mode === 'play') {
    const r = 15 * b;
    G.st.inv.coins += r;
    banner(`Renown level ${b}!`, `+${r} coins · stations now ${Math.round((SPD() - 1) * 100)}% faster`, 'gold');
    audio.play('quest');
  }
}
export const hookRange = () => [10, 14, 19][G.st.up.hook];
