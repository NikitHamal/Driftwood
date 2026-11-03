import * as THREE from '../three.module.js';
import { clamp, lerp, damp, dampAngle, rr, pick, fmtTime, smooth } from './util.js';
import { waveHeight, waveGrad, waveState } from './waves.js';
import { Sky } from './sky.js';
import { Ocean } from './ocean.js';
import { Particles, Rain } from './particles.js';
import { initMaterials, MAT, TEX, timeU, BP, DEBRIS, makeDebris, makeStation, DECK, BAL } from './models.js';
import { makeHuman, HumanAnim, makeCat, animCat, makeGull, makeShark, makeBoat } from './characters.js';
import { Raft, T } from './raft.js';
import { ICON, ITEM } from './icons.js';
import { Audio } from './audio.js';
import { sailTex } from './textures.js';
import { PixelPass } from './pixel.js';
import { createEnvironment } from './pbr.js';
import { ViewModel } from './viewmodel.js';
const $=s=>document.querySelector(s),DAY=480,SAVE='driftwood.save.v2',SETK='driftwood.settings.v2';
const setLoad=(p,t)=>{$('#loadFill').style.width=p+'%';if(t)$('#loadTip').textContent=t};
// ================= renderer =================
const canvas=$('#c');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
const scene=new THREE.Scene();scene.fog=new THREE.Fog(0xbfe9f0,140,1500);
const camera=new THREE.PerspectiveCamera(48,innerWidth/innerHeight,0.1,5000);camera.layers.enable(1);scene.add(camera);
const pix=new PixelPass(renderer,camera);
const hemi=new THREE.HemisphereLight(0xc4e8ff,0x2c8e92,1.1);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xffffff,3);sun.castShadow=true;sun.shadow.bias=-0.0004;sun.shadow.normalBias=0.035;sun.shadow.camera.near=1;sun.shadow.camera.far=90;scene.add(sun,sun.target);
setLoad(15,'Carving the driftwood…');
initMaterials();
const environment=createEnvironment(renderer,scene),viewModel=new ViewModel(camera);
const audio=new Audio();
const sky=new Sky(scene),ocean=new Ocean(scene),parts=new Particles(scene),rain=new Rain(scene);
const raft=new Raft(scene);ocean.sizeFn=()=>pix.on?new THREE.Vector2(pix.w*2,pix.h*2):renderer.getDrawingBufferSize(new THREE.Vector2());
setLoad(40,'Raising the floating house…');
// player
const P=makeHuman();raft.group.add(P.root);const PA=new HumanAnim(P);
const cat=makeCat();raft.group.add(cat.root);
const gulls=[0,1,2,3].map(i=>{const g=makeGull();scene.add(g.root);return{R:g,ang:i*1.7,r:12+i*3,h:9+i*1.6,spd:0.18+i*0.03,ph:i}});
const shark=makeShark();scene.add(shark.root);
const boat=makeBoat(sailTex());scene.add(boat.group);boat.group.visible=false;
const trader=makeHuman({shirt:'#f4e7c8',shirt2:'#8a3b2a',pants:'#4b3a2a',hair:'#cfc6b8',beard:true,hat:false,bandana:'#2f6e9a',skin:'#d49a72',pantsLong:true});
trader.root.position.set(0,0.1,-0.25);trader.root.rotation.y=Math.PI/2;boat.hull.add(trader.root);
trader.lHip.rotation.x=trader.rHip.rotation.x=-1.45;trader.lKn.rotation.x=trader.rKn.rotation.x=1.5;
// glow sprites on lanterns
const glows=[];function addGlow(obj,s=1.1){const m=new THREE.SpriteMaterial({map:TEX.glow,color:0xffb060,blending:THREE.AdditiveBlending,transparent:true,depthWrite:false,opacity:0});const sp=new THREE.Sprite(m);sp.scale.setScalar(s);sp.position.y=0.12;sp.layers.set(1);obj.add(sp);glows.push(sp);return sp}
raft.house.lanterns.forEach(l=>addGlow(l,1.3));
const lampLight=new THREE.PointLight(0xffa850,0,14,1.5);raft.house.lanterns[0].add(lampLight);lampLight.position.y=0.1;
const winLight=new THREE.PointLight(0xffb060,0,7,1.8);winLight.position.set(0.4,BAL+1.1,1.0);raft.group.add(winLight);
// fishing line, bobber, hook
const lineGeo=new THREE.BufferGeometry();lineGeo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(21*3),3));
const fishLine=new THREE.Line(lineGeo,new THREE.LineBasicMaterial({color:0xf5f1e6,transparent:true,opacity:0.8}));fishLine.frustumCulled=false;fishLine.layers.set(1);scene.add(fishLine);fishLine.visible=false;
const bobber=new THREE.Group();{const a=new THREE.Mesh(new THREE.SphereGeometry(0.07,12,8,0,Math.PI*2,0,Math.PI/2),MAT.red),b=new THREE.Mesh(new THREE.SphereGeometry(0.07,12,8,0,Math.PI*2,Math.PI/2,Math.PI/2),MAT.white);bobber.add(a,b)}scene.add(bobber);bobber.visible=false;
const hookObj=new THREE.Mesh(new THREE.TorusGeometry(0.08,0.02,5,10,Math.PI*1.4),MAT.metal);scene.add(hookObj);hookObj.visible=false;
const hoverRing=new THREE.Mesh(new THREE.RingGeometry(1.0,1.12,48),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.8,depthWrite:false}));hoverRing.rotation.x=-Math.PI/2;hoverRing.layers.set(1);scene.add(hoverRing);hoverRing.visible=false;
const jumpFish=new THREE.Group();{const b=new THREE.Mesh(new THREE.SphereGeometry(0.12,10,8),new THREE.MeshStandardMaterial({color:'#a9c3cf',metalness:0.5,roughness:0.3}));b.scale.set(0.6,0.8,2);const t=new THREE.Mesh(new THREE.ConeGeometry(0.1,0.15,3),b.material);t.rotation.x=-Math.PI/2;t.position.z=-0.28;t.scale.set(0.3,1,1);jumpFish.add(b,t)}scene.add(jumpFish);jumpFish.visible=false;
const ghost=new THREE.Group();raft.group.add(ghost);
const ghostMat=new THREE.MeshBasicMaterial({color:0x7bd88f,transparent:true,opacity:0.45,depthWrite:false});
setLoad(65,'Teaching the seagulls to fly…');
// ================= settings & quality =================
let settings={pxMode:1,quality:'auto',fps:false,master:0.8,music:0.5,sfx:0.8,sens:1};
try{Object.assign(settings,JSON.parse(localStorage.getItem(SETK)||'{}'))}catch(e){}
const saveSettings=()=>localStorage.setItem(SETK,JSON.stringify(settings));
const QUAL={low:{pr:0.8,sh:0,refl:0},medium:{pr:1,sh:1024,refl:0.35},high:{pr:1.5,sh:2048,refl:0.5},ultra:{pr:2,sh:4096,refl:0.65}};
let qLevel='high';
function applyQuality(name){qLevel=name;const q=QUAL[name];renderer.setPixelRatio(Math.min(devicePixelRatio,q.pr));renderer.setSize(innerWidth,innerHeight,false);
  const was=renderer.shadowMap.enabled;renderer.shadowMap.enabled=q.sh>0;sun.castShadow=q.sh>0;if(q.sh){sun.shadow.mapSize.set(q.sh,q.sh);if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null}}
  if(was!==renderer.shadowMap.enabled)scene.traverse(o=>{if(o.material){(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.needsUpdate=true)}});
  pix.px=+settings.pxMode||1;pix.u.uAO.value=q.sh>=1024?1:0;pix.u.uBloom.value=name==='low'?0:1;pix.setSize();ocean.setReflection(renderer,q.refl);parts.u.uScale.value=pix.sceneHeight()/(2*Math.tan(camera.fov*Math.PI/360));}
function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight,false);pix.setSize();ocean.resize(renderer);parts.u.uScale.value=pix.sceneHeight()/(2*Math.tan(camera.fov*Math.PI/360))}
addEventListener('resize',resize);
applyQuality(settings.quality==='auto'?'high':settings.quality);
// ================= day / night palette =================
const KF=[
 [0.00,'#06142a','#15304e','#1d3b5a','#9db4ff',0.0,'#7898bb','#3e596d',1.15,'#0c3c50','#072a3c',0.65,1,0.85],
 [0.21,'#0e2444','#3a4f78','#556890','#ffb07a',0.0,'#819bb7','#425c6d',1.05,'#164a5e','#0b3446',0.75,0.7,0.85],
 [0.255,'#4a86c4','#f6c099','#ffd8b0','#ffb070',1.4,'#a9c0dc','#3a6a70',0.85,'#2a8ca2','#1a6c86',1.0,0.05,0.85],
 [0.32,'#1a98d6','#a6e0ef','#cdeef3','#fff1d6',2.7,'#c0e6ff','#2e8a8e',1.1,'#1a9cbc','#0a6c92',1.0,0,1.0],
 [0.5,'#1490d2','#9cdcea','#c6ecf2','#ffffff',3.0,'#c4e8ff','#2c8e92',1.15,'#176f7c','#083f55',1.0,0,1.0],
 [0.68,'#1a8ecc','#a9dceb','#cdebf0','#fff0d8',2.6,'#bfe0f4','#2e8a8e',1.05,'#1b6c78','#0a4255',1.0,0,1.0],
 [0.755,'#3b6fb0','#f2aa7a','#ffc89c','#ff9a5a',1.5,'#c9a8b8','#3a5a68',0.8,'#2a8ea0','#186a82',1.0,0.05,0.9],
 [0.80,'#1c2c58','#a06070','#c07a78','#ff6a40',0.25,'#6a6a90','#1a3a4a',0.55,'#1a5a70','#0e4458',0.8,0.4,0.7],
 [0.86,'#06142a','#15304e','#1d3b5a','#9db4ff',0.0,'#7898bb','#3e596d',1.15,'#0c3c50','#072a3c',0.65,1,0.85],
 [1.0,'#06142a','#15304e','#1d3b5a','#9db4ff',0.0,'#7898bb','#3e596d',1.15,'#0c3c50','#072a3c',0.65,1,0.85]];
const KC=KF.map(k=>k.map(v=>typeof v==='string'?new THREE.Color(v):v));
const RAINC={z:new THREE.Color('#5b7282'),h:new THREE.Color('#93a6b0'),hz:new THREE.Color('#a9b8c0'),wn:new THREE.Color('#2a7f8e'),wf:new THREE.Color('#1a5c6c')};
const env={night:0,rainK:0,sunUp:1};const _c=new THREE.Color(),_c2=new THREE.Color();
function lerpKF(t,idx,out){let a=KC[0],b=KC[1];for(let i=0;i<KC.length-1;i++)if(t>=KC[i][0]&&t<=KC[i+1][0]){a=KC[i];b=KC[i+1];break}const k=smooth(0,1,(t-a[0])/Math.max(1e-4,b[0]-a[0]));if(out)return out.copy(a[idx]).lerp(b[idx],k);return lerp(a[idx],b[idx],k)}
function applySky(t,rk,dt){
  const su=sky.u,ou=ocean.u;
  lerpKF(t,1,su.uZenith.value).lerp(RAINC.z,rk*0.85);lerpKF(t,2,su.uHorizon.value).lerp(RAINC.h,rk*0.85);lerpKF(t,3,su.uHaze.value).lerp(RAINC.hz,rk*0.85);
  lerpKF(t,4,su.uSunColor.value);const sI=lerpKF(t,5)*(1-rk*0.7);
  const a=(t-0.25)*Math.PI*2,sd=new THREE.Vector3(Math.cos(a)*0.75,Math.sin(a)*0.92,0.42).normalize();
  su.uSunDir.value.copy(sd);su.uMoonDir.value.copy(sd).negate();su.uSunVis.value=(1-rk)*smooth(-0.08,0.05,sd.y);su.uStars.value=lerpKF(t,12)*(1-rk);su.uTime.value+=dt;
  const moon=sd.y<0;const ld=moon?su.uMoonDir.value:sd;
  sun.color.copy(moon?_c.set('#9db4ff'):su.uSunColor.value);sun.intensity=moon?1.0*(1-rk*0.65):sI;
  hemi.color.copy(lerpKF(t,6,_c2));hemi.groundColor.copy(lerpKF(t,7,_c));hemi.intensity=lerpKF(t,8)*(1-rk*0.25);
  ou.uNear.value.copy(lerpKF(t,9,_c)).lerp(RAINC.wn,rk*0.7);ou.uFar.value.copy(lerpKF(t,10,_c)).lerp(RAINC.wf,rk*0.7);
  ou.uHorizon.value.copy(su.uHaze.value);ou.uZenith.value.copy(su.uZenith.value);ou.uSunDir.value.copy(ld);ou.uSunColor.value.copy(sun.color).multiplyScalar(moon?0.4:Math.min(1.2,sI/2.5));ou.uLum.value=lerpKF(t,11)*(1-rk*0.3);ou.uStreak.value=(1-env.night*0.6);
  scene.fog.color.copy(su.uHaze.value);scene.fog.near=lerp(140,40,rk);scene.fog.far=lerp(1500,420,rk);ou.uFogNear.value=scene.fog.near;ou.uFogFar.value=scene.fog.far;
  renderer.toneMappingExposure=lerpKF(t,13)*(1.05-rk*0.1);
  const cl=_c.copy(lerpKF(t,11)>0.9?_c2.set('#ffffff'):_c2.set('#ffffff')).multiplyScalar(lerpKF(t,11));
  const warm=Math.max(0,1-Math.abs(t-0.255)/0.04)+Math.max(0,1-Math.abs(t-0.77)/0.045);
  for(const m of sky.cloudMats){m.color.setRGB(cl.r,cl.g,cl.b).lerp(_c2.set('#ffb48a'),Math.min(1,warm)*0.55).lerp(_c2.set('#8f9ea8'),rk*0.6)}
  env.night=clamp(lerpKF(t,12)*1.2,0,1);env.sunUp=sd.y;
  return ld;
}
function placeSun(ld,cx,cz,size){sun.position.set(cx+ld.x*40,ld.y*40+0.01,cz+ld.z*40);if(sun.position.y<3)sun.position.y=3;sun.target.position.set(cx,0,cz);const c=sun.shadow.camera;if(c.right!==size){c.left=-size;c.right=size;c.top=size;c.bottom=-size;c.updateProjectionMatrix()}}
// ================= game data =================
const CROP={potato:{name:'Potato',time:150,item:'potato',seed:'seedPotato',y:[2,3]},melon:{name:'Melon',time:300,item:'melon',seed:'seedMelon',y:[1,2]}};
const FISH=[{n:'Sardine',w:40,f:1,s:0.9},{n:'Mackerel',w:30,f:1,s:1.15},{n:'Sea Bream',w:17,f:2,s:1.4},{n:'Bluefin Tuna',w:8,f:3,s:1.75},{n:'Golden Koi',w:3,f:1,c:40,s:2.1}];
const SELL={smokedFish:11,pearl:30,rawFish:3,cookedFish:6,potato:4,melon:14,scrap:4,wood:1,plastic:1,fiber:1};
const BUY=[{id:'seedPotato',n:1,p:4},{id:'seedMelon',n:1,p:14},{id:'wood',n:5,p:8},{id:'plastic',n:4,p:8},{id:'fiber',n:4,p:6},{id:'scrap',n:1,p:7}];
const UPG=[{id:'rod',lv:1,name:'Sturdy Rod',desc:'Wider catch zone and quicker bites.',p:60},{id:'rod',lv:2,name:'Master Rod',desc:'Rare fish bite far more often.',p:180},
 {id:'hook',lv:1,name:'Long Rope',desc:'Hook range 10 m → 14 m.',p:50},{id:'hook',lv:2,name:'Grappling Hook',desc:'Hook range 14 m → 19 m.',p:150},
 {id:'crab',lv:1,name:'Hermit Crab Helper',desc:'Pip the crab collects ready stations for you, even while you are away.',p:200},{id:'crab',lv:2,name:'Crab Crew',desc:'Pip works three times as fast and never rests.',p:450},{id:'store',lv:1,name:'Storage Crates',desc:'Traps, nets, stills, smokers and pearl beds hold twice as much.',p:140},
  {id:'still',lv:1,name:'Solar Still Blueprint',desc:'Unlocks the Solar Still to build.',p:120},{id:'coil',lv:1,name:'Copper Coil',desc:'Purifiers make 3 water per boil.',p:90}];
