import * as THREE from '../three.module.js';
import { cloudTex } from './textures.js';
export class Sky{
  constructor(scene){
    this.u={uZenith:{value:new THREE.Color()},uHorizon:{value:new THREE.Color()},uHaze:{value:new THREE.Color()},uSunDir:{value:new THREE.Vector3(0,1,0)},uMoonDir:{value:new THREE.Vector3(0,-1,0)},uSunColor:{value:new THREE.Color(1,1,1)},uSunVis:{value:1},uStars:{value:0},uTime:{value:0}};
    const mat=new THREE.ShaderMaterial({uniforms:this.u,side:THREE.BackSide,depthWrite:false,fog:false,
      vertexShader:`varying vec3 vDir;void main(){vDir=position;vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_Position=p.xyww;}`,
      fragmentShader:`uniform vec3 uZenith,uHorizon,uHaze,uSunDir,uMoonDir,uSunColor;uniform float uSunVis,uStars,uTime;varying vec3 vDir;
      float hash(vec3 p){p=fract(p*0.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
      void main(){vec3 d=normalize(vDir);float y=d.y;
        vec3 col=mix(uHorizon,uZenith,smoothstep(0.,1.,pow(clamp(y,0.,1.),0.5)));
        col=mix(col,uHaze,exp(-max(y,0.)*14.)*0.85);
        if(y<0.)col=uHaze;
        float sd=max(dot(d,uSunDir),0.);
        col+=uSunColor*(smoothstep(0.9993,0.9997,sd)*8.+pow(sd,80.)*0.5+pow(sd,8.)*0.18)*uSunVis;
        if(uStars>0.01&&y>0.){vec3 p=d*260.;vec3 c=floor(p);float h=hash(c);if(h>0.985){vec3 f=fract(p)-0.5;float s=1.-smoothstep(0.,0.18,length(f));col+=vec3(s)*uStars*(0.55+0.45*sin(uTime*2.+h*90.))*smoothstep(0.,0.25,y);}
          float md=max(dot(d,uMoonDir),0.);col+=vec3(0.95,0.97,1.)*smoothstep(0.9990,0.9994,md)*uStars*2.+vec3(0.4,0.5,0.8)*pow(md,30.)*uStars*0.25;}
        gl_FragColor=vec4(col,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`});
    this.mesh=new THREE.Mesh(new THREE.SphereGeometry(3000,32,16),mat);
    this.mesh.frustumCulled=false;this.mesh.renderOrder=-10;
    this.mesh.onBeforeRender=(r,s,cam)=>{this.mesh.position.copy(cam.position);this.mesh.updateMatrixWorld()};
    scene.add(this.mesh);
    // clouds
    this.clouds=new THREE.Group();scene.add(this.clouds);
    const texs=[1,2,3,4,5,6].map(s=>cloudTex(s*13+7));
    this.cloudMats=[];
    let rand=(()=>{let a=42;return()=>{a=(a*16807)%2147483647;return a/2147483647}})();
    for(let i=0;i<30;i++){
      const m=new THREE.SpriteMaterial({map:texs[i%texs.length],transparent:true,depthWrite:false,fog:false,color:0xffffff});
      this.cloudMats.push(m);
      const s=new THREE.Sprite(m);
      const ang=rand()*Math.PI*2,low=i>=22,dist=low?1500+rand()*400:600+rand()*700;
      const w=low?380+rand()*260:260+rand()*330;
      s.position.set(Math.cos(ang)*dist,low?30+rand()*25:70+rand()*170,Math.sin(ang)*dist);
      s.scale.set(w,w*0.5,1);s.renderOrder=-5;
      this.clouds.add(s);
    }
  }
  update(dt,cam){this.clouds.rotation.y+=dt*0.0025;this.clouds.position.set(cam.position.x,0,cam.position.z);}
}
