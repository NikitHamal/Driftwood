// 3D pixel-art post pipeline: renders the scene into a low-resolution HDR target,
// then upscales with nearest sampling, depth outlines, edge highlights, palette quantization and ordered dithering.
import * as THREE from '../three.module.js';
export class PixelPass{
  constructor(renderer,camera){
    this.r=renderer;this.cam=camera;this.px=3;this.rt=null;this.w=1;this.h=1;
    this.u={tCol:{value:null},tDep:{value:null},uRes:{value:new THREE.Vector2(1,1)},uNear:{value:camera.near},uFar:{value:camera.far},
      uLevels:{value:20},uOutline:{value:1},uNight:{value:0}};
    this.mat=new THREE.ShaderMaterial({uniforms:this.u,depthTest:false,depthWrite:false,
      vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`,
      fragmentShader:`#include <packing>
      uniform sampler2D tCol,tDep;uniform vec2 uRes;uniform float uNear,uFar,uLevels,uOutline,uNight;varying vec2 vUv;
      float ld(vec2 uv){float d=texture2D(tDep,uv).x;return perspectiveDepthToViewZ(d,uNear,uFar)*-1.;}
      float bayer(vec2 p){ivec2 i=ivec2(mod(p,4.));int k=i.x+i.y*4;
        float m[16];m[0]=0.;m[1]=8.;m[2]=2.;m[3]=10.;m[4]=12.;m[5]=4.;m[6]=14.;m[7]=6.;m[8]=3.;m[9]=11.;m[10]=1.;m[11]=9.;m[12]=15.;m[13]=7.;m[14]=13.;m[15]=5.;
        for(int j=0;j<16;j++)if(j==k)return m[j]/16.-0.5;return 0.;}
      void main(){
        vec2 px=floor(vUv*uRes)+0.5;vec2 uv=px/uRes;vec2 t=1./uRes;
        vec3 c=texture2D(tCol,uv).rgb;
        float d=ld(uv);
        if(uOutline>0.5&&d<400.){
          float dl=ld(uv-vec2(t.x,0.)),dr=ld(uv+vec2(t.x,0.)),du=ld(uv+vec2(0.,t.y)),dd=ld(uv-vec2(0.,t.y));
          float th=0.06+d*0.035;
          // outer silhouette: neighbour much farther => this pixel is the object's edge
          float far=step(th,dl-d)+step(th,dr-d)+step(th,du-d)+step(th,dd-d);
          // inner crease highlight: depth discontinuity in the slope (convex edge)
          float lap=(dl+dr+du+dd-4.*d);
          float crease=clamp(-lap/(th*1.2)-0.6,0.,1.)*step(far,0.5);
          float fade=1.-smoothstep(25.,70.,d);
          c=mix(c,c*vec3(0.32,0.30,0.42),min(1.,far)*0.85*fade);
          c+=c*crease*0.35*fade*(1.-uNight*0.6);
        }
        vec3 col=toneMapping(c);
        col=linearToOutputTexel(vec4(col,1.)).rgb;
        // gentle pixel-art grading: richer saturation, lifted shadows toward cool blue
        float l=dot(col,vec3(0.299,0.587,0.114));col=mix(vec3(l),col,1.1);col+=vec3(0.0,0.012,0.03)*(1.-l);
        // ordered dither + palette quantization
        float b=bayer(px);
        col=floor(col*uLevels+0.5+b)/uLevels;
        // soft vignette
        vec2 q=vUv-0.5;col*=1.-dot(q,q)*0.35;
        gl_FragColor=vec4(clamp(col,0.,1.),1.);
      }`});
    this.quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),this.mat);this.quad.frustumCulled=false;
    this.scene=new THREE.Scene();this.scene.add(this.quad);this.ocam=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
  }
  get on(){return this.px>1}
  setSize(){if(this.rt){this.rt.dispose();this.rt.depthTexture.dispose();this.rt=null}
    if(!this.on)return;
    const s=this.r.getDrawingBufferSize(new THREE.Vector2()),k=this.px*Math.max(1,this.r.getPixelRatio());
    this.w=Math.max(160,Math.round(s.x/k));this.h=Math.max(90,Math.round(s.y/k));
    const dt=new THREE.DepthTexture(this.w,this.h);dt.type=THREE.UnsignedIntType;
    this.rt=new THREE.WebGLRenderTarget(this.w,this.h,{type:THREE.HalfFloatType,minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,depthTexture:dt,depthBuffer:true});
    this.u.tCol.value=this.rt.texture;this.u.tDep.value=dt;this.u.uRes.value.set(this.w,this.h);
  }
  // height in pixels of whatever target the scene is rendered into (for point-sprite scaling)
  sceneHeight(){return this.on?this.h:this.r.getDrawingBufferSize(new THREE.Vector2()).y}
  sceneWidth(){return this.on?this.w:this.r.getDrawingBufferSize(new THREE.Vector2()).x}
  render(scene,camera){
    if(!this.on){this.r.setRenderTarget(null);this.r.render(scene,camera);return}
    this.u.uNear.value=camera.near;this.u.uFar.value=camera.far;
    this.r.setRenderTarget(this.rt);this.r.render(scene,camera);this.r.setRenderTarget(null);this.r.render(this.scene,this.ocam);
  }
}
