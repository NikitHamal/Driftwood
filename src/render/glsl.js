// Shared GLSL snippets: hashing, texture-backed value noise and fbm.
export const NOISE_GLSL = /* glsl */ `
uniform sampler2D tNoise;
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float hash13(vec3 p3){ p3 = fract(p3 * .1031); p3 += dot(p3, p3.zyx + 31.32); return fract((p3.x + p3.y) * p3.z); }
vec2 hash22(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), u.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), u.x), u.y); }
float tnoise(vec2 p){ return texture2D(tNoise, p / 256.).r; }
float fbm4(vec2 p){ float a = .5, s = 0.; for(int i = 0; i < 4; i++){ s += a * tnoise(p); p = p * 2.03 + 17.1; a *= .5; } return s; }
float fbm5(vec2 p){ float a = .5, s = 0.; for(int i = 0; i < 5; i++){ s += a * tnoise(p); p = p * 2.03 + 17.1; a *= .5; } return s; }
`;

/** 256x256 smooth random texture (R,G,B,A independent), repeat-wrapped and bilinear-filtered. */
import * as THREE from '../../vendor/three.module.js';
import { rng } from '../core/util.js';

let _noise = null;
export function noiseTexture() {
  if (_noise) return _noise;
  const S = 256,
    r = rng(1337),
    d = new Uint8Array(S * S * 4);
  // value noise on a coarse lattice, bicubic-smoothed, so single taps are already smooth
  const lat = (n) => {
    const a = new Float32Array(n * n);
    for (let i = 0; i < a.length; i++) a[i] = r();
    return a;
  };
  const chans = [0, 1, 2, 3].map(() => ({ n: 16, a: lat(16) }));
  for (let c = 0; c < 4; c++) {
    const { n, a } = chans[c];
    for (let y = 0; y < S; y++)
      for (let x = 0; x < S; x++) {
        const fx = (x / S) * n,
          fy = (y / S) * n,
          ix = Math.floor(fx),
          iy = Math.floor(fy);
        let tx = fx - ix,
          ty = fy - iy;
        tx = tx * tx * (3 - 2 * tx);
        ty = ty * ty * (3 - 2 * ty);
        const g = (i, j) => a[((j + n) % n) * n + ((i + n) % n)];
        const v = (g(ix, iy) * (1 - tx) + g(ix + 1, iy) * tx) * (1 - ty) + (g(ix, iy + 1) * (1 - tx) + g(ix + 1, iy + 1) * tx) * ty;
        d[(y * S + x) * 4 + c] = Math.round(v * 255);
      }
  }
  _noise = new THREE.DataTexture(d, S, S, THREE.RGBAFormat);
  _noise.wrapS = _noise.wrapT = THREE.RepeatWrapping;
  _noise.minFilter = THREE.LinearMipmapLinearFilter;
  _noise.magFilter = THREE.LinearFilter;
  _noise.generateMipmaps = true;
  _noise.needsUpdate = true;
  return _noise;
}
