import { INV0 } from './data.js';
import { G } from '../core/store.js';

export function freshState(name, mode) {
  const t = [];
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) t.push([i, j]);
  return {
    v: 2,
    name,
    mode,
    created: Date.now(),
    saved: Date.now(),
    clock: 1.3,
    weather: { type: 'clear', until: 1.55 },
    vit: { hp: 100, food: 90, water: 85 },
    inv: { ...INV0 },
    tiles: t,
    b: [],
    nid: 1,
    up: { rod: 0, hook: 0, still: 0, coil: 0, crab: 0, store: 0 },
    quest: 0,
    house: 1,
    stats: { crab: 0, debris: 0, fish: 0, ate: 0, drank: 0, planted: 0, harvest: 0, sold: 0, earned: 0, built: {}, tiles: 0, sharks: 0 },
    player: { x: 0, z: 2.5, l: 0 },
    xp: 0,
    sharkNext: 200,
    seedSel: 'potato',
    play: 0,
  };
}
export function showcase() {
  const s = freshState('Showcase', 'cozy');
  s.tiles.push([-1, 2], [0, 2], [1, 2], [2, 0], [2, 1]);
  s.b = [
    { id: 1, type: 'planter', tile: [-1, 1], s: { crop: 'potato', grow: 0.8 } },
    { id: 2, type: 'grill', tile: [1, 1], s: {} },
    { id: 3, type: 'rain', tile: [1, -1], s: { n: 2 } },
    { id: 4, type: 'net', tile: [0, 2], s: { items: [] } },
    { id: 5, type: 'planter', tile: [2, 0], s: { crop: 'melon', grow: 1 } },
    { id: 6, type: 'lamp', tile: [-1, -1], s: {} },
  ];
  return s;
}
G.st = showcase();
G.mode = 'title';
G.curModal = null;
export const pl = { x: 0, z: 2.5, l: 0, face: 0, speed: 0, lock: 0, climb: null, tool: 'hook' };
