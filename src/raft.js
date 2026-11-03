import * as THREE from '../three.module.js';
import { MAT, makeStation, makeCrop, BP, DECK, BAL } from './models.js';
import { makeHouse } from './house.js';
import { rng, box } from './util.js';
export const T=2.4;
const DIRS=[[0,1],[1,0],[0,-1],[-1,0]];
const PEARL=new THREE.MeshStandardMaterial({color:'#f6efff',roughness:0.15,metalness:0.3,emissive:new THREE.Color('#3a3050')});
export class Raft{
  constructor(scene){
    this.group=new THREE.Group();scene.add(this.group);
    const bg=new THREE.BoxGeometry(1,1,1);
    this.planks=new THREE.InstancedMesh(bg,MAT.plank,1400);this.beams=new THREE.InstancedMesh(bg,MAT.darkWood,2400);
    this.drums=new THREE.InstancedMesh(new THREE.CylinderGeometry(1,1,1,14),MAT.drum,700);
    for(const m of[this.planks,this.beams,this.drums]){m.castShadow=true;m.receiveShadow=true;this.group.add(m)}
    const h=makeHouse();this.house=h;this.group.add(h.group);
    this.tiles=new Set();this.bmap=new Map();this.health=new Map();
  }
  key(i,j){return i+','+j}
  has(i,j){return this.tiles.has(this.key(i,j))}
  setTiles(list){this.tiles=new Set(list.map(([i,j])=>this.key(i,j)));this.rebuild()}
  list(){return[...this.tiles].map(k=>k.split(',').map(Number))}
  rebuild(){
    const d=new THREE.Object3D(),c=new THREE.Color();let np=0,nb=0,nd=0;
    const pc=['#cfc6b6','#bdb3a2','#aea698','#c6b89f','#a39d92','#d6cbb5','#b9a98d'];
    for(const [i,j] of this.list()){const r=rng((i*73856093)^(j*19349663)^7),cx=i*T,cz=j*T;
      for(let k=0;k<5;k++){const w=T/5;d.position.set(cx-T/2+(k+0.5)*w,DECK-0.04+r()*0.012,cz+(r()-0.5)*0.04);d.rotation.set((r()-0.5)*0.01,(r()-0.5)*0.015,(r()-0.5)*0.02);d.scale.set(w-0.035,0.075,T-0.02-r()*0.06);d.updateMatrix();this.planks.setMatrixAt(np,d.matrix);c.set(pc[(r()*pc.length)|0]);this.planks.setColorAt(np++,c)}
      for(const z of[-0.7,0.7]){d.position.set(cx,DECK-0.15,cz+z);d.rotation.set(0,0,0);d.scale.set(T,0.13,0.18);d.updateMatrix();this.beams.setMatrixAt(nb++,d.matrix)}
      DIRS.forEach(([dx,dz])=>{if(this.has(i+dx,j+dz))return;d.position.set(cx+dx*(T/2-0.06),DECK-0.1,cz+dz*(T/2-0.06));d.rotation.set(0,0,0);d.scale.set(dz?T+0.06:0.13,0.24,dx?T+0.06:0.13);d.updateMatrix();this.beams.setMatrixAt(nb++,d.matrix)});
      for(const x of[-0.6,0.6]){d.position.set(cx+x,0.1,cz);d.rotation.set(Math.PI/2,0,0);d.scale.set(0.3,T*0.85,0.3);d.updateMatrix();this.drums.setMatrixAt(nd++,d.matrix)}
    }
    this.planks.count=np;this.beams.count=nb;this.drums.count=nd;
    for(const m of[this.planks,this.beams,this.drums]){m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;m.computeBoundingSphere()}
  }
  edgeDir(i,j){for(const[dx,dz]of DIRS)if(!this.has(i+dx,j+dz))return[dx,dz];return null}
  canFoundation(i,j){if(this.has(i,j))return false;if(Math.abs(i)>6||Math.abs(j)>6)return false;return DIRS.some(([dx,dz])=>this.has(i+dx,j+dz))}
  occupied(i,j){if(i===0&&j===0)return true;for(const b of this.bmap.values())if(b.data.tile[0]===i&&b.data.tile[1]===j)return true;return false}
  addBuilding(data){
    const st=makeStation(data.type);const[i,j]=data.tile;st.group.position.set(i*T,DECK,j*T);
    if(BP[data.type].edge){const e=data.dir||this.edgeDir(i,j)||[0,1];data.dir=e;st.group.rotation.y=Math.atan2(e[0],e[1])}else st.group.rotation.y=data.rot||0;
    st.group.traverse(m=>{if(m.isMesh){m.castShadow=true;m.receiveShadow=true}});
    this.group.add(st.group);const b={data,obj:st};this.bmap.set(data.id,b);this.refreshVisual(b);return b;
  }
  removeBuilding(id){const b=this.bmap.get(id);if(!b)return;this.group.remove(b.obj.group);this.bmap.delete(id)}
  refreshVisual(b){const{type}=b.data,s=b.data.s||{},P=b.obj.parts;
    if(type==='planter'){P.crops.clear();if(s.crop){for(const x of[-0.35,0,0.35]){const c=makeCrop(s.crop,Math.min(1,s.grow||0));c.position.x=x;c.traverse(m=>{if(m.isMesh)m.castShadow=true});P.crops.add(c)}}}
    if(type==='grill'){P.food.visible=!!s.fish;P.food.children.forEach(f=>f.material=f.material.clone());if(s.fish)P.food.children.forEach(f=>f.material.color.set(s.t>=1?'#c07a3a':'#8fb3c4'))}
    if(type==='rain'||type==='still'){P.water.position.y=(type==='rain'?0.12:0.2)+Math.min(1,(s.n||0)/4)*(type==='rain'?0.5:0.05)}
    if(type==='purifier'){P.water.visible=(s.done||0)>0}
    if(type==='trap'){P.fish.clear();for(let k=0;k<(s.n||0);k++){const f=new THREE.Mesh(new THREE.SphereGeometry(0.05,8,6),MAT.blue);f.scale.set(2,0.8,0.7);f.position.set((k%3-1)*0.2,-0.2+Math.floor(k/3)*0.1,0);P.fish.add(f)}}
    if(type==='smoker'){P.fish.visible=(s.q|0)+(s.done|0)>0;P.fish.children.forEach((f,i)=>f.visible=i<(s.q|0)+(s.done|0))}
    if(type==='pearl'){P.pearls.clear();for(let k=0;k<Math.min(6,s.n|0);k++){const m=new THREE.Mesh(new THREE.SphereGeometry(0.06,10,8),PEARL);m.position.set(-0.45+(k%3)*0.45,-0.33+Math.floor(k/3)*0.1,0);P.pearls.add(m)}}
    if(type==='winch'){P.loot.clear();for(let k=0;k<Math.min(5,(s.items||[]).length);k++){const m=new THREE.Mesh(new THREE.BoxGeometry(0.22,0.07,0.1),MAT.plank);m.position.set(-0.15+(k%3)*0.15,Math.floor(k/3)*0.08,0);m.rotation.y=k;P.loot.add(m)}}
    if(type==='net'){P.loot.clear();for(let k=0;k<Math.min(6,(s.items||[]).length);k++){const m=new THREE.Mesh(new THREE.BoxGeometry(0.3,0.08,0.12),MAT.plank);m.position.set(-0.8+k*0.32,0.05,-0.08);m.rotation.y=k;P.loot.add(m)}}
    if(type==='diver'){P.loot.clear();for(let k=0;k<Math.min(5,s.n|0);k++)box(.17,.1,.13,MAT.metal,-.3+k*.15,k*.07,0,P.loot);for(let k=0;k<Math.min(2,s.p|0);k++){const m=new THREE.Mesh(new THREE.SphereGeometry(.055,10,8),PEARL);m.position.set(.25+k*.13,.12,0);P.loot.add(m)}}
  }
  // collision
  walkable(x,z,level=0,rad=0.28){
    if(level===1){
      const r=Math.min(rad,.2);if(Math.abs(x)>1.34-r||z>1.34-r||z< -1.25+r)return false;
      // The front wall is solid except for the real door opening.
      if(Math.abs(z-.35)<r+.055&&Math.abs(x+.55)>.31-r)return false;
      if(z<.35){if(Math.abs(x)>1.0-r)return false;
        if(Math.abs(x-.57)<.41+r&&Math.abs(z+.7)<.61+r)return false;
        if(Math.abs(x+.55)<.33+r&&Math.abs(z+.82)<.24+r)return false;}
      return true;
    }
    const i=Math.round(x/T),j=Math.round(z/T);if(!this.has(i,j))return false;
    const lx=x-i*T,lz=z-j*T,e=T/2-rad;
    if(lx>e&&!this.has(i+1,j))return false;if(lx<-e&&!this.has(i-1,j))return false;if(lz>e&&!this.has(i,j+1))return false;if(lz<-e&&!this.has(i,j-1))return false;
    if(Math.abs(x)<1.25+rad&&Math.abs(z)<1.28+rad)return false;
    for(const b of this.bmap.values()){const r=BP[b.data.type].r;if(!r)continue;const bx=b.data.tile[0]*T,bz=b.data.tile[1]*T;if(b.data.type==='planter'){if(Math.abs(x-bx)<0.68+rad&&Math.abs(z-bz)<0.42+rad)return false}else if(Math.hypot(x-bx,z-bz)<r+rad)return false}
    return true;
  }
  bounds(){let m=1;for(const[i,j]of this.list())m=Math.max(m,Math.abs(i),Math.abs(j));return(m+0.5)*T}
}
