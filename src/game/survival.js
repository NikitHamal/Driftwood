import { clamp } from '../core/util.js';
import { audio, env, raft } from '../render/stage.js';
import { PA } from '../world/entities.js';
import { G } from '../core/store.js';
import { pl } from './state.js';
import { fadeOut, respawnSpot, saveGame, toTitle } from './session.js';
import { cancelFish } from './fishing.js';
import { banner, pickup, toast } from '../ui/hud.js';
import { closeModal, openModal } from '../ui/modals.js';

G.warned = {};
export function updateSurvival(dt) {
  const v = G.st.vit,
    k = G.st.mode === 'cozy' ? 0.5 : 1,
    heat = env.sunUp > 0.3 && env.rainK < 0.3 ? 1.15 : 1;
  v.food = clamp(v.food - dt * 0.24 * k, 0, 100);
  v.water = clamp(v.water - dt * 0.32 * k * heat, 0, 100);
  if (v.food <= 0 || v.water <= 0) v.hp -= dt * ((v.food <= 0 ? 0.6 : 0) + (v.water <= 0 ? 0.9 : 0)) * k;
  else if (v.food > 45 && v.water > 45) v.hp = Math.min(100, v.hp + dt * 0.35);
  for (const n of ['food', 'water']) {
    if (v[n] < 20 && !G.warned[n]) {
      G.warned[n] = 1;
      banner(
        n === 'food' ? 'You’re starving' : 'You’re very thirsty',
        n === 'food' ? 'Eat something soon (5)' : 'Drink fresh water soon (6)',
        'warn',
      );
      audio.play('warn');
    }
    if (v[n] > 35) G.warned[n] = 0;
  }
  if (v.hp <= 0) {
    v.hp = 0;
    die();
  }
}
export function eat() {
  const I = G.st.inv,
    v = G.st.vit;
  let o = null;
  if (I.cookedFish > 0) o = ['cookedFish', 32, 0, 6];
  else if (I.smokedFish > 0) o = ['smokedFish', 40, -4, 8];
  else if (I.melon > 0) o = ['melon', 22, 18, 2];
  else if (I.potato > 0) o = ['potato', 14, 0, 1];
  else if (I.rawFish > 0) o = ['rawFish', 9, -6, -6];
  if (!o) {
    toast('You have nothing to eat');
    audio.play('fail');
    return;
  }
  if (v.food >= 98) {
    toast('You’re not hungry');
    return;
  }
  I[o[0]]--;
  v.food = Math.min(100, v.food + o[1]);
  v.water = clamp(v.water + o[2], 0, 100);
  v.hp = clamp(v.hp + o[3], 0, 100);
  if (o[0] === 'cookedFish') G.st.stats.ate++;
  pickup(o[0], -1);
  PA.play('eat', 0.9);
  audio.play('eat');
  if (o[0] === 'rawFish') toast('Raw fish… not your best idea');
  G.hudDirty = true;
}
export function drink() {
  const I = G.st.inv,
    v = G.st.vit;
  if (I.water <= 0) {
    toast('No fresh water — use a purifier');
    audio.play('fail');
    return;
  }
  if (v.water >= 98) {
    toast('You’re not thirsty');
    return;
  }
  I.water--;
  v.water = Math.min(100, v.water + 38);
  G.st.stats.drank++;
  pickup('water', -1);
  PA.play('drink', 0.9);
  audio.play('drink');
  G.hudDirty = true;
}
export function die() {
  if (G.curModal) closeModal();
  cancelFish();
  pl.lock = 99;
  openModal(
    `<h2>You passed out</h2><p class="sub">The sea is unforgiving. You wake up on your raft some hours later, weak but alive.</p><p style="font-weight:700;color:var(--mut)">Some of your loose materials washed overboard.</p><div class="btns"><button class="btn" data-a="menu">Main menu</button><button class="btn pri" data-a="wake">Wake up</button></div>`,
    { closable: false },
  )
    .querySelectorAll('[data-a]')
    .forEach(
      (b) =>
        (b.onclick = () => {
          for (const k of ['wood', 'plastic', 'fiber', 'scrap', 'rawFish']) G.st.inv[k] = Math.floor(G.st.inv[k] * 0.7);
          G.st.vit = { hp: 60, food: 55, water: 55 };
          G.st.clock += 0.15;
          pl.lock = 0;
          closeModal();
          if (b.dataset.a === 'menu') {
            saveGame();
            toTitle();
          } else {
            fadeOut(() => {
              pl.x = 0;
              pl.z = 2.5;
              pl.l = 0;
              if (!raft.walkable(0, 2.5, 0)) respawnSpot();
            });
          }
        }),
    );
}
