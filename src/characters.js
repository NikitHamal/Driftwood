import * as THREE from '../three.module.js';
import { M, mesh, box, cyl, sph, cap, damp, clamp } from './util.js';
import { MAT, makeLantern } from './models.js';
export function makeHuman(o={}){
  const c={skin:'#e9b48e',shirt:'#f2efe6',shirt2:'#3d7fa6',pants:'#3f5a74',hair:'#4a2f1f',shoe:'#5a3b28',hat:true,beard:false,bandana:null,...o};
  const sk=M(c.skin,0.7),sh=M(c.shirt,0.85),pa=M(c.pants,0.9),ha=M(c.hair,0.9),so=M(c.shoe,0.8);
  const R={};const root=new THREE.Group();R.root=root;
  const hips=new THREE.Group();hips.position.y=0.92;root.add(hips);R.hips=hips;
  const pel=sph(0.17,pa,0,0.02,0,hips);pel.scale.set(1.05,0.75,0.82);
  const spine=new THREE.Group();spine.position.y=0.06;hips.add(spine);R.spine=spine;
  const torso=cap(0.165,0.22,sh,0,0.18,0,spine);torso.scale.set(1.08,1,0.78);
  if(c.shirt2){const vest=cap(0.17,0.16,M(c.shirt2,0.85),0,0.2,0,spine);vest.scale.set(1.1,1,0.82);const cut=box(0.09,0.34,0.02,sh,0,0.22,0.135,spine);}
  const belt=cyl(0.172,0.172,0.04,M('#5a3d26',0.7),0,0.01,0,spine,14);belt.scale.z=0.82;
  const chest=new THREE.Group();chest.position.y=0.36;spine.add(chest);R.chest=chest;
  cyl(0.05,0.055,0.08,sk,0,0.03,0,chest,8);
  const head=new THREE.Group();head.position.y=0.08;chest.add(head);R.head=head;
  const skull=sph(0.135,sk,0,0.13,0.005,head,20,16);skull.scale.set(1,1.02,0.96);
  const hair=mesh(new THREE.SphereGeometry(0.143,20,12,0,Math.PI*2,0,Math.PI*0.52),ha,0,0.14,-0.008,head);hair.rotation.x=-0.25;
  const fringe=sph(0.06,ha,0.04,0.235,0.08,head,8,6);fringe.scale.set(1.6,0.5,0.8);
  for(const s of[-1,1]){const e=sph(0.017,M('#1d1a19',0.3),s*0.048,0.14,0.122,head,8,6);e.scale.set(1,1.3,0.6);sph(0.006,M('#ffffff',0.2),s*0.044,0.147,0.132,head,6,4);
    box(0.04,0.009,0.01,ha,s*0.05,0.178,0.124,head).rotation.z=s*-0.15;const ch=sph(0.022,M('#f08a7a',0.8),s*0.075,0.108,0.11,head,8,6);ch.scale.set(1,0.6,0.3);sph(0.028,sk,s*0.135,0.13,0,head,8,6)}
  sph(0.02,sk,0,0.115,0.135,head,8,6);
  const mouth=box(0.03,0.006,0.01,M('#8a4a3a',0.6),0,0.075,0.125,head);
  if(c.beard){const b=sph(0.11,ha,0,0.07,0.04,head,14,10);b.scale.set(1.15,0.85,0.95);const mu=sph(0.03,ha,0,0.095,0.125,head,8,6);mu.scale.set(1.8,0.6,0.6)}
  if(c.hat){const hm=M('#e3c47a',0.9);const brim=cyl(0.3,0.3,0.018,hm,0,0.235,0,head,24);brim.rotation.x=-0.08;cyl(0.135,0.15,0.11,hm,0,0.29,-0.005,head,18);cyl(0.152,0.152,0.03,M('#c0442f',0.7),0,0.255,-0.005,head,18)}
  if(c.bandana){const bm=M(c.bandana,0.8);const b=mesh(new THREE.SphereGeometry(0.15,18,10,0,Math.PI*2,0,Math.PI*0.45),bm,0,0.15,-0.01,head);b.rotation.x=-0.3;sph(0.04,bm,0,0.17,-0.15,head,8,6)}
  for(const s of[-1,1]){const k=s<0?'l':'r';
    const shd=new THREE.Group();shd.position.set(s*0.215,-0.01,0);chest.add(shd);R[k+'Sh']=shd;
    sph(0.07,c.shirt2?M(c.shirt2,0.85):sh,0,0,0,shd,10,8);
    cap(0.056,0.13,sh,0,-0.1,0,shd);
    const el=new THREE.Group();el.position.y=-0.25;shd.add(el);R[k+'El']=el;
    cap(0.046,0.15,sk,0,-0.1,0,el);
    const hand=sph(0.052,sk,0,-0.24,0.01,el,10,8);hand.scale.set(0.9,1.1,0.8);
    const sock=new THREE.Group();sock.position.set(0,-0.25,0.02);el.add(sock);R[k+'Hand']=sock;
    const hp=new THREE.Group();hp.position.set(s*0.095,0,0);hips.add(hp);R[k+'Hip']=hp;
    cap(0.075,0.25,pa,0,-0.19,0,hp);
    const kn=new THREE.Group();kn.position.y=-0.42;hp.add(kn);R[k+'Kn']=kn;
    cap(0.058,0.26,c.pantsLong?pa:sk,0,-0.2,0,kn);
    const ft=cap(0.055,0.12,so,0,-0.42,0.04,kn);ft.rotation.x=Math.PI/2;ft.scale.set(1.1,1,0.8);
  }
  // tools
  R.tools={};
  const rod=new THREE.Group();const pole=cyl(0.008,0.016,1.9,MAT.darkWood,0,0.85,0,rod,6);const reel=cyl(0.035,0.035,0.03,MAT.metal,0.03,0.12,0,rod,10);reel.rotation.z=Math.PI/2;rod.rotation.x=Math.PI/2+0.6;R.rHand.add(rod);R.tools.rod=rod;
  R.rodTip=new THREE.Object3D();R.rodTip.position.set(0,1.8,0);rod.add(R.rodTip);
  const hook=new THREE.Group();const coil=mesh(new THREE.TorusGeometry(0.07,0.025,6,14),MAT.rope,0,0,0,hook);coil.rotation.y=Math.PI/2;const hk=mesh(new THREE.TorusGeometry(0.04,0.01,5,10,Math.PI*1.3),MAT.metal,0,-0.08,0.06,hook);R.lHand.add(hook);R.tools.hook=hook;
  const ham=new THREE.Group();cyl(0.018,0.018,0.38,MAT.darkWood,0,0.12,0,ham,6);box(0.07,0.07,0.17,M('#5c6166',0.5),0,0.3,0.03,ham);ham.rotation.x=Math.PI/2;R.rHand.add(ham);R.tools.hammer=ham;
  for(const k in R.tools)R.tools[k].visible=false;
  root.traverse(m=>{if(m.isMesh){m.castShadow=true;m.receiveShadow=false}});
  return R;
}
const KEYS=['hipsY','spineX','spineY','chestX','headX','headY','lShX','lShZ','rShX','rShZ','rShY','lElX','rElX','lHipX','rHipX','lKnX','rKnX'];
export class HumanAnim{
  constructor(R){this.R=R;this.cur={};this.tgt={};for(const k of KEYS)this.cur[k]=0;this.phase=0;this.t=0;this.action=null;this.at=0;this.ad=1;this.aw=0;this.hold=null;this.sitting=0}
  play(name,dur=0.6){this.action=name;this.at=0;this.ad=dur}
  update(dt,speed){
    this.t+=dt;const t=this.t,T={};for(const k of KEYS)T[k]=0;
    const w=clamp(speed/3.2,0,1.5);this.phase+=dt*(2+speed*2.1);
    const s=Math.sin(this.phase),c=Math.cos(this.phase);
    T.lHipX=-s*0.6*w;T.rHipX=s*0.6*w;T.lKnX=Math.max(0,c)*1.1*w+0.05;T.rKnX=Math.max(0,-c)*1.1*w+0.05;
    T.lShX=s*0.55*w;T.rShX=-s*0.55*w;T.lElX=-0.25-w*0.3;T.rElX=-0.25-w*0.3;T.lShZ=0.1;T.rShZ=-0.1;
    T.hipsY=-Math.abs(c)*0.045*w+Math.sin(t*1.8)*0.006*(1-w);T.spineY=s*0.12*w;T.spineX=0.06*w;T.chestX=Math.sin(t*1.8)*0.025;T.headX=-0.04*w;T.headY=Math.sin(t*0.4)*0.15*(1-w);
    if(this.hold==='rod'){Object.assign(T,{rShX:-0.85,rElX:-0.7,rShZ:-0.05,lShX:-0.75,lElX:-0.9,lShZ:-0.25})}
    if(this.action){this.at+=dt;const k=clamp(this.at/this.ad,0,1),A={};const a=this.action;
      if(a==='cast'||a==='throw'){const up=k<0.45?k/0.45:1-(k-0.45)/0.55;const side=a==='throw'?'l':'r';A[side+'ShX']=-0.9-up*2.0;A[side+'ElX']=-0.3-up*0.6;A.spineY=(a==='throw'?-1:1)*0.25*up;A.chestX=-0.15*up}
      else if(a==='reel'||a==='pull'){A.rShX=-0.9+Math.sin(t*16)*0.25;A.lShX=-0.9-Math.sin(t*16)*0.25;A.rElX=-1.1;A.lElX=-1.1;A.spineX=-0.1;A.lHipX=-0.3;A.lKnX=0.3}
      else if(a==='hammer'){A.rShX=-1.5+Math.sin(k*Math.PI*6)*0.8;A.rElX=-0.5;A.spineX=0.35;A.hipsY=-0.12;A.lHipX=-0.6;A.rHipX=-0.3;A.lKnX=0.9;A.rKnX=0.7;A.lShX=-0.6}
      else if(a==='interact'||a==='pet'){const b=Math.sin(Math.min(1,k*1.4)*Math.PI);A.spineX=0.55*b;A.hipsY=-0.22*b;A.lHipX=-0.8*b;A.rHipX=-0.8*b;A.lKnX=1.4*b;A.rKnX=1.4*b;A.rShX=-1.0*b+(a==='pet'?Math.sin(t*10)*0.2:0);A.lShX=-0.8*b;A.rElX=-0.3;A.headX=0.25*b}
      else if(a==='eat'||a==='drink'){const b=Math.sin(k*Math.PI);A.rShX=-1.3*b;A.rElX=-2.0*b;A.rShZ=0.3*b;A.headX=a==='drink'?-0.3*b:0.1*b}
      else if(a==='cheer'){const b=Math.sin(k*Math.PI);A.lShX=-2.8*b;A.rShX=-2.8*b;A.lShZ=0.4*b;A.rShZ=-0.4*b;A.lElX=-0.3+Math.sin(t*14)*0.3;A.rElX=-0.3+Math.sin(t*14+1)*0.3;A.hipsY=Math.abs(Math.sin(k*Math.PI*3))*0.1}
      else if(a==='climb'){A.lShX=-2.6+Math.sin(t*9)*0.4;A.rShX=-2.6-Math.sin(t*9)*0.4;A.lHipX=-0.9+Math.sin(t*9)*0.5;A.rHipX=-0.9-Math.sin(t*9)*0.5;A.lKnX=1.2;A.rKnX=1.2}
      else if(a==='sleep'){A.spineX=0.3;A.headX=0.4}
      this.aw=damp(this.aw,1,14,dt);for(const key in A)T[key]=T[key]+(A[key]-T[key])*this.aw;
      if(k>=1){this.action=null}
    }else this.aw=0;
    const C=this.cur;for(const k of KEYS)C[k]=damp(C[k],T[k],16,dt);
    const R=this.R;R.hips.position.y=0.92+C.hipsY;R.spine.rotation.set(C.spineX,C.spineY,0);R.chest.rotation.x=C.chestX;R.head.rotation.set(C.headX,C.headY,0);
    R.lSh.rotation.set(C.lShX,0,C.lShZ);R.rSh.rotation.set(C.rShX,C.rShY,C.rShZ);R.lEl.rotation.x=C.lElX;R.rEl.rotation.x=C.rElX;
    R.lHip.rotation.x=C.lHipX;R.rHip.rotation.x=C.rHipX;R.lKn.rotation.x=C.lKnX;R.rKn.rotation.x=C.rKnX;
  }
}
// ---------- cat ----------
export function makeCat(){
  const o=M('#e8964a',0.85),w=M('#fbf2e6',0.85),R={root:new THREE.Group()};const b=new THREE.Group();R.root.add(b);R.body=b;
  const body=cap(0.1,0.24,o,0,0.2,0,b);body.rotation.x=Math.PI/2;body.scale.set(1,1,0.95);
  const belly=cap(0.08,0.2,w,0,0.16,0.02,b);belly.rotation.x=Math.PI/2;
  const head=new THREE.Group();head.position.set(0,0.32,0.2);b.add(head);R.head=head;
  const hd=sph(0.1,o,0,0,0,head,16,12);hd.scale.set(1.1,0.95,0.95);const mz=sph(0.05,w,0,-0.03,0.07,head,10,8);mz.scale.set(1.3,0.8,0.8);
  for(const s of[-1,1]){const e=mesh(new THREE.ConeGeometry(0.04,0.08,4),o,s*0.06,0.09,0,head);e.rotation.z=-s*0.3;sph(0.014,M('#1d1a19',0.3),s*0.04,0.02,0.088,head,6,4)}
  sph(0.012,M('#e07a7a',0.6),0,-0.005,0.11,head,6,4);
  R.legs=[];for(const[x,z]of[[-0.06,0.13],[0.06,0.13],[-0.06,-0.13],[0.06,-0.13]]){const l=new THREE.Group();l.position.set(x,0.17,z);b.add(l);cap(0.032,0.1,o,0,-0.08,0,l);sph(0.035,w,0,-0.15,0.01,l,8,6);R.legs.push(l)}
  R.tail=[];let p=b;let pos=[0,0.24,-0.2];for(let i=0;i<5;i++){const s=new THREE.Group();s.position.set(...pos);p.add(s);cap(0.025,0.07,i>3?w:o,0,0.05,0,s);R.tail.push(s);p=s;pos=[0,0.1,0]}
  R.tail[0].rotation.x=-0.6;
  R.root.traverse(m=>{if(m.isMesh)m.castShadow=true});return R;
}
export function animCat(R,dt,t,speed,sit){
  const ph=t*(speed*9);for(let i=0;i<4;i++)R.legs[i].rotation.x=Math.sin(ph+(i%2?Math.PI:0)+(i>1?Math.PI/2:0))*0.6*Math.min(1,speed);
  R.body.position.y=damp(R.body.position.y,sit?-0.06:0,6,dt);R.body.rotation.x=damp(R.body.rotation.x,sit?-0.35:0,6,dt);
  if(sit){R.legs[0].rotation.x=R.legs[1].rotation.x=0.35;R.legs[2].rotation.x=R.legs[3].rotation.x=-1.2}
  R.tail.forEach((s,i)=>{s.rotation.z=Math.sin(t*2+i*0.7)*0.25;if(i>0)s.rotation.x=0.25});R.head.rotation.y=Math.sin(t*0.6)*0.4;
}
// ---------- gull ----------
export function makeGull(){const R={root:new THREE.Group()};const w=M('#f7f7f4',0.7),g=M('#9aa4ab',0.7);
  const b=sph(0.12,w,0,0,0,R.root,12,8);b.scale.set(0.8,0.7,2);sph(0.08,w,0,0.06,0.22,R.root,10,8);const bk=mesh(new THREE.ConeGeometry(0.02,0.08,5),M('#f2b33d',0.6),0,0.05,0.32,R.root);bk.rotation.x=Math.PI/2;
  R.wings=[];for(const s of[-1,1]){const p=new THREE.Group();p.position.set(s*0.06,0.03,0);R.root.add(p);const wg=box(0.55,0.015,0.18,g,s*0.28,0,0,p);const tip=box(0.15,0.016,0.12,M('#2a2d30',0.7),s*0.5,0,-0.02,p);R.wings.push(p)}
  const tl=box(0.12,0.015,0.15,w,0,0,-0.27,R.root);R.root.traverse(m=>{if(m.isMesh)m.castShadow=true});return R}
