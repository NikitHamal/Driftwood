import * as THREE from '../../vendor/three.module.js';
import { T } from '../world/raft.js';
import { $ } from '../ui/dom.js';
import { audio, camera, canvas, raft, settings } from '../render/stage.js';
import { shark } from '../world/entities.js';
import { G } from '../core/store.js';
import { pl } from '../game/state.js';
import { playerWorld } from '../world/spatial.js';
import { debris } from '../world/debris.js';
import { cancelFish, fish, fishClick, startCast } from '../game/fishing.js';
import { hk, throwHook } from '../game/hook.js';
import { cancelBuild, placeBuild } from '../game/building.js';
import { scareShark, sh } from '../world/shark.js';
import { joy, keys } from './controls.js';
import { cam, isFP, lookDelta, resetZoom, setCam, wheelZoom } from './camera.js';
import { interact } from '../game/interact.js';
import { toast } from '../ui/hud.js';
import { selectSlot } from '../game/tools.js';
import { closeModal, openHowto, openInventory, openNewWorld, openPause, openSettings } from '../ui/modals.js';
import { hasSave, saveGame, startGame } from '../game/session.js';

export const isTouch = matchMedia('(pointer:coarse)').matches;
export const ray = new THREE.Raycaster();
export const mouse = { ndc: new THREE.Vector2(), inside: false, x: 0, y: 0 };
G.drag = null;
G.hoverD = null;

