import * as THREE from '../three.module.js';
import { MAT, DECK, BAL, makeTree, makePot, makeCrate, makeBarrel, makeLantern, makeLifeRing, rope } from './models.js';
import { M, mesh, box, cyl, sph, damp } from './util.js';

const CZ0=-1.35,CZ1=.35,CW=2.2,CH=1.95,CY=BAL+.035;
function frontWindow(g,x,y,z,w=.66,h=.68){
  box(w,h,.025,MAT.glass,x,y,z,g);for(const s of[-1,1]){box(.055,h+.12,.075,MAT.frame,x+s*(w/2+.025),y,z+.015,g);box(w+.12,.055,.075,MAT.frame,x,y+s*(h/2+.025),z+.015,g)}
  box(.035,h,.06,MAT.frame,x,y,z+.025,g);box(w,.035,.06,MAT.frame,x,y,z+.025,g);box(w+.2,.07,.18,MAT.darkWood,x,y-h/2-.075,z+.045,g);
}
function bed(g){
  const b=new THREE.Group(),linen=M('#d9d5c8',.96),blanket=M('#315f68',.92),brass=M('#8d7650',.35,{metalness:.65});
  box(.82,.16,1.22,MAT.darkWood,0,.24,0,b);box(.76,.18,1.14,linen,0,.39,0,b);box(.77,.055,.72,blanket,0,.505,-.18,b);
  for(const x of[-.39,.39])for(const z of[-.56,.56])cyl(.035,.045,.35,MAT.darkWood,x,.175,z,b,8);
  const pillow=sph(.22,linen,0,.54,.37,b,16,10);pillow.scale.set(1.35,.35,.7);
  box(.88,.65,.07,MAT.darkWood,0,.48,.6,b);for(const x of[-.39,.39])sph(.055,brass,x,.83,.6,b,10,8);
  b.position.set(.57,CY,-.7);g.add(b);
}
function furniture(g,tiers){
  bed(g);const rug=box(.82,.012,.72,M('#8b513c',1),-.48,CY+.012,-.25,g);rug.rotation.y=.04;
  const t=new THREE.Group();box(.66,.075,.48,MAT.plank,0,.67,0,t);for(const x of[-.27,.27])for(const z of[-.18,.18])box(.055,.65,.055,MAT.darkWood,x,.325,z,t);
  const book=box(.2,.035,.27,M('#a65d43',.9),-.12,.727,0,t);book.rotation.y=.15;box(.17,.025,.24,M('#d2b977',.9),-.1,.758,0,t);
  cyl(.065,.08,.13,MAT.terracotta,.18,.78,0,t,12);t.position.set(-.55,CY,-.82);g.add(t);
  const stool=new THREE.Group();cyl(.2,.2,.07,MAT.plank,0,.39,0,stool,16);for(let i=0;i<3;i++){const a=i*Math.PI*2/3;const l=cyl(.025,.035,.38,MAT.darkWood,Math.cos(a)*.13,.19,Math.sin(a)*.13,stool,7);l.rotation.z=Math.cos(a)*.12}stool.position.set(-.55,CY,-.25);g.add(stool);
  box(.76,.06,.2,MAT.darkWood,-.55,CY+1.35,CZ0+.13,g);for(let i=0;i<5;i++){const bk=box(.07+.02*(i%2),.24+.035*(i%3),.15,M(['#794c38','#315c64','#a78345'][i%3],.9),-.82+i*.13,CY+1.5,CZ0+.15,g);bk.rotation.z=(i-2)*.025}
  const lamp=makeLantern();lamp.position.set(-.55,CY+.75,-.82);g.add(lamp);
  const chest=makeCrate(.48);chest.position.set(.73,CY,.03);chest.rotation.y=-.08;g.add(chest);
  const craft=new THREE.Group();box(.8,.09,.38,MAT.plank,0,.78,0,craft);for(const x of[-.34,.34])box(.07,.77,.3,MAT.darkWood,x,.385,0,craft);box(.28,.035,.1,MAT.metal,.12,.85,0,craft);cyl(.018,.018,.35,MAT.darkWood,-.16,.9,0,craft,7).rotation.z=1.1;craft.position.set(-.53,CY,-1.02);tiers[1].add(craft);
}
function roof(g,tiers){
  const ry=CY+CH;box(2.55,.15,2.05,MAT.roof,0,ry+.02,-.5,g);box(2.65,.12,.12,MAT.darkWood,0,ry+.12,.52,g);
  for(let i=0;i<8;i++)box(.31,.055,2.0,MAT.plank,-1.085+i*.31,ry+.12,-.5,g);
  for(const x of[-1.23,1.23]){for(const z of[-1.43,-.5,.43])box(.045,.42,.045,MAT.darkWood,x,ry+.34,z,g);box(.045,.045,1.9,MAT.darkWood,x,ry+.55,-.5,g)}
  const soil=box(1.0,.16,.7,MAT.soil,-.42,ry+.24,-.68,g);for(const z of[-1.05,-.31])box(1.1,.22,.055,MAT.darkWood,-.42,ry+.25,z,g);
  const tree=makeTree(7);tree.position.set(-.43,ry+.31,-.68);tree.scale.setScalar(1.12);g.add(tree);
  [[.75,-1.1,0,.85],[.85,.12,1,.8],[-1.0,.15,2,.85]].forEach(([x,z,t,s],i)=>{const p=makePot(t,i+40,s);p.position.set(x,ry+.16,z);g.add(p)});
  const solar=new THREE.Group(),sm=M('#183f58',.18,{metalness:.55});for(const x of[-.42,.42]){box(.74,.035,.58,sm,x,0,0,solar);for(let k=1;k<4;k++)box(.008,.04,.58,MAT.frame,x-.37+k*.185,.005,0,solar);for(let k=1;k<3;k++)box(.74,.04,.008,MAT.frame,x,.005,-.29+k*.19,solar)}solar.position.set(.45,ry+.48,-.7);solar.rotation.x=-.34;tiers[2-1].add(solar);
  const vane=new THREE.Group();cyl(.018,.025,1.05,MAT.metal,0,.52,0,vane,8);box(.72,.025,.025,MAT.metal,0,.93,0,vane);const fin=mesh(new THREE.ConeGeometry(.13,.3,3),MAT.metal,.36,.93,0,vane);fin.rotation.z=-Math.PI/2;vane.position.set(.95,ry+.18,.1);tiers[2].add(vane);
  const scope=new THREE.Group();cyl(.035,.05,.85,MAT.darkWood,0,.42,0,scope,8);const tube=cyl(.09,.12,.72,M('#8c7650',.3,{metalness:.7}),0,.88,0,scope,16);tube.rotation.x=1.1;scope.position.set(.82,ry+.16,-.02);tiers[2].add(scope);
}
export function makeHouse(){
  const g=new THREE.Group(),tiers=[new THREE.Group(),new THREE.Group(),new THREE.Group()];tiers.forEach(t=>g.add(t));
  for(const x of[-1.15,1.15])for(const z of[-1.2,1.15])cyl(.09,.12,BAL-DECK,MAT.stilt,x,DECK+(BAL-DECK)/2,z,g,10);
  for(let i=0;i<9;i++)box(.34,.075,3.0,MAT.plank,-1.36+i*.34,BAL,0,g);
  box(3.08,.16,.14,MAT.darkWood,0,BAL-.1,1.45,g);box(3.08,.16,.14,MAT.darkWood,0,BAL-.1,-1.45,g);
  for(const x of[-1.45,1.45]){for(const z of[-1.35,-.45,.45,1.35])box(.055,.58,.055,MAT.darkWood,x,BAL+.31,z,g);box(.055,.055,2.75,MAT.darkWood,x,BAL+.6,0,g)}
  for(const x of[-1.42,-.78,.75,1.42])box(.055,.58,.055,MAT.darkWood,x,BAL+.31,1.4,g);box(.69,.055,.055,MAT.darkWood,-1.1,BAL+.6,1.4,g);box(.72,.055,.055,MAT.darkWood,1.08,BAL+.6,1.4,g);
  // Front wall is segmented around an actual open doorway and window.
  box(.2,CH,.1,MAT.wall,-1,CY+CH/2,CZ1,g);box(.29,CH,.1,MAT.wall,-.055,CY+CH/2,CZ1,g);box(.28,CH,.1,MAT.wall,.96,CY+CH/2,CZ1,g);
  box(CW,.4,.1,MAT.wall,0,CY+1.75,CZ1,g);box(.86,.72,.1,MAT.wall,.46,CY+.36,CZ1,g);
  box(.1,CH,1.7,MAT.wall,-1.05,CY+CH/2,-.5,g);box(CW,CH,.1,MAT.wall,0,CY+CH/2,CZ0,g);
  // Right wall has a genuine window opening.
  box(.1,CH,.48,MAT.wall,1.05,CY+CH/2,-1.11,g);box(.1,CH,.48,MAT.wall,1.05,CY+CH/2,.11,g);box(.1,.68,.76,MAT.wall,1.05,CY+.34,-.5,g);box(.1,.53,.76,MAT.wall,1.05,CY+1.685,-.5,g);
  for(const x of[-1.1,1.1])for(const z of[CZ0,CZ1])box(.085,CH+.05,.085,MAT.trim,x,CY+CH/2,z,g);
  frontWindow(g,.46,CY+1.09,CZ1+.065);
  const sw=new THREE.Group();frontWindow(sw,0,0,0,.64,.62);sw.position.set(1.115,CY+1.08,-.5);sw.rotation.y=Math.PI/2;g.add(sw);
  const doorPivot=new THREE.Group();doorPivot.position.set(-.9,CY,CZ1+.07);doorPivot.userData.dynamic=true;g.add(doorPivot);
  box(.7,1.52,.065,MAT.trim,.35,.76,0,doorPivot);for(let i=0;i<5;i++)box(.55,.018,.012,MAT.darkWood,.35,.22+i*.25,.041,doorPivot);sph(.035,MAT.metal,.59,.75,.065,doorPivot,10,8);
  box(.78,.09,.15,MAT.frame,-.55,CY+1.57,CZ1+.04,g);box(.09,1.6,.15,MAT.frame,-.94,CY+.8,CZ1+.04,g);box(.09,1.6,.15,MAT.frame,-.16,CY+.8,CZ1+.04,g);
  box(.9,.025,.5,M('#6e4a35',1),-.55,BAL+.05,.65,g);furniture(g,tiers);roof(g,tiers);
  const lampW=makeLantern();lampW.position.set(-1.0,CY+1.62,CZ1+.18);g.add(lampW);
  const ring=makeLifeRing();ring.position.set(-1.17,CY+1.15,-.45);ring.rotation.y=Math.PI/2;g.add(ring);
  const barrel=makeBarrel(MAT.drum,.72,.26);barrel.position.set(.85,DECK,-.65);g.add(barrel);const crate=makeCrate(.5);crate.position.set(.65,DECK,.1);g.add(crate);
  [[-1.28,1.15,0],[1.27,1.15,1],[-1.27,-1.15,2]].forEach(([x,z,t],i)=>{const p=makePot(t,70+i,1.05);p.position.set(x,BAL+.05,z);g.add(p)});
  const px=1.35,pz=-1.35;cyl(.055,.075,5.4,MAT.stilt,px,DECK+2.7,pz,g,10);box(.72,.055,.055,MAT.stilt,px-.3,DECK+5.22,pz,g);const lamp=makeLantern();lamp.position.set(px-.6,DECK+4.75,pz);g.add(lamp);g.add(rope(new THREE.Vector3(px,DECK+5.25,pz),new THREE.Vector3(-1.1,CY+CH+.1,.3),.45,.009));
  const lx=.62,lz=1.52;for(const x of[-.2,.2])box(.06,BAL-DECK+.6,.06,MAT.darkWood,lx+x,DECK+(BAL-DECK+.6)/2,lz,g);for(let y=DECK+.3;y<BAL+.2;y+=.3)box(.42,.04,.055,MAT.darkWood,lx,y,lz,g);
  // Tier 1: shutters, metal brackets and guttering. Tier 2 adds solar; tier 3 adds navigation equipment.
  for(const s of[-1,1]){const sh=box(.22,.72,.055,MAT.trim,.46+s*.48,CY+1.09,CZ1+.1,tiers[0]);for(let k=0;k<4;k++)box(.2,.025,.015,MAT.darkWood,.46+s*.48,CY+.82+k*.17,CZ1+.135,tiers[0])}
  for(const x of[-1.1,1.1])for(const z of[CZ0,CZ1]){box(.13,.28,.025,MAT.metal,x,CY+.16,z+.06,tiers[0]);sph(.018,MAT.metal,x,CY+.16,z+.08,tiers[0],8,6)}
  const gutter=cyl(.045,.045,2.5,MAT.metal,0,CY+CH-.05,.54,tiers[0],10);gutter.rotation.z=Math.PI/2;
  let level=0,target=0;const api={group:g,lanterns:[lamp,lampW],ladder:{x:lx,z:lz+.45,topZ:lz-.35},door:doorPivot,bed:{x:.57,z:-.7},upgradePoint:{x:-.55,z:.9},doorOpen:0,
    setLevel(n){level=Math.max(0,Math.min(3,n|0));tiers.forEach((t,i)=>t.visible=i<level)},get level(){return level},
    update(dt,x,z,onBalcony){const near=onBalcony&&Math.hypot(x+.55,z-.55)<1.15;target=near?1:0;this.doorOpen=damp(this.doorOpen,target,9,dt);doorPivot.rotation.y=this.doorOpen*1.72;}};
  api.setLevel(0);return api;
}
