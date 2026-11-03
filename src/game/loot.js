import { DEBRIS } from '../world/models.js';

export function rollLoot(type) {
  const d = DEBRIS[type];
  if (typeof d.loot === 'object') return { ...d.loot };
  const o = {};
  if (d.loot === 'barrel') {
    o.wood = 2 + ((Math.random() * 2) | 0);
    o.plastic = 1 + ((Math.random() * 2) | 0);
    o.scrap = 1 + ((Math.random() * 2) | 0);
    if (Math.random() < 0.4) o.seedPotato = 1 + ((Math.random() * 2) | 0);
    if (Math.random() < 0.5) o.coins = 3 + ((Math.random() * 8) | 0);
  } else {
    o.scrap = 2 + ((Math.random() * 2) | 0);
    o.fiber = 2;
    if (Math.random() < 0.5) o.seedPotato = 2;
    if (Math.random() < 0.25) o.seedMelon = 1;
    o.coins = 5 + ((Math.random() * 11) | 0);
  }
  return o;
}
export function rollType() {
  let tot = 0;
  for (const k in DEBRIS) tot += DEBRIS[k].w;
  let r = Math.random() * tot;
  for (const k in DEBRIS) {
    r -= DEBRIS[k].w;
    if (r <= 0) return k;
  }
  return 'plank';
}