const HOUSE_UP=[
 {name:'Weatherproof Cabin',desc:'Copper brackets, storm shutters and gutters protect your home.',perk:'+5% station speed · 8% slower hunger and thirst',cost:{wood:18,scrap:6,plastic:8}},
 {name:'Solar Workshop',desc:'A roof solar array and a fitted craftsman’s workbench.',perk:'+12% total station speed · 16% slower hunger and thirst',cost:{wood:28,scrap:14,plastic:16,fiber:10}},
 {name:'Captain’s Retreat',desc:'Navigation instruments, brass fittings and a master-crafted interior.',perk:'+20% total station speed · 24% slower vitals · 12 h offline progress',cost:{wood:42,scrap:24,plastic:22,fiber:18}}];
const QUESTS=[
 {t:'Hook floating debris',d:'Select the Hook (1), then click debris drifting past the raft.',k:'debris',n:5,r:{coins:10,wood:4}},
 {t:'Catch a fish',d:'Select the Rod (2) and click the water to cast. Click when the bobber dips!',k:'fish',n:1,r:{coins:10}},
 {t:'Build a Grill',d:'Select the Hammer (3) and choose Grill from the build menu.',k:'b:grill',n:1,r:{scrap:2}},
 {t:'Cook and eat a fish',d:'Put raw fish on the grill with E, collect it, then eat (5).',k:'ate',n:1,r:{coins:10}},
 {t:'Build a Water Purifier',d:'Fresh water keeps you alive out here.',k:'b:purifier',n:1,r:{wood:4}},
 {t:'Drink purified water',d:'Boil seawater in the purifier, collect it and drink (6).',k:'drank',n:1,r:{coins:15}},
 {t:'Plant some seeds',d:'Build a Planter, then press E beside it to plant.',k:'planted',n:1,r:{seedPotato:2}},
 {t:'Harvest a crop',d:'Water crops to make them grow nearly twice as fast.',k:'harvest',n:1,r:{coins:20}},
 {t:'Expand your raft',d:'Build 2 new foundations with the Hammer.',k:'tiles',n:2,r:{plastic:4,wood:4}},
 {t:'Trade with Marlo',d:'The merchant visits every day between 09:00 and 15:00.',k:'sold',n:1,r:{coins:25}},
 {t:'Build a Debris Net',d:'Place it on an outer edge to catch debris automatically.',k:'b:net',n:1,r:{fiber:4}},
 {t:'Build a Fish Trap',d:'Fish traps fill up even while you are away.',k:'b:trap',n:1,r:{coins:20}},
 {t:'Grow your raft to 16 tiles',d:'A bigger home holds more of everything.',k:'tileCount',n:16,r:{coins:60}},
 {t:'Earn 400 coins trading',d:'Sell your fish and crops to Marlo.',k:'earned',n:400,r:{coins:100}},
 {t:'Survive 10 days',d:'You are becoming a true sea dweller.',k:'day',n:10,r:{coins:200}},
 {t:'Build a Smokehouse',d:'Load raw fish; it smokes them slowly into valuable smoked fish.',k:'b:smoker',n:1,r:{coins:30}},
 {t:'Build a Pearl Bed',d:'Oysters on an outer edge grow pearls over time. Marlo pays well.',k:'b:pearl',n:1,r:{coins:40}},
 {t:'Hire Pip the crab',d:'Buy the Hermit Crab Helper from Marlo to automate collection.',k:'crab',n:1,r:{coins:50}},
 {t:'Build an Auto Winch',d:'Place it on an edge; it reels in debris on its own.',k:'b:winch',n:1,r:{coins:40}},
 {t:'Build a Sprinkler',d:'Put it next to planters to water them automatically.',k:'b:sprinkler',n:1,r:{coins:40}},
 {t:'Build a Trade Buoy',d:'It auto-sells your spare goods, even while you are away.',k:'b:buoy',n:1,r:{coins:60}},
 {t:'Reach Renown level 8',d:'Everything you gather earns renown. Each level speeds up all stations.',k:'renown',n:8,r:{coins:300}}];
const NAMES=['Seabreeze','Saltwind','Lantern Bay','Driftwood Haven','Coral Rest','Gullsong','Bluewater','Tidewatch'];
const INV0={wood:8,plastic:4,fiber:2,scrap:1,rawFish:0,cookedFish:1,water:1,potato:0,melon:0,seedPotato:3,seedMelon:0,coins:15};
function freshState(name,mode){const t=[];for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++)t.push([i,j]);
  return{v:2,name,mode,created:Date.now(),saved:Date.now(),clock:1.3,weather:{type:'clear',until:1.55},vit:{hp:100,food:90,water:85},inv:{...INV0},tiles:t,b:[],nid:1,houseLv:0,up:{rod:0,hook:0,still:0,coil:0,crab:0,store:0},quest:0,
    stats:{crab:0,debris:0,fish:0,ate:0,drank:0,planted:0,harvest:0,sold:0,earned:0,built:{},tiles:0,sharks:0},player:{x:0,z:2.5,l:0},xp:0,sharkNext:200,seedSel:'potato',play:0}}
function showcase(){const s=freshState('Showcase','cozy');s.houseLv=3;s.tiles.push([-1,2],[0,2],[1,2],[2,0],[2,1]);
  s.b=[{id:1,type:'planter',tile:[-1,1],s:{crop:'potato',grow:0.8}},{id:2,type:'grill',tile:[1,1],s:{}},{id:3,type:'rain',tile:[1,-1],s:{n:2}},{id:4,type:'net',tile:[0,2],s:{items:[]}},{id:5,type:'planter',tile:[2,0],s:{crop:'melon',grow:1}},{id:6,type:'lamp',tile:[-1,-1],s:{}}];return s}
let st=showcase(),mode='title',curModal=null;
const pl={x:0,z:2.5,l:0,face:0,speed:0,lock:0,climb:null,tool:'hook'};
// ================= helpers =================
const tool=()=>pl.tool;
const has=(cost)=>Object.entries(cost).every(([k,v])=>(st.inv[k]||0)>=v);
const pay=(cost)=>{for(const k in cost)st.inv[k]-=cost[k]};
function give(items,silent){let xp=0;for(const k in items){if(!items[k])continue;st.inv[k]=(st.inv[k]||0)+items[k];if(k!=='coins'&&items[k]>0)xp+=items[k];if(!silent)pickup(k,items[k])}if(xp)addXP(xp);hudDirty=true}
const lvlOf=x=>Math.floor(Math.sqrt((x||0)/40))+1,xpFor=l=>(l-1)*(l-1)*40;
const SPD=()=>1+0.06*(lvlOf(st.xp)-1)+[0,.05,.12,.2][st.houseLv||0];
function addXP(n){if(st.name==='Showcase')return;const a=lvlOf(st.xp);st.xp=(st.xp||0)+n;const b=lvlOf(st.xp);if(b>a&&mode==='play'){const r=15*b;st.inv.coins+=r;banner(`Renown level ${b}!`,`+${r} coins · stations now ${Math.round((SPD()-1)*100)}% faster`,'gold');audio.play('quest')}}
const hookRange=()=>[10,14,19][st.up.hook];
function rollLoot(type){const d=DEBRIS[type];if(typeof d.loot==='object')return{...d.loot};const o={};
  if(d.loot==='barrel'){o.wood=2+(Math.random()*2|0);o.plastic=1+(Math.random()*2|0);o.scrap=1+(Math.random()*2|0);if(Math.random()<0.4)o.seedPotato=1+(Math.random()*2|0);if(Math.random()<0.5)o.coins=3+(Math.random()*8|0)}
  else{o.scrap=2+(Math.random()*2|0);o.fiber=2;if(Math.random()<0.5)o.seedPotato=2;if(Math.random()<0.25)o.seedMelon=1;o.coins=5+(Math.random()*11|0)}return o}
function rollType(){let tot=0;for(const k in DEBRIS)tot+=DEBRIS[k].w;let r=Math.random()*tot;for(const k in DEBRIS){r-=DEBRIS[k].w;if(r<=0)return k}return'plank'}
const worldPos=(x,y,z)=>raft.group.localToWorld(new THREE.Vector3(x,y,z));
const playerWorld=()=>P.root.getWorldPosition(new THREE.Vector3());
function equippedTip(kind='rod'){if(mode==='play'&&CAMS[settings.cam|0]?.fp)return camera.localToWorld(new THREE.Vector3(kind==='rod'?.28:.32,kind==='rod'?-.1:-.25,kind==='rod'?-.78:-.55));return (kind==='rod'?P.rodTip:P.lHand).getWorldPosition(new THREE.Vector3())}
// ================= raft state application =================
function applyState(){
  raft.setTiles(st.tiles);raft.house.setLevel(st.houseLv||0);for(const id of[...raft.bmap.keys()])raft.removeBuilding(id);for(const b of st.b)raft.addBuilding(b);
  ocean.setFoam(st.tiles,T);raft.health.clear();
  pl.x=st.player.x;pl.z=st.player.z;pl.l=st.player.l||0;if(!raft.walkable(pl.x,pl.z,pl.l)){pl.x=0;pl.z=2.5;pl.l=0;if(!raft.walkable(pl.x,pl.z,0))respawnSpot()}
  pl.lock=0;pl.climb=null;fish.st='none';hk.st='none';cancelBuild();
  catS.x=-1.4;catS.z=2.0;for(const d of debris)scene.remove(d.obj);debris.length=0;for(let i=0;i<10;i++)spawnDebris(true);
  shark.root.visible=st.mode!=='cozy';sh.st='circle';boatS.st='away';boat.group.visible=false;
}
function respawnSpot(){for(const[i,j]of raft.list()){for(const[ox,oz]of[[0,0],[0.6,0.6],[-0.6,0.6]]){const x=i*T+ox,z=j*T+oz;if(raft.walkable(x,z,0)){pl.x=x;pl.z=z;pl.l=0;return}}}}
// ================= debris =================
const debris=[];let debrisT=2;const CUR=new THREE.Vector2(0.62,0.16);
function spawnDebris(init){if(debris.length>=22)return;const type=rollType(),obj=makeDebris(type);obj.traverse(m=>{if(m.isMesh){m.castShadow=true;m.userData.debris=true}});scene.add(obj);
  let x,z;if(init){x=rr(-45,45);z=rr(-40,40);if(Math.hypot(x,z)<raft.bounds()+4){x+=14*Math.sign(x||1)}}else{x=-50;z=rr(-38,38)}
  const d={type,obj,x,z,vx:CUR.x*rr(0.7,1.3),vz:CUR.y*rr(-0.5,1.5),rot:rr(0,6.28),spin:rr(-0.15,0.15),st:'float',ph:rr(0,6)};obj.userData.ref=d;debris.push(d)}
function removeDebris(d){scene.remove(d.obj);const i=debris.indexOf(d);if(i>=0)debris.splice(i,1)}
function updateDebris(dt){debrisT-=dt;if(debrisT<=0){spawnDebris(false);debrisT=rr(2,4.5)}
  const lim=raft.bounds()+0.6;
  for(let i=debris.length-1;i>=0;i--){const d=debris[i];
    if(d.st==='float'){d.x+=d.vx*dt;d.z+=d.vz*dt;d.rot+=d.spin*dt;
      if(Math.abs(d.x)<lim&&Math.abs(d.z)<lim){const push=Math.sign(d.z||1);d.z+=push*dt*1.5}
      for(const b of raft.bmap.values()){if(b.data.type!=='net')continue;const s=b.data.s||(b.data.s={});s.items=s.items||[];if(s.items.length>=10*CAP())continue;const[di,dj]=b.data.dir,np=new THREE.Vector3(b.data.tile[0]*T+di*1.5,0,b.data.tile[1]*T+dj*1.5);
        if(Math.hypot(d.x-np.x,d.z-np.z)<2.2){s.items.push(d.type);parts.splash(d.x,d.z,0.6);removeDebris(d);break}}
      if(d.x>55||Math.abs(d.z)>60){removeDebris(d);continue}}
    if(!d.obj.parent)continue;
    const h=waveHeight(d.x,d.z),[gx,gz]=waveGrad(d.x,d.z);d.obj.position.set(d.x,h-0.02,d.z);d.obj.rotation.set(gz*0.8+Math.sin(waveState.time+d.ph)*0.04,d.rot,-gx*0.8);}
}
// ================= stations =================
function bState(b){return b.data.s||(b.data.s={})}
const CAP=()=>st.up&&st.up.store?2:1;
function simBuildings(sec,raining){sec*=SPD();
  for(const b of raft.bmap.values()){const s=bState(b);switch(b.data.type){
    case'grill':if(s.fish&&s.t<1)s.t=Math.min(1,(s.t||0)+sec/14);break;
    case'purifier':if(s.b){s.t=(s.t||0)+sec/16;if(s.t>=1){s.b=0;s.t=0;s.done=(s.done||0)+(st.up.coil?3:2)}}break;
    case'planter':if(s.crop&&s.grow<1)s.grow=Math.min(1,s.grow+sec/CROP[s.crop].time*(s.wet?1.8:1));break;
    case'rain':s.n=Math.min(4,(s.n||0)+sec*(raining?1/10:1/220));break;
    case'still':s.n=Math.min(5*CAP(),(s.n||0)+sec/(env.sunUp>0?60:240));break;
    case'trap':s.n=Math.min(6*CAP(),(s.n||0)+sec/70);break;
    case'smoker':if(s.q>0){s.t=(s.t||0)+sec/40;while(s.t>=1&&s.q>0){s.t-=1;s.q--;s.done=(s.done||0)+1}if(!s.q)s.t=0}break;
    case'pearl':s.n=Math.min(4*CAP(),(s.n||0)+sec/150);break;
    case'winch':s.items=s.items||[];s.acc=(s.acc||0)+sec/28;while(s.acc>=1&&s.items.length<8*CAP()){s.acc-=1;s.items.push(rollType())}if(s.items.length>=8*CAP())s.acc=0;break;
    case'sprinkler':{s.w=Math.min(6,(s.w||0)+sec*(raining?1/12:1/90));const[ti,tj]=b.data.tile;for(const p of raft.bmap.values()){if(p.data.type!=='planter')continue;const ps=bState(p);if(Math.abs(p.data.tile[0]-ti)<=1&&Math.abs(p.data.tile[1]-tj)<=1&&ps.crop&&!ps.wet&&ps.grow<1&&s.w>=1){ps.wet=1;s.w-=1}}break}
    case'buoy':{s.acc=(s.acc||0)+sec/25;let guard=0;while(s.acc>=1&&guard++<2000){s.acc-=1;if((s.c||0)>=250*CAP()){s.acc=0;break}const k=['pearl','smokedFish','melon','cookedFish','potato','scrap'].find(k=>(st.inv[k]|0)>(k==='cookedFish'||k==='potato'||k==='melon'?4:2));if(!k){s.acc=0;break}st.inv[k]--;s.c=(s.c||0)+Math.ceil(SELL[k]*0.8);st.stats.sold++}break}
    case'net':s.items=s.items||[];s.acc=(s.acc||0)+sec/55;while(s.acc>=1&&s.items.length<10*CAP()){s.acc-=1;s.items.push(rollType())}if(s.items.length>=10*CAP())s.acc=0;break;}}
}
function bSig(b){const s=bState(b);return[s.fish|0,(s.t||0)>=1,s.crop||'',Math.floor((s.grow||0)*5),Math.floor(s.n||0),(s.items||[]).length,s.done|0,s.q|0,Math.floor(s.w||0),s.c|0].join('|')}
function bStatus(b){const s=bState(b);switch(b.data.type){
  case'grill':if(s.fish&&s.t>=1)return{ready:1,icon:'cooked'};if(s.fish)return{pf:s.t,icon:'fire'};return null;
  case'purifier':if(s.done)return{ready:1,icon:'water',n:s.done};if(s.b)return{pf:s.t,icon:'drop'};return null;
  case'planter':if(s.crop&&s.grow>=1)return{ready:1,icon:CROP[s.crop].item};if(s.crop)return{pf:s.grow,icon:s.wet?'drop':'plant',thirsty:!s.wet};return null;
  case'rain':case'still':return(s.n|0)>0?{ready:(s.n|0)>=2,icon:'water',n:s.n|0}:null;
  case'trap':return(s.n|0)>0?{ready:(s.n|0)>=2,icon:'fish',n:s.n|0}:null;
  case'smoker':if(s.done)return{ready:1,icon:'smoked',n:s.done};if(s.q)return{pf:s.t||0,icon:'fire'};return null;
  case'pearl':return(s.n|0)>0?{ready:1,icon:'pearl',n:s.n|0}:null;
  case'winch':return(s.items||[]).length?{ready:s.items.length>=3,icon:'hook',n:s.items.length}:null;
  case'sprinkler':return{pf:Math.min(1,(s.w||0)/6),icon:'drop'};
  case'buoy':return(s.c|0)>0?{ready:(s.c|0)>=10,icon:'coin',n:s.c|0}:null;
  case'net':return(s.items||[]).length?{ready:s.items.length>=3,icon:'net',n:s.items.length}:null;}return null}
