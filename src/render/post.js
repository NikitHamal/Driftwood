// HDR post-processing pipeline (dependency free):
//   scene -> MSAA half-float target (+depth) -> half-res SSAO -> bilateral blur -> dual-filter bloom pyramid
//   -> composite (AO, bloom, exposure, filmic tone map, grade, vignette, grain, sRGB encode, dither).
import * as THREE from '../../vendor/three.module.js';

const VERT = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`;
const fsMat = (frag, uniforms, extra = {}) =>
  new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: frag, depthTest: false, depthWrite: false, ...extra });

const AO_FRAG = /* glsl */ `
uniform sampler2D tDepth; uniform mat4 uProj, uProjInv; uniform float uRadius, uStrength;
varying vec2 vUv;
vec3 viewPos(vec2 uv, float d){ vec4 c = uProjInv * vec4(uv * 2. - 1., d * 2. - 1., 1.); return c.xyz / c.w; }
float ign(vec2 p){ return fract(52.9829189 * fract(dot(p, vec2(.06711056, .00583715)))); }
void main(){
  float d = texture2D(tDepth, vUv).x;
  if(d >= .99999){ gl_FragColor = vec4(1.); return; }
  vec3 P = viewPos(vUv, d);
  vec3 N = normalize(cross(dFdx(P), dFdy(P)));
  float rad = uRadius * (1. + (-P.z) * .03);
  float ang = ign(gl_FragCoord.xy) * 6.2831853, occ = 0.;
  const int S = 14;
  for(int i = 0; i < S; i++){
    float fi = (float(i) + .5) / float(S);
    float a = ang + float(i) * 2.399963;
    vec3 dir = normalize(vec3(cos(a), sin(a), .35 + fi));
    if(dot(dir, N) < 0.) dir = -dir;
    vec3 sp = P + dir * rad * (.2 + .8 * fi);
    vec4 cl = uProj * vec4(sp, 1.);
    vec2 suv = cl.xy / cl.w * .5 + .5;
    float sd = texture2D(tDepth, suv).x;
    if(sd >= .99999) continue;
    float sz = viewPos(suv, sd).z;
    float dz = sz - sp.z;
    float rc = smoothstep(0., 1., rad / max(abs(P.z - sz), 1e-3));
    occ += step(.015 * rad, dz) * rc;
  }
  float far = 1. - smoothstep(60., 160., -P.z);
  gl_FragColor = vec4(vec3(1. - clamp(occ / float(S) * uStrength * far, 0., 1.)), 1.);
}`;

const BLUR_FRAG = /* glsl */ `
uniform sampler2D tAO, tDepth; uniform vec2 uTexel;
varying vec2 vUv;
void main(){
  float d0 = texture2D(tDepth, vUv).x; float s = 0., w = 0.;
  for(int x = -2; x <= 2; x++) for(int y = -2; y <= 2; y++){
    vec2 uv = vUv + vec2(float(x), float(y)) * uTexel;
    float d = texture2D(tDepth, uv).x;
    float k = exp(-abs(d - d0) * 12000.);
    s += texture2D(tAO, uv).r * k; w += k;
  }
  gl_FragColor = vec4(vec3(s / max(w, 1e-4)), 1.);
}`;

const PRE_FRAG = /* glsl */ `
uniform sampler2D tSrc; uniform vec2 uTexel; uniform float uThreshold;
varying vec2 vUv;
vec3 s(vec2 o){ return texture2D(tSrc, vUv + o * uTexel).rgb; }
void main(){
  vec3 c = s(vec2(0.)) * .25 + (s(vec2(-1, -1)) + s(vec2(1, -1)) + s(vec2(-1, 1)) + s(vec2(1, 1))) * .1875 + (s(vec2(-2, 0)) + s(vec2(2, 0)) + s(vec2(0, 2)) + s(vec2(0, -2))) * 0.0;
  float l = max(c.r, max(c.g, c.b));
  float k = clamp((l - uThreshold) / max(l, 1e-4), 0., 1.);
  gl_FragColor = vec4(min(c * k, vec3(60.)), 1.);
}`;

const DOWN_FRAG = /* glsl */ `
uniform sampler2D tSrc; uniform vec2 uTexel; varying vec2 vUv;
vec3 s(vec2 o){ return texture2D(tSrc, vUv + o * uTexel).rgb; }
void main(){
  vec3 c = s(vec2(0.)) * .125;
  c += (s(vec2(-1, -1)) + s(vec2(1, -1)) + s(vec2(-1, 1)) + s(vec2(1, 1))) * .125;
  c += (s(vec2(-2, -2)) + s(vec2(2, -2)) + s(vec2(-2, 2)) + s(vec2(2, 2))) * .03125;
  c += (s(vec2(-2, 0)) + s(vec2(2, 0)) + s(vec2(0, -2)) + s(vec2(0, 2))) * .0625;
  gl_FragColor = vec4(c, 1.);
}`;

const UP_FRAG = /* glsl */ `
uniform sampler2D tSrc; uniform vec2 uTexel; uniform float uWeight; varying vec2 vUv;
vec3 s(vec2 o){ return texture2D(tSrc, vUv + o * uTexel).rgb; }
void main(){
  vec3 c = s(vec2(0.)) * 4. + (s(vec2(-1, 0)) + s(vec2(1, 0)) + s(vec2(0, -1)) + s(vec2(0, 1))) * 2. + (s(vec2(-1, -1)) + s(vec2(1, -1)) + s(vec2(-1, 1)) + s(vec2(1, 1)));
  gl_FragColor = vec4(c / 16. * uWeight, 1.);
}`;

const COMP_FRAG = /* glsl */ `
uniform sampler2D tScene, tBloom, tAO; uniform float uExposure, uBloom, uAO, uVignette, uSat, uGrain, uTime, uContrast, uDim;
uniform vec3 uTint, uLift; uniform vec2 uRes; varying vec2 vUv;
vec3 aces(vec3 x){ x *= .6; return clamp((x * (2.51 * x + .03)) / (x * (2.43 * x + .59) + .14), 0., 1.); }
vec3 toSRGB(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(1. / 2.4)) - .055, step(.0031308, c)); }
float hash(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
void main(){
  vec3 c = texture2D(tScene, vUv).rgb;
  c *= mix(1., texture2D(tAO, vUv).r, uAO);
  c += texture2D(tBloom, vUv).rgb * uBloom;
  c *= uExposure * uTint;
  vec2 q = vUv - .5;
  c *= 1. - dot(q, q) * uVignette;
  c *= uDim;
  c = aces(c);
  float l = dot(c, vec3(.2126, .7152, .0722));
  c = mix(vec3(l), c, uSat);
  c = mix(c, c * c * (3. - 2. * c), uContrast);
  c += uLift * (1. - l);
  c = toSRGB(clamp(c, 0., 1.));
  float n = hash(gl_FragCoord.xy + fract(uTime) * 61.);
  c += (n - .5) * (uGrain + 1. / 255.);
  gl_FragColor = vec4(c, 1.);
}`;

export class PostFX {
  constructor(renderer) {
    this.r = renderer;
    this.scale = 1;
    this.cfg = { samples: 4, ao: true, bloom: true };
    this.scene = new THREE.Scene();
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);
    const rt = () => new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false });
    this.aoRT = rt();
    this.aoBlurRT = rt();
    this.levels = [];
    this.sceneRT = null;
    this.u = {
      comp: {
        tScene: { value: null },
        tBloom: { value: null },
        tAO: { value: null },
        uExposure: { value: 1 },
        uBloom: { value: 0.22 },
        uAO: { value: 0.85 },
        uVignette: { value: 0.55 },
        uSat: { value: 1.06 },
        uGrain: { value: 0.018 },
        uTime: { value: 0 },
        uContrast: { value: 0.12 },
        uDim: { value: 1 },
        uTint: { value: new THREE.Color(1, 1, 1) },
        uLift: { value: new THREE.Color(0.004, 0.008, 0.016) },
        uRes: { value: new THREE.Vector2(1, 1) },
      },
      ao: {
        tDepth: { value: null },
        uProj: { value: new THREE.Matrix4() },
        uProjInv: { value: new THREE.Matrix4() },
        uRadius: { value: 0.55 },
        uStrength: { value: 1.5 },
      },
    };
    this.m = {
      ao: fsMat(AO_FRAG, this.u.ao),
      blur: fsMat(BLUR_FRAG, { tAO: { value: null }, tDepth: { value: null }, uTexel: { value: new THREE.Vector2() } }),
      pre: fsMat(PRE_FRAG, { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() }, uThreshold: { value: 1.0 } }),
      down: fsMat(DOWN_FRAG, { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() } }),
      up: fsMat(
        UP_FRAG,
        { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() }, uWeight: { value: 1 } },
        { blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor },
      ),
      comp: fsMat(COMP_FRAG, this.u.comp),
    };
    this.m.ao.extensions = { derivatives: true };
    this.w = 1;
    this.h = 1;
  }
  configure(cfg) {
    Object.assign(this.cfg, cfg);
    this._build();
  }
  setSize(w, h, scale = this.scale) {
    this.w = w;
    this.h = h;
    this.scale = scale;
    this._build();
  }
  _build() {
    const sw = Math.max(2, Math.round(this.w * this.scale)),
      sh = Math.max(2, Math.round(this.h * this.scale));
    if (this.sceneRT) {
      this.sceneRT.depthTexture.dispose();
      this.sceneRT.dispose();
    }
    const dt = new THREE.DepthTexture(sw, sh);
    dt.type = THREE.UnsignedIntType;
    this.sceneRT = new THREE.WebGLRenderTarget(sw, sh, {
      type: THREE.HalfFloatType,
      samples: this.cfg.samples,
      depthTexture: dt,
      depthBuffer: true,
    });
    const hw = Math.max(2, sw >> 1),
      hh = Math.max(2, sh >> 1);
    this.aoRT.setSize(hw, hh);
    this.aoBlurRT.setSize(hw, hh);
    this.m.blur.uniforms.uTexel.value.set(1 / hw, 1 / hh);
    for (const l of this.levels) l.dispose();
    this.levels = [];
    let lw = hw,
      lh = hh;
    for (let i = 0; i < 5; i++) {
      this.levels.push(new THREE.WebGLRenderTarget(Math.max(2, lw), Math.max(2, lh), { type: THREE.HalfFloatType, depthBuffer: false }));
      lw >>= 1;
      lh >>= 1;
    }
    this.u.comp.uRes.value.set(this.w, this.h);
  }
  get target() {
    return this.sceneRT;
  }
  _pass(mat, target, clear = true) {
    this.quad.material = mat;
    this.r.setRenderTarget(target);
    if (clear) this.r.clear();
    this.r.render(this.scene, this.cam);
  }
  /** Renders the scene through the full pipeline to the canvas. `p` = per-frame grading params. */
  render(scene, camera, time, p = {}) {
    const r = this.r;
    r.setRenderTarget(this.sceneRT);
    r.clear();
    r.render(scene, camera);
    const u = this.u;
    const prevAuto = r.autoClear;
    r.autoClear = false;
    if (this.cfg.ao) {
      u.ao.tDepth.value = this.sceneRT.depthTexture;
      u.ao.uProj.value.copy(camera.projectionMatrix);
      u.ao.uProjInv.value.copy(camera.projectionMatrixInverse);
      this._pass(this.m.ao, this.aoRT);
      const bu = this.m.blur.uniforms;
      bu.tAO.value = this.aoRT.texture;
      bu.tDepth.value = this.sceneRT.depthTexture;
      this._pass(this.m.blur, this.aoBlurRT);
      u.comp.tAO.value = this.aoBlurRT.texture;
      u.comp.uAO.value = p.ao ?? 0.9;
    } else {
      u.comp.uAO.value = 0;
      u.comp.tAO.value = this.aoRT.texture;
    }
    if (this.cfg.bloom) {
      const L = this.levels,
        pre = this.m.pre.uniforms;
      pre.tSrc.value = this.sceneRT.texture;
      pre.uTexel.value.set(1 / this.sceneRT.width, 1 / this.sceneRT.height);
      pre.uThreshold.value = p.bloomThreshold ?? 1.0;
      this._pass(this.m.pre, L[0]);
      for (let i = 1; i < L.length; i++) {
        const d = this.m.down.uniforms;
        d.tSrc.value = L[i - 1].texture;
        d.uTexel.value.set(1 / L[i - 1].width, 1 / L[i - 1].height);
        this._pass(this.m.down, L[i]);
      }
      for (let i = L.length - 2; i >= 0; i--) {
        const d = this.m.up.uniforms;
        d.tSrc.value = L[i + 1].texture;
        d.uTexel.value.set(1 / L[i + 1].width, 1 / L[i + 1].height);
        d.uWeight.value = 1;
        this._pass(this.m.up, L[i], false);
      }
      u.comp.tBloom.value = L[0].texture;
      u.comp.uBloom.value = p.bloom ?? 0.25;
    } else {
      u.comp.uBloom.value = 0;
      u.comp.tBloom.value = this.aoRT.texture;
    }
    u.comp.tScene.value = this.sceneRT.texture;
    u.comp.uTime.value = time;
    u.comp.uExposure.value = p.exposure ?? 1;
    u.comp.uVignette.value = p.vignette ?? 0.55;
    u.comp.uSat.value = p.sat ?? 1.06;
    u.comp.uDim.value = p.dim ?? 1;
    if (p.tint) u.comp.uTint.value.copy(p.tint);
    this._pass(this.m.comp, null);
    r.autoClear = prevAuto;
  }
  dispose() {
    this.sceneRT.depthTexture.dispose();
    this.sceneRT.dispose();
    this.aoRT.dispose();
    this.aoBlurRT.dispose();
    for (const l of this.levels) l.dispose();
    for (const k in this.m) this.m[k].dispose();
  }
}
