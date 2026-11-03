// Camera rig: third-person follow/close/overview, first-person with pointer-lock look, Minecraft-style zoom
// (mouse wheel in first person, hold Z anywhere), head bob, interior clamping and wall occlusion.
import * as THREE from '../../vendor/three.module.js';
import { clamp, damp } from '../core/util.js';
import { $ } from '../ui/dom.js';
import { camera, raft, saveSettings, settings, updateParticleScale } from '../render/stage.js';
import { banner } from '../ui/hud.js';
import { G } from '../core/store.js';
import { P } from '../world/entities.js';
import { pl } from '../game/state.js';
import { BAL } from '../world/models.js';

export const CAMS = [
  { n: 'Follow', d: 9, p: 0.38, fov: 52 },
  { n: 'Close', d: 4.6, p: 0.2, fov: 58 },
  { n: 'Overview', d: 22, p: 0.95, fov: 40 },
  { n: 'First person', fp: 1, d: 3, p: 0.45, fov: 0 },
];
export const cam = {
  yaw: 0.5,
  pitch: 0.38,
  dist: 9,
  tx: 0,
  ty: 0,
  tz: 0,
  tyaw: 0.5,
  tpitch: 0.38,
  tdist: 9,
  fpPitch: 0,
  tfpPitch: 0,
  zoom: 1,
  fpZoom: 1,
  zoomHold: false,
  bob: 0,
  fov: 60,
  indoor: 0,
  eye: new THREE.Vector3(),
};
export const isFP = () => !!CAMS[settings.cam | 0].fp;

export function setCam(i, quiet) {
  settings.cam = i = ((i % CAMS.length) + CAMS.length) % CAMS.length;
  const c = CAMS[i];
  cam.tdist = c.d;
  cam.tpitch = c.p;
  if (c.fp) {
    cam.tfpPitch = 0;
    cam.fpZoom = 1;
    cam.tyaw = cam.yaw;
  }
  saveSettings();
  if (!quiet) banner('Camera', c.n + ' · press C to switch', null, true);
  const b = $('#btnCam');
  if (b) b.title = 'Camera: ' + c.n + ' (C)';
}
/** Mouse / touch look delta in pixels. Sensitivity scales down while zoomed for precise aiming. */
export function lookDelta(dx, dy) {
  const k = 0.0024 * settings.sens * (1 / Math.sqrt(cam.zoom));
  const iy = settings.invertY ? -1 : 1;
  cam.tyaw -= dx * k;
  if (isFP()) cam.tfpPitch = clamp(cam.tfpPitch - dy * k * iy, -1.45, 1.45);
  else cam.tpitch = clamp(cam.tpitch + dy * k * iy, 0.05, 1.3);
}
/** Wheel: first person => smooth FOV zoom; third person => dolly (hold Z for FOV zoom). */
export function wheelZoom(deltaY) {
  const s = Math.sign(deltaY);
  if (isFP() || cam.zoomHold) cam.fpZoom = clamp(cam.fpZoom * (1 - s * 0.14), 1, 8);
  else cam.tdist = clamp(cam.tdist * (1 + s * 0.1), 3, 28);
}
export function resetZoom() {
  cam.fpZoom = 1;
}

const _ray = new THREE.Raycaster();
const _dir = new THREE.Vector3(),
  _tgt = new THREE.Vector3(),
  _pos = new THREE.Vector3();
let lastFov = 0;
function applyFov(rdt) {
  const c = CAMS[settings.cam | 0];
  const base = c.fp ? settings.fov : c.fov;
  const want = cam.zoomHold ? Math.max(cam.fpZoom, 2.5) : cam.fpZoom;
  cam.zoom = damp(cam.zoom, want, 14, rdt);
  const fov = (2 * Math.atan(Math.tan((base * Math.PI) / 360) / cam.zoom) * 180) / Math.PI;
  if (Math.abs(fov - lastFov) > 0.01) {
    lastFov = fov;
    camera.fov = fov;
    camera.updateProjectionMatrix();
    updateParticleScale();
  }
  const zi = $('#zoomInd');
  if (zi) {
    const on = cam.zoom > 1.04;
    zi.hidden = !on;
    if (on) zi.lastElementChild.textContent = cam.zoom.toFixed(1) + '×';
  }
}

