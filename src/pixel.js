// Unified HDR post pipeline: cinematic full-resolution rendering by default,
// with optional low-resolution pixel-art treatment. One final blit keeps GPU cost bounded.
import * as THREE from '../three.module.js';
export class PixelPass{
  constructor(renderer,camera){
    this.r=renderer;this.cam=camera;this.px=1;this.rt=null;this.w=1;this.h=1;
    this.u={tCol:{value:null},tDep:{value:null},uRes:{value:new THREE.Vector2(1,1)},uNear:{value:camera.near},uFar:{value:camera.far},uLevels:{value:24},uOutline:{value:0},uNight:{value:0},uPixel:{value:0},uAO:{value:1},uBloom:{value:1}};
    this.mat=new THREE.ShaderMaterial({uniforms:this.u,depthTest:false,depthWrite:false,
      vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`,
      fragmentShader:`#include <packing>
      uniform sampler2D tCol,tDep;uniform vec2 uRes;uniform float uNear,uFar,uLevels,uOutline,uNight,uPixel,uAO,uBloom;varying vec2 vUv;
      float ld(vec2 uv){return -perspectiveDepthToViewZ(texture2D(tDep,uv).x,uNear,uFar);}
      float lum(vec3 c){return dot(c,vec3(.299,.587,.114));}
      float bayer(vec2 p){ivec2 i=ivec2(mod(p,4.));int k=i.x+i.y*4;float m[16];m[0]=0.;m[1]=8.;m[2]=2.;m[3]=10.;m[4]=12.;m[5]=4.;m[6]=14.;m[7]=6.;m[8]=3.;m[9]=11.;m[10]=1.;m[11]=9.;m[12]=15.;m[13]=7.;m[14]=13.;m[15]=5.;for(int j=0;j<16;j++)if(j==k)return m[j]/16.-.5;return 0.;}
      vec3 fxaa(vec2 uv,vec2 t){vec3 nw=texture2D(tCol,uv+vec2(-t.x,-t.y)).rgb,ne=texture2D(tCol,uv+vec2(t.x,-t.y)).rgb,sw=texture2D(tCol,uv+vec2(-t.x,t.y)).rgb,se=texture2D(tCol,uv+vec2(t.x,t.y)).rgb,m=texture2D(tCol,uv).rgb;
        float lm=lum(m),ln=lum(nw)+lum(ne)+lum(sw)+lum(se);vec2 d=vec2(-((lum(nw)+lum(ne))-(lum(sw)+lum(se))),((lum(nw)+lum(sw))-(lum(ne)+lum(se))));float red=max(ln*.03125,.0078125);float rcp=1./(min(abs(d.x),abs(d.y))+red);d=clamp(d*rcp,vec2(-6.),vec2(6.))*t;
        vec3 a=.5*(texture2D(tCol,uv+d*(1./3.-.5)).rgb+texture2D(tCol,uv+d*(2./3.-.5)).rgb),b=a*.5+.25*(texture2D(tCol,uv+d*-.5).rgb+texture2D(tCol,uv+d*.5).rgb);float lb=lum(b);return lb<min(lm,ln*.25)||lb>max(lm,ln*.25)?a:b;}
      float occ(vec2 uv,float d,vec2 off){float nd=ld(uv+off);float delta=d-nd;return smoothstep(.025,.32,delta)*(1.-smoothstep(.4,3.,delta));}
      void main(){vec2 t=1./uRes;vec2 px=floor(vUv*uRes)+.5;vec2 uv=uPixel>.5?px/uRes:vUv;vec3 c=uPixel>.5?texture2D(tCol,uv).rgb:fxaa(uv,t);float d=ld(uv);
        if(uPixel<.5&&uAO>.5&&d<65.){float radius=mix(1.4,3.4,clamp(d/35.,0.,1.));vec2 o=t*radius;float a=occ(uv,d,vec2(o.x,0.))+occ(uv,d,vec2(-o.x,0.))+occ(uv,d,vec2(0.,o.y))+occ(uv,d,vec2(0.,-o.y))+occ(uv,d,o)+occ(uv,d,-o)+occ(uv,d,vec2(o.x,-o.y))+occ(uv,d,vec2(-o.x,o.y));c*=1.-a*.027*(1.-smoothstep(25.,65.,d));}
        if(uPixel<.5&&uBloom>.5){vec2 o=t*3.;vec3 b=texture2D(tCol,uv+vec2(o.x,o.y)).rgb+texture2D(tCol,uv+vec2(-o.x,o.y)).rgb+texture2D(tCol,uv+vec2(o.x,-o.y)).rgb+texture2D(tCol,uv+vec2(-o.x,-o.y)).rgb;b*=.25;c+=max(b-vec3(.82),vec3(0.))*.11;}
        if(uOutline>.5&&d<400.){float dl=ld(uv-vec2(t.x,0.)),dr=ld(uv+vec2(t.x,0.)),du=ld(uv+vec2(0.,t.y)),dd=ld(uv-vec2(0.,t.y));float th=.06+d*.035,far=step(th,dl-d)+step(th,dr-d)+step(th,du-d)+step(th,dd-d);float fade=1.-smoothstep(25.,70.,d);c=mix(c,c*vec3(.32,.3,.42),min(1.,far)*.85*fade);}
        vec3 col=toneMapping(c);col=linearToOutputTexel(vec4(col,1.)).rgb;float l=lum(col);col=mix(vec3(l),col,uPixel>.5?1.08:1.035);col+=vec3(.002,.007,.011)*(1.-l)*(1.-uNight*.5);
        if(uPixel>.5){float b=bayer(px);col=floor(col*uLevels+.5+b)/uLevels;}vec2 q=vUv-.5;col*=1.-dot(q,q)*(uPixel>.5?.3:.16);gl_FragColor=vec4(clamp(col,0.,1.),1.);}`});
    this.quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),this.mat);this.quad.frustumCulled=false;this.scene=new THREE.Scene();this.scene.add(this.quad);this.ocam=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
  }
  get on(){return this.px>1}
  setSize(){if(this.rt){this.rt.dispose();if(this.rt.depthTexture)this.rt.depthTexture.dispose();this.rt=null}
    const s=this.r.getDrawingBufferSize(new THREE.Vector2()),k=this.on?this.px*Math.max(1,this.r.getPixelRatio()):1;this.w=Math.max(this.on?160:320,Math.round(s.x/k));this.h=Math.max(this.on?90:180,Math.round(s.y/k));
    const filter=this.on?THREE.NearestFilter:THREE.LinearFilter,dt=new THREE.DepthTexture(this.w,this.h);dt.type=THREE.UnsignedIntType;
    this.rt=new THREE.WebGLRenderTarget(this.w,this.h,{type:THREE.HalfFloatType,minFilter:filter,magFilter:filter,depthTexture:dt,depthBuffer:true});this.u.tCol.value=this.rt.texture;this.u.tDep.value=dt;this.u.uRes.value.set(this.w,this.h);this.u.uPixel.value=this.on?1:0;this.u.uOutline.value=this.on?1:0;
  }
  sceneHeight(){return this.h}
  sceneWidth(){return this.w}
  render(scene,camera){this.u.uNear.value=camera.near;this.u.uFar.value=camera.far;this.r.setRenderTarget(this.rt);this.r.render(scene,camera);this.r.setRenderTarget(null);this.r.render(this.scene,this.ocam)}
}
