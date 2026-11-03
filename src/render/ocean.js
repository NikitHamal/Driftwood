// Ocean: radial LOD mesh displaced by the shared wave table, analytic + multi-octave ripple normals, Fresnel blend of
// planar reflections (raft, boats) over the sky cube, GGX sun glitter, subsurface scattering, crest/raft foam and
// exponential fog that matches the sky haze.
import * as THREE from '../../vendor/three.module.js';
import { WAVE_GLSL, waveUniforms } from '../core/waves.js';
import { NOISE_GLSL, noiseTexture } from './glsl.js';

function oceanGeo() {
  const radii = [];
  for (let i = 1; i <= 70; i++) radii.push(i * 0.45);
  let r = radii[radii.length - 1];
  while (r < 2800) {
    r *= 1.055;
    radii.push(r);
  }
  const SEG = 256,
    pos = [0, 0, 0],
    idx = [];
  for (let i = 0; i < radii.length; i++)
    for (let j = 0; j < SEG; j++) {
      const a = (j / SEG) * Math.PI * 2;
      pos.push(Math.cos(a) * radii[i], 0, Math.sin(a) * radii[i]);
    }
  for (let j = 0; j < SEG; j++) idx.push(0, 1 + ((j + 1) % SEG), 1 + j);
  for (let i = 0; i < radii.length - 1; i++)
    for (let j = 0; j < SEG; j++) {
      const a = 1 + i * SEG + j,
        b = 1 + i * SEG + ((j + 1) % SEG),
        c = a + SEG,
        d = b + SEG;
      idx.push(a, b, c, b, d, c);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 3000);
  return g;
}

const VERT = /* glsl */ `${WAVE_GLSL}
uniform mat4 uTexMat; varying vec3 vW; varying vec4 vR; varying float vH;
void main(){
  vec3 p = (modelMatrix * vec4(position, 1.)).xyz;
  float d = length(p.xz - cameraPosition.xz);
  vec2 g; float h = waveH(p.xz, g) * (1. - smoothstep(160., 700., d));
  p.y += h; vH = h; vW = p; vR = uTexMat * vec4(p.x, 0., p.z, 1.);
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.);
}`;

