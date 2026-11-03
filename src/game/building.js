import * as THREE from '../../vendor/three.module.js';
import { BP, DECK, makeStation } from '../world/models.js';
import { T } from '../world/raft.js';
import { $ } from '../ui/dom.js';
import { audio, camera, ocean, parts, raft } from '../render/stage.js';
import { ghost, ghostMat, PA } from '../world/entities.js';
import { G } from '../core/store.js';
import { pl } from './state.js';
import { give, has, pay } from './economy.js';
import { worldPos } from '../world/spatial.js';
import { renderBuildbar, toast } from '../ui/hud.js';
import { mouse, ray } from '../input/input.js';

export const BKEYS = [...Object.keys(BP), 'demolish'];
G.bsel = null;
G.buildOn = false;
G.ghostCell = null;
G.ghostKey = '';
export function openBuild() {
  G.buildOn = true;
  if (!G.bsel) G.bsel = 'foundation';
  renderBuildbar();
  $('#buildbar').hidden = false;
}
export function cancelBuild() {
  G.buildOn = false;
  $('#buildbar').hidden = true;
  ghost.clear();
  G.ghostKey = '';
  G.ghostCell = null;
  if (pl.tool === 'hammer') pl.tool = 'hook';
  G.hudDirty = true;
}
export function locked(k) {
  return BP[k]?.unlock && !G.st.up[BP[k].unlock];
}
export function setGhost(k) {
  if (G.ghostKey === k) return;
  G.ghostKey = k;
  ghost.clear();
  if (k === 'demolish') {
    const m = new THREE.Mesh(new THREE.BoxGeometry(T - 0.1, 1.6, T - 0.1), ghostMat);
    m.position.y = 0.8;
    ghost.add(m);
    return;
  }
  if (k === 'foundation') {
    const m = new THREE.Mesh(new THREE.BoxGeometry(T, 0.12, T), ghostMat);
    m.position.y = -0.06;
    ghost.add(m);
    return;
  }
  const s = makeStation(k);
  s.group.traverse((o) => {
    if (o.isMesh) {
      o.material = ghostMat;
      o.castShadow = false;
    }
  });
  s.group.position.y = 0;
  ghost.add(s.group);
}
export function updateGhost() {
  if (!G.buildOn || !mouse.inside) {
    ghost.visible = false;
    return;
  }
  ray.setFromCamera(mouse.ndc, camera);
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -(raft.group.position.y + DECK));
  const hit = new THREE.Vector3();
  if (!ray.ray.intersectPlane(plane, hit)) {
    ghost.visible = false;
    return;
  }
  const l = raft.group.worldToLocal(hit.clone()),
    i = Math.round(l.x / T),
    j = Math.round(l.z / T);
  G.ghostCell = [i, j];
  setGhost(G.bsel);
  ghost.visible = true;
  ghost.position.set(i * T, DECK, j * T);
  let ok = false;
  if (G.bsel === 'demolish') {
    ok = !!findB(i, j);
  } else if (G.bsel === 'foundation') ok = raft.canFoundation(i, j);
  else {
    ok = raft.has(i, j) && !raft.occupied(i, j) && !locked(G.bsel);
    if (ok && BP[G.bsel].edge) {
      const e = raft.edgeDir(i, j);
      ok = !!e;
      if (e) ghost.rotation.y = Math.atan2(e[0], e[1]);
    } else ghost.rotation.y = 0;
  }
  if (G.bsel !== 'demolish' && !has(BP[G.bsel].cost)) ok = false;
  G.ghostCell.ok = ok;
  ghostMat.color.set(ok ? (G.bsel === 'demolish' ? '#ffb454' : '#7bd88f') : '#ff6b6b');
}
export function findB(i, j) {
  for (const b of raft.bmap.values()) if (b.data.tile[0] === i && b.data.tile[1] === j) return b;
  return null;
}
export function placeBuild() {
  if (!G.ghostCell) return;
  const [i, j] = G.ghostCell;
  if (!G.ghostCell.ok) {
    if (G.bsel !== 'demolish' && !has(BP[G.bsel].cost)) toast('Not enough materials');
    else if (locked(G.bsel)) toast('Buy the blueprint from Marlo first');
    else
      toast(
        G.bsel === 'foundation'
          ? 'Foundations must touch your raft'
          : BP[G.bsel]?.edge
            ? 'Place this on an outer edge tile'
            : 'Can’t build there',
      );
    audio.play('fail');
    return;
  }
  const wp = worldPos(i * T, DECK, j * T);
  if (G.bsel === 'demolish') {
    const b = findB(i, j);
    const c = BP[b.data.type].cost,
      ref = {};
    for (const k in c) ref[k] = Math.floor(c[k] / 2);
    give(ref);
    raft.removeBuilding(b.data.id);
    G.st.b = G.st.b.filter((x) => x.id !== b.data.id);
    audio.play('build');
    dust(wp);
    return;
  }
  pay(BP[G.bsel].cost);
  if (G.bsel === 'foundation') {
    G.st.tiles.push([i, j]);
    raft.setTiles(G.st.tiles);
    ocean.setFoam(G.st.tiles, T);
    G.st.stats.tiles++;
  } else {
    const data = { id: G.st.nid++, type: G.bsel, tile: [i, j], s: {} };
    G.st.b.push(data);
    raft.addBuilding(data);
    G.st.stats.built[G.bsel] = (G.st.stats.built[G.bsel] || 0) + 1;
  }
  audio.play('build');
  dust(wp);
  PA.play('hammer', 0.7);
  G.hudDirty = true;
  renderBuildbar();
  parts.splash(wp.x, wp.z, 0.5);
}
export function dust(p) {
  parts.emit({
    x: p.x,
    y: p.y + 0.1,
    z: p.z,
    count: 30,
    spread: 2,
    vel: [0, 1, 0],
    vr: 1,
    life: 1,
    size: [0.25, 0.5],
    color: '#e8dcc4',
    alpha: 0.5,
    gravity: 0.5,
    drag: 2,
  });
}
