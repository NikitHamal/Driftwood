// The render stage: WebGL renderer, scene, camera, lights, atmosphere, ocean, post pipeline, quality presets and the
// day/night palette. Everything that draws the world (but not the gameplay objects themselves) lives here.
import * as THREE from '../../vendor/three.module.js';
import { clamp, lerp, smooth } from '../core/util.js';
import { Sky } from './sky.js';
import { Ocean } from './ocean.js';
import { Environment } from './environment.js';
import { PostFX } from './post.js';
import { Particles, Rain } from './particles.js';
import { initMaterials } from '../world/models.js';
import { Raft } from '../world/raft.js';
import { Audio } from '../audio/audio.js';
import { SETK } from '../game/constants.js';
import { $, setLoad } from '../ui/dom.js';

// ---------- renderer ----------
export const canvas = $('#c');
export const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: false,
  stencil: false,
  alpha: false,
  powerPreference: 'high-performance',
});
renderer.toneMapping = THREE.NoToneMapping; // tone mapping happens in the post composite
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false;
renderer.localClippingEnabled = false;
export const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0xbfe9f0, 0.0007);
export const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.05, 5000);
camera.layers.enable(1);
export const post = new PostFX(renderer);

// ---------- lights ----------
export const hemi = new THREE.HemisphereLight(0xc4e8ff, 0x2c8e92, 0.3);
scene.add(hemi);
export const sun = new THREE.DirectionalLight(0xffffff, 3);
sun.castShadow = true;
sun.shadow.bias = -0.0003;
sun.shadow.normalBias = 0.03;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 90;
scene.add(sun, sun.target);

setLoad(15, 'Carving the driftwood…');
initMaterials();
export const audio = new Audio();
export const sky = new Sky(scene);
export const ocean = new Ocean(scene);
sky.dome.layers.set(2);
camera.layers.enable(2);
ocean.hide = [sky.dome];
export const envmap = new Environment(renderer, scene, sky);
ocean.u.uSky.value = envmap.skyCube;
export const parts = new Particles(scene);
export const rain = new Rain(scene);
export const raft = new Raft(scene);

// ---------- settings & quality ----------
export const settings = { quality: 'auto', fps: false, master: 0.8, music: 0.5, sfx: 0.8, sens: 1, cam: 0, fov: 70, invertY: false };
try {
  Object.assign(settings, JSON.parse(localStorage.getItem(SETK) || '{}'));
} catch (e) {
  /* ignore corrupt settings */
}
export const saveSettings = () => localStorage.setItem(SETK, JSON.stringify(settings));
export const QUAL = {
  low: { pr: 1, scale: 0.75, samples: 0, ao: false, sh: 1024, refl: 0, env: 96 },
  medium: { pr: 1, scale: 1, samples: 2, ao: true, sh: 1024, refl: 0.35, env: 128 },
  high: { pr: 1.5, scale: 1, samples: 4, ao: true, sh: 2048, refl: 0.5, env: 128 },
  ultra: { pr: 2, scale: 1, samples: 4, ao: true, sh: 4096, refl: 0.65, env: 128 },
};
export let qLevel = 'high';
export let renderScale = 1;
export function updateParticleScale() {
  const h = renderer.getDrawingBufferSize(new THREE.Vector2()).y * post.scale;
  parts.u.uScale.value = h / (2 * Math.tan((camera.fov * Math.PI) / 360));
}
export function applyQuality(name) {
  qLevel = name;
  const q = QUAL[name];
  renderScale = q.scale;
  renderer.setPixelRatio(Math.min(devicePixelRatio, q.pr));
  renderer.setSize(innerWidth, innerHeight, false);
  const was = renderer.shadowMap.enabled;
  renderer.shadowMap.enabled = q.sh > 0;
  sun.castShadow = q.sh > 0;
  if (q.sh) {
    sun.shadow.mapSize.set(q.sh, q.sh);
    if (sun.shadow.map) {
      sun.shadow.map.dispose();
      sun.shadow.map = null;
    }
  }
  if (was !== renderer.shadowMap.enabled)
    scene.traverse((o) => {
      if (o.material) [].concat(o.material).forEach((m) => (m.needsUpdate = true));
    });
  const s = renderer.getDrawingBufferSize(new THREE.Vector2());
  post.cfg.samples = q.samples;
  post.cfg.ao = q.ao;
  post.setSize(s.x, s.y, q.scale);
  ocean.sizeFn = () => new THREE.Vector2(s.x * post.scale, s.y * post.scale);
  ocean.setReflection(renderer, q.refl);
  updateParticleScale();
}
/** Dynamic resolution: nudges the internal render scale to hold the frame-rate without touching the preset. */
export function adaptScale(frameMs) {
  const q = QUAL[qLevel];
  const target = clamp(post.scale + (frameMs > 22 ? -0.08 : frameMs < 13.5 ? 0.04 : 0), 0.6, q.scale);
  if (Math.abs(target - post.scale) < 0.001) return;
  const s = renderer.getDrawingBufferSize(new THREE.Vector2());
  post.setSize(s.x, s.y, target);
  ocean.setReflection(renderer, q.refl);
  updateParticleScale();
}
export function resize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight, false);
  const s = renderer.getDrawingBufferSize(new THREE.Vector2());
  post.setSize(s.x, s.y, post.scale);
  ocean.resize(renderer);
  updateParticleScale();
}
addEventListener('resize', resize);
applyQuality(settings.quality === 'auto' ? 'high' : settings.quality);

