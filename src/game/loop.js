import * as THREE from '../../vendor/three.module.js';
import { damp, lerp } from '../core/util.js';
import { waveGrad, waveHeight, waveState } from '../core/waves.js';
import { DEBRIS, MAT, timeU } from '../world/models.js';
import { $ } from '../ui/dom.js';
import {
  adaptScale,
  applyIndoor,
  applyQuality,
  applySky,
  audio,
  camera,
  canvas,
  env,
  ocean,
  parts,
  placeSun,
  post,
  qLevel,
  raft,
  rain,
  renderer,
  scene,
  settings,
  sky,
} from '../render/stage.js';
import { bobber, fishLine, hoverRing, lineGeo, P, PA } from '../world/entities.js';
import { pl } from '../game/state.js';
import { G } from '../core/store.js';
import { hookRange } from '../game/economy.js';
import { playerWorld } from '../world/spatial.js';
import { saveGame } from '../game/session.js';
import { updateDebris } from '../world/debris.js';
import { bSig, simBuildings } from '../game/stations.js';
import { fish, updateFish } from '../game/fishing.js';
import { updateHook } from '../game/hook.js';
import { updateGhost } from '../game/building.js';
import { updateSurvival } from '../game/survival.js';
import { updateTime } from '../game/clock.js';
import { updateShark } from '../world/shark.js';
import { updateBoat } from '../world/trader.js';
import { checkQuest } from '../game/quests.js';
import { cam, updateCamera } from '../input/camera.js';
import { updatePlayer } from '../game/player.js';
import { updateCat } from '../world/cat.js';
import { updateAmbient } from '../world/ambient.js';
import { gatherActions } from '../game/interact.js';
import { ic, renderBuildbar, updateHUD, updateMarkers } from '../ui/hud.js';
import { updateCrab } from '../world/crab.js';
import { isTouch, mouse, pickDebris, updateControlsHint } from '../input/input.js';

