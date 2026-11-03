import * as THREE from '../three.module.js';
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const lerp=(a,b,t)=>a+(b-a)*t;
export const damp=(a,b,l,dt)=>lerp(a,b,1-Math.exp(-l*dt));
export const smooth=(e0,e1,x)=>{const t=clamp((x-e0)/(e1-e0),0,1);return t*t*(3-2*t)};
export const rr=(a,b)=>a+Math.random()*(b-a);
export const pick=a=>a[Math.floor(Math.random()*a.length)];
export function rng(seed){let a=seed>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
export function dampAngle(a,b,l,dt){let d=b-a;d=Math.atan2(Math.sin(d),Math.cos(d));return a+d*(1-Math.exp(-l*dt))}
const cache=new Map();
export function M(color,rough=0.85,extra=null){
  const k=color+'|'+rough+'|'+(extra?extra.key||'':'');
  if(!extra||extra.key){ if(cache.has(k))return cache.get(k); }
  const o={color,roughness:rough,metalness:0};
  if(extra)for(const n in extra)if(n!=='key')o[n]=extra[n];
  const m=new THREE.MeshStandardMaterial(o);
  if(!extra||extra.key)cache.set(k,m);
  return m;
}
export function mesh(geo,mat,x=0,y=0,z=0,parent=null,shadow=true){
  const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);
  if(shadow){m.castShadow=true;m.receiveShadow=true;}
  if(parent)parent.add(m);return m;
}
export const box=(w,h,d,mat,x,y,z,p)=>mesh(new THREE.BoxGeometry(w,h,d),mat,x,y,z,p);
export const cyl=(rt,rb,h,mat,x,y,z,p,seg=14)=>mesh(new THREE.CylinderGeometry(rt,rb,h,seg),mat,x,y,z,p);
export const sph=(r,mat,x,y,z,p,ws=16,hs=12)=>mesh(new THREE.SphereGeometry(r,ws,hs),mat,x,y,z,p);
export const cap=(r,l,mat,x,y,z,p)=>mesh(new THREE.CapsuleGeometry(r,l,6,12),mat,x,y,z,p);
// darken geometry towards bottom with vertex colors (fake AO)
export function vertexAO(geo,minY,maxY,dark=0.55,base=[1,1,1]){
  const p=geo.attributes.position,c=new Float32Array(p.count*3);
  for(let i=0;i<p.count;i++){const t=clamp((p.getY(i)-minY)/(maxY-minY),0,1);const f=dark+(1-dark)*t;c[i*3]=base[0]*f;c[i*3+1]=base[1]*f;c[i*3+2]=base[2]*f;}
  geo.setAttribute('color',new THREE.BufferAttribute(c,3));return geo;
}
export const fmtTime=t=>{const h=Math.floor(t*24),m=Math.floor((t*24-h)*60);return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`};