// ---------- shark ----------
export function makeShark(){const R={root:new THREE.Group()};const g=M('#5f7d8c',0.5),wb=M('#dfe7ea',0.6);
  const b=new THREE.Group();R.root.add(b);R.body=b;const body=sph(0.5,g,0,0,0,b,20,14);body.scale.set(0.7,0.62,2.6);const belly=sph(0.46,wb,0,-0.08,0.1,b,18,12);belly.scale.set(0.62,0.5,2.3);
  const fin=mesh(new THREE.ConeGeometry(0.28,0.75,3),g,0,0.6,-0.1,b);fin.scale.set(0.25,1,1.2);fin.rotation.x=-0.35;R.fin=fin;
  for(const s of[-1,1]){const pf=box(0.7,0.04,0.3,g,s*0.45,-0.2,0.35,b);pf.rotation.z=s*-0.4;pf.rotation.y=s*0.3;sph(0.035,M('#111',0.2),s*0.25,0.08,1.05,b,8,6)}
  const tail=new THREE.Group();tail.position.z=-1.25;b.add(tail);R.tail=tail;const tf=box(0.05,0.9,0.35,g,0,0.15,-0.25,tail);tf.rotation.x=0.4;const tf2=box(0.05,0.5,0.3,g,0,-0.15,-0.2,tail);tf2.rotation.x=-0.5;
  R.root.traverse(m=>{if(m.isMesh)m.castShadow=true});return R}