function stationAction(b){const s=bState(b),I=st.inv;switch(b.data.type){
  case'grill':if(s.fish&&s.t>=1)return{l:`Collect cooked fish ×${s.fish}`,i:'cooked',f:()=>{give({cookedFish:s.fish});s.fish=0;s.t=0;audio.play('pickup')}};
    if(s.fish)return{l:`Cooking… ${Math.round(s.t*100)}%`,i:'fire',off:1};
    if(I.rawFish>0)return{l:`Cook raw fish ×${Math.min(2,I.rawFish)}`,i:'fire',f:()=>{const n=Math.min(2,I.rawFish);I.rawFish-=n;s.fish=n;s.t=0;audio.play('sizzle')}};return{l:'Grill — needs raw fish',i:'fire',off:1};
  case'purifier':if(s.done)return{l:`Collect fresh water ×${s.done}`,i:'water',f:()=>{give({water:s.done});s.done=0;audio.play('pickup')}};
    if(s.b)return{l:`Boiling… ${Math.round(s.t*100)}%`,i:'drop',off:1};
    if(I.wood>=1)return{l:'Boil seawater (1 wood)',i:'drop',f:()=>{I.wood--;s.b=1;s.t=0;audio.play('boil');audio.play('splash')}};return{l:'Purifier — needs 1 wood',i:'drop',off:1};
  case'planter':if(s.crop&&s.grow>=1)return{l:`Harvest ${CROP[s.crop].name}`,i:CROP[s.crop].item,f:()=>{const c=CROP[s.crop],n=c.y[0]+(Math.random()*(c.y[1]-c.y[0]+1)|0);const o={[c.item]:n*3};o[c.seed]=Math.random()<0.7?2:1;give(o);s.crop=null;s.grow=0;s.wet=0;st.stats.harvest++;audio.play('pickup');PA.play('interact',0.7)}};
    if(s.crop&&!s.wet&&I.water>0)return{l:'Water crops (1 water)',i:'drop',f:()=>{I.water--;s.wet=1;audio.play('drink');parts.emit({...worldPos(b.data.tile[0]*T,DECK+0.6,b.data.tile[1]*T),count:20,spread:1,vel:[0,0.5,0],vr:0.4,life:0.7,size:[0.08,0.03],color:'#7fd3ff',gravity:-5})}};
    if(s.crop)return{l:`Growing… ${Math.round(s.grow*100)}%${s.wet?'':' — needs water'}`,i:'plant',off:1};
    {let k=st.seedSel;if(!I[CROP[k].seed])k=k==='potato'?'melon':'potato';if(I[CROP[k].seed]>0)return{l:`Plant ${CROP[k].name} seeds`,i:'seed',f:()=>{I[CROP[k].seed]--;s.crop=k;s.grow=0;s.wet=0;st.stats.planted++;audio.play('pickup');PA.play('interact',0.7)}}}
    return{l:'Planter — needs seeds',i:'seed',off:1};
  case'rain':case'still':{const n=s.n|0;if(n>0)return{l:`Collect water ×${n}`,i:'water',f:()=>{give({water:n});s.n-=n;audio.play('pickup')}};return{l:b.data.type==='rain'?'Rain Catcher — waiting for rain':'Solar Still — collecting…',i:'water',off:1}}
  case'trap':{const n=s.n|0;if(n>0)return{l:`Collect fish ×${n}`,i:'fish',f:()=>{give({rawFish:n});s.n-=n;st.stats.fish+=n;audio.play('pickup');parts.splash(...splashAt(b))}};return{l:'Fish Trap — nothing yet',i:'fish',off:1}}
  case'net':{const it=s.items||[];if(it.length)return{l:`Empty net (${it.length} items)`,i:'net',f:()=>{const o={};for(const t of it){const l=rollLoot(t);for(const k in l)o[k]=(o[k]||0)+l[k]}give(o);st.stats.debris+=it.length;s.items=[];audio.play('pickup')}};return{l:'Debris Net — empty',i:'net',off:1}}
  case'smoker':{if(s.done)return{l:`Collect smoked fish ×${s.done}`,i:'smoked',f:()=>{give({smokedFish:s.done});s.done=0;audio.play('pickup')}};
    const room=6*CAP()-(s.q|0);if(I.rawFish>0&&room>0)return{l:`Load raw fish ×${Math.min(room,I.rawFish)}${s.q?` (${s.q} smoking)`:''}`,i:'fire',f:()=>{const n=Math.min(room,I.rawFish);I.rawFish-=n;s.q=(s.q|0)+n;audio.play('sizzle')}};
    if(s.q)return{l:`Smoking ${s.q} fish… ${Math.round((s.t||0)*100)}%`,i:'fire',off:1};return{l:'Smokehouse — needs raw fish',i:'fire',off:1}}
  case'pearl':{const n=s.n|0;if(n>0)return{l:`Harvest pearls ×${n}`,i:'pearl',f:()=>{give({pearl:n});s.n-=n;audio.play('pickup');parts.splash(...splashAt(b))}};return{l:`Pearl Bed — growing ${Math.round((s.n%1)*100)}%`,i:'pearl',off:1}}
  case'winch':{const it=s.items||[];if(it.length)return{l:`Empty auto winch (${it.length} items)`,i:'hook',f:()=>{const o={};for(const t of it){const l=rollLoot(t);for(const k in l)o[k]=(o[k]||0)+l[k]}give(o);st.stats.debris+=it.length;s.items=[];audio.play('pickup')}};return{l:'Auto Winch — reeling in debris…',i:'hook',off:1}}
  case'sprinkler':{if(I.water>0&&(s.w||0)<5)return{l:`Fill sprinkler (1 water) · tank ${Math.floor(s.w||0)}/6`,i:'drop',f:()=>{I.water--;s.w=(s.w||0)+1;audio.play('drink')}};return{l:`Sprinkler · tank ${Math.floor(s.w||0)}/6 — waters nearby planters`,i:'drop',off:1}}
  case'buoy':{if(s.c|0)return{l:`Collect sales ${s.c|0} coins`,i:'coin',f:()=>{const c=s.c|0;give({coins:c});st.stats.earned+=c;s.c=0;audio.play('coin')}};return{l:'Trade Buoy — auto-sells spare pearls, smoked fish, crops & scrap',i:'coin',off:1}}
  case'lamp':return{l:s.off?'Light lantern':'Snuff lantern',i:'lamp',f:()=>{s.off=!s.off;audio.play('click')}};}
}
function splashAt(b){const[di,dj]=b.data.dir||[0,1];const p=worldPos(b.data.tile[0]*T+di*1.5,0,b.data.tile[1]*T+dj*1.5);return[p.x,p.z]}
// ================= fishing =================
const fish={st:'none',t:0,x:0,z:0,from:new THREE.Vector3(),wait:0,mk:0,dir:1,zone:0.5,zw:0.2,sp:1,sp2:null};
function startCast(p){const pw=playerWorld(),d=Math.hypot(p.x-pw.x,p.z-pw.z);if(d<2.5){toast('Cast further out into the water');return}if(d>16){toast('Too far — cast closer');return}
  pl.face=Math.atan2(p.x-pw.x,p.z-pw.z);fish.st='cast';fish.t=0;fish.x=p.x;fish.z=p.z;PA.hold='rod';PA.play('cast',0.6);audio.play('cast');pl.lock=0.6}
function cancelFish(msg){if(fish.st==='none')return;fish.st='none';bobber.visible=false;fishLine.visible=false;$('#fishbar').hidden=true;PA.hold=null;if(msg)toast(msg)}
function rollFish(){const w=FISH.map((f,i)=>f.w*(i>=2?1+st.up.rod*0.8:1));let tot=w.reduce((a,b)=>a+b),r=Math.random()*tot;for(let i=0;i<FISH.length;i++){r-=w[i];if(r<=0)return FISH[i]}return FISH[0]}
function updateFish(dt){if(fish.st==='none'){if(mode==='title'){}return}
  fish.t+=dt;const tip=equippedTip('rod');
  if(fish.st==='cast'){if(fish.t>0.3){if(!fish.sp2){fish.sp2=tip.clone()}const k=clamp((fish.t-0.3)/0.6,0,1);bobber.visible=true;const p=fish.sp2.clone().lerp(new THREE.Vector3(fish.x,0,fish.z),k);p.y+=Math.sin(k*Math.PI)*3*(1-k*0.3);if(k>=1){p.y=waveHeight(fish.x,fish.z);fish.st='wait';fish.t=0;fish.wait=rr(3.5,9)/(1+st.up.rod*0.35);parts.splash(fish.x,fish.z,0.5);audio.play('splash');fish.sp2=null}bobber.position.copy(p)}}
  else if(fish.st==='wait'){bobber.position.set(fish.x,waveHeight(fish.x,fish.z)+Math.sin(fish.t*3)*0.02,fish.z);if(fish.t>fish.wait&&Math.random()<0.6){fish.st='bite';fish.t=0;fish.f=rollFish();parts.splash(fish.x,fish.z,0.7);audio.play('bite');showFishPrompt()}else if(fish.t>fish.wait){fish.wait+=0.8}}
  else if(fish.st==='bite'){bobber.position.set(fish.x,waveHeight(fish.x,fish.z)-0.12+Math.sin(fish.t*30)*0.04,fish.z);if(fish.t>1.3){cancelFish('It got away…');audio.play('fail')}}
  else if(fish.st==='mini'){bobber.position.set(fish.x+Math.sin(fish.t*7)*0.15,waveHeight(fish.x,fish.z)-0.08,fish.z+Math.cos(fish.t*5)*0.15);if(Math.random()<0.1)parts.splash(bobber.position.x,bobber.position.z,0.3);
    fish.mk+=fish.dir*dt*fish.sp;if(fish.mk>1){fish.mk=1;fish.dir=-1}if(fish.mk<0){fish.mk=0;fish.dir=1}$('#fbMark').style.left=(fish.mk*100)+'%';if(fish.t>6){cancelFish('The line went slack…');audio.play('fail')}}
  if(bobber.visible){fishLine.visible=true;const a=lineGeo.attributes.position,b=bobber.position;for(let i=0;i<=20;i++){const k=i/20;a.setXYZ(i,lerp(tip.x,b.x,k),lerp(tip.y,b.y,k)-Math.sin(k*Math.PI)*(fish.st==='mini'?0.05:0.4),lerp(tip.z,b.z,k))}a.needsUpdate=true}
}
function showFishPrompt(){banner('Bite!','Click now to hook it',null,1)}
function fishClick(){if(fish.st==='bite'){fish.st='mini';fish.t=0;fish.mk=0;fish.dir=1;fish.sp=fish.f.s*(0.95-st.up.rod*0.08);fish.zw=0.2+st.up.rod*0.05;fish.zone=rr(0.25,0.75);const z=$('#fbZone');z.style.left=((fish.zone-fish.zw/2)*100)+'%';z.style.width=(fish.zw*100)+'%';$('#fbTitle').textContent='Reel it in!';$('#fishbar').hidden=false;PA.play('reel',6);audio.play('splash');return true}
  if(fish.st==='mini'){$('#fishbar').hidden=true;if(Math.abs(fish.mk-fish.zone)<=fish.zw/2+0.015){const f=fish.f;give({rawFish:f.f,...(f.c?{coins:f.c}:{})});st.stats.fish++;banner(`${f.n}!`,f.c?`A rare catch worth ${f.c} coins`:`+${f.f} raw fish`,'gold');audio.play('catch');PA.play('cheer',1.2);parts.splash(fish.x,fish.z,1.2);cancelFish()}else{cancelFish('It slipped off the hook!');audio.play('fail')}return true}
  if(fish.st==='wait'||fish.st==='cast'){cancelFish();return true}return false}
// ================= hook =================
const hk={st:'none',d:null,t:0,from:new THREE.Vector3()};
function throwHook(d){const pw=playerWorld(),dist=Math.hypot(d.x-pw.x,d.z-pw.z);if(dist>hookRange()){toast(`Too far — hook range is ${hookRange()} m`);return}
  pl.face=Math.atan2(d.x-pw.x,d.z-pw.z);PA.play('throw',0.5);audio.play('cast');hk.st='fly';hk.d=d;hk.t=0;d.st='hooked';pl.lock=0.5;hk.from.copy(equippedTip('hook'))}
function updateHook(dt){if(hk.st==='none')return;hk.t+=dt;const hand=equippedTip('hook'),d=hk.d;
  if(!d.obj.parent){hk.st='none';hookObj.visible=false;fishLine.visible=fish.st!=='none';return}
  if(hk.st==='fly'){const k=clamp(hk.t/0.4,0,1);const p=hand.clone().lerp(d.obj.position,k);p.y+=Math.sin(k*Math.PI)*2;hookObj.position.copy(p);hookObj.visible=true;if(k>=1){hk.st='pull';audio.play('splash');parts.splash(d.x,d.z,0.6);PA.play('pull',8)}}
  else{const pw=playerWorld(),dx=pw.x-d.x,dz=pw.z-d.z,dist=Math.hypot(dx,dz);const sp=Math.min(6,1.5+hk.t*4);d.x+=dx/dist*sp*dt;d.z+=dz/dist*sp*dt;hookObj.position.copy(d.obj.position);if(Math.random()<0.25)parts.emit({x:d.x,y:0.05,z:d.z,count:2,spread:0.5,vel:[0,0.8,0],vr:0.4,life:0.6,size:[0.1,0.04],color:'#f2fbff'});
    if(dist<1.7||hk.t>8){const loot=rollLoot(d.type);give(loot);st.stats.debris++;audio.play('pickup');parts.emit({x:d.x,y:DECK+0.4,z:d.z,count:14,spread:0.4,vel:[0,2.5,0],vr:1.2,life:0.7,size:[0.08,0.02],color:'#ffe08a',gravity:-4});removeDebris(d);hk.st='none';hookObj.visible=false;fishLine.visible=fish.st!=='none';PA.action=null;}}
  if(hookObj.visible){fishLine.visible=true;const a=lineGeo.attributes.position,b=hookObj.position;for(let i=0;i<=20;i++){const k=i/20;a.setXYZ(i,lerp(hand.x,b.x,k),lerp(hand.y,b.y,k)-Math.sin(k*Math.PI)*0.3,lerp(hand.z,b.z,k))}a.needsUpdate=true}
}
// ================= building =================
const BKEYS=[...Object.keys(BP),'demolish'];let bsel=null,buildOn=false,ghostCell=null,ghostKey='';
function openBuild(){buildOn=true;if(!bsel)bsel='foundation';renderBuildbar();$('#buildbar').hidden=false}
function cancelBuild(){buildOn=false;$('#buildbar').hidden=true;ghost.clear();ghostKey='';ghostCell=null;if(pl.tool==='hammer')pl.tool='hook';hudDirty=true}
function locked(k){return BP[k]?.unlock&&!st.up[BP[k].unlock]}
function setGhost(k){if(ghostKey===k)return;ghostKey=k;ghost.clear();if(k==='demolish'){const m=new THREE.Mesh(new THREE.BoxGeometry(T-0.1,1.6,T-0.1),ghostMat);m.position.y=0.8;ghost.add(m);return}
  if(k==='foundation'){const m=new THREE.Mesh(new THREE.BoxGeometry(T,0.12,T),ghostMat);m.position.y=-0.06;ghost.add(m);return}
  const s=makeStation(k);s.group.traverse(o=>{if(o.isMesh){o.material=ghostMat;o.castShadow=false}});s.group.position.y=0;ghost.add(s.group)}