// ---- pointer lock ----------------------------------------------------------------------------------------------
// First person always uses pointer lock (no visible cursor, relative look). In third person the cursor stays free;
// dragging temporarily locks it so the pointer can never hit the window edge while orbiting.
const isLocked = () => document.pointerLockElement === canvas;
export function requestLock() {
  if (isTouch || isLocked() || !canvas.requestPointerLock) return;
  try {
    const r = canvas.requestPointerLock();
    if (r && r.catch) r.catch(() => {});
  } catch (e) {
    /* lock refused (e.g. no user gesture) */
  }
}
export function releaseLock() {
  if (isLocked()) document.exitPointerLock();
}
const centerAim = () => {
  mouse.ndc.set(0, 0);
  mouse.x = innerWidth / 2;
  mouse.y = innerHeight / 2;
  mouse.inside = true;
};
const canLook = () => G.mode === 'play' && !G.curModal;
let wasLocked = false;
document.addEventListener('pointerlockchange', () => {
  const now = isLocked();
  if (now && isFP()) centerAim();
  // leaving the lock with Esc while playing in first person opens the pause menu
  if (wasLocked && !now && isFP() && canLook()) openPause();
  wasLocked = now;
});
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
canvas.addEventListener('pointerdown', (e) => {
  audio.init();
  if (!canLook()) return;
  if (isFP() && !isTouch) {
    if (!isLocked()) return requestLock();
    if (e.button === 0) worldClick();
    else if (e.button === 2 && G.buildOn) cancelBuild();
    else if (e.button === 1) resetZoom();
    return;
  }
  G.drag = { x: e.clientX, y: e.clientY, b: e.button, moved: false, id: e.pointerId };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (isLocked()) {
    if (canLook()) lookDelta(e.movementX, e.movementY);
    if (isFP()) centerAim();
    else if (G.drag) G.drag.moved = true;
    return;
  }
  mouse.x = e.clientX;
  mouse.y = e.clientY;
  mouse.ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  mouse.inside = true;
  if (G.drag && G.drag.id === e.pointerId) {
    const dx = e.clientX - G.drag.x,
      dy = e.clientY - G.drag.y;
    if (!G.drag.moved && Math.hypot(dx, dy) > 5) {
      G.drag.moved = true;
      requestLock();
    }
    if (G.drag.moved && canLook()) lookDelta(e.movementX, e.movementY);
  }
});
canvas.addEventListener('pointerup', () => {
  if (!G.drag) return;
  const d = G.drag;
  G.drag = null;
  if (!isFP()) releaseLock();
  if (d.moved || !canLook()) return;
  if (d.b === 2) {
    if (G.buildOn) cancelBuild();
    return;
  }
  if (d.b === 0) worldClick();
});
canvas.addEventListener('pointerleave', () => {
  if (!isLocked()) mouse.inside = false;
});
canvas.addEventListener(
  'wheel',
  (e) => {
    if (!canLook()) return;
    e.preventDefault();
    wheelZoom(e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY);
  },
  { passive: false },
);
export function pickDebris() {
  ray.setFromCamera(mouse.ndc, camera);
  const objs = debris.filter((d) => d.st === 'float').map((d) => d.obj);
  const hits = ray.intersectObjects(objs, true);
  if (hits.length) {
    let o = hits[0].object;
    while (o && !o.userData.ref) o = o.parent;
    if (o) return o.userData.ref;
  }
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
    p = new THREE.Vector3();
  if (!ray.ray.intersectPlane(plane, p)) return null;
  let best = null,
    bd = 1.4;
  for (const d of debris) {
    if (d.st !== 'float') continue;
    const dd = Math.hypot(d.x - p.x, d.z - p.z);
    if (dd < bd) {
      bd = dd;
      best = d;
    }
  }
  return best;
}
export function waterPoint() {
  ray.setFromCamera(mouse.ndc, camera);
  const p = new THREE.Vector3();
  if (!ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), p)) return null;
  const l = raft.group.worldToLocal(p.clone());
  const i = Math.round(l.x / T),
    j = Math.round(l.z / T);
  if (raft.has(i, j) && Math.abs(l.x - i * T) < T / 2 + 0.2 && Math.abs(l.z - j * T) < T / 2 + 0.2) return null;
  return p;
}
export function sharkHit() {
  if (sh.st !== 'attack' && sh.st !== 'approach') return false;
  ray.setFromCamera(mouse.ndc, camera);
  const h = ray.intersectObject(shark.root, true);
  if (!h.length) {
    const p = new THREE.Vector3();
    if (!ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), p) || Math.hypot(p.x - sh.x, p.z - sh.z) > 2) return false;
  }
  const pw = playerWorld();
  if (Math.hypot(pw.x - sh.x, pw.z - sh.z) > 7) {
    toast('Get closer to the shark!');
    return true;
  }
  scareShark();
  return true;
}
export function worldClick() {
  if (pl.climb) return;
  if (fish.st === 'bite' || fish.st === 'mini') {
    fishClick();
    return;
  }
  if (G.buildOn) {
    placeBuild();
    return;
  }
  if (pl.tool === 'hook' || pl.tool === 'rod') {
    if (sharkHit()) return;
  }
  if (pl.tool === 'hook') {
    if (hk.st !== 'none' || pl.lock > 0) return;
    const d = pickDebris();
    if (d) throwHook(d);
    return;
  }
  if (pl.tool === 'rod') {
    if (fish.st !== 'none') {
      fishClick();
      return;
    }
    if (pl.lock > 0) return;
    if (pl.l === 1) {
      toast('Climb down to fish');
      return;
    }
    const p = waterPoint();
    if (p) startCast(p);
    else toast('Click on open water to cast');
    return;
  }
  if (pl.tool === 'seeds') {
    toast('Walk to a Planter and press E to plant');
  }
}
addEventListener('keydown', (e) => {
  audio.init();
  if (e.target.tagName === 'INPUT') return;
  if (e.code === 'Tab') {
    e.preventDefault();
    if (G.mode === 'play') {
      if (G.curModal) closeModal();
      else openInventory();
    }
    return;
  }
  if (e.code === 'Escape') {
    if (G.curModal) {
      if (G.curModal.closable) closeModal();
      return;
    }
    if (G.buildOn) {
      cancelBuild();
      return;
    }
    if (fish.st !== 'none') {
      cancelFish();
      return;
    }
    openPause();
    return;
  }
  if (G.mode !== 'play' || G.curModal) return;
  keys.add(e.code);
  if (e.code === 'KeyE') interact();
  if (e.code === 'Space') {
    e.preventDefault();
    if (fish.st === 'bite' || fish.st === 'mini') fishClick();
  }
  if (e.code === 'KeyB') selectSlot('hammer');
  if (e.code === 'KeyC') {
    setCam((settings.cam | 0) + 1);
    audio.play('click');
  }
  if (e.code === 'KeyI') openInventory();
  if (e.code === 'KeyZ') cam.zoomHold = true;
  const n = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6'].indexOf(e.code);
  if (n >= 0) selectSlot(['hook', 'rod', 'hammer', 'seeds', 'eat', 'drink'][n]);
});
addEventListener('keyup', (e) => {
  keys.delete(e.code);
  if (e.code === 'KeyZ') cam.zoomHold = false;
});
addEventListener('blur', () => {
  keys.clear();
  cam.zoomHold = false;
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) saveGame();
});
addEventListener('beforeunload', saveGame);
{
  const j = $('#joy'),
    k = $('#joyKnob');
  let id = null;
  j.addEventListener('pointerdown', (e) => {
    id = e.pointerId;
    j.setPointerCapture(id);
    mv(e);
  });
  j.addEventListener('pointermove', (e) => {
    if (e.pointerId === id) mv(e);
  });
  const end = () => {
    id = null;
    joy.x = joy.y = 0;
    k.style.transform = '';
  };
  j.addEventListener('pointerup', end);
  j.addEventListener('pointercancel', end);
  function mv(e) {
    const r = j.getBoundingClientRect(),
      dx = (e.clientX - r.left - r.width / 2) / (r.width / 2),
      dy = (e.clientY - r.top - r.height / 2) / (r.height / 2),
      l = Math.max(1, Math.hypot(dx, dy));
    joy.x = dx / l;
    joy.y = dy / l;
    k.style.transform = `translate(${joy.x * 34}px,${joy.y * 34}px)`;
  }
  $('#mobUse').onclick = () => {
    if (fish.st === 'bite' || fish.st === 'mini') fishClick();
    else interact();
  };
}
$('#mainMenu').addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  audio.init();
  audio.play('click');
  const a = b.dataset.act;
  if (a === 'continue') {
    const s = hasSave();
    if (s) startGame(s, false);
  }
  if (a === 'new') openNewWorld();
  if (a === 'settings') openSettings();
  if (a === 'howto') openHowto();
});
$('#mainMenu').addEventListener('pointerover', (e) => {
  if (e.target.closest('.mbtn')) audio.play('hover');
});

/** Context-sensitive controls hint + crosshair visibility. */
export function updateControlsHint() {
  const fp = isFP(),
    locked = isLocked();
  $('#cross').hidden = !(fp && locked);
  const k = (t) => `<b>${t}</b>`;
  $('#hint').innerHTML = isTouch
    ? ''
    : fp
      ? locked
        ? `${k('WASD')} move · ${k('Mouse')} look · ${k('Scroll')} zoom · ${k('Z')} spyglass · ${k('E')} interact · ${k('C')} camera · ${k('Esc')} menu`
        : `${k('Click')} to capture the mouse and look around`
      : `${k('WASD')} move · ${k('Drag')} look · ${k('Scroll')} dolly · ${k('Z')} zoom · ${k('E')} interact · ${k('C')} camera · ${k('Tab')} bag`;
}
