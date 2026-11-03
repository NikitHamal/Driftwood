import { pick } from '../core/util.js';
import { ITEM } from './icons.js';
import { $ } from './dom.js';
import { applyQuality, audio, qLevel, saveSettings, settings } from '../render/stage.js';
import { BUY, NAMES, QUESTS, SELL, UPG } from '../game/data.js';
import { freshState, pl } from '../game/state.js';
import { G } from '../core/store.js';
import { give, has } from '../game/economy.js';
import { keys } from '../input/controls.js';
import { banner, ic, pickup } from './hud.js';
import { hasSave, saveGame, startGame, toTitle } from '../game/session.js';
import { crab } from '../world/crab.js';
import { autoQ } from '../game/loop.js';
import { houseLevel, upgradeHouse } from '../game/home.js';
import { HOUSE_LEVELS } from '../world/house.js';

export function openModal(html, { wide = false, closable = true, onClose = null, shop = false } = {}) {
  closeModal(true);
  if (document.pointerLockElement) document.exitPointerLock();
  const back = document.createElement('div');
  back.className = 'modal-back';
  back.innerHTML = `<div class="modal ${wide ? 'wide' : ''}">${html}</div>`;
  $('#modals').appendChild(back);
  G.curModal = { back, closable, onClose, shop };
  back.addEventListener('pointerdown', (e) => {
    if (e.target === back && closable) closeModal();
  });
  back.querySelectorAll('[data-close]').forEach((b) => (b.onclick = () => closeModal()));
  keys.clear();
  return back.firstElementChild;
}
export function closeModal(silent) {
  if (!G.curModal) return;
  const m = G.curModal;
  G.curModal = null;
  m.back.remove();
  if (m.onClose && !silent) m.onClose();
}
export const head = (t, s) =>
  `<div class="mhead"><div><h2>${t}</h2>${s ? `<p class="sub">${s}</p>` : ''}</div><button class="xbtn" data-close aria-label="Close">${ic('close')}</button></div>`;
