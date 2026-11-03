import * as THREE from '../../vendor/three.module.js';
import { clamp, lerp, rr } from '../core/util.js';
import { waveHeight } from '../core/waves.js';
import { $ } from '../ui/dom.js';
import { audio, parts } from '../render/stage.js';
import { bobber, fishLine, lineGeo, P, PA } from '../world/entities.js';
import { FISH } from './data.js';
import { G } from '../core/store.js';
import { pl } from './state.js';
import { give } from './economy.js';
import { playerWorld } from '../world/spatial.js';
import { banner, toast } from '../ui/hud.js';

export const fish = {
  st: 'none',
  t: 0,
  x: 0,
  z: 0,
  from: new THREE.Vector3(),
  wait: 0,
  mk: 0,
  dir: 1,
  zone: 0.5,
  zw: 0.2,
  sp: 1,
  sp2: null,
};
export function startCast(p) {
  const pw = playerWorld(),
    d = Math.hypot(p.x - pw.x, p.z - pw.z);
  if (d < 2.5) {
    toast('Cast further out into the water');
    return;
  }
  if (d > 16) {
    toast('Too far — cast closer');
    return;
  }
  pl.face = Math.atan2(p.x - pw.x, p.z - pw.z);
  fish.st = 'cast';
  fish.t = 0;
  fish.x = p.x;
  fish.z = p.z;
  PA.hold = 'rod';
  PA.play('cast', 0.6);
  audio.play('cast');
  pl.lock = 0.6;
}
export function cancelFish(msg) {
  if (fish.st === 'none') return;
  fish.st = 'none';
  bobber.visible = false;
  fishLine.visible = false;
  $('#fishbar').hidden = true;
  PA.hold = null;
  if (msg) toast(msg);
}
export function rollFish() {
  const w = FISH.map((f, i) => f.w * (i >= 2 ? 1 + G.st.up.rod * 0.8 : 1));
  let tot = w.reduce((a, b) => a + b),
    r = Math.random() * tot;
  for (let i = 0; i < FISH.length; i++) {
    r -= w[i];
    if (r <= 0) return FISH[i];
  }
  return FISH[0];
}
export function updateFish(dt) {
  if (fish.st === 'none') {
    if (G.mode === 'title') {
    }
    return;
  }
  fish.t += dt;
  const tip = P.rodTip.getWorldPosition(new THREE.Vector3());
  if (fish.st === 'cast') {
    if (fish.t > 0.3) {
      if (!fish.sp2) {
        fish.sp2 = tip.clone();
      }
      const k = clamp((fish.t - 0.3) / 0.6, 0, 1);
      bobber.visible = true;
      const p = fish.sp2.clone().lerp(new THREE.Vector3(fish.x, 0, fish.z), k);
      p.y += Math.sin(k * Math.PI) * 3 * (1 - k * 0.3);
      if (k >= 1) {
        p.y = waveHeight(fish.x, fish.z);
        fish.st = 'wait';
        fish.t = 0;
        fish.wait = rr(3.5, 9) / (1 + G.st.up.rod * 0.35);
        parts.splash(fish.x, fish.z, 0.5);
        audio.play('splash');
        fish.sp2 = null;
      }
      bobber.position.copy(p);
    }
  } else if (fish.st === 'wait') {
    bobber.position.set(fish.x, waveHeight(fish.x, fish.z) + Math.sin(fish.t * 3) * 0.02, fish.z);
    if (fish.t > fish.wait && Math.random() < 0.6) {
      fish.st = 'bite';
      fish.t = 0;
      fish.f = rollFish();
      parts.splash(fish.x, fish.z, 0.7);
      audio.play('bite');
      showFishPrompt();
    } else if (fish.t > fish.wait) {
      fish.wait += 0.8;
    }
  } else if (fish.st === 'bite') {
    bobber.position.set(fish.x, waveHeight(fish.x, fish.z) - 0.12 + Math.sin(fish.t * 30) * 0.04, fish.z);
    if (fish.t > 1.3) {
      cancelFish('It got away…');
      audio.play('fail');
    }
  } else if (fish.st === 'mini') {
    bobber.position.set(fish.x + Math.sin(fish.t * 7) * 0.15, waveHeight(fish.x, fish.z) - 0.08, fish.z + Math.cos(fish.t * 5) * 0.15);
    if (Math.random() < 0.1) parts.splash(bobber.position.x, bobber.position.z, 0.3);
    fish.mk += fish.dir * dt * fish.sp;
    if (fish.mk > 1) {
      fish.mk = 1;
      fish.dir = -1;
    }
    if (fish.mk < 0) {
      fish.mk = 0;
      fish.dir = 1;
    }
    $('#fbMark').style.left = fish.mk * 100 + '%';
    if (fish.t > 6) {
      cancelFish('The line went slack…');
      audio.play('fail');
    }
  }
  if (bobber.visible) {
    fishLine.visible = true;
    const a = lineGeo.attributes.position,
      b = bobber.position;
    for (let i = 0; i <= 20; i++) {
      const k = i / 20;
      a.setXYZ(
        i,
        lerp(tip.x, b.x, k),
        lerp(tip.y, b.y, k) - Math.sin(k * Math.PI) * (fish.st === 'mini' ? 0.05 : 0.4),
        lerp(tip.z, b.z, k),
      );
    }
    a.needsUpdate = true;
  }
}
export function showFishPrompt() {
  banner('Bite!', 'Click now to hook it', null, 1);
}
export function fishClick() {
  if (fish.st === 'bite') {
    fish.st = 'mini';
    fish.t = 0;
    fish.mk = 0;
    fish.dir = 1;
    fish.sp = fish.f.s * (0.95 - G.st.up.rod * 0.08);
    fish.zw = 0.2 + G.st.up.rod * 0.05;
    fish.zone = rr(0.25, 0.75);
    const z = $('#fbZone');
    z.style.left = (fish.zone - fish.zw / 2) * 100 + '%';
    z.style.width = fish.zw * 100 + '%';
    $('#fbTitle').textContent = 'Reel it in!';
    $('#fishbar').hidden = false;
    PA.play('reel', 6);
    audio.play('splash');
    return true;
  }
  if (fish.st === 'mini') {
    $('#fishbar').hidden = true;
    if (Math.abs(fish.mk - fish.zone) <= fish.zw / 2 + 0.015) {
      const f = fish.f;
      give({ rawFish: f.f, ...(f.c ? { coins: f.c } : {}) });
      G.st.stats.fish++;
      banner(`${f.n}!`, f.c ? `A rare catch worth ${f.c} coins` : `+${f.f} raw fish`, 'gold');
      audio.play('catch');
      PA.play('cheer', 1.2);
      parts.splash(fish.x, fish.z, 1.2);
      cancelFish();
    } else {
      cancelFish('It slipped off the hook!');
      audio.play('fail');
    }
    return true;
  }
  if (fish.st === 'wait' || fish.st === 'cast') {
    cancelFish();
    return true;
  }
  return false;
}
