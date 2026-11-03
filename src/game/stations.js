import { DECK } from '../world/models.js';
import { T } from '../world/raft.js';
import { audio, env, parts, raft } from '../render/stage.js';
import { PA } from '../world/entities.js';
import { CROP, SELL } from './data.js';
import { G } from '../core/store.js';
import { give, SPD } from './economy.js';
import { rollLoot, rollType } from './loot.js';
import { worldPos } from '../world/spatial.js';

export function bState(b) {
  return b.data.s || (b.data.s = {});
}
export const CAP = () => (G.st.up && G.st.up.store ? 2 : 1);
export function simBuildings(sec, raining) {
  sec *= SPD();
  for (const b of raft.bmap.values()) {
    const s = bState(b);
    switch (b.data.type) {
      case 'grill':
        if (s.fish && s.t < 1) s.t = Math.min(1, (s.t || 0) + sec / 14);
        break;
      case 'purifier':
        if (s.b) {
          s.t = (s.t || 0) + sec / 16;
          if (s.t >= 1) {
            s.b = 0;
            s.t = 0;
            s.done = (s.done || 0) + (G.st.up.coil ? 3 : 2);
          }
        }
        break;
      case 'planter':
        if (s.crop && s.grow < 1) s.grow = Math.min(1, s.grow + (sec / CROP[s.crop].time) * (s.wet ? 1.8 : 1));
        break;
      case 'rain':
        s.n = Math.min(4, (s.n || 0) + sec * (raining ? 1 / 10 : 1 / 220));
        break;
      case 'still':
        s.n = Math.min(5 * CAP(), (s.n || 0) + sec / (env.sunUp > 0 ? 60 : 240));
        break;
      case 'trap':
        s.n = Math.min(6 * CAP(), (s.n || 0) + sec / 70);
        break;
      case 'smoker':
        if (s.q > 0) {
          s.t = (s.t || 0) + sec / 40;
          while (s.t >= 1 && s.q > 0) {
            s.t -= 1;
            s.q--;
            s.done = (s.done || 0) + 1;
          }
          if (!s.q) s.t = 0;
        }
        break;
      case 'pearl':
        s.n = Math.min(4 * CAP(), (s.n || 0) + sec / 150);
        break;
      case 'winch':
        s.items = s.items || [];
        s.acc = (s.acc || 0) + sec / 28;
        while (s.acc >= 1 && s.items.length < 8 * CAP()) {
          s.acc -= 1;
          s.items.push(rollType());
        }
        if (s.items.length >= 8 * CAP()) s.acc = 0;
        break;
      case 'sprinkler': {
        s.w = Math.min(6, (s.w || 0) + sec * (raining ? 1 / 12 : 1 / 90));
        const [ti, tj] = b.data.tile;
        for (const p of raft.bmap.values()) {
          if (p.data.type !== 'planter') continue;
          const ps = bState(p);
          if (Math.abs(p.data.tile[0] - ti) <= 1 && Math.abs(p.data.tile[1] - tj) <= 1 && ps.crop && !ps.wet && ps.grow < 1 && s.w >= 1) {
            ps.wet = 1;
            s.w -= 1;
          }
        }
        break;
      }
      case 'buoy': {
        s.acc = (s.acc || 0) + sec / 25;
        let guard = 0;
        while (s.acc >= 1 && guard++ < 2000) {
          s.acc -= 1;
          if ((s.c || 0) >= 250 * CAP()) {
            s.acc = 0;
            break;
          }
          const k = ['pearl', 'smokedFish', 'melon', 'cookedFish', 'potato', 'scrap'].find(
            (k) => (G.st.inv[k] | 0) > (k === 'cookedFish' || k === 'potato' || k === 'melon' ? 4 : 2),
          );
          if (!k) {
            s.acc = 0;
            break;
          }
          G.st.inv[k]--;
          s.c = (s.c || 0) + Math.ceil(SELL[k] * 0.8);
          G.st.stats.sold++;
        }
        break;
      }
      case 'net':
        s.items = s.items || [];
        s.acc = (s.acc || 0) + sec / 55;
        while (s.acc >= 1 && s.items.length < 10 * CAP()) {
          s.acc -= 1;
          s.items.push(rollType());
        }
        if (s.items.length >= 10 * CAP()) s.acc = 0;
        break;
    }
  }
}
export function bSig(b) {
  const s = bState(b);
  return [
    s.fish | 0,
    (s.t || 0) >= 1,
    s.crop || '',
    Math.floor((s.grow || 0) * 5),
    Math.floor(s.n || 0),
    (s.items || []).length,
    s.done | 0,
    s.q | 0,
    Math.floor(s.w || 0),
    s.c | 0,
  ].join('|');
}
export function bStatus(b) {
  const s = bState(b);
  switch (b.data.type) {
    case 'grill':
      if (s.fish && s.t >= 1) return { ready: 1, icon: 'cooked' };
      if (s.fish) return { pf: s.t, icon: 'fire' };
      return null;
    case 'purifier':
      if (s.done) return { ready: 1, icon: 'water', n: s.done };
      if (s.b) return { pf: s.t, icon: 'drop' };
      return null;
    case 'planter':
      if (s.crop && s.grow >= 1) return { ready: 1, icon: CROP[s.crop].item };
      if (s.crop) return { pf: s.grow, icon: s.wet ? 'drop' : 'plant', thirsty: !s.wet };
      return null;
    case 'rain':
    case 'still':
      return (s.n | 0) > 0 ? { ready: (s.n | 0) >= 2, icon: 'water', n: s.n | 0 } : null;
    case 'trap':
      return (s.n | 0) > 0 ? { ready: (s.n | 0) >= 2, icon: 'fish', n: s.n | 0 } : null;
    case 'smoker':
      if (s.done) return { ready: 1, icon: 'smoked', n: s.done };
      if (s.q) return { pf: s.t || 0, icon: 'fire' };
      return null;
    case 'pearl':
      return (s.n | 0) > 0 ? { ready: 1, icon: 'pearl', n: s.n | 0 } : null;
    case 'winch':
      return (s.items || []).length ? { ready: s.items.length >= 3, icon: 'hook', n: s.items.length } : null;
    case 'sprinkler':
      return { pf: Math.min(1, (s.w || 0) / 6), icon: 'drop' };
    case 'buoy':
      return (s.c | 0) > 0 ? { ready: (s.c | 0) >= 10, icon: 'coin', n: s.c | 0 } : null;
    case 'net':
      return (s.items || []).length ? { ready: s.items.length >= 3, icon: 'net', n: s.items.length } : null;
  }
  return null;
}
export function stationAction(b) {
  const s = bState(b),
    I = G.st.inv;
  switch (b.data.type) {
    case 'grill':
      if (s.fish && s.t >= 1)
        return {
          l: `Collect cooked fish ×${s.fish}`,
          i: 'cooked',
          f: () => {
            give({ cookedFish: s.fish });
            s.fish = 0;
            s.t = 0;
            audio.play('pickup');
          },
        };
      if (s.fish) return { l: `Cooking… ${Math.round(s.t * 100)}%`, i: 'fire', off: 1 };
      if (I.rawFish > 0)
        return {
          l: `Cook raw fish ×${Math.min(2, I.rawFish)}`,
          i: 'fire',
          f: () => {
            const n = Math.min(2, I.rawFish);
            I.rawFish -= n;
            s.fish = n;
            s.t = 0;
            audio.play('sizzle');
          },
        };
      return { l: 'Grill — needs raw fish', i: 'fire', off: 1 };
    case 'purifier':
      if (s.done)
        return {
          l: `Collect fresh water ×${s.done}`,
          i: 'water',
          f: () => {
            give({ water: s.done });
            s.done = 0;
            audio.play('pickup');
          },
        };
      if (s.b) return { l: `Boiling… ${Math.round(s.t * 100)}%`, i: 'drop', off: 1 };
      if (I.wood >= 1)
        return {
          l: 'Boil seawater (1 wood)',
          i: 'drop',
          f: () => {
            I.wood--;
            s.b = 1;
            s.t = 0;
            audio.play('boil');
            audio.play('splash');
          },
        };
      return { l: 'Purifier — needs 1 wood', i: 'drop', off: 1 };
    case 'planter':
      if (s.crop && s.grow >= 1)
        return {
          l: `Harvest ${CROP[s.crop].name}`,
          i: CROP[s.crop].item,
          f: () => {
            const c = CROP[s.crop],
              n = c.y[0] + ((Math.random() * (c.y[1] - c.y[0] + 1)) | 0);
            const o = { [c.item]: n * 3 };
            o[c.seed] = Math.random() < 0.7 ? 2 : 1;
            give(o);
            s.crop = null;
            s.grow = 0;
            s.wet = 0;
            G.st.stats.harvest++;
            audio.play('pickup');
            PA.play('interact', 0.7);
          },
        };
      if (s.crop && !s.wet && I.water > 0)
        return {
          l: 'Water crops (1 water)',
          i: 'drop',
          f: () => {
            I.water--;
            s.wet = 1;
            audio.play('drink');
            parts.emit({
              ...worldPos(b.data.tile[0] * T, DECK + 0.6, b.data.tile[1] * T),
              count: 20,
              spread: 1,
              vel: [0, 0.5, 0],
              vr: 0.4,
              life: 0.7,
              size: [0.08, 0.03],
              color: '#7fd3ff',
              gravity: -5,
            });
          },
        };
      if (s.crop) return { l: `Growing… ${Math.round(s.grow * 100)}%${s.wet ? '' : ' — needs water'}`, i: 'plant', off: 1 };
      {
        let k = G.st.seedSel;
        if (!I[CROP[k].seed]) k = k === 'potato' ? 'melon' : 'potato';
        if (I[CROP[k].seed] > 0)
          return {
            l: `Plant ${CROP[k].name} seeds`,
            i: 'seed',
            f: () => {
              I[CROP[k].seed]--;
              s.crop = k;
              s.grow = 0;
              s.wet = 0;
              G.st.stats.planted++;
              audio.play('pickup');
              PA.play('interact', 0.7);
            },
          };
      }
      return { l: 'Planter — needs seeds', i: 'seed', off: 1 };
    case 'rain':
    case 'still': {
      const n = s.n | 0;
      if (n > 0)
        return {
          l: `Collect water ×${n}`,
          i: 'water',
          f: () => {
            give({ water: n });
            s.n -= n;
            audio.play('pickup');
          },
        };
      return { l: b.data.type === 'rain' ? 'Rain Catcher — waiting for rain' : 'Solar Still — collecting…', i: 'water', off: 1 };
    }
    case 'trap': {
      const n = s.n | 0;
      if (n > 0)
        return {
          l: `Collect fish ×${n}`,
          i: 'fish',
          f: () => {
            give({ rawFish: n });
            s.n -= n;
            G.st.stats.fish += n;
            audio.play('pickup');
            parts.splash(...splashAt(b));
          },
        };
      return { l: 'Fish Trap — nothing yet', i: 'fish', off: 1 };
    }
    case 'net': {
      const it = s.items || [];
      if (it.length)
        return {
          l: `Empty net (${it.length} items)`,
          i: 'net',
          f: () => {
            const o = {};
            for (const t of it) {
              const l = rollLoot(t);
              for (const k in l) o[k] = (o[k] || 0) + l[k];
            }
            give(o);
            G.st.stats.debris += it.length;
            s.items = [];
            audio.play('pickup');
          },
        };
      return { l: 'Debris Net — empty', i: 'net', off: 1 };
    }
    case 'smoker': {
      if (s.done)
        return {
          l: `Collect smoked fish ×${s.done}`,
          i: 'smoked',
          f: () => {
            give({ smokedFish: s.done });
            s.done = 0;
            audio.play('pickup');
          },
        };
      const room = 6 * CAP() - (s.q | 0);
      if (I.rawFish > 0 && room > 0)
        return {
          l: `Load raw fish ×${Math.min(room, I.rawFish)}${s.q ? ` (${s.q} smoking)` : ''}`,
          i: 'fire',
          f: () => {
            const n = Math.min(room, I.rawFish);
            I.rawFish -= n;
            s.q = (s.q | 0) + n;
            audio.play('sizzle');
          },
        };
      if (s.q) return { l: `Smoking ${s.q} fish… ${Math.round((s.t || 0) * 100)}%`, i: 'fire', off: 1 };
      return { l: 'Smokehouse — needs raw fish', i: 'fire', off: 1 };
    }
    case 'pearl': {
      const n = s.n | 0;
      if (n > 0)
        return {
          l: `Harvest pearls ×${n}`,
          i: 'pearl',
          f: () => {
            give({ pearl: n });
            s.n -= n;
            audio.play('pickup');
            parts.splash(...splashAt(b));
          },
        };
      return { l: `Pearl Bed — growing ${Math.round((s.n % 1) * 100)}%`, i: 'pearl', off: 1 };
    }
    case 'winch': {
      const it = s.items || [];
      if (it.length)
        return {
          l: `Empty auto winch (${it.length} items)`,
          i: 'hook',
          f: () => {
            const o = {};
            for (const t of it) {
              const l = rollLoot(t);
              for (const k in l) o[k] = (o[k] || 0) + l[k];
            }
            give(o);
            G.st.stats.debris += it.length;
            s.items = [];
            audio.play('pickup');
          },
        };
      return { l: 'Auto Winch — reeling in debris…', i: 'hook', off: 1 };
    }
    case 'sprinkler': {
      if (I.water > 0 && (s.w || 0) < 5)
        return {
          l: `Fill sprinkler (1 water) · tank ${Math.floor(s.w || 0)}/6`,
          i: 'drop',
          f: () => {
            I.water--;
            s.w = (s.w || 0) + 1;
            audio.play('drink');
          },
        };
      return { l: `Sprinkler · tank ${Math.floor(s.w || 0)}/6 — waters nearby planters`, i: 'drop', off: 1 };
    }
    case 'buoy': {
      if (s.c | 0)
        return {
          l: `Collect sales ${s.c | 0} coins`,
          i: 'coin',
          f: () => {
            const c = s.c | 0;
            give({ coins: c });
            G.st.stats.earned += c;
            s.c = 0;
            audio.play('coin');
          },
        };
      return { l: 'Trade Buoy — auto-sells spare pearls, smoked fish, crops & scrap', i: 'coin', off: 1 };
    }
    case 'lamp':
      return {
        l: s.off ? 'Light lantern' : 'Snuff lantern',
        i: 'lamp',
        f: () => {
          s.off = !s.off;
          audio.play('click');
        },
      };
  }
}
export function splashAt(b) {
  const [di, dj] = b.data.dir || [0, 1];
  const p = worldPos(b.data.tile[0] * T + di * 1.5, 0, b.data.tile[1] * T + dj * 1.5);
  return [p.x, p.z];
}