// ---------- trader boat ----------
export function makeBoat(sailTex){const g=new THREE.Group();const hull=new THREE.Group();g.add(hull);
  const shape=new THREE.Shape();shape.moveTo(0,1.9);shape.quadraticCurveTo(0.95,0.9,0.85,-1.6);shape.lineTo(-0.85,-1.6);shape.quadraticCurveTo(-0.95,0.9,0,1.9);
  const hg=new THREE.ExtrudeGeometry(shape,{depth:0.6,bevelEnabled:true,bevelSize:0.06,bevelThickness:0.06,bevelSegments:2});hg.rotateX(Math.PI/2);hg.translate(0,0.45,0);
  const hm=mesh(hg,M('#b0573c',0.7),0,0,0,hull);const deck=mesh(new THREE.ShapeGeometry(shape),new THREE.MeshStandardMaterial({map:MAT.plank.map,color:'#c9b08a',side:THREE.DoubleSide,roughness:0.9}),0,0.47,0,hull);deck.rotation.x=Math.PI/2;deck.scale.set(0.92,0.92,1);
  const stripe=mesh(hg.clone(),M('#f1e6cc',0.7),0,0.02,0,hull);stripe.scale.set(1.01,0.15,1.01);stripe.position.y=0.3;
  cyl(0.05,0.06,3.6,MAT.darkWood,0,2.2,0.5,hull,8);const boom=cyl(0.035,0.035,1.8,MAT.darkWood,0,1.1,-0.35,hull,6);boom.rotation.x=Math.PI/2;
  const sail=mesh(new THREE.PlaneGeometry(1.7,2.6,6,6),new THREE.MeshStandardMaterial({map:sailTex,side:THREE.DoubleSide,roughness:0.9}),0,2.45,-0.35,hull);sail.rotation.y=Math.PI/2;
  const sp=sail.geometry.attributes.position;for(let i=0;i<sp.count;i++){const x=sp.getX(i);sp.setZ(i,(1-(x/0.85)**2)*0.18)}sail.geometry.computeVertexNormals();
    const cr=new THREE.Group();for(const[x,z,s]of[[0.4,-0.9,0.45],[-0.35,-1.0,0.4],[0.0,-1.2,0.35]]){const b=new THREE.Mesh(new THREE.BoxGeometry(s,s,s),MAT.plank);b.position.set(x,0.5+s/2,z);b.castShadow=true;cr.add(b)}hull.add(cr);
  const lan=makeLantern();lan.position.set(0,0.5,1.4);hull.add(lan);
  hull.traverse(m=>{if(m.isMesh)m.castShadow=true});return{group:g,hull,sail};
}