function updateGhost(){if(!buildOn||!mouse.inside){ghost.visible=false;return}
  ray.setFromCamera(mouse.ndc,camera);const plane=new THREE.Plane(new THREE.Vector3(0,1,0),-(raft.group.position.y+DECK));const hit=new THREE.Vector3();if(!ray.ray.intersectPlane(plane,hit)){ghost.visible=false;return}
  const l=raft.group.worldToLocal(hit.clone()),i=Math.round(l.x/T),j=Math.round(l.z/T);ghostCell=[i,j];setGhost(bsel);ghost.visible=true;
  ghost.position.set(i*T,DECK,j*T);let ok=false;
  if(bsel==='demolish'){ok=!!findB(i,j)}else if(bsel==='foundation')ok=raft.canFoundation(i,j);else{ok=raft.has(i,j)&&!raft.occupied(i,j)&&!locked(bsel);if(ok&&BP[bsel].edge){const e=raft.edgeDir(i,j);ok=!!e;if(e)ghost.rotation.y=Math.atan2(e[0],e[1])}else ghost.rotation.y=0}
  if(bsel!=='demolish'&&!has(BP[bsel].cost))ok=false;ghostCell.ok=ok;ghostMat.color.set(ok?(bsel==='demolish'?'#ffb454':'#7bd88f'):'#ff6b6b')}
function findB(i,j){for(const b of raft.bmap.values())if(b.data.tile[0]===i&&b.data.tile[1]===j)return b;return null}
function placeBuild(){if(!ghostCell)return;const[i,j]=ghostCell;
  if(!ghostCell.ok){if(bsel!=='demolish'&&!has(BP[bsel].cost))toast('Not enough materials');else if(locked(bsel))toast('Buy the blueprint from Marlo first');else toast(bsel==='foundation'?'Foundations must touch your raft':BP[bsel]?.edge?'Place this on an outer edge tile':'Can’t build there');audio.play('fail');return}
  const wp=worldPos(i*T,DECK,j*T);
  if(bsel==='demolish'){const b=findB(i,j);const c=BP[b.data.type].cost,ref={};for(const k in c)ref[k]=Math.floor(c[k]/2);give(ref);raft.removeBuilding(b.data.id);st.b=st.b.filter(x=>x.id!==b.data.id);audio.play('build');dust(wp);return}
  pay(BP[bsel].cost);if(bsel==='foundation'){st.tiles.push([i,j]);raft.setTiles(st.tiles);ocean.setFoam(st.tiles,T);st.stats.tiles++}
  else{const data={id:st.nid++,type:bsel,tile:[i,j],s:{}};st.b.push(data);raft.addBuilding(data);st.stats.built[bsel]=(st.stats.built[bsel]||0)+1}
  audio.play('build');dust(wp);PA.play('hammer',0.7);hudDirty=true;renderBuildbar();parts.splash(wp.x,wp.z,0.5)}
function dust(p){parts.emit({x:p.x,y:p.y+0.1,z:p.z,count:30,spread:2,vel:[0,1,0],vr:1,life:1,size:[0.25,0.5],color:'#e8dcc4',alpha:0.5,gravity:0.5,drag:2})}
// ================= survival =================
let warned={};
function updateSurvival(dt){const v=st.vit,k=(st.mode==='cozy'?0.5:1)*(1-[0,.08,.16,.24][st.houseLv||0]),heat=env.sunUp>0.3&&env.rainK<0.3?1.15:1;
  v.food=clamp(v.food-dt*0.24*k,0,100);v.water=clamp(v.water-dt*0.32*k*heat,0,100);
  if(v.food<=0||v.water<=0)v.hp-=dt*((v.food<=0?0.6:0)+(v.water<=0?0.9:0))*k;else if(v.food>45&&v.water>45)v.hp=Math.min(100,v.hp+dt*0.35);
  for(const n of['food','water']){if(v[n]<20&&!warned[n]){warned[n]=1;banner(n==='food'?'You’re starving':'You’re very thirsty',n==='food'?'Eat something soon (5)':'Drink fresh water soon (6)','warn');audio.play('warn')}if(v[n]>35)warned[n]=0}
  if(v.hp<=0){v.hp=0;die()}}
function eat(){const I=st.inv,v=st.vit;let o=null;if(I.cookedFish>0)o=['cookedFish',32,0,6];else if(I.smokedFish>0)o=['smokedFish',40,-4,8];else if(I.melon>0)o=['melon',22,18,2];else if(I.potato>0)o=['potato',14,0,1];else if(I.rawFish>0)o=['rawFish',9,-6,-6];
  if(!o){toast('You have nothing to eat');audio.play('fail');return}if(v.food>=98){toast('You’re not hungry');return}
  I[o[0]]--;v.food=Math.min(100,v.food+o[1]);v.water=clamp(v.water+o[2],0,100);v.hp=clamp(v.hp+o[3],0,100);if(o[0]==='cookedFish')st.stats.ate++;pickup(o[0],-1);PA.play('eat',0.9);audio.play('eat');if(o[0]==='rawFish')toast('Raw fish… not your best idea');hudDirty=true}
function drink(){const I=st.inv,v=st.vit;if(I.water<=0){toast('No fresh water — use a purifier');audio.play('fail');return}if(v.water>=98){toast('You’re not thirsty');return}
  I.water--;v.water=Math.min(100,v.water+38);st.stats.drank++;pickup('water',-1);PA.play('drink',0.9);audio.play('drink');hudDirty=true}
function die(){if(curModal)closeModal();cancelFish();pl.lock=99;
  openModal(`<h2>You passed out</h2><p class="sub">The sea is unforgiving. You wake up on your raft some hours later, weak but alive.</p><p style="font-weight:700;color:var(--mut)">Some of your loose materials washed overboard.</p><div class="btns"><button class="btn" data-a="menu">Main menu</button><button class="btn pri" data-a="wake">Wake up</button></div>`,{closable:false}).querySelectorAll('[data-a]').forEach(b=>b.onclick=()=>{
    for(const k of['wood','plastic','fiber','scrap','rawFish'])st.inv[k]=Math.floor(st.inv[k]*0.7);st.vit={hp:60,food:55,water:55};st.clock+=0.15;pl.lock=0;closeModal();
    if(b.dataset.a==='menu'){saveGame();toTitle()}else{fadeOut(()=>{pl.x=0;pl.z=2.5;pl.l=0;if(!raft.walkable(0,2.5,0))respawnSpot()})}})}
// ================= time & weather =================
let lastDay=1;
function updateTime(dt){st.clock+=dt/DAY;const day=Math.floor(st.clock);if(day!==lastDay){lastDay=day;banner(`Day ${day}`,pick(['The sea is calm today','A new horizon awaits','Another day adrift','The current carries on']));saveGame()}
  const w=st.weather;if(st.clock>w.until){if(w.type==='clear'&&Math.random()<0.3){w.type='rain';w.until=st.clock+rr(0.05,0.11);banner('Rain is coming','Rain Catchers will fill up quickly')}else{w.type='clear';w.until=st.clock+rr(0.15,0.4)}}
}
// ================= shark =================
const sh={st:'circle',ang:0,x:20,z:0,tile:null,t:0,hp:0};
function sharkTiles(){return raft.list().filter(([i,j])=>!(i===0&&j===0)&&raft.edgeDir(i,j))}
function updateShark(dt){if(st.mode==='cozy'){shark.root.visible=false;return}shark.root.visible=true;const R=raft.bounds()+6;sh.t+=dt;let tx,tz,spd=3;
  if(sh.st==='circle'){sh.ang+=dt*0.16;tx=Math.cos(sh.ang)*R;tz=Math.sin(sh.ang)*R;spd=3.2;if(mode==='play'&&!curModal){st.sharkNext-=dt;if(st.sharkNext<=0){const c=sharkTiles();if(c.length){sh.tile=pick(c);sh.st='approach';banner('Shark!','It’s heading for your raft — fend it off with E or the Hook','warn');audio.play('warn')}st.sharkNext=rr(180,300)}}}
  if(sh.st==='approach'||sh.st==='attack'){const[i,j]=sh.tile,e=raft.edgeDir(i,j)||[0,1];if(!raft.has(i,j)){sh.st='flee';sh.t=0}else{tx=i*T+e[0]*2.1;tz=j*T+e[1]*2.1;spd=4.5;
    if(sh.st==='approach'&&Math.hypot(sh.x-tx,sh.z-tz)<0.6){sh.st='attack';sh.t=0}
    if(sh.st==='attack'){const key=raft.key(i,j);const h=(raft.health.get(key)??100)-dt*5.5;raft.health.set(key,h);if(Math.random()<0.15)parts.splash(tx-e[0]*0.6,tz-e[1]*0.6,0.8);if(Math.random()<0.02)audio.play('hit');if(h<=0)destroyTile(i,j)}}}
  if(sh.st==='flee'){const a=Math.atan2(sh.z,sh.x);tx=Math.cos(a)*(R+25);tz=Math.sin(a)*(R+25);spd=7;if(sh.t>6){sh.st='circle';sh.ang=a}}
  const dx=tx-sh.x,dz=tz-sh.z,d=Math.hypot(dx,dz);if(d>0.05){const m=Math.min(d,spd*dt);sh.x+=dx/d*m;sh.z+=dz/d*m;shark.root.rotation.y=dampAngle(shark.root.rotation.y,Math.atan2(dx,dz),4,dt)}
  const att=sh.st==='attack';shark.root.position.set(sh.x,att?-0.25+Math.sin(sh.t*9)*0.12:-0.42,sh.z);shark.body.rotation.z=att?Math.sin(sh.t*7)*0.35:0;shark.tail.rotation.y=Math.sin(sh.t*(att?14:5))*0.45;
  for(const[k,v]of raft.health)if(!(att&&sh.tile&&k===raft.key(...sh.tile)))raft.health.set(k,Math.min(100,v+dt*2));
}
function scareShark(){if(sh.st!=='attack'&&sh.st!=='approach')return false;sh.st='flee';sh.t=0;st.stats.sharks++;audio.play('hit');audio.play('bigsplash');parts.splash(sh.x,sh.z,1.6);banner('Shark scared off!','It won’t be back for a while','gold');PA.play('throw',0.5);return true}
function destroyTile(i,j){const b=findB(i,j);if(b){raft.removeBuilding(b.data.id);st.b=st.b.filter(x=>x.id!==b.data.id)}st.tiles=st.tiles.filter(([a,c])=>!(a===i&&c===j));raft.setTiles(st.tiles);ocean.setFoam(st.tiles,T);raft.health.delete(raft.key(i,j));
  const p=worldPos(i*T,0,j*T);parts.splash(p.x,p.z,2);audio.play('bigsplash');banner('The shark wrecked a foundation','Keep your hook ready next time','warn');sh.st='flee';sh.t=0;spawnDebrisAt(p.x,p.z);if(!raft.walkable(pl.x,pl.z,pl.l))respawnSpot()}
function spawnDebrisAt(x,z){for(let k=0;k<2;k++){spawnDebris(true);const d=debris[debris.length-1];if(d){d.x=x+rr(-1,1);d.z=z+rr(-1,1);d.type='plank'}}}
// ================= trader =================
const boatS={st:'away',x:0,z:80,tx:0,tz:0,t:0};
function dockPoint(){let mz=1;for(const[i,j]of raft.list())if(Math.abs(i)<=1)mz=Math.max(mz,j);return[0,(mz+0.5)*T+1.9]}
function updateBoat(dt){const t=st.clock%1,want=t>=0.375&&t<0.625&&mode==='play';boatS.t+=dt;
  if(boatS.st==='away'){boat.group.visible=false;if(want){const[x,z]=dockPoint();boatS.tx=x;boatS.tz=z;boatS.x=x-70;boatS.z=z+40;boatS.st='arrive';boat.group.visible=true;banner('A sail on the horizon','Marlo the merchant is coming to trade')}}
  if(boatS.st==='arrive'||boatS.st==='leave'){const dx=boatS.tx-boatS.x,dz=boatS.tz-boatS.z,d=Math.hypot(dx,dz),sp=Math.min(7,0.6+d*0.4);if(d>0.1){boatS.x+=dx/d*sp*dt;boatS.z+=dz/d*sp*dt;boat.group.rotation.y=dampAngle(boat.group.rotation.y,Math.atan2(dx,dz),1.5,dt)}
    if(boatS.st==='arrive'&&d<0.4){boatS.st='docked';audio.play('quest')}if(boatS.st==='leave'&&d<1){boatS.st='away'}}
  if(boatS.st==='docked'){boat.group.rotation.y=dampAngle(boat.group.rotation.y,Math.PI/2,1.2,dt);const[x,z]=dockPoint();boatS.tx=x;boatS.tz=z;boatS.x=damp(boatS.x,x,1,dt);boatS.z=damp(boatS.z,z,1,dt);if(!want){boatS.st='leave';boatS.tx=boatS.x+110;boatS.tz=boatS.z+30;if(curModal&&curModal.shop)closeModal()}}
  if(boat.group.visible){const h=waveHeight(boatS.x,boatS.z),[gx,gz]=waveGrad(boatS.x,boatS.z);boat.group.position.set(boatS.x,h*0.8-0.12,boatS.z);boat.hull.rotation.set(gz*0.6,0,-gx*0.6+Math.sin(boatS.t*0.9)*0.03);
    const near=boatS.st==='docked'&&Math.hypot(playerWorld().x-boatS.x,playerWorld().z-boatS.z)<6;trader.rSh.rotation.x=near?-2.6+Math.sin(boatS.t*8)*0.15:-0.3;trader.rSh.rotation.z=near?-0.3:-0.1;trader.lSh.rotation.x=-0.5;trader.lEl.rotation.x=-0.8;trader.head.rotation.y=near?-0.3:Math.sin(boatS.t*0.5)*0.4;trader.chest.rotation.x=Math.sin(boatS.t*1.5)*0.02}}
