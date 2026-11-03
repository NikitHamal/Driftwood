import { pick, rr } from '../core/util.js';
import { DAY } from './constants.js';
import { G } from '../core/store.js';
import { banner } from '../ui/hud.js';
import { saveGame } from './session.js';

G.lastDay = 1;
export function updateTime(dt) {
  G.st.clock += dt / DAY;
  const day = Math.floor(G.st.clock);
  if (day !== G.lastDay) {
    G.lastDay = day;
    banner(`Day ${day}`, pick(['The sea is calm today', 'A new horizon awaits', 'Another day adrift', 'The current carries on']));
    saveGame();
  }
  const w = G.st.weather;
  if (G.st.clock > w.until) {
    if (w.type === 'clear' && Math.random() < 0.3) {
      w.type = 'rain';
      w.until = G.st.clock + rr(0.05, 0.11);
      banner('Rain is coming', 'Rain Catchers will fill up quickly');
    } else {
      w.type = 'clear';
      w.until = G.st.clock + rr(0.15, 0.4);
    }
  }
}