export const autoQ = { slow: 0, lock: settings.quality !== 'auto' };
G.fpsT = 0;
G.fpsN = 0;
G.markT = 0;
G.sigT = 0;
G.qT = 0;
G.saveT = 0;
export const sigs = new Map();
G.last = performance.now();
export function frame(now) {
  requestAnimationFrame(frame);
  const rdt = Math.min(0.1, (now - G.last) / 1000);
  G.last = now;
  const dt = Math.min(rdt, 0.05);
  G.fpsN++;
  G.fpsT += rdt;
  if (G.fpsT > 0.5) {
    const f = G.fpsN / G.fpsT;
    if (settings.fps) $('#fps').textContent = `${f.toFixed(0)} FPS · ${qLevel} · ${Math.round(post.scale * 100)}% res`;
    if (!autoQ.lock && G.mode === 'play') {
      adaptScale(1000 / f);
      // sustained slow frames at the lowest internal resolution => drop a quality tier
      autoQ.slow = post.scale <= 0.62 && f < 30 ? autoQ.slow + G.fpsT : 0;
      if (autoQ.slow > 4) {
        const order = ['low', 'medium', 'high', 'ultra'],
          i = order.indexOf(qLevel);
        if (i > 0) applyQuality(order[i - 1]);
        autoQ.slow = 0;
      }
    }
    G.fpsN = 0;
    G.fpsT = 0;
  }
  const playing = G.mode === 'play' && !G.curModal;
  waveState.time += dt;
  timeU.value = waveState.time;
  if (playing) {
    updateTime(dt);
    G.st.play += dt;
  } else if (G.mode === 'title') {
    G.st.clock = 1.42 + Math.sin(now * 0.00002) * 0.02;
  }
  const raining = G.st.weather.type === 'rain' && G.mode === 'play';
  env.rainK = damp(env.rainK, raining ? 1 : 0, 0.4, dt);
  waveState.amp = 1 + env.rainK * 0.7;
  ocean.u.uWaveAmp.value = waveState.amp;
  ocean.u.uTime.value = waveState.time;
  const h = waveHeight(0, 0),
    [gx, gz] = waveGrad(0, 0);
  raft.group.position.y = h * 0.55 - 0.03;
  raft.group.rotation.set(gz * 0.18, 0, -gx * 0.18);
  if (playing) {
    updateSurvival(dt);
    simBuildings(dt, raining);
    updateDebris(dt);
    updateHook(dt);
    updateBoat(dt);
    G.sigT += dt;
    if (G.sigT > 0.3) {
      G.sigT = 0;
      for (const b of raft.bmap.values()) {
        const s = bSig(b);
        if (sigs.get(b.data.id) !== s) {
          sigs.set(b.data.id, s);
          raft.refreshVisual(b);
        }
      }
    }
    G.qT += dt;
    if (G.qT > 0.5) {
      G.qT = 0;
      checkQuest();
      if (G.buildOn) renderBuildbar();
    }
    G.saveT += dt;
    if (G.saveT > 20) {
      G.saveT = 0;
      saveGame();
    }
  } else if (G.mode === 'title') {
    updateDebris(dt * 0.5);
  }
  updateShark(playing || G.mode === 'title' ? dt : 0);
  updatePlayer(dt);
  updateCat(dt);
  updateCrab(playing ? dt : 0, now);
  updateAmbient(dt);
  updateFish(dt);
  parts.update(dt);
  if (G.mode === 'title' && fish.st === 'none') {
    PA.hold = 'rod';
    bobber.visible = true;
    fishLine.visible = true;
    const bx = 3.2,
      bz = 6.5;
    bobber.position.set(bx, waveHeight(bx, bz), bz);
    const tip = P.rodTip.getWorldPosition(new THREE.Vector3()),
      a = lineGeo.attributes.position;
    for (let i = 0; i <= 20; i++) {
      const k = i / 20;
      a.setXYZ(i, lerp(tip.x, bx, k), lerp(tip.y, bobber.position.y, k) - Math.sin(k * Math.PI) * 0.5, lerp(tip.z, bz, k));
    }
    a.needsUpdate = true;
  }
  // lanterns, interior lights & night emissives
  const nl = env.night;
  MAT.lamp.emissiveIntensity = 0.4 + nl * 3;
  MAT.glass.emissiveIntensity = nl * 1.6;
  raft.house.update(dt, nl);
  applyIndoor(cam.indoor);
  for (const b of raft.bmap.values())
    if (b.data.type === 'sprinkler') {
      const P2 = b.obj.parts,
        s = b.data.s || {};
      P2.head.rotation.y += dt * ((s.w || 0) >= 1 ? 4 : 0.5);
    } else if (b.data.type === 'buoy') {
      const P2 = b.obj.parts;
      P2.bob.position.y = -0.3 + Math.sin(now * 0.002 + b.data.id) * 0.06;
      P2.bob.rotation.z = Math.sin(now * 0.0013) * 0.08;
    } else if (b.data.type === 'winch') {
      b.obj.parts.drum.rotation.x += dt * 0.8;
    } else if (b.data.type === 'smoker') {
      const s = b.data.s || {},
        P2 = b.obj.parts;
      const on = (s.q | 0) > 0;
      P2.fire.material.emissiveIntensity = on ? 1.6 + Math.sin(now * 0.011) * 0.5 : 0;
      if (on && Math.random() < dt * 1.2) {
        const w = b.obj.group.localToWorld(new THREE.Vector3(0.16, 1.32, 0));
        parts.emit({
          x: w.x,
          y: w.y,
          z: w.z,
          count: 1,
          spread: 0.04,
          vel: [0.2, 0.6, 0],
          vr: 0.1,
          life: 2.2,
          size: [0.08, 0.22],
          color: '#cfd3d6',
          alpha: 0.3,
          gravity: 0.25,
          drag: 0.3,
        });
      }
    } else if (b.data.type === 'grill' || b.data.type === 'purifier') {
      const s = b.data.s || {},
        P2 = b.obj.parts;
      if (P2.coals) P2.coals.material.emissiveIntensity = s.fish && s.t < 1 ? 1.5 + Math.sin(now * 0.01) * 0.4 : 0;
      if (P2.fire) P2.fire.material.emissiveIntensity = s.b ? 2 + Math.sin(now * 0.013) * 0.6 : 0;
    }
  // camera
  const pw = playerWorld();
  updateCamera(rdt, dt, pw);
  // interactions/hud
  if (playing) {
    G.curAct = gatherActions();
    const pr = $('#prompt');
    if (G.curAct) {
      const html = `<kbd>${isTouch ? 'Tap' : 'E'}</kbd><i>${ic(G.curAct.i)}</i><span>${G.curAct.l}</span>`;
      if (pr.dataset.h !== html) {
        pr.dataset.h = html;
        pr.innerHTML = html;
      }
      pr.className = 'on' + (G.curAct.off ? ' off' : '');
    } else pr.className = '';
    updateGhost();
    if (pl.tool === 'hook' && !G.buildOn && mouse.inside && !G.drag) {
      G.hoverD = pickDebris();
      const tt = $('#tooltip');
      if (G.hoverD) {
        hoverRing.visible = true;
        hoverRing.position.set(G.hoverD.x, waveHeight(G.hoverD.x, G.hoverD.z) + 0.05, G.hoverD.z);
        const s = 1 + Math.sin(now * 0.006) * 0.08;
        hoverRing.scale.setScalar(s);
        const pw2 = playerWorld(),
          dd = Math.hypot(pw2.x - G.hoverD.x, pw2.z - G.hoverD.z),
          ok = dd <= hookRange();
        hoverRing.material.color.set(ok ? '#ffffff' : '#ff8a8a');
        tt.innerHTML = `${DEBRIS[G.hoverD.type].name}<small>${ok ? 'Click to hook' : `Too far · ${dd.toFixed(0)} m / ${hookRange()} m`}</small>`;
        tt.style.left = mouse.x + 'px';
        tt.style.top = mouse.y + 'px';
        tt.classList.add('on');
        canvas.style.cursor = 'pointer';
      } else {
        hoverRing.visible = false;
        tt.classList.remove('on');
        canvas.style.cursor = '';
      }
    } else {
      hoverRing.visible = false;
      $('#tooltip').classList.remove('on');
      canvas.style.cursor = G.buildOn ? 'crosshair' : '';
    }
    G.hudT += rdt;
    if (G.hudT > 0.12 || G.hudDirty) {
      G.hudT = 0;
      G.hudDirty = false;
      updateHUD();
      updateControlsHint();
    }
  }
  G.markT += rdt;
  if (G.markT > 0.033) {
    G.markT = 0;
    updateMarkers();
  }
  // environment & render
  const ld = applySky(G.st.clock % 1, env.rainK, dt);
  rain.intensity = env.rainK;
  rain.update(dt, camera);
  audio.update(dt, { rain: env.rainK, night: env.night, storm: env.rainK });
  sky.update(dt, camera);
  placeSun(ld, pw.x, pw.z, Math.min(24, raft.bounds() + 4));
  renderer.shadowMap.needsUpdate = true;
  ocean.renderReflection(renderer, scene, camera);
  post.render(scene, camera, waveState.time, { exposure: env.exposure, bloom: env.bloom, sat: env.sat, tint: env.tint, dim: 1 });
}