// ================= quests =================
function qProg(q){if(q.k.startsWith('b:'))return st.stats.built[q.k.slice(2)]||0;if(q.k==='tileCount')return st.tiles.length;if(q.k==='day')return Math.floor(st.clock);if(q.k==='renown')return lvlOf(st.xp);return st.stats[q.k]||0}
function checkQuest(){const q=QUESTS[st.quest];if(!q)return;if(qProg(q)>=q.n){give(q.r);st.quest++;banner('Objective complete',q.t,'gold');audio.play('quest');const el=$('#quest');el.classList.remove('done');void el.offsetWidth;el.classList.add('done');hudDirty=true}}
// ================= player & companions =================
const keys=new Set();const joy={x:0,y:0};
const CAMS=[{n:'Follow',d:10,p:.4,fov:48},{n:'Close',d:4.8,p:.22,fov:55},{n:'Overview',d:24,p:.95,fov:38},{n:'First person',fp:1,d:3,p:0,fov:72}];
function updateOptics(){const o=$('#optics');if(!o)return;o.innerHTML=`FOCUS <b>${cam.zoom.toFixed(1)}×</b>`;o.classList.toggle('on',cam.zoom>1.04)}
function setCam(i,quiet){settings.cam=i=((i%CAMS.length)+CAMS.length)%CAMS.length;const c=CAMS[i];if(!c.fp&&document.pointerLockElement)document.exitPointerLock();cam.tdist=c.d;cam.tpitch=c.p;cam.baseFov=c.fov;cam.zoom=1;camera.fov=c.fov;camera.updateProjectionMatrix();parts.u.uScale.value=pix.sceneHeight()/(2*Math.tan(camera.fov*Math.PI/360));updateOptics();saveSettings();if(!quiet)banner('Camera',c.n+(c.fp?' · click to capture mouse':' · press C to switch'),null,true);const b=$('#btnCam');if(b)b.title='Camera: '+c.n+' (C)'}
const cam={yaw:.5,pitch:.38,dist:10,tx:0,ty:0,tz:0,tyaw:.5,tpitch:.38,tdist:10,baseFov:48,zoom:1,bob:0};
function updatePlayer(dt){
  let ix=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+joy.x,iz=(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0)+joy.y;
  const len=Math.hypot(ix,iz);pl.lock=Math.max(0,pl.lock-dt);let speed=0;
  if(pl.climb){const c=pl.climb;c.t+=dt/1.1;const k=clamp(c.t,0,1);P.root.position.set(raft.house.ladder.x,lerp(c.y0,c.y1,k),lerp(c.z0,c.z1,smooth(0.7,1,k)));pl.face=Math.PI;if(k>=1){pl.climb=null;pl.l=c.l;pl.x=raft.house.ladder.x;pl.z=c.z1;PA.action=null}PA.update(dt,0);return}
  if(len>0.1&&pl.lock<=0&&mode==='play'&&!curModal){const f=Math.min(1,len);ix/=len;iz/=len;const fx=-Math.sin(cam.yaw),fz=-Math.cos(cam.yaw),rx=Math.cos(cam.yaw),rz=-Math.sin(cam.yaw);
    let mx=rx*ix-fx*iz,mz=rz*ix-fz*iz;const m=Math.hypot(mx,mz);mx/=m;mz/=m;speed=(keys.has('ShiftLeft')||keys.has('ShiftRight')?5.2:3.3)*f;
    if(fish.st!=='none')cancelFish();const nx=pl.x+mx*speed*dt,nz=pl.z+mz*speed*dt;
    if(raft.walkable(nx,nz,pl.l)){pl.x=nx;pl.z=nz}else if(raft.walkable(nx,pl.z,pl.l))pl.x=nx;else if(raft.walkable(pl.x,nz,pl.l))pl.z=nz;else speed*=0.2;
    pl.face=Math.atan2(mx,mz)}
  pl.speed=damp(pl.speed,speed,10,dt);P.root.position.set(pl.x,pl.l?BAL+0.035:DECK,pl.z);P.root.rotation.y=dampAngle(P.root.rotation.y,pl.face,12,dt);
  for(const k in P.tools)P.tools[k].visible=false;if(mode==='title'||pl.tool==='rod'||fish.st!=='none')P.tools.rod.visible=true;else if(pl.tool==='hook')P.tools.hook.visible=true;else if(pl.tool==='hammer')P.tools.hammer.visible=true;
  PA.update(dt,pl.speed);
}
const catS={x:-1.4,z:2,tx:-1.4,tz:2,t:0,think:2,sit:false,face:0,sp:0};
function updateCat(dt){catS.t+=dt;catS.think-=dt;const px=pl.l?raft.house.ladder.x:pl.x,pz=pl.l?raft.house.ladder.z+0.4:pl.z,dp=Math.hypot(px-catS.x,pz-catS.z);
  if(catS.think<=0){catS.think=rr(2.5,6);if(dp>3.5){const a=Math.random()*6.28;catS.tx=px+Math.cos(a)*1.2;catS.tz=pz+Math.sin(a)*1.2}else if(Math.random()<0.45){const t=pick(raft.list());catS.tx=t[0]*T+rr(-0.8,0.8);catS.tz=t[1]*T+rr(-0.8,0.8)}else{catS.tx=catS.x;catS.tz=catS.z}if(!raft.walkable(catS.tx,catS.tz,0,0.2)){catS.tx=catS.x;catS.tz=catS.z}}
  const dx=catS.tx-catS.x,dz=catS.tz-catS.z,d=Math.hypot(dx,dz);let sp=0;if(d>0.1){sp=Math.min(d*2,dp>5?2.6:1.3);const nx=catS.x+dx/d*sp*dt,nz=catS.z+dz/d*sp*dt;if(raft.walkable(nx,nz,0,0.18)){catS.x=nx;catS.z=nz}else catS.think=0;catS.face=Math.atan2(dx,dz)}
  else if(dp<3){catS.face=dampAngle(catS.face,Math.atan2(px-catS.x,pz-catS.z),2,dt)}
  if(!raft.walkable(catS.x,catS.z,0,0.1)){const t=raft.list()[0];catS.x=t[0]*T+0.9;catS.z=t[1]*T+0.9}
  catS.sp=damp(catS.sp,sp,8,dt);cat.root.position.set(catS.x,DECK,catS.z);cat.root.rotation.y=dampAngle(cat.root.rotation.y,catS.face,8,dt);animCat(cat,dt,catS.t,catS.sp,catS.sp<0.05)}
let gullT=8,jump={t:-1,next:5,x:0,z:0,dx:1,dz:0};
function updateAmbient(dt){const t=waveState.time;
  for(const g of gulls){g.ang+=dt*g.spd;const r=g.r+Math.sin(t*0.1+g.ph)*3;const x=Math.cos(g.ang)*r,z=Math.sin(g.ang)*r;g.R.root.position.set(x,g.h+Math.sin(t*0.6+g.ph),z);g.R.root.rotation.y=-g.ang+Math.PI;g.R.root.rotation.z=-0.25;
    const glide=Math.sin(t*0.3+g.ph)>0.3,f=glide?0.1:Math.sin(t*9+g.ph)*0.55;g.R.wings[0].rotation.z=f;g.R.wings[1].rotation.z=-f}
  gullT-=dt;if(gullT<0){gullT=rr(14,30);audio.play('gull')}
  jump.next-=dt;if(jump.next<0&&jump.t<0){jump.t=0;const a=rr(0,6.28),r=rr(7,22);jump.x=Math.cos(a)*r;jump.z=Math.sin(a)*r;const b=rr(0,6.28);jump.dx=Math.cos(b);jump.dz=Math.sin(b);parts.splash(jump.x,jump.z,0.5);jump.next=rr(6,16)}
  if(jump.t>=0){jump.t+=dt/0.9;const k=jump.t;jumpFish.visible=true;jumpFish.position.set(jump.x+jump.dx*k*2.2,Math.sin(k*Math.PI)*1.1-0.1,jump.z+jump.dz*k*2.2);jumpFish.rotation.set(-Math.cos(k*Math.PI)*1.0,Math.atan2(jump.dx,jump.dz),0);if(k>=1){parts.splash(jumpFish.position.x,jumpFish.position.z,0.6);jump.t=-1;jumpFish.visible=false}}
  // smoke & steam
  for(const b of raft.bmap.values()){const s=b.data.s||{};if(Math.random()>dt*8)continue;const p=worldPos(b.data.tile[0]*T,DECK,b.data.tile[1]*T);
    if(b.data.type==='grill'&&s.fish&&s.t<1)parts.emit({x:p.x,y:p.y+0.8,z:p.z,count:1,spread:0.3,vel:[0,0.8,0],vr:0.15,life:2.2,size:[0.2,0.7],color:'#d9d4cc',alpha:0.35,gravity:0.3,drag:0.6});
    if(b.data.type==='purifier'&&s.b)parts.emit({x:p.x-0.08,y:p.y+0.8,z:p.z,count:1,spread:0.15,vel:[0,0.9,0],vr:0.1,life:1.6,size:[0.12,0.5],color:'#ffffff',alpha:0.35,gravity:0.3,drag:0.6});}
}
// ================= interactions =================
let curAct=null;
function gatherActions(){const out=[];const add=(x,z,r,a,pri=0)=>{const d=Math.hypot(pl.x-x,pl.z-z);if(d<r&&a)out.push({d:d-pri,...a})};const L=raft.house.ladder;
  if(pl.climb||mode!=='play')return null;
  if(pl.l===0){add(L.x,L.z,1.0,{l:'Climb up',i:'ladder',f:()=>{pl.climb={t:0,y0:DECK,y1:BAL+0.035,z0:L.z-0.33,z1:1.05,l:1};pl.x=L.x;PA.play('climb',1.1);cancelFish()}});
    for(const b of raft.bmap.values()){const bx=b.data.tile[0]*T,bz=b.data.tile[1]*T,r=b.data.type==='planter'?1.45:BP[b.data.type].edge?1.7:1.25;add(bx,bz,r,stationAction(b))}
    add(catS.x,catS.z,1.2,{l:'Pet Biscuit',i:'cat',f:()=>{PA.play('pet',1.2);audio.play('meow');const p=worldPos(catS.x,DECK+0.6,catS.z);parts.emit({x:p.x,y:p.y,z:p.z,count:6,spread:0.3,vel:[0,1,0],vr:0.3,life:1.2,size:[0.12,0.05],color:'#ff8fa3',gravity:0.5});catS.think=4;catS.tx=catS.x;catS.tz=catS.z}},-0.2);
    if(boatS.st==='docked'){const lp=raft.group.worldToLocal(new THREE.Vector3(boatS.x,0,boatS.z));add(lp.x,lp.z,5.2,{l:'Trade with Marlo',i:'boat',f:openShop},0.5)}
    if(sh.st==='attack'||sh.st==='approach'){const lp=raft.group.worldToLocal(new THREE.Vector3(sh.x,0,sh.z));add(lp.x,lp.z,4.2,{l:'Fend off the shark!',i:'shark',f:scareShark},3)}
  }else{add(L.x,1.05,0.9,{l:'Climb down',i:'ladder',f:()=>{pl.climb={t:0,y0:BAL+0.035,y1:DECK,z0:L.z-0.33,z1:L.z,l:0};PA.play('climb',1.1)}});
    add(-.55,.9,1.0,{l:`Cabin upgrades · tier ${(st.houseLv||0)+1}`,i:'hammer',f:openHouseUpgrades},-.1);
    const bd=raft.house.bed,night=(st.clock%1)>0.8||(st.clock%1)<0.22;add(bd.x-.55,bd.z,1.15,night?{l:'Sleep in your bed until morning',i:'bed',f:sleep}:{l:'Your bed — sleep available at night',i:'bed',off:1})}
  out.sort((a,b)=>a.d-b.d);return out[0]||null}
function interact(){if(!curAct||curAct.off||pl.lock>0)return;audio.play('click');curAct.f();hudDirty=true;if(!['Climb up','Climb down'].includes(curAct.l)&&!PA.action)PA.play('interact',0.6)}
function sleep(){fadeOut(()=>{const t=st.clock%1,add=(t>0.5?1-t+0.26:0.26-t);simBuildings(add*DAY,false);st.clock+=add;st.vit.hp=Math.min(100,st.vit.hp+40);st.vit.food=Math.max(5,st.vit.food-15);st.vit.water=Math.max(5,st.vit.water-18);lastDay=Math.floor(st.clock);banner(`Day ${lastDay}`,'You feel well rested');saveGame()})}
// ================= HUD =================
let hudDirty=true,hudT=0;
const ic=n=>ICON[n]||'';
function pickup(k,n){const it=ITEM[k];if(!it)return;const d=document.createElement('div');d.className='pk'+(n<0?' neg':'');d.innerHTML=`<i style="color:${it.color}">${ic(it.icon)}</i><b>${n>0?'+':''}${n}</b> ${it.name}`;const c=$('#pickups');c.appendChild(d);while(c.children.length>5)c.firstChild.remove();setTimeout(()=>d.remove(),3100);if(k==='coins'&&n>0)audio.play('coin')}
function toast(t){const d=document.createElement('div');d.className='pk';d.innerHTML=`<span style="color:var(--mut)">${t}</span>`;$('#pickups').appendChild(d);setTimeout(()=>d.remove(),3100)}
function banner(t,s,cls,short){const b=$('#banner');b.innerHTML=`<div class="bn ${cls||''}"><div class="bt">${t}</div>${s?`<div class="bs">${s}</div>`:''}</div>`;if(short){const el=b.firstChild;el.style.animation='bnin .3s, pkout .3s 1.1s forwards'}}
const RES=['coins','wood','plastic','fiber','scrap'];
function buildHUD(){
  $('#res').innerHTML=RES.map(k=>`<div class="rs ${k==='coins'?'coin':''}" data-r="${k}" title="${ITEM[k].name}"><i style="color:${ITEM[k].color}">${ic(ITEM[k].icon)}</i><span>0</span></div>`).join('');
  $('#btnCam').innerHTML=ic('cam');$('#btnInv').innerHTML=ic('bag');$('#btnPause').innerHTML=ic('pause');
  const ring=(c)=>`<svg class="ring" viewBox="0 0 60 60"><circle cx="30" cy="30" r="26" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="5"/><circle class="rv" cx="30" cy="30" r="26" fill="none" stroke="${c}" stroke-width="5" stroke-linecap="round" stroke-dasharray="163.4" stroke-dashoffset="0"/></svg>`;
  $('#vitals').innerHTML=[['hp','heart','var(--hp)','Health'],['food','food','var(--food)','Hunger'],['water','drop','var(--wat)','Thirst']].map(([k,i,c,n])=>`<div class="vit" data-v="${k}" title="${n}">${ring(c)}<i class="ic" style="color:${c}">${ic(i)}</i><div class="num">100</div></div>`).join('');
  const slots=[['hook','hook','Hook','1'],['rod','rod','Fishing Rod','2'],['hammer','hammer','Build','3'],['seeds','seed','Seeds','4'],['eat','eat','Eat','5'],['drink','water','Drink','6']];
  $('#hotbar').innerHTML=slots.map(([id,i,n,k])=>`<button class="slot" data-s="${id}"><span class="k">${k}</span><i>${ic(i)}</i><span class="c"></span><span class="nm">${n}</span></button>`).join('');
  $('#hotbar').querySelectorAll('.slot').forEach(b=>b.onclick=()=>selectSlot(b.dataset.s));
  $('#btnCam').onclick=()=>{setCam((settings.cam|0)+1);audio.play('click')};$('#btnInv').onclick=()=>openInventory();$('#btnPause').onclick=()=>openPause();
  $('#prompt').onclick=()=>interact();
}
function updateHUD(){
  const t=st.clock%1,night=env.night>0.5,rain=st.weather.type==='rain';$('#clkDay').textContent=`Day ${Math.floor(st.clock)}`;{const L=lvlOf(st.xp),a=xpFor(L),b2=xpFor(L+1);$('#rnL').textContent=`Renown ${L}`;$('#rnB').style.width=`${((st.xp||0)-a)/(b2-a)*100}%`}$('#clkTime').textContent=fmtTime(t);$('#clkWx').textContent=rain?'Rain':night?'Night':t<0.3?'Dawn':t>0.74?'Dusk':'Clear';
  const ci=$('#clkIco'),want=rain?'rain':night?'moon':'sun';if(ci.dataset.i!==want){ci.dataset.i=want;ci.innerHTML=ic(want);ci.className='clk-ico '+(rain?'rain':night?'night':'')}
  for(const k of RES){const el=$(`.rs[data-r="${k}"] span`);const v=String(st.inv[k]|0);if(el.textContent!==v){el.textContent=v;el.parentElement.classList.add('flash');setTimeout(()=>el.parentElement.classList.remove('flash'),300)}}
  for(const k of['hp','food','water']){const v=st.vit[k],el=$(`.vit[data-v="${k}"]`);el.querySelector('.rv').style.strokeDashoffset=163.4*(1-v/100);el.querySelector('.num').textContent=Math.ceil(v);el.classList.toggle('low',v<20)}
  const cnt={seeds:(st.inv[st.seedSel==='melon'?'seedMelon':'seedPotato']|0),eat:(st.inv.cookedFish+st.inv.potato+st.inv.melon+st.inv.rawFish)|0,drink:st.inv.water|0};
  $('#hotbar').querySelectorAll('.slot').forEach(b=>{const s=b.dataset.s;b.classList.toggle('on',s===pl.tool||(s==='hammer'&&buildOn));const c=b.querySelector('.c');c.textContent=s in cnt?cnt[s]:'';b.classList.toggle('dim',s in cnt&&!cnt[s]);if(s==='seeds')b.querySelector('.nm').textContent=st.seedSel==='melon'?'Melon Seeds (4 to switch)':'Potato Seeds (4 to switch)'});
  const q=QUESTS[st.quest];if(q){const p=Math.min(q.n,qProg(q));$('#quest').innerHTML=`<div class="q-lab"><i>${ic('quest')}</i>Objective ${st.quest+1}/${QUESTS.length}</div><div class="q-t">${q.t}</div><div class="q-d">${q.d}</div><div class="q-bar"><i style="width:${p/q.n*100}%"></i></div><div class="q-foot"><span>${p} / ${q.n}</span><span>Reward: ${Object.entries(q.r).map(([k,v])=>`${v} ${ITEM[k].name.toLowerCase()}`).join(', ')}</span></div>`}
  else $('#quest').innerHTML=`<div class="q-lab"><i>${ic('star')}</i>Free play</div><div class="q-t">Master of the sea</div><div class="q-d">All objectives complete. Keep expanding your floating home!</div>`;
}
function selectSlot(s){audio.play('click');if(s==='eat')return eat();if(s==='drink')return drink();
  if(s==='seeds'){if(pl.tool==='seeds')st.seedSel=st.seedSel==='potato'?'melon':'potato';pl.tool='seeds';if(buildOn)cancelBuild();toast(`${CROP[st.seedSel].name} seeds selected — press E at a Planter`);hudDirty=true;return}
  if(s==='hammer'){if(buildOn){cancelBuild();return}pl.tool='hammer';cancelFish();openBuild();hudDirty=true;return}
  if(buildOn)cancelBuild();pl.tool=s;if(s!=='rod')cancelFish();hudDirty=true}
