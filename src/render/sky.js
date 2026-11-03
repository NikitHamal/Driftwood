// Physically-inspired sky dome: Preetham-style Rayleigh/Mie atmosphere, palette-driven horizon haze,
// layered raymarch-free volumetric-look clouds (self-shadowed, silver lining), phase-lit moon, stars and Milky Way.
import * as THREE from '../../vendor/three.module.js';
import { NOISE_GLSL, noiseTexture } from './glsl.js';

const VERT = /* glsl */ `
varying vec3 vDir;
void main(){ vDir = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.); gl_Position = p.xyww; }`;

const FRAG = /* glsl */ `
uniform vec3 uSunDir, uMoonDir, uSunColor, uHaze, uZenith, uGround, uOvercast, uCloudTint;
uniform float uSunVis, uStars, uTime, uCover, uRain, uNoSun, uTurbidity, uSunLum;
varying vec3 vDir;
${NOISE_GLSL}
const float PI = 3.141592653589793;
const vec3 LAMBDA = vec3(680e-9, 550e-9, 450e-9);
const vec3 K = vec3(0.686, 0.678, 0.666);
vec3 totalRayleigh(vec3 l){ return (8. * pow(PI, 3.) * pow(pow(1.0003, 2.) - 1., 2.) * (6. + 3. * .035)) / (3. * 2.545e25 * pow(l, vec3(4.)) * (6. - 7. * .035)); }
vec3 totalMie(float T){ float c = (.2 * T) * 10e-18; return .434 * c * PI * pow((2. * PI) / LAMBDA, vec3(2.)) * K; }
float rayleighPhase(float c){ return .05968310365946075 * (1. + c * c); }
float hgPhase(float c, float g){ float g2 = g * g; return .07957747154594767 * ((1. - g2) / pow(1. - 2. * g * c + g2, 1.5)); }

vec3 atmosphereUnused(vec3 d, vec3 sunDir){
  float cosZ = max(d.y, 0.0);
  float zen = acos(cosZ);
  float inv = 1. / (cosZ + .15 * pow(93.885 - degrees(zen), -1.253));
  float sunCos = sunDir.y;
  float sunE = 1000. * max(0., 1. - exp(-((1.6110731556870734 - acos(clamp(sunCos, -1., 1.))) / 1.5)));
  float fade = 1. - clamp(1. - exp(sunDir.y / 450000. * 1000.), 0., 1.);
  vec3 bR = totalRayleigh(LAMBDA) * 1.35, bM = totalMie(uTurbidity) * .0035;
  vec3 Fex = exp(-(bR * 8.4e3 * inv + bM * 1.25e3 * inv));
  float cosT = dot(d, sunDir);
  vec3 bRT = bR * rayleighPhase(cosT * .5 + .5), bMT = bM * hgPhase(cosT, .8);
  vec3 Lin = pow(sunE * ((bRT + bMT) / (bR + bM)) * (1. - Fex), vec3(1.5));
  Lin *= mix(vec3(1.), pow(sunE * ((bRT + bMT) / (bR + bM)) * Fex, vec3(.5)), clamp(pow(1. - sunDir.y, 5.), 0., 1.));
  vec3 L0 = vec3(.1) * Fex;
  return pow((Lin + L0) * .04 + vec3(0., .0003, .00075), vec3(1. / (1.2 + 1.2 * 1.0)));
}

vec4 clouds(vec3 d, float dist){
  // two cloud decks: thick cumulus at ~1.6km and thin cirrus at ~7km, projected on planes
  vec2 wind = vec2(uTime * 6., uTime * 2.6);
  float cov = clamp(uCover + uRain * .4, 0., 1.);
  vec2 p = d.xz / max(d.y, .02) * 1600. + wind;
  vec2 q = p / 900.;
  float base = fbm5(q * .9 + 3.1);
  float detail = fbm4(q * 3.4 - wind / 700.);
  float dens = smoothstep(1. - cov, 1. - cov + .4, base * .82 + detail * .22);
  // self shadow / thickness: sample toward the sun
  vec2 sdir = normalize(uSunDir.xz + 1e-4) * (.06 + .08 * (1. - clamp(uSunDir.y, 0., 1.)));
  float dens2 = smoothstep(1. - cov, 1. - cov + .4, fbm4((q + sdir) * .9 + 3.1) * .82 + fbm4((q + sdir) * 3.4 - wind / 700.) * .22);
  float shade = clamp(1. - (dens2 - dens * .5) * 1.1, .15, 1.);
  float mu = dot(d, uSunDir);
  float silver = pow(max(mu, 0.), 6.) * (1. - dens * .55) * 1.6;
  float edge = clamp(1. - dens2, 0., 1.) * dens;
  vec3 lit = uSunColor * uSunLum * (shade * .85 + silver + edge * .6);
  vec3 amb = uCloudTint * (.35 + .5 * uZenith);
  vec3 c = mix(amb, lit, clamp(uSunVis, 0., 1.)) * mix(1., .55, uRain);
  c = mix(c, uOvercast * .75, uRain * .6);
  // cirrus
  vec2 pc = d.xz / max(d.y, .05) * 5200. + wind * 3.;
  float ci = fbm4(vec2(pc.x * .00045, pc.y * .0016) + 7.7);
  float cir = smoothstep(.52, .8, ci) * .45 * (1. - uRain);
  vec3 cc = mix(uCloudTint * .5, uSunColor * uSunLum * .7, clamp(uSunVis, 0., 1.));
  float fadeH = smoothstep(.0, .22, d.y);
  float a = dens * fadeH;
  vec3 col = mix(cc, c, a / max(a + cir * fadeH, 1e-3));
  float alpha = clamp(a + cir * fadeH * (1. - a), 0., 1.);
  return vec4(col, alpha);
}

void main(){
  vec3 d = normalize(vDir);
  vec3 col;
  if(d.y < 0.){
    col = uGround;
  } else {
    float elev = clamp(d.y, 0., 1.);
    // palette-driven Rayleigh-like gradient (zenith -> haze) with a Mie forward-scatter glow around the sun
    float cs0 = max(dot(d, uSunDir), 0.);
    col = mix(uHaze, uZenith, pow(elev, .55)) * 1.7;
    col *= 1. + .35 * pow(1. - elev, 3.) * uSunVis;
    col += uSunColor * (pow(cs0, 5.) * .22 + pow(cs0, 40.) * .35) * uSunVis * (1. - uRain);
    col = mix(col, col * .55, uRain);
    // palette driven horizon haze: guarantees the dome blends seamlessly into ocean fog colour
    float hz = exp(-elev * 9.5);
    col = mix(col, uHaze, clamp(hz * .92, 0., 1.));
    col = mix(col, uOvercast * (.35 + .65 * uSunVis), uRain * .8);
    // sun
    float cs = max(dot(d, uSunDir), 0.);
    vec3 sunGlow = uSunColor * (pow(cs, 24.) * .35 + pow(cs, 600.) * 2.2) * uSunVis * uSunLum * (1. - uRain * .85);
    float disk = smoothstep(.99985, .99992, cs) * (1. - uRain);
    col += sunGlow * .6 + uSunColor * 26. * disk * uSunVis * (1. - uNoSun);
    // stars + milky way
    if(uStars > .01){
      vec3 p = d * 120.; vec3 cell = floor(p); vec3 f = fract(p);
      float h = hash13(cell); float star = 0.;
      if(h > .965){ vec3 o = vec3(hash13(cell + 1.7), hash13(cell + 5.3), hash13(cell + 9.1)); star = smoothstep(.2, .0, length(f - o)) * (.4 + 1.6 * fract(h * 91.)); }
      star *= .75 + .25 * sin(uTime * (1.5 + h * 3.) + h * 60.);
      vec3 gal = normalize(vec3(.3, .85, .4));
      float band = exp(-pow(dot(d, gal) * 3.4, 2.)) * (.35 + .65 * fbm4(d.xz * 14. + d.y * 9.));
      float vis = uStars * smoothstep(.0, .2, d.y) * (1. - uRain);
      col += (vec3(.9, .95, 1.) * star * 1.5 + vec3(.35, .42, .6) * band * .12) * vis;
    }
    // moon: phase-free full disc with maria
    float md = dot(d, uMoonDir);
    if(md > .9985 && uStars > .01){
      vec3 u = normalize(cross(uMoonDir, vec3(0., 1., 0.))), v = cross(u, uMoonDir);
      vec2 m = vec2(dot(d, u), dot(d, v)) / .0549; float r2 = dot(m, m);
      if(r2 < 1.){
        vec3 n = vec3(m, sqrt(1. - r2));
        float maria = fbm4(m * 3.2 + 40.) * .55 + fbm4(m * 11. + 9.) * .25;
        float lit = .5 + .5 * n.z;
        col = mix(col, vec3(.86, .88, .95) * (1.05 - maria * .65) * lit * 2.2, smoothstep(1., .96, r2) * (1. - uRain * .9));
      }
    }
    col += vec3(.45, .55, .85) * pow(max(md, 0.), 60.) * uStars * .25 * (1. - uRain);
    // clouds
    vec4 cl = clouds(d, 0.);
    col = mix(col, cl.rgb, cl.a * (1. - uNoSun * .0));
  }
  gl_FragColor = vec4(col, 1.);
}`;

