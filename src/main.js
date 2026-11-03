import { ICON } from './ui/icon-set.js';
// Driftwood entry point: boots the stage, builds the UI, starts the loop and exposes a debug handle.
import { $, setLoad } from './ui/dom.js';
import { applyQuality, audio, camera, raft, renderer, scene, settings } from './render/stage.js';
import { PA } from './world/entities.js';
import { freshState, pl } from './game/state.js';
import { G } from './core/store.js';
import { BP } from './world/models.js';
import { give, has } from './game/economy.js';
import { buildHUD } from './ui/hud.js';
import { applyState, refreshTitle, startGame } from './game/session.js';
import { frame } from './game/loop.js';
import { placeBuild, updateGhost } from './game/building.js';
import { fish, fishClick, startCast } from './game/fishing.js';
import { throwHook } from './game/hook.js';
import { drink, eat } from './game/survival.js';
import { interact, sleep } from './game/interact.js';
import { selectSlot } from './game/tools.js';
import { closeModal, openInventory, openPause, openShop } from './ui/modals.js';
import { debris } from './world/debris.js';
import { sh } from './world/shark.js';
import { boatS } from './world/trader.js';
import { cam } from './input/camera.js';

$('#logoBadge').innerHTML = ICON.boat;
buildHUD();
applyState();
PA.hold = 'rod';
pl.x = 1.5;
pl.z = 2.6;
pl.face = 0.6;
audio.vol = { master: settings.master, music: settings.music, sfx: settings.sfx };
$('#fps').hidden = !settings.fps;
setLoad(90, 'Setting the sun…');
renderer.compile(scene, camera);
requestAnimationFrame((t) => {
  G.last = t;
  frame(t);
  setLoad(100, 'Ready');
  setTimeout(() => {
    $('#loading').classList.add('done');
    $('#title').hidden = false;
    refreshTitle();
  }, 350);
});

// Development / test handle. Not a stable API.
window.__dw = {
  throwHook,
  startCast,
  fishClick,
  eat,
  drink,
  give,
  openInventory,
  openPause,
  closeModal,
  sleep,
  updateGhost,
  openShop,
  applyQuality,
  selectSlot,
  interact,
  startGame,
  freshState,
  pl,
  fish,
  sh,
  boatS,
  raft,
  debris,
  camera,
  cam,
  get fishSt() {
    return fish.st;
  },
  get st() {
    return G.st;
  },
  get mode() {
    return G.mode;
  },
  get act() {
    return G.curAct;
  },
  house(level = 3, x = 0.3, z = 0.0, yaw = 0.7) {
    G.st.house = level;
    raft.house.setLevel(level);
    pl.l = 1;
    pl.x = x;
    pl.z = z;
    cam.tyaw = cam.yaw = yaw;
  },
  build(type, i, j) {
    G.bsel = type;
    G.ghostCell = [i, j];
    if (type === 'foundation') G.ghostCell.ok = raft.canFoundation(i, j) && has(BP[type].cost);
    else G.ghostCell.ok = raft.has(i, j) && !raft.occupied(i, j) && has(BP[type].cost) && (!BP[type].edge || !!raft.edgeDir(i, j));
    placeBuild();
  },
};