function renderBuildbar(){$('#buildbar').innerHTML=BKEYS.map(k=>{if(k==='demolish')return`<button class="bc ${bsel===k?'on':''}" data-b="${k}"><div class="bi" style="color:var(--bad)">${ic('trash')}</div><div class="bn2">Demolish</div><div class="cost"><span style="color:var(--mut)">50% refund</span></div></button>`;
  const b=BP[k],lk=locked(k),ok=has(b.cost);return`<button class="bc ${bsel===k?'on':''} ${ok&&!lk?'':'no'} ${lk?'lock':''}" data-b="${k}" title="${b.desc}"><div class="bi">${ic(b.icon)}</div><div class="bn2">${b.name}</div><div class="cost">${Object.entries(b.cost).map(([r,v])=>`<span class="${(st.inv[r]|0)>=v?'':'lack'}"><i style="color:${ITEM[r].color}">${ic(ITEM[r].icon)}</i>${v}</span>`).join('')}</div></button>`}).join('');
  $('#buildbar').querySelectorAll('.bc').forEach(e=>e.onclick=()=>{bsel=e.dataset.b;audio.play('click');renderBuildbar()})}
// markers
const mkPool=[];const _v=new THREE.Vector3();
function updateMarkers(){const list=[];if(mode==='play'){
  for(const b of raft.bmap.values()){const s=bStatus(b);if(!s)continue;let p;if(BP[b.data.type].edge){const[di,dj]=b.data.dir;p=worldPos(b.data.tile[0]*T+di*0.9,DECK+1.3,b.data.tile[1]*T+dj*0.9)}else p=worldPos(b.data.tile[0]*T,DECK+(b.data.type==='rain'?1.9:1.4),b.data.tile[1]*T);list.push({p,...s})}
  if(sh.st==='attack'||sh.st==='approach')list.push({p:new THREE.Vector3(sh.x,1.4,sh.z),warn:1,icon:'shark',lab:'Shark!'});
  if(boatS.st==='docked')list.push({p:new THREE.Vector3(boatS.x,3.8,boatS.z),icon:'boat',lab:'Marlo · Trader'});}
  const W=innerWidth,H=innerHeight;let n=0;
  for(const m of list){_v.copy(m.p).project(camera);if(_v.z>1||Math.abs(_v.x)>1.1||Math.abs(_v.y)>1.1)continue;let el=mkPool[n];if(!el){el=document.createElement('div');el.className='mk';el.innerHTML='<div class="b"><svg class="pr" viewBox="0 0 40 40"><circle cx="20" cy="20" r="17" fill="none" stroke="rgba(255,255,255,.15)" stroke-width="3"/><circle class="pv" cx="20" cy="20" r="17" fill="none" stroke="#ffd166" stroke-width="3" stroke-linecap="round" stroke-dasharray="106.8"/></svg><span class="ico"></span></div><div class="l"></div>';$('#markers').appendChild(el);mkPool.push(el)}
    n++;el.style.display='';el.style.left=((_v.x*0.5+0.5)*W)+'px';el.style.top=((-_v.y*0.5+0.5)*H)+'px';el.className='mk'+(m.ready?' ready':'')+(m.warn?' warn':'');
    const key=m.icon;if(el.dataset.i!==key){el.dataset.i=key;el.querySelector('.ico').innerHTML=ic(key)}
    const pr=el.querySelector('svg.pr'),pv=el.querySelector('.pv');
    const lab=el.querySelector('.l');const txt=m.lab||(m.n>1?`×${m.n}`:'');lab.textContent=txt;lab.style.display=txt?'':'none';
    if(m.ready||m.warn||m.lab){pr.style.display='none'}else{pr.style.display='';pv.style.strokeDashoffset=106.8*(1-(m.pf||0))}}
  for(let i=n;i<mkPool.length;i++)mkPool[i].style.display='none'}
// ================= modals =================
function openModal(html,{wide=false,closable=true,onClose=null,shop=false}={}){if(document.pointerLockElement)document.exitPointerLock();closeModal(true);const back=document.createElement('div');back.className='modal-back';back.innerHTML=`<div class="modal ${wide?'wide':''}">${html}</div>`;$('#modals').appendChild(back);curModal={back,closable,onClose,shop};
  back.addEventListener('pointerdown',e=>{if(e.target===back&&closable)closeModal()});back.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>closeModal());keys.clear();return back.firstElementChild}
function closeModal(silent){if(!curModal)return;const m=curModal;curModal=null;m.back.remove();if(m.onClose&&!silent)m.onClose()}
const head=(t,s)=>`<div class="mhead"><div><h2>${t}</h2>${s?`<p class="sub">${s}</p>`:''}</div><button class="xbtn" data-close aria-label="Close">${ic('close')}</button></div>`;
function openSettings(back){const m=openModal(head('Settings','Tune graphics, sound and controls')+`
  <div class="row"><span class="lbl">Graphics quality</span><select class="input" id="sQ">${['auto','low','medium','high','ultra'].map(q=>`<option value="${q}" ${settings.quality===q?'selected':''}>${q[0].toUpperCase()+q.slice(1)}${q==='auto'?` (${qLevel})`:''}</option>`).join('')}</select></div>
  <div class="row"><span class="lbl">Pixel art</span><select class="input" id="sP">${[[1,'Off'],[2,'On · Fine'],[3,'On · Classic'],[4,'On · Chunky']].map(([v,n])=>`<option value="${v}" ${+settings.pxMode===v?'selected':''}>${n}</option>`).join('')}</select></div>
  <div class="row"><span class="lbl">Show FPS</span><button class="toggle ${settings.fps?'on':''}" id="sF" aria-label="Show FPS"></button></div>
  ${[['master','Master volume'],['music','Music'],['sfx','Sound effects'],['sens','Camera sensitivity']].map(([k,n])=>`<div class="row"><span class="lbl">${n}</span><input type="range" min="${k==='sens'?0.3:0}" max="${k==='sens'?2:1}" step="0.05" value="${settings[k]}" data-k="${k}"></div>`).join('')}
  <div class="btns"><button class="btn pri" data-close>Done</button></div>`,{onClose:back});
  m.querySelector('#sQ').onchange=e=>{settings.quality=e.target.value;applyQuality(settings.quality==='auto'?'high':settings.quality);autoQ.t=0;autoQ.lock=settings.quality!=='auto';saveSettings()};
  m.querySelector('#sP').onchange=e=>{settings.pxMode=+e.target.value;applyQuality(qLevel);saveSettings()};
  m.querySelector('#sF').onclick=e=>{settings.fps=!settings.fps;e.target.classList.toggle('on',settings.fps);$('#fps').hidden=!settings.fps;saveSettings()};
  m.querySelectorAll('input[type=range]').forEach(r=>r.oninput=()=>{settings[r.dataset.k]=+r.value;audio.vol={master:settings.master,music:settings.music,sfx:settings.sfx};audio.apply();saveSettings()})}
function openHowto(back){openModal(head('How to play','Survive, gather, grow and expand your floating home')+`<div class="keys">
  <div><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> Move</div><div><kbd>Shift</kbd> Run</div><div><kbd>Drag</kbd> Orbit in third person</div><div><kbd>Click</kbd> Capture mouse in first person</div><div><kbd>Mouse</kbd> Free look in first person</div><div><kbd>Scroll</kbd> Focus zoom in every view</div>
  <div><kbd>E</kbd> Interact</div><div><kbd>Click</kbd> Use tool</div><div><kbd>1</kbd>–<kbd>6</kbd> Hotbar</div><div><kbd>Tab</kbd> Inventory</div><div><kbd>Space</kbd> Reel fish</div><div><kbd>Esc</kbd> Pause</div></div>
  <ul class="tips"><li>Use the <b>Hook</b> to pull in planks, bottles, fronds, barrels and crates.</li><li>Cast your <b>Rod</b>, wait for the bobber to dip, click, then stop the marker inside the green zone.</li><li>Keep <b>Hunger</b> and <b>Thirst</b> up. When either reaches zero, you start losing health.</li><li>Build a <b>Grill</b>, <b>Purifier</b> and <b>Planters</b>. Nets, traps and stills keep working while you’re away.</li><li>Marlo the merchant visits daily from 09:00 to 15:00. Sell goods and buy upgrades.</li><li>In Survival mode, a shark attacks your raft from time to time. Get close and press <b>E</b>, or click it with the Hook.</li></ul>
  <div class="btns"><button class="btn pri" data-close>Got it</button></div>`,{onClose:back})}
function openPause(){if(mode!=='play')return;const m=openModal(head('Paused',`${st.name} · Day ${Math.floor(st.clock)} · ${st.mode==='cozy'?'Cozy':'Survival'}`)+`<div class="pause-menu"><button class="btn pri" data-a="resume">Resume</button><button class="btn" data-a="inv">Inventory & objectives</button><button class="btn" data-a="settings">Settings</button><button class="btn" data-a="howto">How to play</button><button class="btn" data-a="quit">Save & quit to title</button></div>`);
  m.querySelectorAll('[data-a]').forEach(b=>b.onclick=()=>{audio.play('click');const a=b.dataset.a;if(a==='resume')closeModal();if(a==='inv')openInventory();if(a==='settings')openSettings(openPause);if(a==='howto')openHowto(openPause);if(a==='quit'){closeModal();saveGame();toTitle()}})}
function openHouseUpgrades(){
  const lv=st.houseLv||0,next=HOUSE_UP[lv];
  const tiers=HOUSE_UP.map((u,i)=>`<div class="house-tier ${i<lv?'owned':i===lv?'next':''}"><span class="tier-no">0${i+1}</span><div><b>${u.name}</b><p>${u.desc}</p><small>${u.perk}</small></div>${i<lv?`<span class="tier-owned">${ic('check')} Built</span>`:''}</div>`).join('');
  const cost=next?Object.entries(next.cost).map(([k,v])=>`<span class="${(st.inv[k]|0)>=v?'':'lack'}"><i style="color:${ITEM[k].color}">${ic(ITEM[k].icon)}</i>${st.inv[k]|0} / ${v}</span>`).join(''):'';
  const m=openModal(head('Cabin & living quarters',`Tier ${lv+1} · ${lv?HOUSE_UP[lv-1].name:'Driftwood Cabin'}`)+`<div class="house-tiers">${tiers}</div>${next?`<div class="upgrade-buy"><div><b>Next: ${next.name}</b><div class="upgrade-cost">${cost}</div></div><button class="btn pri" id="buyHouse" ${has(next.cost)?'':'disabled'}>Upgrade</button></div>`:'<p class="maxed">Your cabin is fully upgraded. All passive perks are active.</p>'}<div class="btns"><button class="btn" data-close>Return</button></div>`,{wide:true});
  const buy=m.querySelector('#buyHouse');if(buy)buy.onclick=()=>{if(!has(next.cost))return;pay(next.cost);st.houseLv=lv+1;raft.house.setLevel(st.houseLv);audio.play('quest');banner(next.name,next.perk,'gold');saveGame();openHouseUpgrades()};
}
function openInventory(tab='items'){if(mode!=='play')return;const I=st.inv;
  const items=Object.keys(ITEM).filter(k=>k!=='coins').map(k=>`<div class="it"><i style="color:${ITEM[k].color}">${ic(ITEM[k].icon)}</i><b>${I[k]|0}</b><span>${ITEM[k].name}</span></div>`).join('');
  const quests=QUESTS.map((q,i)=>`<div class="ql ${i<st.quest?'done':i===st.quest?'cur':'lock'}"><div class="ck">${i<st.quest?ic('check'):''}</div><div><div class="qt">${q.t}</div><div class="q-d">${i<=st.quest?q.d:'Locked'}</div></div></div>`).join('');
  const S=st.stats,stats=[[Math.floor(st.clock),'Days survived'],[st.tiles.length,'Raft tiles'],[S.fish,'Fish caught'],[S.debris,'Debris collected'],[S.harvest,'Crops harvested'],[S.earned,'Coins earned'],[S.sharks,'Sharks scared off'],[st.b.length,'Structures built']].map(([v,n])=>`<div><b>${v}</b><span>${n}</span></div>`).join('');
  const ups=UPG.filter(u=>(st.up[u.id]|0)>=u.lv).map(u=>`<div class="ql done"><div class="ck">${ic('check')}</div><div><div class="qt" style="text-decoration:none;opacity:1">${u.name}</div><div class="q-d">${u.desc}</div></div></div>`).join('')||'<p class="sub">No upgrades yet. Visit Marlo the merchant.</p>';
  const m=openModal(head('Inventory',`<span class="coinbal"><i>${ic('coin')}</i>${I.coins} coins</span>`)+`<div class="tabs">${['items','objectives','upgrades','stats'].map(t=>`<button data-t="${t}" class="${t===tab?'on':''}">${t[0].toUpperCase()+t.slice(1)}</button>`).join('')}</div>
    <div>${tab==='items'?`<div class="inv-grid">${items}</div>`:tab==='objectives'?quests:tab==='upgrades'?ups:`<div class="stats">${stats}</div>`}</div>`,{wide:true});
  m.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{audio.play('click');openInventory(b.dataset.t)})}
