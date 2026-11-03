import { audio } from '../render/stage.js';
import { CROP } from './data.js';
import { G } from '../core/store.js';
import { pl } from './state.js';
import { cancelFish } from './fishing.js';
import { cancelBuild, openBuild } from './building.js';
import { drink, eat } from './survival.js';
import { toast } from '../ui/hud.js';

export function selectSlot(s) {
  audio.play('click');
  if (s === 'eat') return eat();
  if (s === 'drink') return drink();
  if (s === 'seeds') {
    if (pl.tool === 'seeds') G.st.seedSel = G.st.seedSel === 'potato' ? 'melon' : 'potato';
    pl.tool = 'seeds';
    if (G.buildOn) cancelBuild();
    toast(`${CROP[G.st.seedSel].name} seeds selected — press E at a Planter`);
    G.hudDirty = true;
    return;
  }
  if (s === 'hammer') {
    if (G.buildOn) {
      cancelBuild();
      return;
    }
    pl.tool = 'hammer';
    cancelFish();
    openBuild();
    G.hudDirty = true;
    return;
  }
  if (G.buildOn) cancelBuild();
  pl.tool = s;
  if (s !== 'rod') cancelFish();
  G.hudDirty = true;
}