export function openSettings(back) {
  const m = openModal(
    head('Settings', 'Tune graphics, sound and controls') +
      `
  <div class="row"><span class="lbl">Graphics quality</span><select class="input" id="sQ">${['auto', 'low', 'medium', 'high', 'ultra'].map((q) => `<option value="${q}" ${settings.quality === q ? 'selected' : ''}>${q[0].toUpperCase() + q.slice(1)}${q === 'auto' ? ` (${qLevel})` : ''}</option>`).join('')}</select></div>
  <div class="row"><span class="lbl">Pixel art</span><select class="input" id="sP">${[
    [1, 'Off'],
    [2, 'On · Fine'],
    [3, 'On · Classic'],
    [4, 'On · Chunky'],
  ]
    .map(([v, n]) => `<option value="${v}" ${+settings.pxMode === v ? 'selected' : ''}>${n}</option>`)
    .join('')}</select></div>
  <div class="row"><span class="lbl">Show FPS</span><button class="toggle ${settings.fps ? 'on' : ''}" id="sF" aria-label="Show FPS"></button></div>
  ${[
    ['master', 'Master volume'],
    ['music', 'Music'],
    ['sfx', 'Sound effects'],
    ['sens', 'Camera sensitivity'],
  ]
    .map(
      ([k, n]) =>
        `<div class="row"><span class="lbl">${n}</span><input type="range" min="${k === 'sens' ? 0.3 : 0}" max="${k === 'sens' ? 2 : 1}" step="0.05" value="${settings[k]}" data-k="${k}"></div>`,
    )
    .join('')}
  <div class="btns"><button class="btn pri" data-close>Done</button></div>`,
    { onClose: back },
  );
  m.querySelector('#sQ').onchange = (e) => {
    settings.quality = e.target.value;
    applyQuality(settings.quality === 'auto' ? 'high' : settings.quality);
    autoQ.t = 0;
    autoQ.lock = settings.quality !== 'auto';
    saveSettings();
  };
  m.querySelector('#sP').onchange = (e) => {
    settings.pxMode = +e.target.value;
    applyQuality(qLevel);
    saveSettings();
  };
  m.querySelector('#sF').onclick = (e) => {
    settings.fps = !settings.fps;
    e.target.classList.toggle('on', settings.fps);
    $('#fps').hidden = !settings.fps;
    saveSettings();
  };
  m.querySelectorAll('input[type=range]').forEach(
    (r) =>
      (r.oninput = () => {
        settings[r.dataset.k] = +r.value;
        audio.vol = { master: settings.master, music: settings.music, sfx: settings.sfx };
        audio.apply();
        saveSettings();
      }),
  );
}
export function openHowto(back) {
  openModal(
    head('How to play', 'Survive, gather, grow and expand your floating home') +
      `<div class="keys">
  <div><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> Move</div><div><kbd>Shift</kbd> Run</div><div><kbd>Drag</kbd> Look around</div><div><kbd>Scroll</kbd> Zoom</div>
  <div><kbd>E</kbd> Interact</div><div><kbd>Click</kbd> Use tool</div><div><kbd>1</kbd>–<kbd>6</kbd> Hotbar</div><div><kbd>Tab</kbd> Inventory</div><div><kbd>Space</kbd> Reel fish</div><div><kbd>Esc</kbd> Pause</div></div>
  <ul class="tips"><li>Use the <b>Hook</b> to pull in planks, bottles, fronds, barrels and crates.</li><li>Cast your <b>Rod</b>, wait for the bobber to dip, click, then stop the marker inside the green zone.</li><li>Keep <b>Hunger</b> and <b>Thirst</b> up. When either reaches zero, you start losing health.</li><li>Build a <b>Grill</b>, <b>Purifier</b> and <b>Planters</b>. Nets, traps and stills keep working while you’re away.</li><li>Marlo the merchant visits daily from 09:00 to 15:00. Sell goods and buy upgrades.</li><li>In Survival mode, a shark attacks your raft from time to time. Get close and press <b>E</b>, or click it with the Hook.</li></ul>
  <div class="btns"><button class="btn pri" data-close>Got it</button></div>`,
    { onClose: back },
  );
}
export function openPause() {
  if (G.mode !== 'play') return;
  const m = openModal(
    head('Paused', `${G.st.name} · Day ${Math.floor(G.st.clock)} · ${G.st.mode === 'cozy' ? 'Cozy' : 'Survival'}`) +
      `<div class="pause-menu"><button class="btn pri" data-a="resume">Resume</button><button class="btn" data-a="inv">Inventory & objectives</button><button class="btn" data-a="settings">Settings</button><button class="btn" data-a="howto">How to play</button><button class="btn" data-a="quit">Save & quit to title</button></div>`,
  );
  m.querySelectorAll('[data-a]').forEach(
    (b) =>
      (b.onclick = () => {
        audio.play('click');
        const a = b.dataset.a;
        if (a === 'resume') closeModal();
        if (a === 'inv') openInventory();
        if (a === 'settings') openSettings(openPause);
        if (a === 'howto') openHowto(openPause);
        if (a === 'quit') {
          closeModal();
          saveGame();
          toTitle();
        }
      }),
  );
}
export function openInventory(tab = 'items') {
  if (G.mode !== 'play') return;
  const I = G.st.inv;
  const items = Object.keys(ITEM)
    .filter((k) => k !== 'coins')
    .map(
      (k) =>
        `<div class="it"><i style="color:${ITEM[k].color}">${ic(ITEM[k].icon)}</i><b>${I[k] | 0}</b><span>${ITEM[k].name}</span></div>`,
    )
    .join('');
  const quests = QUESTS.map(
    (q, i) =>
      `<div class="ql ${i < G.st.quest ? 'done' : i === G.st.quest ? 'cur' : 'lock'}"><div class="ck">${i < G.st.quest ? ic('check') : ''}</div><div><div class="qt">${q.t}</div><div class="q-d">${i <= G.st.quest ? q.d : 'Locked'}</div></div></div>`,
  ).join('');
  const S = G.st.stats,
    stats = [
      [Math.floor(G.st.clock), 'Days survived'],
      [G.st.tiles.length, 'Raft tiles'],
      [S.fish, 'Fish caught'],
      [S.debris, 'Debris collected'],
      [S.harvest, 'Crops harvested'],
      [S.earned, 'Coins earned'],
      [S.sharks, 'Sharks scared off'],
      [G.st.b.length, 'Structures built'],
    ]
      .map(([v, n]) => `<div><b>${v}</b><span>${n}</span></div>`)
      .join('');
  const ups =
    UPG.filter((u) => (G.st.up[u.id] | 0) >= u.lv)
      .map(
        (u) =>
          `<div class="ql done"><div class="ck">${ic('check')}</div><div><div class="qt" style="text-decoration:none;opacity:1">${u.name}</div><div class="q-d">${u.desc}</div></div></div>`,
      )
      .join('') || '<p class="sub">No upgrades yet. Visit Marlo the merchant.</p>';
  const m = openModal(
    head('Inventory', `<span class="coinbal"><i>${ic('coin')}</i>${I.coins} coins</span>`) +
      `<div class="tabs">${['items', 'objectives', 'upgrades', 'stats'].map((t) => `<button data-t="${t}" class="${t === tab ? 'on' : ''}">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}</div>
    <div>${tab === 'items' ? `<div class="inv-grid">${items}</div>` : tab === 'objectives' ? quests : tab === 'upgrades' ? ups : `<div class="stats">${stats}</div>`}</div>`,
    { wide: true },
  );
  m.querySelectorAll('[data-t]').forEach(
    (b) =>
      (b.onclick = () => {
        audio.play('click');
        openInventory(b.dataset.t);
      }),
  );
}
export function openShop(tab = 'sell') {
  const I = G.st.inv;
  let body = '';
  if (tab === 'sell')
    body = Object.entries(SELL)
      .map(
        ([k, p]) =>
          `<div class="sh"><i style="color:${ITEM[k].color}">${ic(ITEM[k].icon)}</i><div class="sn"><b>${ITEM[k].name}</b><span>You have ${I[k] | 0}</span></div><div class="price"><i>${ic('coin')}</i>${p}</div><button class="btn" data-sell="${k}" data-n="1" ${I[k] > 0 ? '' : 'disabled'}>Sell 1</button><button class="btn" data-sell="${k}" data-n="all" ${I[k] > 0 ? '' : 'disabled'}>All</button></div>`,
      )
      .join('');
  else if (tab === 'buy')
    body = BUY.map(
      (b) =>
        `<div class="sh"><i style="color:${ITEM[b.id].color}">${ic(ITEM[b.id].icon)}</i><div class="sn"><b>${ITEM[b.id].name}${b.n > 1 ? ` ×${b.n}` : ''}</b><span>You have ${I[b.id] | 0}</span></div><div class="price"><i>${ic('coin')}</i>${b.p}</div><button class="btn pri" data-buy="${b.id}" ${I.coins >= b.p ? '' : 'disabled'}>Buy</button></div>`,
    ).join('');
  else
    body = UPG.map((u, i) => {
      const own = (G.st.up[u.id] | 0) >= u.lv,
        prev = (G.st.up[u.id] | 0) >= u.lv - 1;
      return `<div class="sh"><i style="color:var(--acc)">${ic(u.id === 'rod' ? 'rod' : u.id === 'hook' ? 'hook' : u.id === 'still' ? 'sun' : u.id === 'crab' ? 'crab' : u.id === 'store' ? 'crate' : 'drop')}</i><div class="sn"><b>${u.name}</b><span>${u.desc}</span></div>${own ? `<span class="coinbal" style="background:rgba(123,216,143,.15);color:var(--good)">Owned</span>` : `<div class="price"><i>${ic('coin')}</i>${u.p}</div><button class="btn pri" data-up="${i}" ${I.coins >= u.p && prev ? '' : 'disabled'}>${prev ? 'Buy' : 'Locked'}</button>`}</div>`;
    }).join('');
  const m = openModal(
    head('Marlo’s Floating Market', `<span class="coinbal"><i>${ic('coin')}</i>${I.coins} coins</span>`) +
      `<div class="trader-head"><div class="av">${ic('boat')}</div><q>${pick(['Fine day for trading, sailor! What have you got?', 'Fresh fish fetches a fair price, friend.', 'I sail every current there is. Buy something nice!', 'Careful out there, the sharks are hungry this season.'])}</q></div>
    <div class="tabs">${[
      ['sell', 'Sell'],
      ['buy', 'Buy supplies'],
      ['up', 'Upgrades'],
    ]
      .map(([t, n]) => `<button data-t="${t}" class="${t === tab ? 'on' : ''}">${n}</button>`)
      .join('')}</div><div class="shop-list">${body}</div>`,
    { wide: true, shop: true },
  );
  m.querySelectorAll('[data-t]').forEach(
    (b) =>
      (b.onclick = () => {
        audio.play('click');
        openShop(b.dataset.t);
      }),
  );
  m.querySelectorAll('[data-sell]').forEach(
    (b) =>
      (b.onclick = () => {
        const k = b.dataset.sell,
          n = b.dataset.n === 'all' ? I[k] : 1,
          v = n * SELL[k];
        I[k] -= n;
        I.coins += v;
        G.st.stats.sold += n;
        G.st.stats.earned += v;
        audio.play('coin');
        pickup('coins', v);
        openShop('sell');
      }),
  );
  m.querySelectorAll('[data-buy]').forEach(
    (b) =>
      (b.onclick = () => {
        const it = BUY.find((x) => x.id === b.dataset.buy);
        I.coins -= it.p;
        give({ [it.id]: it.n });
        audio.play('coin');
        openShop('buy');
      }),
  );
  m.querySelectorAll('[data-up]').forEach(
    (b) =>
      (b.onclick = () => {
        const u = UPG[+b.dataset.up];
        I.coins -= u.p;
        G.st.up[u.id] = u.lv;
        if (u.id === 'crab') {
          G.st.stats.crab = 1;
          crab.x = pl.x;
          crab.z = pl.z;
        }
        audio.play('quest');
        banner('Upgrade purchased', u.name, 'gold');
        openShop('up');
      }),
  );
}
export function openNewWorld() {
  const ex = hasSave();
  let md = 'survival';
  const nm = pick(NAMES);
  const m = openModal(
    head('New World', 'Choose how your voyage begins') +
      `<div class="field"><label for="wn">World name</label><input class="input" id="wn" maxlength="24" value="${nm}"></div>
   <div class="field"><label>Game mode</label><div class="seg" id="seg"><button data-m="cozy"><b>Cozy</b><span>Slower hunger, no shark. Relax and build.</span></button><button data-m="survival" class="on"><b>Survival</b><span>The full challenge, with shark attacks.</span></button></div></div>
   ${ex ? `<p class="sub" style="color:#ffc9a8;margin-top:16px">This will replace your current world “${ex.name}” (Day ${Math.floor(ex.clock)}).</p>` : ''}
   <div class="btns"><button class="btn" data-close>Cancel</button><button class="btn pri" id="go">Set sail</button></div>`,
  );
  m.querySelectorAll('#seg button').forEach(
    (b) =>
      (b.onclick = () => {
        md = b.dataset.m;
        m.querySelectorAll('#seg button').forEach((x) => x.classList.toggle('on', x === b));
        audio.play('click');
      }),
  );
  m.querySelector('#go').onclick = () => {
    const n = (m.querySelector('#wn').value || nm).trim().slice(0, 24);
    closeModal();
    audio.play('quest');
    startGame(freshState(n, md), true);
  };
}

export function openHouse() {
  const L = houseLevel(),
    cur = HOUSE_LEVELS[L - 1],
    next = HOUSE_LEVELS[L];
  const costs = next
    ? Object.entries(next.cost)
        .map(
          ([k, v]) =>
            `<span class="${(G.st.inv[k] | 0) >= v ? '' : 'lack'}"><i style="color:${ITEM[k].color}">${ic(ITEM[k].icon)}</i>${v} ${ITEM[k].name}</span>`,
        )
        .join('')
    : '';
  const steps = HOUSE_LEVELS.map(
    (h, i) => `<div class="hl ${i < L ? 'done' : i === L ? 'next' : ''}"><b>${i + 1}</b><span>${h.name}</span></div>`,
  ).join('<i class="hl-sep"></i>');
  const m = openModal(
    head('Blueprint desk', `Level ${L} · ${cur.name}`) +
      `<div class="house-steps">${steps}</div><p class="sub">${cur.desc}</p><p class="perk"><i>${ic('star')}</i>${cur.perk}</p>` +
      (next
        ? `<div class="house-next"><h3>Next: ${next.name}</h3><p class="sub">${next.desc}</p><p class="perk"><i>${ic('star')}</i>${next.perk}</p><div class="cost-row">${costs}</div></div>
           <div class="btns"><button class="btn" data-close>Later</button><button class="btn pri" id="upg" ${has(next.cost) ? '' : 'disabled'}>Upgrade home</button></div>`
        : `<div class="btns"><button class="btn pri" data-close>Lovely</button></div>`),
  );
  const b = m.querySelector('#upg');
  if (b)
    b.onclick = () => {
      if (upgradeHouse()) openHouse();
    };
}