function openShop(tab='sell'){const I=st.inv;let body='';
  if(tab==='sell')body=Object.entries(SELL).map(([k,p])=>`<div class="sh"><i style="color:${ITEM[k].color}">${ic(ITEM[k].icon)}</i><div class="sn"><b>${ITEM[k].name}</b><span>You have ${I[k]|0}</span></div><div class="price"><i>${ic('coin')}</i>${p}</div><button class="btn" data-sell="${k}" data-n="1" ${I[k]>0?'':'disabled'}>Sell 1</button><button class="btn" data-sell="${k}" data-n="all" ${I[k]>0?'':'disabled'}>All</button></div>`).join('');
  else if(tab==='buy')body=BUY.map(b=>`<div class="sh"><i style="color:${ITEM[b.id].color}">${ic(ITEM[b.id].icon)}</i><div class="sn"><b>${ITEM[b.id].name}${b.n>1?` ×${b.n}`:''}</b><span>You have ${I[b.id]|0}</span></div><div class="price"><i>${ic('coin')}</i>${b.p}</div><button class="btn pri" data-buy="${b.id}" ${I.coins>=b.p?'':'disabled'}>Buy</button></div>`).join('');
  else body=UPG.map((u,i)=>{const own=(st.up[u.id]|0)>=u.lv,prev=(st.up[u.id]|0)>=u.lv-1;return`<div class="sh"><i style="color:var(--acc)">${ic(u.id==='rod'?'rod':u.id==='hook'?'hook':u.id==='still'?'sun':u.id==='crab'?'crab':u.id==='store'?'crate':'drop')}</i><div class="sn"><b>${u.name}</b><span>${u.desc}</span></div>${own?`<span class="coinbal" style="background:rgba(123,216,143,.15);color:var(--good)">Owned</span>`:`<div class="price"><i>${ic('coin')}</i>${u.p}</div><button class="btn pri" data-up="${i}" ${I.coins>=u.p&&prev?'':'disabled'}>${prev?'Buy':'Locked'}</button>`}</div>`}).join('');
  const m=openModal(head('Marlo’s Floating Market',`<span class="coinbal"><i>${ic('coin')}</i>${I.coins} coins</span>`)+`<div class="trader-head"><div class="av">${ic('boat')}</div><q>${pick(['Fine day for trading, sailor! What have you got?','Fresh fish fetches a fair price, friend.','I sail every current there is. Buy something nice!','Careful out there, the sharks are hungry this season.'])}</q></div>
    <div class="tabs">${[['sell','Sell'],['buy','Buy supplies'],['up','Upgrades']].map(([t,n])=>`<button data-t="${t}" class="${t===tab?'on':''}">${n}</button>`).join('')}</div><div class="shop-list">${body}</div>`,{wide:true,shop:true});
  m.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{audio.play('click');openShop(b.dataset.t)});
  m.querySelectorAll('[data-sell]').forEach(b=>b.onclick=()=>{const k=b.dataset.sell,n=b.dataset.n==='all'?I[k]:1,v=n*SELL[k];I[k]-=n;I.coins+=v;st.stats.sold+=n;st.stats.earned+=v;audio.play('coin');pickup('coins',v);openShop('sell')});
  m.querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>{const it=BUY.find(x=>x.id===b.dataset.buy);I.coins-=it.p;give({[it.id]:it.n});audio.play('coin');openShop('buy')});
  m.querySelectorAll('[data-up]').forEach(b=>b.onclick=()=>{const u=UPG[+b.dataset.up];I.coins-=u.p;st.up[u.id]=u.lv;if(u.id==='crab'){st.stats.crab=1;crab.x=pl.x;crab.z=pl.z}audio.play('quest');banner('Upgrade purchased',u.name,'gold');openShop('up')})}
// ================= save / load / flow =================
const hasSave=()=>{try{return JSON.parse(localStorage.getItem(SAVE)||'null')}catch(e){return null}};
function saveGame(){if(mode!=='play'||st.name==='Showcase')return;st.player={x:pl.x,z:pl.z,l:pl.l};st.saved=Date.now();try{localStorage.setItem(SAVE,JSON.stringify(st))}catch(e){}}
function fadeOut(mid){const f=$('#fade');f.classList.add('on');setTimeout(()=>{mid&&mid();setTimeout(()=>f.classList.remove('on'),120)},650)}
function migrate(s){const f=freshState(s.name||'World',s.mode||'survival');for(const k in f)if(s[k]===undefined)s[k]=f[k];s.inv={...INV0,...s.inv};for(const k in INV0)if(s.inv[k]==null)s.inv[k]=0;s.stats={...f.stats,...s.stats};s.up={...f.up,...s.up};return s}
function startGame(state,isNew){fadeOut(()=>{st=migrate(state);mode='play';lastDay=Math.floor(st.clock);warned={};applyState();$('#title').hidden=true;$('#hud').hidden=false;hudDirty=true;cam.tyaw=cam.yaw=0.5;setCam(settings.cam|0,true);pl.tool='hook';PA.hold=null;cancelFish();bobber.visible=false;fishLine.visible=false;
  if(isNew){banner(st.name,'Stranded on an endless sea. Make it home.','gold');saveGame()}
  else{const away=Math.min((st.houseLv>=3?12:8)*3600,(Date.now()-(st.saved||Date.now()))/1000);if(away>60){const before=snap();simBuildings(away,false);const after=snap();if(st.up.crab)crabCollectAll(true);const gained=Object.keys(after).filter(k=>after[k]>before[k]).map(k=>[k,after[k]-before[k]]);
    if(gained.length)setTimeout(()=>openModal(head('Welcome back!',`You were away for ${fmtDur(away)}. Your raft kept working:`)+`<div class="away-list">${gained.map(([k,v])=>`<div class="it"><i style="color:${ITEM[k].color}">${ic(ITEM[k].icon)}</i><b>+${v}</b><span>${ITEM[k].name} ready</span></div>`).join('')}</div><p class="sub" style="margin-top:14px">Collect it from your stations with E.</p><div class="btns"><button class="btn pri" data-close>Let’s go</button></div>`),700)}
    else banner(`Welcome back`,`${st.name} · Day ${Math.floor(st.clock)}`)}
  if(isTouch){$('#joy').hidden=false;$('#mobUse').hidden=false;$('#hint').hidden=true}})}
function snap(){const o={coins:0,rawFish:0,cookedFish:0,smokedFish:0,pearl:0,water:0,potato:0,melon:0,wood:0};for(const b of raft.bmap.values()){const s=bState(b);switch(b.data.type){case'trap':o.rawFish+=s.n|0;break;case'grill':if(s.t>=1)o.cookedFish+=s.fish|0;break;case'rain':case'still':o.water+=s.n|0;break;case'purifier':o.water+=s.done|0;break;case'planter':if(s.crop&&s.grow>=1)o[CROP[s.crop].item]+=1;break;case'net':o.wood+=(s.items||[]).length;break;case'smoker':o.smokedFish+=s.done|0;break;case'winch':o.wood+=(s.items||[]).length;break;case'buoy':o.coins=(o.coins||0)+(s.c|0);break;case'pearl':o.pearl+=s.n|0;break}}return o}
// ---- Pip the hermit crab: idle auto-collector ----
const crab={t:0,tgt:null,x:0.6,z:0.4,face:0,obj:null};
function crabCollectAll(silent){const got={};const keep=st.inv;const snapInv={...keep};let n=0;
  for(const b of raft.bmap.values()){if(b.data.type==='lamp'||b.data.type==='planter')continue;const a=stationAction(b);if(a&&!a.off&&/^(Collect|Empty|Harvest)/.test(a.l)){a.f();n++}}
  if(n&&!silent){for(const k in keep){const d=(keep[k]|0)-(snapInv[k]|0);if(d>0)got[k]=d}const txt=Object.entries(got).map(([k,v])=>`+${v} ${ITEM[k]?ITEM[k].name:k}`).join(' · ');if(txt)toast(`Pip collected ${txt}`)}
  if(n)hudDirty=true;return n}
function updateCrab(dt,now){if(!crab.obj)return;crab.obj.visible=!!(st.up&&st.up.crab)&&mode==='play';if(!crab.obj.visible)return;
  crab.t+=dt*(st.up.crab>1?3:1);if(!crab.tgt||crab.t>6){crab.t=0;const bs=[...raft.bmap.values()].filter(b=>{const x=bStatus(b);return x&&x.ready});const b=bs.length?bs[Math.random()*bs.length|0]:null;
    const tl=st.tiles[Math.random()*st.tiles.length|0];crab.tgt=b?[b.data.tile[0]*T+0.7,b.data.tile[1]*T+0.7,b]:[tl[0]*T+rr(-0.8,0.8),tl[1]*T+rr(-0.8,0.8),null]}
  const dx=crab.tgt[0]-crab.x,dz=crab.tgt[1]-crab.z,d=Math.hypot(dx,dz);
  if(d>0.08){const sp=Math.min(d,dt*(st.up.crab>1?2.4:0.9));crab.x+=dx/d*sp;crab.z+=dz/d*sp;crab.face=dampAngle(crab.face,Math.atan2(dx,dz)+Math.PI/2,8,dt)}
  else if(crab.tgt[2]){const b=crab.tgt[2];crab.tgt[2]=null;if(raft.bmap.has(b.data.id)){const a=stationAction(b);if(a&&!a.off&&/^(Collect|Empty|Harvest)/.test(a.l)&&b.data.type!=='planter'){const before={...st.inv};a.f();const got=Object.keys(st.inv).filter(k=>(st.inv[k]|0)>(before[k]|0)).map(k=>`+${st.inv[k]-before[k]} ${ITEM[k]?ITEM[k].name:k}`).join(' · ');if(got)toast(`Pip collected ${got}`);hudDirty=true}}}
  const o=crab.obj;o.position.set(crab.x,DECK+0.02+Math.abs(Math.sin(now*0.02))*0.01*(d>0.08),crab.z);o.rotation.y=crab.face;o.children.forEach((c,i)=>{if(c.userData.leg!=null)c.rotation.z=Math.sin(now*0.03+c.userData.leg)*(d>0.08?0.5:0.05)})}
function makeCrabMesh(){const g=new THREE.Group(),sh=new THREE.MeshStandardMaterial({color:'#d9643a',roughness:0.6}),shell=new THREE.MeshStandardMaterial({color:'#e8c79a',roughness:0.8});
  const body=new THREE.Mesh(new THREE.SphereGeometry(0.09,10,8),sh);body.scale.set(1.3,0.6,1);body.position.y=0.07;g.add(body);
  const sp=new THREE.Mesh(new THREE.ConeGeometry(0.1,0.18,8),shell);sp.position.set(0,0.17,-0.02);sp.rotation.x=-0.5;g.add(sp);
  for(const s of[-1,1]){const c=new THREE.Mesh(new THREE.SphereGeometry(0.035,8,6),sh);c.scale.set(1.4,0.8,1);c.position.set(0.11,0.08,s*0.09);g.add(c);
    for(let i=0;i<3;i++){const l=new THREE.Mesh(new THREE.BoxGeometry(0.012,0.1,0.012),sh);l.position.set(-0.05+i*0.045,0.04,s*0.09);l.rotation.x=s*0.7;l.userData.leg=i*2+s;g.add(l)}
    const e=new THREE.Mesh(new THREE.SphereGeometry(0.014,6,4),new THREE.MeshStandardMaterial({color:'#111'}));e.position.set(0.1,0.13,s*0.03);g.add(e)}
  g.traverse(m=>{if(m.isMesh)m.castShadow=true});return g}
crab.obj=makeCrabMesh();raft.group.add(crab.obj);crab.obj.visible=false;
const fmtDur=s=>s>3600?`${Math.floor(s/3600)} h ${Math.floor(s%3600/60)} min`:`${Math.floor(s/60)} min`;
function toTitle(){fadeOut(()=>{mode='title';P.root.visible=true;cam.baseFov=48;cam.zoom=1;camera.fov=48;camera.updateProjectionMatrix();st=showcase();applyState();$('#hud').hidden=true;$('#title').hidden=false;refreshTitle();cancelFish();PA.hold='rod';pl.x=1.5;pl.z=2.6;pl.face=0.6})}
function refreshTitle(){const s=hasSave(),b=$('#btnContinue');b.hidden=!s;if(s){$('#contInfo').textContent=`${s.name} · Day ${Math.floor(s.clock)} · ${s.mode==='cozy'?'Cozy':'Survival'}`;b.classList.add('primary')}}
function openNewWorld(){const ex=hasSave();let md='survival';const nm=pick(NAMES);
  const m=openModal(head('New World','Choose how your voyage begins')+`<div class="field"><label for="wn">World name</label><input class="input" id="wn" maxlength="24" value="${nm}"></div>
   <div class="field"><label>Game mode</label><div class="seg" id="seg"><button data-m="cozy"><b>Cozy</b><span>Slower hunger, no shark. Relax and build.</span></button><button data-m="survival" class="on"><b>Survival</b><span>The full challenge, with shark attacks.</span></button></div></div>
   ${ex?`<p class="sub" style="color:#ffc9a8;margin-top:16px">This will replace your current world “${ex.name}” (Day ${Math.floor(ex.clock)}).</p>`:''}
   <div class="btns"><button class="btn" data-close>Cancel</button><button class="btn pri" id="go">Set sail</button></div>`);
  m.querySelectorAll('#seg button').forEach(b=>b.onclick=()=>{md=b.dataset.m;m.querySelectorAll('#seg button').forEach(x=>x.classList.toggle('on',x===b));audio.play('click')});
  m.querySelector('#go').onclick=()=>{const n=(m.querySelector('#wn').value||nm).trim().slice(0,24);closeModal();audio.play('quest');startGame(freshState(n,md),true)}}
// ================= input =================
const isTouch=matchMedia('(pointer:coarse)').matches;
const ray=new THREE.Raycaster();const mouse={ndc:new THREE.Vector2(),inside:false,x:0,y:0};let drag=null,hoverD=null;
canvas.addEventListener('contextmenu',e=>e.preventDefault());
const fpMode=()=>!!CAMS[settings.cam|0].fp,pointerLocked=()=>document.pointerLockElement===canvas;
canvas.addEventListener('pointerdown',e=>{audio.init();if(mode!=='play'||curModal)return;
  if(fpMode()&&!pointerLocked()){if(e.button===0)canvas.requestPointerLock();return}
  drag={x:e.clientX,y:e.clientY,b:e.button,moved:false,id:e.pointerId,locked:pointerLocked()};if(!drag.locked)canvas.setPointerCapture(e.pointerId)});
canvas.addEventListener('pointermove',e=>{mouse.x=e.clientX;mouse.y=e.clientY;mouse.inside=true;
  if(fpMode()&&pointerLocked()){mouse.ndc.set(0,0);cam.tyaw-=e.movementX*.0022*settings.sens;cam.tpitch=clamp(cam.tpitch+e.movementY*.0022*settings.sens,-1.25,1.25);return}
  mouse.ndc.set(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight)*2+1);
  if(drag&&drag.id===e.pointerId){const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(!drag.moved&&Math.hypot(dx,dy)>5)drag.moved=true;if(drag.moved&&mode==='play'){cam.tyaw-=e.movementX*.006*settings.sens;cam.tpitch=clamp(cam.tpitch+e.movementY*.005*settings.sens,.06,1.25)}}});
canvas.addEventListener('pointerup',e=>{if(!drag)return;const d=drag;drag=null;if(d.moved||mode!=='play'||curModal)return;if(d.b===2){if(buildOn)cancelBuild();return}if(d.b===0)worldClick()});
canvas.addEventListener('pointerleave',()=>{if(!pointerLocked())mouse.inside=false});
document.addEventListener('pointerlockchange',()=>{const on=pointerLocked();$('#hud').classList.toggle('locked',on);mouse.ndc.set(0,0);mouse.inside=on;drag=null;keys.clear();if(on)canvas.focus()});
canvas.addEventListener('wheel',e=>{if(mode!=='play'||curModal)return;e.preventDefault();cam.zoom=clamp(cam.zoom*Math.exp(-e.deltaY*.0013),1,3);updateOptics()},{passive:false});
function pickDebris(){ray.setFromCamera(mouse.ndc,camera);const objs=debris.filter(d=>d.st==='float').map(d=>d.obj);const hits=ray.intersectObjects(objs,true);if(hits.length){let o=hits[0].object;while(o&&!o.userData.ref)o=o.parent;if(o)return o.userData.ref}
  const plane=new THREE.Plane(new THREE.Vector3(0,1,0),0),p=new THREE.Vector3();if(!ray.ray.intersectPlane(plane,p))return null;let best=null,bd=1.4;for(const d of debris){if(d.st!=='float')continue;const dd=Math.hypot(d.x-p.x,d.z-p.z);if(dd<bd){bd=dd;best=d}}return best}
