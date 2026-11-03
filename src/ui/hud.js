import * as THREE from '../../vendor/three.module.js';
import { fmtTime } from '../core/util.js';
import { BP, DECK } from '../world/models.js';
import { T } from '../world/raft.js';
import { ICON, ITEM } from './icons.js';
import { $ } from './dom.js';
import { audio, camera, env, raft, settings } from '../render/stage.js';
import { QUESTS } from '../game/data.js';
import { G } from '../core/store.js';
import { pl } from '../game/state.js';
import { has, lvlOf, xpFor } from '../game/economy.js';
import { worldPos } from '../world/spatial.js';
import { bStatus } from '../game/stations.js';
import { BKEYS, locked } from '../game/building.js';
import { sh } from '../world/shark.js';
import { boatS } from '../world/trader.js';
import { qProg } from '../game/quests.js';
import { setCam } from '../input/camera.js';
import { interact } from '../game/interact.js';
import { selectSlot } from '../game/tools.js';
import { openInventory, openPause } from './modals.js';

G.hudDirty = true;
G.hudT = 0;
export const ic = (n) => ICON[n] || '';
export function pickup(k, n) {
  const it = ITEM[k];
  if (!it) return;
  const d = document.createElement('div');
  d.className = 'pk' + (n < 0 ? ' neg' : '');
  d.innerHTML = `<i style="color:${it.color}">${ic(it.icon)}</i><b>${n > 0 ? '+' : ''}${n}</b> ${it.name}`;
  const c = $('#pickups');
  c.appendChild(d);
  while (c.children.length > 5) c.firstChild.remove();
  setTimeout(() => d.remove(), 3100);
  if (k === 'coins' && n > 0) audio.play('coin');
}
export function toast(t) {
  const d = document.createElement('div');
  d.className = 'pk';
  d.innerHTML = `<span style="color:var(--mut)">${t}</span>`;
  $('#pickups').appendChild(d);
  setTimeout(() => d.remove(), 3100);
}
export function banner(t, s, cls, short) {
  const b = $('#banner');
  b.innerHTML = `<div class="bn ${cls || ''}"><div class="bt">${t}</div>${s ? `<div class="bs">${s}</div>` : ''}</div>`;
  if (short) {
    const el = b.firstChild;
    el.style.animation = 'bnin .3s, pkout .3s 1.1s forwards';
  }
}
export const RES = ['coins', 'wood', 'plastic', 'fiber', 'scrap'];
export function buildHUD() {
  $('#res').innerHTML = RES.map(
    (k) =>
      `<div class="rs ${k === 'coins' ? 'coin' : ''}" data-r="${k}" title="${ITEM[k].name}"><i style="color:${ITEM[k].color}">${ic(ITEM[k].icon)}</i><span>0</span></div>`,
  ).join('');
  $('#btnCam').innerHTML = ic('cam');
  $('#btnInv').innerHTML = ic('bag');
  $('#btnPause').innerHTML = ic('pause');
  const ring = (c) =>
    `<svg class="ring" viewBox="0 0 60 60"><circle cx="30" cy="30" r="26" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="5"/><circle class="rv" cx="30" cy="30" r="26" fill="none" stroke="${c}" stroke-width="5" stroke-linecap="round" stroke-dasharray="163.4" stroke-dashoffset="0"/></svg>`;
  $('#vitals').innerHTML = [
    ['hp', 'heart', 'var(--hp)', 'Health'],
    ['food', 'food', 'var(--food)', 'Hunger'],
    ['water', 'drop', 'var(--wat)', 'Thirst'],
  ]
    .map(
      ([k, i, c, n]) =>
        `<div class="vit" data-v="${k}" title="${n}">${ring(c)}<i class="ic" style="color:${c}">${ic(i)}</i><div class="num">100</div></div>`,
    )
    .join('');
  const slots = [
    ['hook', 'hook', 'Hook', '1'],
    ['rod', 'rod', 'Fishing Rod', '2'],
    ['hammer', 'hammer', 'Build', '3'],
    ['seeds', 'seed', 'Seeds', '4'],
    ['eat', 'eat', 'Eat', '5'],
    ['drink', 'water', 'Drink', '6'],
  ];
  $('#hotbar').innerHTML = slots
    .map(
      ([id, i, n, k]) =>
        `<button class="slot" data-s="${id}"><span class="k">${k}</span><i>${ic(i)}</i><span class="c"></span><span class="nm">${n}</span></button>`,
    )
    .join('');
  $('#hotbar')
    .querySelectorAll('.slot')
    .forEach((b) => (b.onclick = () => selectSlot(b.dataset.s)));
  $('#btnCam').onclick = () => {
    setCam((settings.cam | 0) + 1);
    audio.play('click');
  };
  $('#btnInv').onclick = () => openInventory();
  $('#btnPause').onclick = () => openPause();
  $('#prompt').onclick = () => interact();
}
export function updateHUD() {
  const t = G.st.clock % 1,
    night = env.night > 0.5,
    rain = G.st.weather.type === 'rain';
  $('#clkDay').textContent = `Day ${Math.floor(G.st.clock)}`;
  {
    const L = lvlOf(G.st.xp),
      a = xpFor(L),
      b2 = xpFor(L + 1);
    $('#rnL').textContent = `Renown ${L}`;
    $('#rnB').style.width = `${(((G.st.xp || 0) - a) / (b2 - a)) * 100}%`;
  }
  $('#clkTime').textContent = fmtTime(t);
  $('#clkWx').textContent = rain ? 'Rain' : night ? 'Night' : t < 0.3 ? 'Dawn' : t > 0.74 ? 'Dusk' : 'Clear';
  const ci = $('#clkIco'),
    want = rain ? 'rain' : night ? 'moon' : 'sun';
  if (ci.dataset.i !== want) {
    ci.dataset.i = want;
    ci.innerHTML = ic(want);
    ci.className = 'clk-ico ' + (rain ? 'rain' : night ? 'night' : '');
  }
  for (const k of RES) {
    const el = $(`.rs[data-r="${k}"] span`);
    const v = String(G.st.inv[k] | 0);
    if (el.textContent !== v) {
      el.textContent = v;
      el.parentElement.classList.add('flash');
      setTimeout(() => el.parentElement.classList.remove('flash'), 300);
    }
  }
  for (const k of ['hp', 'food', 'water']) {
    const v = G.st.vit[k],
      el = $(`.vit[data-v="${k}"]`);
    el.querySelector('.rv').style.strokeDashoffset = 163.4 * (1 - v / 100);
    el.querySelector('.num').textContent = Math.ceil(v);
    el.classList.toggle('low', v < 20);
  }
  const cnt = {
    seeds: G.st.inv[G.st.seedSel === 'melon' ? 'seedMelon' : 'seedPotato'] | 0,
    eat: (G.st.inv.cookedFish + G.st.inv.potato + G.st.inv.melon + G.st.inv.rawFish) | 0,
    drink: G.st.inv.water | 0,
  };
  $('#hotbar')
    .querySelectorAll('.slot')
    .forEach((b) => {
      const s = b.dataset.s;
      b.classList.toggle('on', s === pl.tool || (s === 'hammer' && G.buildOn));
      const c = b.querySelector('.c');
      c.textContent = s in cnt ? cnt[s] : '';
      b.classList.toggle('dim', s in cnt && !cnt[s]);
      if (s === 'seeds')
        b.querySelector('.nm').textContent = G.st.seedSel === 'melon' ? 'Melon Seeds (4 to switch)' : 'Potato Seeds (4 to switch)';
    });
  const q = QUESTS[G.st.quest];
  if (q) {
    const p = Math.min(q.n, qProg(q));
    $('#quest').innerHTML =
      `<div class="q-lab"><i>${ic('quest')}</i>Objective ${G.st.quest + 1}/${QUESTS.length}</div><div class="q-t">${q.t}</div><div class="q-d">${q.d}</div><div class="q-bar"><i style="width:${(p / q.n) * 100}%"></i></div><div class="q-foot"><span>${p} / ${q.n}</span><span>Reward: ${Object.entries(
        q.r,
      )
        .map(([k, v]) => `${v} ${ITEM[k].name.toLowerCase()}`)
        .join(', ')}</span></div>`;
  } else
    $('#quest').innerHTML =
      `<div class="q-lab"><i>${ic('star')}</i>Free play</div><div class="q-t">Master of the sea</div><div class="q-d">All objectives complete. Keep expanding your floating home!</div>`;
}
export function renderBuildbar() {
  $('#buildbar').innerHTML = BKEYS.map((k) => {
    if (k === 'demolish')
      return `<button class="bc ${G.bsel === k ? 'on' : ''}" data-b="${k}"><div class="bi" style="color:var(--bad)">${ic('trash')}</div><div class="bn2">Demolish</div><div class="cost"><span style="color:var(--mut)">50% refund</span></div></button>`;
    const b = BP[k],
      lk = locked(k),
      ok = has(b.cost);
    return `<button class="bc ${G.bsel === k ? 'on' : ''} ${ok && !lk ? '' : 'no'} ${lk ? 'lock' : ''}" data-b="${k}" title="${b.desc}"><div class="bi">${ic(b.icon)}</div><div class="bn2">${b.name}</div><div class="cost">${Object.entries(
      b.cost,
    )
      .map(
        ([r, v]) =>
          `<span class="${(G.st.inv[r] | 0) >= v ? '' : 'lack'}"><i style="color:${ITEM[r].color}">${ic(ITEM[r].icon)}</i>${v}</span>`,
      )
      .join('')}</div></button>`;
  }).join('');
  $('#buildbar')
    .querySelectorAll('.bc')
    .forEach(
      (e) =>
        (e.onclick = () => {
          G.bsel = e.dataset.b;
          audio.play('click');
          renderBuildbar();
        }),
    );
}
export const mkPool = [];
export const _v = new THREE.Vector3();
export function updateMarkers() {
  const list = [];
  if (G.mode === 'play') {
    for (const b of raft.bmap.values()) {
      const s = bStatus(b);
      if (!s) continue;
      let p;
      if (BP[b.data.type].edge) {
        const [di, dj] = b.data.dir;
        p = worldPos(b.data.tile[0] * T + di * 0.9, DECK + 1.3, b.data.tile[1] * T + dj * 0.9);
      } else p = worldPos(b.data.tile[0] * T, DECK + (b.data.type === 'rain' ? 1.9 : 1.4), b.data.tile[1] * T);
      list.push({ p, ...s });
    }
    if (sh.st === 'attack' || sh.st === 'approach')
      list.push({ p: new THREE.Vector3(sh.x, 1.4, sh.z), warn: 1, icon: 'shark', lab: 'Shark!' });
    if (boatS.st === 'docked') list.push({ p: new THREE.Vector3(boatS.x, 3.8, boatS.z), icon: 'boat', lab: 'Marlo · Trader' });
  }
  const W = innerWidth,
    H = innerHeight;
  let n = 0;
  for (const m of list) {
    _v.copy(m.p).project(camera);
    if (_v.z > 1 || Math.abs(_v.x) > 1.1 || Math.abs(_v.y) > 1.1) continue;
    let el = mkPool[n];
    if (!el) {
      el = document.createElement('div');
      el.className = 'mk';
      el.innerHTML =
        '<div class="b"><svg class="pr" viewBox="0 0 40 40"><circle cx="20" cy="20" r="17" fill="none" stroke="rgba(255,255,255,.15)" stroke-width="3"/><circle class="pv" cx="20" cy="20" r="17" fill="none" stroke="#ffd166" stroke-width="3" stroke-linecap="round" stroke-dasharray="106.8"/></svg><span class="ico"></span></div><div class="l"></div>';
      $('#markers').appendChild(el);
      mkPool.push(el);
    }
    n++;
    el.style.display = '';
    el.style.left = (_v.x * 0.5 + 0.5) * W + 'px';
    el.style.top = (-_v.y * 0.5 + 0.5) * H + 'px';
    el.className = 'mk' + (m.ready ? ' ready' : '') + (m.warn ? ' warn' : '');
    const key = m.icon;
    if (el.dataset.i !== key) {
      el.dataset.i = key;
      el.querySelector('.ico').innerHTML = ic(key);
    }
    const pr = el.querySelector('svg.pr'),
      pv = el.querySelector('.pv');
    const lab = el.querySelector('.l');
    const txt = m.lab || (m.n > 1 ? `×${m.n}` : '');
    lab.textContent = txt;
    lab.style.display = txt ? '' : 'none';
    if (m.ready || m.warn || m.lab) {
      pr.style.display = 'none';
    } else {
      pr.style.display = '';
      pv.style.strokeDashoffset = 106.8 * (1 - (m.pf || 0));
    }
  }
  for (let i = n; i < mkPool.length; i++) mkPool[i].style.display = 'none';
}