// ---------- day / night palette ----------
// [t, zenith, horizon, haze, sunColor, sunIntensity, hemiSky, hemiGround, hemiIntensity, waterNear, waterFar, lum, stars, exposure]
const KF = [
  [0.0, '#06142a', '#15304e', '#1d3b5a', '#9db4ff', 0.0, '#7898bb', '#3e596d', 1.15, '#0c3c50', '#072a3c', 0.65, 1, 1.0],
  [0.21, '#0e2444', '#3a4f78', '#556890', '#ffb07a', 0.0, '#819bb7', '#425c6d', 1.05, '#164a5e', '#0b3446', 0.75, 0.7, 1.0],
  [0.255, '#4a86c4', '#f6c099', '#ffd0a8', '#ffb070', 1.6, '#a9c0dc', '#3a6a70', 0.85, '#2a8ca2', '#1a6c86', 1.0, 0.05, 1.0],
  [0.32, '#1a98d6', '#a6e0ef', '#cdeef3', '#fff1d6', 2.9, '#c0e6ff', '#2e8a8e', 1.1, '#1a9cbc', '#0a6c92', 1.0, 0, 1.0],
  [0.5, '#1490d2', '#9cdcea', '#c6ecf2', '#ffffff', 3.2, '#c4e8ff', '#2c8e92', 1.15, '#1b9fbf', '#0a6e94', 1.0, 0, 1.0],
  [0.68, '#1a8ecc', '#a9dceb', '#cdebf0', '#fff0d8', 2.8, '#bfe0f4', '#2e8a8e', 1.05, '#1a98b8', '#0a6a8f', 1.0, 0, 1.0],
  [0.755, '#3b6fb0', '#f2aa7a', '#ffc89c', '#ff9a5a', 1.7, '#c9a8b8', '#3a5a68', 0.8, '#2a8ea0', '#186a82', 1.0, 0.05, 1.0],
  [0.8, '#1c2c58', '#a06070', '#b07078', '#ff6a40', 0.3, '#6a6a90', '#1a3a4a', 0.55, '#1a5a70', '#0e4458', 0.8, 0.4, 1.0],
  [0.86, '#06142a', '#15304e', '#1d3b5a', '#9db4ff', 0.0, '#7898bb', '#3e596d', 1.15, '#0c3c50', '#072a3c', 0.65, 1, 1.0],
  [1.0, '#06142a', '#15304e', '#1d3b5a', '#9db4ff', 0.0, '#7898bb', '#3e596d', 1.15, '#0c3c50', '#072a3c', 0.65, 1, 1.0],
];
const KC = KF.map((k) => k.map((v) => (typeof v === 'string' ? new THREE.Color(v) : v)));
const RAINC = {
  z: new THREE.Color('#566772'),
  h: new THREE.Color('#8b9ba5'),
  hz: new THREE.Color('#9fb0b8'),
  wn: new THREE.Color('#2a6f7e'),
  wf: new THREE.Color('#1a4c5c'),
};
export const env = {
  night: 0,
  rainK: 0,
  sunUp: 1,
  exposure: 1,
  bloom: 0.25,
  sat: 1.06,
  tint: new THREE.Color(1, 1, 1),
  indoor: 0,
  lightning: 0,
};
const _c = new THREE.Color(),
  _c2 = new THREE.Color(),
  _sd = new THREE.Vector3();