const FRAG = /* glsl */ `${WAVE_GLSL}${NOISE_GLSL}
uniform vec3 uNear, uFar, uHorizon, uSunDir, uSunColor, uSSS;
uniform float uLum, uUseRefl, uFogDensity, uStreak, uRain, uSunVis, uEnvGain;
uniform sampler2D tRefl, tFoam; uniform samplerCube uSky; uniform vec2 uReflTexel; uniform vec3 uFoamRect;
varying vec3 vW; varying vec4 vR; varying float vH;

float ripple(vec2 p, float t){
  float h = 0.;
  h += tnoise(p * 2.0 + vec2(t * .9, t * .55)) * .55;
  h += tnoise(p * 5.0 - vec2(t * 1.3, -t * .9)) * .26;
  h += tnoise(p * 12.0 + vec2(-t * 1.9, t * 1.6)) * .12;
  h += tnoise(p * 29.0 + vec2(t * 2.4, t * 2.9)) * .05;
  return h;
}
void main(){
  float dist = length(vW.xz - cameraPosition.xz);
  vec3 V = normalize(cameraPosition - vW);
  vec2 g; waveH(vW.xz, g); g *= (1. - smoothstep(160., 700., dist));
  float t = uTime;
  // ripple normals by finite differences, faded with distance to avoid shimmering
  float e = .03, fade = (1. - smoothstep(30., 320., dist)) * (.55 + .45 * uWaveAmp);
  float h0 = ripple(vW.xz, t), hx = ripple(vW.xz + vec2(e, 0.), t), hz = ripple(vW.xz + vec2(0., e), t);
  vec2 det = vec2(h0 - hx, h0 - hz) / e * .028 * fade * (1. + uRain * 1.2);
  vec3 N = normalize(vec3(-g.x + det.x, 1., -g.y + det.y));
  N = normalize(mix(N, vec3(0., 1., 0.), smoothstep(250., 1500., dist) * .8));
  float NdV = max(dot(N, V), 1e-3);
  float fres = .02 + .98 * pow(1. - NdV, 5.);
  fres = mix(fres, 1., smoothstep(.0, .06, .06 - NdV) * .0);
  vec3 R = reflect(-V, N); R.y = abs(R.y);
  vec3 sky = textureLod(uSky, R, 2.5 + (1. - NdV) * 1.5).rgb * uEnvGain * .8;
  vec3 refl = sky;
  if(uUseRefl > .5){
    vec2 uv = vR.xy / vR.w + N.xz * .03; vec2 o = uReflTexel * 1.6;
    vec4 c = texture2D(tRefl, uv) * .4 + (texture2D(tRefl, uv + o) + texture2D(tRefl, uv - o) + texture2D(tRefl, uv + vec2(o.x, -o.y)) + texture2D(tRefl, uv + vec2(-o.x, o.y))) * .15;
    float edge = smoothstep(.0, .04, uv.x) * smoothstep(1., .96, uv.x) * smoothstep(1., .96, uv.y) * smoothstep(.0, .04, uv.y);
    refl = mix(sky, c.rgb, clamp(c.a, 0., 1.) * edge);
  }
  // body colour: depth gradient lit by sky irradiance, plus subsurface glow through wave crests
  vec3 amb = textureLod(uSky, vec3(0., 1., 0.), 5.).rgb * uEnvGain;
  vec3 body = mix(uFar, uNear, smoothstep(.1, .9, NdV)) * (.25 + .4 * amb) * uLum;
  body += uNear * .22 * smoothstep(-.02, .14, vH) * (.4 + amb);
  float sss = pow(max(dot(-V, normalize(uSunDir * vec3(1., .3, 1.))), 0.), 3.) * smoothstep(-.03, .12, vH + g.x * .3) * uSunVis;
  body += uSSS * sss * .55 * uSunColor;
  vec3 col = mix(body, refl, fres);
  // sun glitter: GGX on the rippled normal
  vec3 H = normalize(uSunDir + V); float NdH = max(dot(N, H), 0.), NdL = max(dot(N, uSunDir), 0.);
  float a2 = .0009; float dd = NdH * NdH * (a2 - 1.) + 1.; float D = a2 / (3.14159 * dd * dd);
  float F = .02 + .98 * pow(1. - max(dot(H, V), 0.), 5.);
  col += uSunColor * D * F * NdL * .25 * uSunVis * (1. - uRain);
  col += uSunColor * pow(NdH, 40.) * .06 * uSunVis;
  // crest foam from steepness + height, broken up by cell noise
  float steep = length(g);
  float cn = tnoise(vW.xz * 3.1 + t * .35) * .6 + tnoise(vW.xz * 8.3 - t * .5) * .4;
  float crest = smoothstep(.095, .2, vH * 1.5 + steep * .6 - .02 * (1. - uWaveAmp)) * smoothstep(.38, .62, cn + .12) * fade;
  // raft wake foam
  vec2 fuv = (vW.xz - uFoamRect.xy) / uFoamRect.z; float m = texture2D(tFoam, fuv).r;
  float fn = tnoise(vW.xz * 4.2 + t * .6), fn2 = tnoise(vW.xz * 10.5 - t * .8), cells = tnoise(vW.xz * 14. + vec2(t * .3, -t * .2));
  float ring = smoothstep(.04, .22, m) * (1. - smoothstep(.45, .8, m));
  float foam = smoothstep(.5, .62, ring * (.3 + fn * .6 + fn2 * .3)) * smoothstep(.45, .6, cells);
  col *= 1. - smoothstep(.5, 1., m) * .35;
  vec3 foamCol = (vec3(.92, .96, .98) * (.25 + .75 * amb) + uSunColor * NdL * .35 * uSunVis) * uLum;
  col = mix(col, foamCol, clamp(foam * .85 + crest * .75, 0., 1.));
  // exponential fog to the sky haze
  float f = 1. - exp(-pow(dist * uFogDensity, 2.));
  col = mix(col, uHorizon, clamp(f, 0., 1.));
  gl_FragColor = vec4(col, 1.);
}`;

