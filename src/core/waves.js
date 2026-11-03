// Ocean wave model. CPU functions (buoyancy, debris, boats) and the GLSL used by the ocean shader share
// the same wave table, so everything that floats stays perfectly aligned with the rendered sea.
import * as THREE from '../../vendor/three.module.js';

// [dirX, dirZ, amplitude, wavelength]
const TABLE = [
  [1, 0.35, 0.085, 14],
  [-0.45, 1, 0.06, 9],
  [0.75, -0.7, 0.035, 5.2],
  [-0.9, -0.3, 0.02, 3.1],
  [0.2, 0.95, 0.011, 1.9],
  [-0.6, 0.7, 0.006, 1.1],
];
export const WAVE_COUNT = TABLE.length;
export const waves = TABLE.map(([x, z, a, l]) => {
  const n = Math.hypot(x, z);
  const k = (2 * Math.PI) / l;
  return { dx: x / n, dz: z / n, a, k, w: Math.sqrt(9.8 * k) * 0.55 };
});
export const waveState = { amp: 1, time: 0 };

export function waveHeight(x, z) {
  let h = 0;
  const t = waveState.time;
  for (const w of waves) h += w.a * Math.sin((w.dx * x + w.dz * z) * w.k - w.w * t);
  return h * waveState.amp;
}

const _g = [0, 0];
/** Returns [dh/dx, dh/dz]. The returned array is reused between calls. */
export function waveGrad(x, z) {
  let gx = 0;
  let gz = 0;
  const t = waveState.time;
  for (const w of waves) {
    const c = w.a * w.k * Math.cos((w.dx * x + w.dz * z) * w.k - w.w * t);
    gx += c * w.dx;
    gz += c * w.dz;
  }
  _g[0] = gx * waveState.amp;
  _g[1] = gz * waveState.amp;
  return _g;
}

export const waveUniforms = () => ({
  uWD: { value: waves.map((w) => new THREE.Vector4(w.dx, w.dz, w.k, w.w)) },
  uWA: { value: waves.map((w) => w.a) },
});

export const WAVE_GLSL = /* glsl */ `
uniform vec4 uWD[${WAVE_COUNT}]; uniform float uWA[${WAVE_COUNT}]; uniform float uTime; uniform float uWaveAmp;
float waveH(vec2 p, out vec2 g){
  float h = 0.; g = vec2(0.);
  for(int i = 0; i < ${WAVE_COUNT}; i++){
    vec4 d = uWD[i]; float a = uWA[i];
    float ph = dot(d.xy, p) * d.z - d.w * uTime;
    h += a * sin(ph); g += a * d.z * cos(ph) * d.xy;
  }
  g *= uWaveAmp; return h * uWaveAmp;
}
`;