function lerpKF(t, idx, out) {
  let a = KC[0],
    b = KC[1];
  for (let i = 0; i < KC.length - 1; i++)
    if (t >= KC[i][0] && t <= KC[i + 1][0]) {
      a = KC[i];
      b = KC[i + 1];
      break;
    }
  const k = smooth(0, 1, (t - a[0]) / Math.max(1e-4, b[0] - a[0]));
  if (out) return out.copy(a[idx]).lerp(b[idx], k);
  return lerp(a[idx], b[idx], k);
}
export function applySky(t, rk, dt) {
  const su = sky.u,
    ou = ocean.u;
  lerpKF(t, 1, su.uZenith.value).lerp(RAINC.z, rk * 0.85);
  lerpKF(t, 3, su.uHaze.value).lerp(RAINC.hz, rk * 0.85);
  lerpKF(t, 4, su.uSunColor.value);
  const sI = lerpKF(t, 5) * (1 - rk * 0.7);
  const a = (t - 0.25) * Math.PI * 2;
  const sd = _sd.set(Math.cos(a) * 0.75, Math.sin(a) * 0.92, 0.42).normalize();
  su.uSunDir.value.copy(sd);
  su.uMoonDir.value.copy(sd).negate();
  su.uSunVis.value = smooth(-0.1, 0.06, sd.y);
  su.uSunLum.value = lerp(0.6, 1.4, clamp(sd.y * 2, 0, 1));
  su.uStars.value = lerpKF(t, 12) * (1 - rk);
  su.uRain.value = rk;
  su.uCover.value = lerp(0.42, 0.9, rk);
  su.uOvercast.value.copy(RAINC.h).multiplyScalar(0.55 + 0.45 * smooth(-0.1, 0.4, sd.y));
  const warm = Math.max(0, 1 - Math.abs(t - 0.255) / 0.045) + Math.max(0, 1 - Math.abs(t - 0.77) / 0.05);
  su.uCloudTint.value
    .set('#e6edf5')
    .lerp(_c.set('#ff9d6a'), Math.min(1, warm) * 0.7)
    .multiplyScalar(0.25 + 0.75 * su.uSunVis.value + 0.08);
  su.uTime.value += dt;
  const moon = sd.y < 0.02;
  const ld = moon ? su.uMoonDir.value : sd;
  sun.color.copy(moon ? _c.set('#9db4ff') : su.uSunColor.value);
  sun.intensity = moon ? 0.9 * (1 - rk * 0.65) : sI;
  hemi.color.copy(lerpKF(t, 6, _c2));
  hemi.groundColor.copy(lerpKF(t, 7, _c));
  hemi.intensity = lerpKF(t, 8) * (1 - rk * 0.25) * 0.28;
  ou.uNear.value.copy(lerpKF(t, 9, _c)).lerp(RAINC.wn, rk * 0.7);
  ou.uFar.value.copy(lerpKF(t, 10, _c)).lerp(RAINC.wf, rk * 0.7);
  ou.uHorizon.value.copy(su.uHaze.value);
  ou.uSunDir.value.copy(ld);
  ou.uSunColor.value.copy(sun.color).multiplyScalar(moon ? 0.25 : Math.min(1.4, sI / 2.4));
  ou.uSunVis.value = moon ? 0.3 * (1 - rk) : su.uSunVis.value;
  ou.uLum.value = lerpKF(t, 11) * (1 - rk * 0.3);
  ou.uRain.value = rk;
  ou.uEnvGain.value = 1;
  su.uGround.value.copy(ou.uFar.value).multiplyScalar(0.75 + 0.25 * su.uSunVis.value);
  const dens = lerp(0.00075, 0.0034, rk);
  scene.fog.color.copy(su.uHaze.value);
  scene.fog.density = dens;
  ou.uFogDensity.value = dens;
  env.night = clamp(lerpKF(t, 12) * 1.2, 0, 1);
  env.sunUp = sd.y;
  env.exposure = lerpKF(t, 13) * (1.0 - rk * 0.08) * (1 + env.lightning * 0.6);
  env.bloom = 0.22 + env.night * 0.12 + warm * 0.1;
  env.tint
    .set(1, 1, 1)
    .lerp(_c.set('#ffd2a8'), Math.min(1, warm) * 0.25)
    .lerp(_c.set('#9fb8ff'), env.night * 0.18);
  envmap.update(dt);
  return ld;
}
export function placeSun(ld, cx, cz, size) {
  sun.position.set(cx + ld.x * 40, ld.y * 40 + 0.01, cz + ld.z * 40);
  if (sun.position.y < 3) sun.position.y = 3;
  sun.target.position.set(cx, 0, cz);
  const c = sun.shadow.camera;
  if (c.right !== size) {
    c.left = -size;
    c.right = size;
    c.top = size;
    c.bottom = -size;
    c.updateProjectionMatrix();
  }
}