function waterPoint(){ray.setFromCamera(mouse.ndc,camera);const p=new THREE.Vector3();if(!ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),0),p))return null;const l=raft.group.worldToLocal(p.clone());const i=Math.round(l.x/T),j=Math.round(l.z/T);if(raft.has(i,j)&&Math.abs(l.x-i*T)<T/2+0.2&&Math.abs(l.z-j*T)<T/2+0.2)return null;return p}
function sharkHit(){if(sh.st!=='attack'&&sh.st!=='approach')return false;ray.setFromCamera(mouse.ndc,camera);const h=ray.intersectObject(shark.root,true);if(!h.length){const p=new THREE.Vector3();if(!ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),0),p)||Math.hypot(p.x-sh.x,p.z-sh.z)>2)return false}
  const pw=playerWorld();if(Math.hypot(pw.x-sh.x,pw.z-sh.z)>7){toast('Get closer to the shark!');return true}scareShark();return true}
function worldClick(){if(pl.climb)return;if(fish.st==='bite'||fish.st==='mini'){fishClick();return}
  if(buildOn){placeBuild();return}
  if(pl.tool==='hook'||pl.tool==='rod'){if(sharkHit())return}
  if(pl.tool==='hook'){if(hk.st!=='none'||pl.lock>0)return;const d=pickDebris();if(d)throwHook(d);return}
  if(pl.tool==='rod'){if(fish.st!=='none'){fishClick();return}if(pl.lock>0)return;if(pl.l===1){toast('Climb down to fish');return}const p=waterPoint();if(p)startCast(p);else toast('Click on open water to cast');return}
  if(pl.tool==='seeds'){toast('Walk to a Planter and press E to plant')}}
addEventListener('keydown',e=>{audio.init();if(e.target.tagName==='INPUT')return;
  if(e.code==='Tab'){e.preventDefault();if(mode==='play'){if(curModal)closeModal();else openInventory()}return}
  if(e.code==='Escape'){if(curModal){if(curModal.closable)closeModal();return}if(buildOn){cancelBuild();return}if(fish.st!=='none'){cancelFish();return}openPause();return}
  if(mode!=='play'||curModal)return;keys.add(e.code);
  if(e.code==='KeyE')interact();if(e.code==='Space'){e.preventDefault();if(fish.st==='bite'||fish.st==='mini')fishClick()}if(e.code==='KeyB')selectSlot('hammer');if(e.code==='KeyC'){setCam((settings.cam|0)+1);audio.play('click')}if(e.code==='KeyI')openInventory();
  const n=['Digit1','Digit2','Digit3','Digit4','Digit5','Digit6'].indexOf(e.code);if(n>=0)selectSlot(['hook','rod','hammer','seeds','eat','drink'][n])});
addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',()=>keys.clear());
document.addEventListener('visibilitychange',()=>{if(document.hidden)saveGame()});addEventListener('beforeunload',saveGame);
// joystick
{const j=$('#joy'),k=$('#joyKnob');let id=null;j.addEventListener('pointerdown',e=>{id=e.pointerId;j.setPointerCapture(id);mv(e)});j.addEventListener('pointermove',e=>{if(e.pointerId===id)mv(e)});const end=()=>{id=null;joy.x=joy.y=0;k.style.transform=''};j.addEventListener('pointerup',end);j.addEventListener('pointercancel',end);
 function mv(e){const r=j.getBoundingClientRect(),dx=(e.clientX-r.left-r.width/2)/(r.width/2),dy=(e.clientY-r.top-r.height/2)/(r.height/2),l=Math.max(1,Math.hypot(dx,dy));joy.x=dx/l;joy.y=dy/l;k.style.transform=`translate(${joy.x*34}px,${joy.y*34}px)`}
 $('#mobUse').onclick=()=>{if(fish.st==='bite'||fish.st==='mini')fishClick();else interact()}}
$('#mainMenu').addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(!b)return;audio.init();audio.play('click');const a=b.dataset.act;
  if(a==='continue'){const s=hasSave();if(s)startGame(s,false)}if(a==='new')openNewWorld();if(a==='settings')openSettings();if(a==='howto')openHowto()});
$('#mainMenu').addEventListener('pointerover',e=>{if(e.target.closest('.mbtn'))audio.play('hover')});
// ================= loop =================
const autoQ={t:0,frames:0,acc:0,cool:0,lock:settings.quality!=='auto'};let fpsT=0,fpsN=0,markT=0,sigT=0,qT=0,saveT=0;const sigs=new Map();
let last=performance.now();
function frame(now){requestAnimationFrame(frame);const rdt=Math.min(0.1,(now-last)/1000);last=now;const dt=Math.min(rdt,0.05);
  fpsN++;fpsT+=rdt;if(fpsT>0.5){const f=fpsN/fpsT;if(settings.fps)$('#fps').textContent=`${f.toFixed(0)} FPS · ${qLevel}`;
    if(!autoQ.lock){autoQ.t+=fpsT;autoQ.acc+=f;autoQ.frames++;if(autoQ.t>3){const avg=autoQ.acc/autoQ.frames;const order=['low','medium','high','ultra'];const i=order.indexOf(qLevel);if(autoQ.cool>0)autoQ.cool-=autoQ.t;else if(avg<40&&i>0){applyQuality(order[i-1]);autoQ.cool=8}else if(avg>58&&i<2){applyQuality(order[i+1]);autoQ.cool=12}autoQ.t=0;autoQ.acc=0;autoQ.frames=0}}fpsN=0;fpsT=0}
  const playing=mode==='play'&&!curModal;
  waveState.time+=dt;timeU.value=waveState.time;
  if(playing){updateTime(dt);st.play+=dt}else if(mode==='title'){st.clock=1.42+Math.sin(now*0.00002)*0.02}
  const raining=st.weather.type==='rain'&&mode==='play';env.rainK=damp(env.rainK,raining?1:0,0.4,dt);waveState.amp=1+env.rainK*0.7;ocean.u.uWaveAmp.value=waveState.amp;ocean.u.uTime.value=waveState.time;
  const h=waveHeight(0,0),[gx,gz]=waveGrad(0,0);raft.group.position.y=h*0.55-0.03;raft.group.rotation.set(gz*0.18,0,-gx*0.18);
  if(playing){updateSurvival(dt);simBuildings(dt,raining);updateDebris(dt);updateHook(dt);updateBoat(dt);
    sigT+=dt;if(sigT>0.3){sigT=0;for(const b of raft.bmap.values()){const s=bSig(b);if(sigs.get(b.data.id)!==s){sigs.set(b.data.id,s);raft.refreshVisual(b)}}}
    qT+=dt;if(qT>0.5){qT=0;checkQuest();if(buildOn)renderBuildbar()}saveT+=dt;if(saveT>20){saveT=0;saveGame()}}
  else if(mode==='title'){updateDebris(dt*0.5)}
  updateShark(playing||mode==='title'?dt:0);updatePlayer(dt);raft.house.update(dt,pl.x,pl.z,pl.l===1&&mode==='play');updateCat(dt);updateCrab(playing?dt:0,now);updateAmbient(dt);updateFish(dt);parts.update(dt);viewModel.update(dt,pl.tool,pl.speed,PA.action,fish.st!=='none',mode==='play'&&!!CAMS[settings.cam|0].fp&&!curModal);
  if(mode==='title'&&fish.st==='none'){PA.hold='rod';bobber.visible=true;fishLine.visible=true;const bx=3.2,bz=6.5;bobber.position.set(bx,waveHeight(bx,bz),bz);const tip=equippedTip('rod'),a=lineGeo.attributes.position;for(let i=0;i<=20;i++){const k=i/20;a.setXYZ(i,lerp(tip.x,bx,k),lerp(tip.y,bobber.position.y,k)-Math.sin(k*Math.PI)*0.5,lerp(tip.z,bz,k))}a.needsUpdate=true}
  // lanterns & night lights
  const nl=env.night;MAT.lamp.emissiveIntensity=0.4+nl*3;MAT.glass.emissiveIntensity=nl*1.6;lampLight.intensity=nl*9;winLight.intensity=nl*4;for(const g of glows)g.material.opacity=nl*0.9;
  for(const b of raft.bmap.values())if(b.data.type==='sprinkler'){const P2=b.obj.parts,s=b.data.s||{};P2.head.rotation.y+=dt*((s.w||0)>=1?4:0.5)}else if(b.data.type==='buoy'){const P2=b.obj.parts;P2.bob.position.y=-0.3+Math.sin(now*0.002+b.data.id)*0.06;P2.bob.rotation.z=Math.sin(now*0.0013)*0.08}else if(b.data.type==='winch'){b.obj.parts.drum.rotation.x+=dt*0.8}else if(b.data.type==='smoker'){const s=b.data.s||{},P2=b.obj.parts;const on=(s.q|0)>0;P2.fire.material.emissiveIntensity=on?1.6+Math.sin(now*0.011)*0.5:0;if(on&&Math.random()<dt*1.2){const w=b.obj.group.localToWorld(new THREE.Vector3(0.16,1.32,0));parts.emit({x:w.x,y:w.y,z:w.z,count:1,spread:0.04,vel:[0.2,0.6,0],vr:0.1,life:2.2,size:[0.08,0.22],color:'#cfd3d6',alpha:0.3,gravity:0.25,drag:0.3})}}
  else if(b.data.type==='grill'||b.data.type==='purifier'){const s=b.data.s||{},P2=b.obj.parts;if(P2.coals)P2.coals.material.emissiveIntensity=s.fish&&s.t<1?1.5+Math.sin(now*0.01)*0.4:0;if(P2.fire)P2.fire.material.emissiveIntensity=s.b?2+Math.sin(now*0.013)*0.6:0}
  // camera: focal zoom changes projection, not just follow distance.
  const wantedFov=cam.baseFov/cam.zoom;if(Math.abs(camera.fov-wantedFov)>.005){camera.fov=damp(camera.fov,wantedFov,12,rdt);camera.updateProjectionMatrix();parts.u.uScale.value=pix.sceneHeight()/(2*Math.tan(camera.fov*Math.PI/360))}
  const pw=playerWorld();
  if(mode==='title'){cam.yaw+=dt*0.035;const tx=0.4,ty=1.6,tz=0.6,r=17,pp=0.2;camera.position.set(tx+Math.sin(cam.yaw)*Math.cos(pp)*r,ty+Math.sin(pp)*r,tz+Math.cos(cam.yaw)*Math.cos(pp)*r);camera.lookAt(tx-Math.cos(cam.yaw)*3.5,ty+1.4,tz+Math.sin(cam.yaw)*3.5)}
  else{cam.yaw=damp(cam.yaw,cam.tyaw,14,rdt);cam.pitch=damp(cam.pitch,cam.tpitch,14,rdt);cam.dist=damp(cam.dist,cam.tdist,8,rdt);cam.tx=damp(cam.tx,pw.x,10,rdt);cam.ty=damp(cam.ty,pw.y,6,rdt);cam.tz=damp(cam.tz,pw.z,10,rdt);
    const fpm=CAMS[settings.cam|0].fp;P.root.visible=!fpm;if(fpm){cam.bob+=dt*pl.speed*2.2;const bob=pl.speed>.2?Math.sin(cam.bob*2.4)*.018*Math.min(1,pl.speed/3):0,hy=cam.ty+1.55+bob,lp=cam.pitch;camera.position.set(cam.tx,hy,cam.tz);camera.lookAt(cam.tx-Math.sin(cam.yaw)*Math.cos(lp),hy-Math.sin(lp),cam.tz-Math.cos(cam.yaw)*Math.cos(lp))}else{
    const cy=cam.ty+1.25;camera.position.set(cam.tx+Math.sin(cam.yaw)*Math.cos(cam.pitch)*cam.dist,Math.max(0.6,cy+Math.sin(cam.pitch)*cam.dist),cam.tz+Math.cos(cam.yaw)*Math.cos(cam.pitch)*cam.dist);camera.lookAt(cam.tx,cy,cam.tz)}}
  camera.updateMatrixWorld();
  // interactions/hud
  if(playing){curAct=gatherActions();const pr=$('#prompt');if(curAct){const html=`<kbd>${isTouch?'Tap':'E'}</kbd><i>${ic(curAct.i)}</i><span>${curAct.l}</span>`;if(pr.dataset.h!==html){pr.dataset.h=html;pr.innerHTML=html}pr.className='on'+(curAct.off?' off':'')}else pr.className='';
    updateGhost();
    if(pl.tool==='hook'&&!buildOn&&mouse.inside&&!drag){hoverD=pickDebris();const tt=$('#tooltip');if(hoverD){hoverRing.visible=true;hoverRing.position.set(hoverD.x,waveHeight(hoverD.x,hoverD.z)+0.05,hoverD.z);const s=1+Math.sin(now*0.006)*0.08;hoverRing.scale.setScalar(s);const pw2=playerWorld(),dd=Math.hypot(pw2.x-hoverD.x,pw2.z-hoverD.z),ok=dd<=hookRange();hoverRing.material.color.set(ok?'#ffffff':'#ff8a8a');
      tt.innerHTML=`${DEBRIS[hoverD.type].name}<small>${ok?'Click to hook':`Too far · ${dd.toFixed(0)} m / ${hookRange()} m`}</small>`;tt.style.left=mouse.x+'px';tt.style.top=mouse.y+'px';tt.classList.add('on');canvas.style.cursor='pointer'}else{hoverRing.visible=false;tt.classList.remove('on');canvas.style.cursor=''}}
    else{hoverRing.visible=false;$('#tooltip').classList.remove('on');canvas.style.cursor=buildOn?'crosshair':''}
    hudT+=rdt;if(hudT>0.12||hudDirty){hudT=0;hudDirty=false;updateHUD()}}
  markT+=rdt;if(markT>0.033){markT=0;updateMarkers()}
  // environment & render
  const ld=applySky(st.clock%1,env.rainK,dt);rain.intensity=env.rainK;rain.update(dt,camera);audio.update(dt,{rain:env.rainK,night:env.night,storm:env.rainK});
  sky.update(dt,camera);placeSun(ld,pw.x,pw.z,Math.min(24,raft.bounds()+4));
  renderer.shadowMap.needsUpdate=true;pix.u.uNight.value=env.night;ocean.renderReflection(renderer,scene,camera);pix.render(scene,camera);
}
// ================= boot =================
buildHUD();applyState();PA.hold='rod';pl.x=1.5;pl.z=2.6;pl.face=0.6;
audio.vol={master:settings.master,music:settings.music,sfx:settings.sfx};$('#fps').hidden=!settings.fps;
setLoad(90,'Setting the sun…');
renderer.compile(scene,camera);
requestAnimationFrame(t=>{last=t;frame(t);setLoad(100,'Ready');setTimeout(()=>{$('#loading').classList.add('done');$('#title').hidden=false;refreshTitle()},350)});
window.__dw={throwHook,startCast,fishClick,eat,drink,give,openInventory,openHouseUpgrades,openPause,closeModal,sleep,updateGhost,renderer,settings,viewModel,get fishSt(){return fish.st},build:(type,i,j)=>{bsel=type;ghostCell=[i,j];if(type==='foundation')ghostCell.ok=raft.canFoundation(i,j)&&has(BP[type].cost);else{ghostCell.ok=raft.has(i,j)&&!raft.occupied(i,j)&&has(BP[type].cost)&&(!BP[type].edge||!!raft.edgeDir(i,j))}placeBuild()},get st(){return st},get mode(){return mode},pl,fish,sh,boatS,raft,debris,camera,cam,startGame,freshState,openShop,applyQuality,selectSlot,interact,get act(){return curAct},get keys(){return[...keys]},get modal(){return!!curModal}};
