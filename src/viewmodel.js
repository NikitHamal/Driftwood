import * as THREE from '../three.module.js';
import { MAT } from './models.js';
import { M, box, cyl, cap, mesh, damp } from './util.js';

export class ViewModel{
  constructor(camera){
    this.root=new THREE.Group();this.root.position.set(0,0,0);camera.add(this.root);this.tools={};this.t=0;this.kick=0;
    const skin=M('#d8a37e',.72),sleeve=M('#315f70',.88),metal=MAT.metal;
    const arm=(parent,x,y,z)=>{const a=new THREE.Group();const sl=cap(.065,.2,sleeve,0,-.1,0,a);sl.rotation.z=-.18;const hand=cap(.047,.09,skin,-.035,-.32,0,a);hand.rotation.z=-.18;a.position.set(x,y,z);parent.add(a);return a};
    const rod=this.tools.rod=new THREE.Group();const pole=cyl(.009,.018,1.65,MAT.darkWood,0,.45,0,rod,8);pole.rotation.z=-.28;const grip=cyl(.025,.029,.32,M('#45372a',.95),-.13,-.23,0,rod,10);grip.rotation.z=-.28;const reel=cyl(.055,.055,.045,metal,-.08,-.06,.035,rod,14);reel.rotation.x=Math.PI/2;box(.02,.09,.02,metal,-.02,-.09,.05,rod);arm(rod,.03,-.38,.02);rod.position.set(.38,-.27,-.72);rod.rotation.set(-.12,0,.06);this.root.add(rod);
    const hook=this.tools.hook=new THREE.Group();for(let i=0;i<4;i++){const coil=mesh(new THREE.TorusGeometry(.075-i*.007,.014,7,20),MAT.rope,0,i*.018,0,hook);coil.rotation.x=Math.PI/2}const hk=mesh(new THREE.TorusGeometry(.07,.015,7,18,Math.PI*1.45),metal,.03,-.09,.04,hook);hk.rotation.z=.4;arm(hook,-.02,-.29,0);hook.position.set(.32,-.28,-.6);hook.rotation.z=-.18;this.root.add(hook);
    const hammer=this.tools.hammer=new THREE.Group();const handle=cyl(.018,.023,.48,MAT.darkWood,0,.04,0,hammer,8);handle.rotation.z=-.3;const head=box(.25,.085,.09,metal,-.075,.27,0,hammer);head.rotation.z=-.3;const claw=mesh(new THREE.TorusGeometry(.065,.018,6,12,Math.PI*.8),metal,-.16,.3,0,hammer);claw.rotation.z=2.1;arm(hammer,.06,-.25,0);hammer.position.set(.36,-.26,-.58);this.root.add(hammer);
    const seeds=this.tools.seeds=new THREE.Group();const pouch=mesh(new THREE.SphereGeometry(.13,16,12),M('#8b6b45',.95),0,-.04,0,seeds);pouch.scale.set(1,.85,.6);cyl(.07,.1,.08,MAT.darkWood,0,.07,0,seeds,12);arm(seeds,.02,-.31,0);seeds.position.set(.34,-.26,-.56);this.root.add(seeds);
    this.root.traverse(o=>{if(o.isMesh){o.layers.set(1);o.castShadow=false;o.receiveShadow=false;o.renderOrder=4}});this.root.visible=false;
  }
  update(dt,tool,speed,action,fishing,visible){this.root.visible=visible;if(!visible)return;this.t+=dt;for(const k in this.tools)this.tools[k].visible=k===tool||(k==='rod'&&fishing);
    this.kick=damp(this.kick,action?1:0,action?18:8,dt);const bob=Math.min(1,speed/3.3),s=Math.sin(this.t*8)*.008*bob,c=Math.cos(this.t*4)*.006;
    this.root.position.set(s,-Math.abs(c)*bob-.012*this.kick,-.02*this.kick);this.root.rotation.set(c*.3+this.kick*.07,s*.5,-s*.6-this.kick*.08);
  }
}
