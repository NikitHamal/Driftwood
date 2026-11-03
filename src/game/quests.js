import { $ } from '../ui/dom.js';
import { audio } from '../render/stage.js';
import { QUESTS } from './data.js';
import { G } from '../core/store.js';
import { give, lvlOf } from './economy.js';
import { banner } from '../ui/hud.js';

export function qProg(q) {
  if (q.k.startsWith('b:')) return G.st.stats.built[q.k.slice(2)] || 0;
  if (q.k === 'tileCount') return G.st.tiles.length;
  if (q.k === 'day') return Math.floor(G.st.clock);
  if (q.k === 'renown') return lvlOf(G.st.xp);
  return G.st.stats[q.k] || 0;
}
export function checkQuest() {
  const q = QUESTS[G.st.quest];
  if (!q) return;
  if (qProg(q) >= q.n) {
    give(q.r);
    G.st.quest++;
    banner('Objective complete', q.t, 'gold');
    audio.play('quest');
    const el = $('#quest');
    el.classList.remove('done');
    void el.offsetWidth;
    el.classList.add('done');
    G.hudDirty = true;
  }
}
