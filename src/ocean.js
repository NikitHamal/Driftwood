import * as THREE from '../three.module.js';
import { waveUniforms, WAVE_GLSL } from './waves.js';
const NOISE=`vec2 hash2(vec2 p){p=vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3)));return -1.+2.*fract(sin(p)*43758.5453123);}
float gnoise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);return mix(mix(dot(hash2(i),f),dot(hash2(i+vec2(1,0)),f-vec2(1,0)),u.x),mix(dot(hash2(i+vec2(0,1)),f-vec2(0,1)),dot(hash2(i+vec2(1,1)),f-vec2(1,1)),u.x),u.y);}`;
function oceanGeo(){
  const radii=[];for(let i=1;i<=70;i++)radii.push(i*0.45);let r=radii[radii.length-1];while(r<2800){r*=1.055;radii.push(r)}
  const SEG=256,pos=[0,0,0],idx=[];
  for(let i=0;i<radii.length;i++)for(let j=0;j<SEG;j++){const a=j/SEG*Math.PI*2;pos.push(Math.cos(a)*radii[i],0,Math.sin(a)*radii[i])}
  for(let j=0;j<SEG;j++)idx.push(0,1+(j+1)%SEG,1+j);
  for(let i=0;i<radii.length-1;i++)for(let j=0;j<SEG;j++){const a=1+i*SEG+j,b=1+i*SEG+(j+1)%SEG,c=a+SEG,d=b+SEG;idx.push(a,b,c,b,d,c)}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);
  g.boundingSphere=new THREE.Sphere(new THREE.Vector3(),3000);return g;
}
export class Ocean{
  constructor(scene){
    this.u={...waveUniforms(),uTime:{value:0},uWaveAmp:{value:1},
      uNear:{value:new THREE.Color('#1aa6b8')},uFar:{value:new THREE.Color('#0f8ea6')},uHorizon:{value:new THREE.Color('#9fdbe0')},uZenith:{value:new THREE.Color('#1c9fd0')},
      uSunDir:{value:new THREE.Vector3(0.3,0.8,0.2)},uSunColor:{value:new THREE.Color(1,1,1)},uLum:{value:1},
      tRefl:{value:null},uTexMat:{value:new THREE.Matrix4()},uUseRefl:{value:0},uReflTexel:{value:new THREE.Vector2(0.002,0.002)},
      tFoam:{value:null},uFoamRect:{value:new THREE.Vector3(-40,-40,80)},uFogNear:{value:120},uFogFar:{value:1400},uStreak:{value:1}};
    this.mat=new THREE.ShaderMaterial({uniforms:this.u,
      vertexShader:WAVE_GLSL+`uniform mat4 uTexMat;varying vec3 vW;varying vec4 vR;varying float vH;
      void main(){vec3 p=(modelMatrix*vec4(position,1.)).xyz;float d=length(p.xz-cameraPosition.xz);vec2 g;float h=waveH(p.xz,g)*(1.-smoothstep(120.,600.,d));p.y+=h;vH=h;vW=p;vR=uTexMat*vec4(p.x,0.,p.z,1.);gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);}`,
      fragmentShader:WAVE_GLSL+NOISE+`uniform vec3 uNear,uFar,uHorizon,uZenith,uSunDir,uSunColor;uniform float uLum,uUseRefl,uFogNear,uFogFar,uStreak;uniform sampler2D tRefl,tFoam;uniform vec2 uReflTexel;uniform vec3 uFoamRect;
      varying vec3 vW;varying vec4 vR;varying float vH;
      void main(){
        float dist=length(vW.xz-cameraPosition.xz);float fade=1.-smoothstep(40.,260.,dist);
        vec2 g;waveH(vW.xz,g);g*=(1.-smoothstep(120.,600.,dist));
        vec2 q=vW.xz;float t=uTime;
        float n1=gnoise(q*0.55+vec2(t*0.18,t*0.11)),n2=gnoise(q*1.3-vec2(t*0.25,-t*0.2)),n3=gnoise(q*0.21+vec2(-t*0.05,t*0.07));
        vec2 det=vec2(n1+n2*0.5,gnoise(q*0.55+vec2(5.2,1.3)+t*0.15)+gnoise(q*1.3+vec2(3.1,7.7)-t*0.22)*0.5)*0.16*fade+vec2(n3)*0.05;
        vec3 N=normalize(vec3(-g.x-det.x,1.,-g.y-det.y));
        vec3 V=normalize(cameraPosition-vW);float NdV=max(dot(N,V),0.);
        float fres=0.03+0.97*pow(1.-NdV,5.);fres=clamp(fres*1.25+0.22,0.,1.);
        vec3 base=mix(uFar,uNear,smoothstep(0.15,0.9,NdV));
        base+=uNear*0.35*smoothstep(-0.02,0.12,vH)*fade;
        base*=0.92+0.16*n3;
        vec3 R=reflect(-V,N);
        vec3 sky=mix(uHorizon,uZenith,smoothstep(0.,0.6,R.y));
        vec3 refl=sky;
        if(uUseRefl>0.5){vec2 uv=vR.xy/vR.w+N.xz*0.035;vec2 o=uReflTexel*2.2;
          vec4 c=texture2D(tRefl,uv)*0.36+texture2D(tRefl,uv+vec2(o.x,o.y))*0.16+texture2D(tRefl,uv-vec2(o.x,o.y))*0.16+texture2D(tRefl,uv+vec2(o.x,-o.y))*0.16+texture2D(tRefl,uv+vec2(-o.x,o.y))*0.16;
          refl=mix(sky,c.rgb,c.a>0.?1.:0.);}
        vec3 col=mix(base,refl,fres*0.92);
        vec3 H=normalize(uSunDir+V);float sp=pow(max(dot(N,H),0.),420.)*2.4+pow(max(dot(N,H),0.),60.)*0.08;
        col+=uSunColor*sp*smoothstep(-0.05,0.1,uSunDir.y);
        // stylised wind streaks
        float s=gnoise(vec2(q.x*0.22-t*0.35,q.y*1.9+t*0.08)+n1*0.6);
        float mask=smoothstep(0.05,0.45,gnoise(q*0.045+t*0.01)+0.2);
        float streak=smoothstep(0.38,0.5,s)*mask*(1.-smoothstep(18.,90.,dist))*uStreak;
        col=mix(col,vec3(0.93,0.98,1.)*uLum,streak*0.55);
        // foam around raft
        vec2 fuv=(vW.xz-uFoamRect.xy)/uFoamRect.z;float m=texture2D(tFoam,fuv).r;
        float fn=gnoise(q*2.4+t*0.7)*0.5+0.5;
        float ring=smoothstep(0.04,0.22,m)*(1.-smoothstep(0.45,0.8,m));
        float fn2=gnoise(q*5.5-t*0.9)*0.5+0.5;
        float cells=gnoise(q*7.5+vec2(t*0.3,-t*0.2))*0.5+0.5;float foam=smoothstep(0.5,0.62,ring*(0.3+fn*0.6+fn2*0.3))*smoothstep(0.52,0.6,cells);
        col*=1.-smoothstep(0.5,1.,m)*0.4;
        col=mix(col,vec3(0.95,0.99,1.)*uLum,foam*0.8);
        float f=smoothstep(uFogNear,uFogFar,dist);col=mix(col,uHorizon,f);
        gl_FragColor=vec4(col,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`});
    this.mesh=new THREE.Mesh(oceanGeo(),this.mat);this.mesh.receiveShadow=false;
    scene.add(this.mesh);
    // foam mask canvas
    this.fc=document.createElement('canvas');this.fc.width=this.fc.height=256;
    this.u.tFoam.value=new THREE.CanvasTexture(this.fc);this.u.tFoam.value.flipY=false;
    // reflection
    this.rt=null;this.vcam=new THREE.PerspectiveCamera();this.vcam.layers.set(0);this.scale=0.5;
  }
  setFoam(tiles,T){
    const g=this.fc.getContext('2d'),S=256,size=this.u.uFoamRect.value.z,px=S/size;
    const [tc,tg]=[document.createElement('canvas'),null];tc.width=tc.height=S;const t2=tc.getContext('2d');
    t2.fillStyle='#000';t2.fillRect(0,0,S,S);t2.fillStyle='#fff';
    for(const [i,j] of tiles){const x=(i*T-T/2+40)*px,z=(j*T-T/2+40)*px;t2.fillRect(x-1,z-1,T*px+2,T*px+2)}
    g.filter='blur(1.1px)';g.fillStyle='#000';g.fillRect(0,0,S,S);g.drawImage(tc,0,0);g.filter='none';
    this.u.tFoam.value.needsUpdate=true;
  }
  setReflection(renderer,scale){
    this.scale=scale;if(this.rt){this.rt.dispose();this.rt=null}
    if(scale>0){const s=this.sizeFn?this.sizeFn():renderer.getDrawingBufferSize(new THREE.Vector2());this.rt=new THREE.WebGLRenderTarget(Math.max(64,s.x*scale|0),Math.max(64,s.y*scale|0),{type:THREE.HalfFloatType});this.u.tRefl.value=this.rt.texture;this.u.uReflTexel.value.set(1/this.rt.width,1/this.rt.height)}
    this.u.uUseRefl.value=scale>0?1:0;
  }
  resize(renderer){if(this.rt)this.setReflection(renderer,this.scale)}
  renderReflection(renderer,scene,camera){
    this.mesh.position.set(camera.position.x,0,camera.position.z);
    if(!this.rt)return;
    const n=new THREE.Vector3(0,1,0),cp=camera.position,vc=this.vcam;
    if(cp.y<0.05)return;
    const rot=new THREE.Matrix4().extractRotation(camera.matrixWorld);
    const view=new THREE.Vector3(cp.x,-cp.y,cp.z);
    const look=new THREE.Vector3(0,0,-1).applyMatrix4(rot).add(cp);look.y=-look.y;
    vc.position.copy(view);vc.up.set(0,1,0).applyMatrix4(rot);vc.up.y=-vc.up.y;vc.lookAt(look);
    vc.far=camera.far;vc.near=camera.near;vc.updateMatrixWorld();vc.projectionMatrix.copy(camera.projectionMatrix);
    const tm=this.u.uTexMat.value;tm.set(0.5,0,0,0.5,0,0.5,0,0.5,0,0,0.5,0.5,0,0,0,1);tm.multiply(vc.projectionMatrix).multiply(vc.matrixWorldInverse);
    const plane=new THREE.Plane().setFromNormalAndCoplanarPoint(n,new THREE.Vector3(0,0,0));plane.applyMatrix4(vc.matrixWorldInverse);
    const clip=new THREE.Vector4(plane.normal.x,plane.normal.y,plane.normal.z,plane.constant),pm=vc.projectionMatrix,q=new THREE.Vector4();
    q.x=(Math.sign(clip.x)+pm.elements[8])/pm.elements[0];q.y=(Math.sign(clip.y)+pm.elements[9])/pm.elements[5];q.z=-1;q.w=(1+pm.elements[10])/pm.elements[14];
    clip.multiplyScalar(2/clip.dot(q));pm.elements[2]=clip.x;pm.elements[6]=clip.y;pm.elements[10]=clip.z+1-0.003;pm.elements[14]=clip.w;
    this.mesh.visible=false;const old=renderer.getRenderTarget();
    renderer.setRenderTarget(this.rt);renderer.setClearColor(0x000000,0);renderer.clear();renderer.render(scene,vc);
    renderer.setRenderTarget(old);this.mesh.visible=true;
  }
}