export class Sky {
  constructor(scene) {
    this.u = {
      uZenith: { value: new THREE.Color('#2b6fb0') },
      uHaze: { value: new THREE.Color('#bcd9e6') },
      uGround: { value: new THREE.Color('#2c6b7a') },
      uOvercast: { value: new THREE.Color('#7e8f9a') },
      uCloudTint: { value: new THREE.Color('#dfe8f2') },
      uSunDir: { value: new THREE.Vector3(0, 1, 0) },
      uMoonDir: { value: new THREE.Vector3(0, -1, 0) },
      uSunColor: { value: new THREE.Color(1, 1, 1) },
      uSunLum: { value: 1 },
      uSunVis: { value: 1 },
      uStars: { value: 0 },
      uTime: { value: 0 },
      uCover: { value: 0.55 },
      uRain: { value: 0 },
      uTurbidity: { value: 3.2 },
      uNoSun: { value: 0 },
      tNoise: { value: noiseTexture() },
    };
    const geo = new THREE.SphereGeometry(2400, 48, 24);
    const make = (uniforms) =>
      new THREE.ShaderMaterial({
        uniforms,
        side: THREE.BackSide,
        depthWrite: false,
        depthTest: false,
        fog: false,
        vertexShader: VERT,
        fragmentShader: FRAG,
      });
    this.mat = make(this.u);
    this.dome = new THREE.Mesh(geo, this.mat);
    this.dome.frustumCulled = false;
    this.dome.renderOrder = -10;
    scene.add(this.dome);
    // a second dome sharing every uniform value except uNoSun, rendered into the environment cube
    this.envScene = new THREE.Scene();
    this.envMat = make({ ...this.u, uNoSun: { value: 1 } });
    this.envDome = new THREE.Mesh(geo, this.envMat);
    this.envDome.frustumCulled = false;
    this.envScene.add(this.envDome);
  }
  update(dt, camera) {
    this.u.uTime.value += dt;
    this.dome.position.copy(camera.position);
  }
}