export class Ocean {
  constructor(scene) {
    this.u = {
      ...waveUniforms(),
      uTime: { value: 0 },
      uWaveAmp: { value: 1 },
      uNear: { value: new THREE.Color('#1aa6b8') },
      uFar: { value: new THREE.Color('#0f8ea6') },
      uHorizon: { value: new THREE.Color('#9fdbe0') },
      uSSS: { value: new THREE.Color('#2fd0a8') },
      uSunDir: { value: new THREE.Vector3(0.3, 0.8, 0.2) },
      uSunColor: { value: new THREE.Color(1, 1, 1) },
      uSunVis: { value: 1 },
      uLum: { value: 1 },
      uRain: { value: 0 },
      uEnvGain: { value: 1 },
      uStreak: { value: 1 },
      tRefl: { value: null },
      uTexMat: { value: new THREE.Matrix4() },
      uUseRefl: { value: 0 },
      uReflTexel: { value: new THREE.Vector2(0.002, 0.002) },
      tFoam: { value: null },
      uFoamRect: { value: new THREE.Vector3(-40, -40, 80) },
      uFogDensity: { value: 0.0006 },
      uSky: { value: null },
      tNoise: { value: noiseTexture() },
    };
    this.mat = new THREE.ShaderMaterial({ uniforms: this.u, vertexShader: VERT, fragmentShader: FRAG });
    this.mesh = new THREE.Mesh(oceanGeo(), this.mat);
    this.mesh.receiveShadow = false;
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
    this.fc = document.createElement('canvas');
    this.fc.width = this.fc.height = 256;
    this.u.tFoam.value = new THREE.CanvasTexture(this.fc);
    this.u.tFoam.value.flipY = false;
    this.rt = null;
    this.vcam = new THREE.PerspectiveCamera();
    this.vcam.layers.set(0);
    this.scale = 0.5;
    this.hide = [];
  }
  setFoam(tiles, T) {
    const g = this.fc.getContext('2d'),
      S = 256,
      size = this.u.uFoamRect.value.z,
      px = S / size;
    const [tc, tg] = [document.createElement('canvas'), null];
    tc.width = tc.height = S;
    const t2 = tc.getContext('2d');
    t2.fillStyle = '#000';
    t2.fillRect(0, 0, S, S);
    t2.fillStyle = '#fff';
    for (const [i, j] of tiles) {
      const x = (i * T - T / 2 + 40) * px,
        z = (j * T - T / 2 + 40) * px;
      t2.fillRect(x - 1, z - 1, T * px + 2, T * px + 2);
    }
    g.filter = 'blur(1.1px)';
    g.fillStyle = '#000';
    g.fillRect(0, 0, S, S);
    g.drawImage(tc, 0, 0);
    g.filter = 'none';
    this.u.tFoam.value.needsUpdate = true;
  }
  setReflection(renderer, scale) {
    this.scale = scale;
    if (this.rt) {
      this.rt.dispose();
      this.rt = null;
    }
    if (scale > 0) {
      const s = this.sizeFn ? this.sizeFn() : renderer.getDrawingBufferSize(new THREE.Vector2());
      this.rt = new THREE.WebGLRenderTarget(Math.max(64, (s.x * scale) | 0), Math.max(64, (s.y * scale) | 0), {
        type: THREE.HalfFloatType,
      });
      this.u.tRefl.value = this.rt.texture;
      this.u.uReflTexel.value.set(1 / this.rt.width, 1 / this.rt.height);
    }
    this.u.uUseRefl.value = scale > 0 ? 1 : 0;
  }
  resize(renderer) {
    if (this.rt) this.setReflection(renderer, this.scale);
  }
  renderReflection(renderer, scene, camera) {
    for (const o of this.hide) o.visible = false;
    this.mesh.position.set(camera.position.x, 0, camera.position.z);
    if (!this.rt) return;
    const n = new THREE.Vector3(0, 1, 0),
      cp = camera.position,
      vc = this.vcam;
    if (cp.y < 0.05) {
      this.hide.length && 0;
      return;
    }
    const rot = new THREE.Matrix4().extractRotation(camera.matrixWorld);
    const view = new THREE.Vector3(cp.x, -cp.y, cp.z);
    const look = new THREE.Vector3(0, 0, -1).applyMatrix4(rot).add(cp);
    look.y = -look.y;
    vc.position.copy(view);
    vc.up.set(0, 1, 0).applyMatrix4(rot);
    vc.up.y = -vc.up.y;
    vc.lookAt(look);
    vc.far = camera.far;
    vc.near = camera.near;
    vc.updateMatrixWorld();
    vc.projectionMatrix.copy(camera.projectionMatrix);
    const tm = this.u.uTexMat.value;
    tm.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
    tm.multiply(vc.projectionMatrix).multiply(vc.matrixWorldInverse);
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(n, new THREE.Vector3(0, 0, 0));
    plane.applyMatrix4(vc.matrixWorldInverse);
    const clip = new THREE.Vector4(plane.normal.x, plane.normal.y, plane.normal.z, plane.constant),
      pm = vc.projectionMatrix,
      q = new THREE.Vector4();
    q.x = (Math.sign(clip.x) + pm.elements[8]) / pm.elements[0];
    q.y = (Math.sign(clip.y) + pm.elements[9]) / pm.elements[5];
    q.z = -1;
    q.w = (1 + pm.elements[10]) / pm.elements[14];
    clip.multiplyScalar(2 / clip.dot(q));
    pm.elements[2] = clip.x;
    pm.elements[6] = clip.y;
    pm.elements[10] = clip.z + 1 - 0.003;
    pm.elements[14] = clip.w;
    this.mesh.visible = false;
    const old = renderer.getRenderTarget();
    renderer.setRenderTarget(this.rt);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    renderer.render(scene, vc);
    renderer.setRenderTarget(old);
    this.mesh.visible = true;
    for (const o of this.hide) o.visible = true;
  }
}
