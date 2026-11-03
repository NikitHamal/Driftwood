import * as THREE from '../three.module.js';
const W=[[1,0.35,0.07,11],[-0.45,1,0.05,7],[0.75,-0.7,0.03,4.1],[-0.9,-0.3,0.016,2.6]];
export const waves=W.map(([x,z,a,l])=>{const n=Math.hypot(x,z),k=2*Math.PI/l;return{dx:x/n,dz:z/n,a,k,w:Math.sqrt(9.8*k)*0.55}});
export const waveState={amp:1,time:0};
export function waveHeight(x,z){let h=0;const t=waveState.time;for(const w of waves)h+=w.a*Math.sin((w.dx*x+w.dz*z)*w.k-w.w*t);return h*waveState.amp}
export function waveGrad(x,z){let gx=0,gz=0;const t=waveState.time;for(const w of waves){const c=w.a*w.k*Math.cos((w.dx*x+w.dz*z)*w.k-w.w*t);gx+=c*w.dx;gz+=c*w.dz;}return[gx*waveState.amp,gz*waveState.amp]}
export const waveUniforms=()=>({
  uWD:{value:waves.map(w=>new THREE.Vector4(w.dx,w.dz,w.k,w.w))},
  uWA:{value:new THREE.Vector4(...waves.map(w=>w.a))},
});
export const WAVE_GLSL=`
uniform vec4 uWD[4]; uniform vec4 uWA; uniform float uTime; uniform float uWaveAmp;
float waveH(vec2 p,out vec2 g){float h=0.;g=vec2(0.);
 for(int i=0;i<4;i++){vec4 d=uWD[i];float a=uWA[i];float ph=dot(d.xy,p)*d.z-d.w*uTime;h+=a*sin(ph);g+=a*d.z*cos(ph)*d.xy;}
 g*=uWaveAmp;return h*uWaveAmp;}
`;