/** Per-frame camera update. `pw` = player world position. */
export function updateCamera(rdt, dt, pw) {
  if (G.mode === 'title') {
    cam.yaw += dt * 0.03;
    const tx = 0.4,
      ty = 1.6,
      tz = 0.6,
      r = 17,
      pp = 0.2;
    camera.position.set(tx + Math.sin(cam.yaw) * Math.cos(pp) * r, ty + Math.sin(pp) * r, tz + Math.cos(cam.yaw) * Math.cos(pp) * r);
    camera.lookAt(tx - Math.cos(cam.yaw) * 3.5, ty + 1.4, tz + Math.sin(cam.yaw) * 3.5);
    camera.fov = 50;
    camera.updateProjectionMatrix();
    lastFov = 0;
    cam.zoom = 1;
    return;
  }
  applyFov(rdt);
  const fp = isFP();
  cam.yaw = damp(cam.yaw, cam.tyaw, fp ? 40 : 16, rdt);
  cam.pitch = damp(cam.pitch, cam.tpitch, 16, rdt);
  cam.fpPitch = damp(cam.fpPitch, cam.tfpPitch, 40, rdt);
  cam.tx = damp(cam.tx, pw.x, 12, rdt);
  cam.ty = damp(cam.ty, pw.y, 7, rdt);
  cam.tz = damp(cam.tz, pw.z, 12, rdt);
  const house = raft.house;
  const inside = pl.l === 1 && house.inRoom(pl.x, pl.z, 0.05);
  cam.indoor = damp(cam.indoor, inside ? 1 : 0, 6, rdt);
  if (fp) {
    cam.bob += rdt * (4 + pl.speed * 2.2);
    const bobY = Math.sin(cam.bob * 2) * 0.018 * Math.min(1, pl.speed / 3),
      bobX = Math.cos(cam.bob) * 0.012 * Math.min(1, pl.speed / 3);
    const eyeY = cam.ty + 1.56 + bobY;
    camera.position.set(cam.tx + Math.cos(cam.yaw) * bobX, eyeY, cam.tz - Math.sin(cam.yaw) * bobX);
    const cp = Math.cos(cam.fpPitch);
    camera.lookAt(
      camera.position.x - Math.sin(cam.yaw) * cp,
      camera.position.y + Math.sin(cam.fpPitch),
      camera.position.z - Math.cos(cam.yaw) * cp,
    );
    P.root.visible = true; // body visible (hands, shadow); the head is hidden by the player module
  } else {
    P.root.visible = true;
    const cy = cam.ty + 1.25;
    let dist = (cam.dist = damp(cam.dist, cam.tdist, 9, rdt));
    if (inside) dist = Math.min(dist, 2.6);
    _tgt.set(cam.tx, cy, cam.tz);
    _pos.set(
      cam.tx + Math.sin(cam.yaw) * Math.cos(cam.pitch) * dist,
      Math.max(0.6, cy + Math.sin(cam.pitch) * dist),
      cam.tz + Math.cos(cam.yaw) * Math.cos(cam.pitch) * dist,
    );
    if (pl.l === 1 || cam.indoor > 0.01) {
      // pull the camera in front of any house wall that blocks the view of the player
      _dir.copy(_pos).sub(_tgt);
      const len = _dir.length();
      _dir.divideScalar(len);
      _ray.set(_tgt, _dir);
      _ray.far = len;
      const hit = _ray.intersectObjects(house.occluders, false)[0];
      if (hit) _pos.copy(_tgt).addScaledVector(_dir, Math.max(0.5, hit.distance - 0.25));
      if (inside) house.clampToRoom(_pos, BAL + 2.0);
    }
    camera.position.copy(_pos);
    camera.lookAt(_tgt);
  }
  camera.updateMatrixWorld();
}
