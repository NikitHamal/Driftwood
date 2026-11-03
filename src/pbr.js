import * as THREE from '../three.module.js';
import { rng, clamp } from './util.js';

function dataTex(data,w,h,srgb=false){
  const t=new THREE.DataTexture(data,w,h,THREE.RGBAFormat,THREE.UnsignedByteType);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.minFilter=THREE.LinearMipmapLinearFilter;t.magFilter=THREE.LinearFilter;t.generateMipmaps=true;t.anisotropy=8;if(srgb)t.colorSpace=THREE.SRGBColorSpace;t.needsUpdate=true;return t;
}
function normalFromHeight(h,w,strength=3){
  const n=new Uint8Array(w*w*4);for(let y=0;y<w;y++)for(let x=0;x<w;x++){const at=(xx,yy)=>h[((yy+w)%w)*w+(xx+w)%w],dx=(at(x+1,y)-at(x-1,y))*strength,dy=(at(x,y+1)-at(x,y-1))*strength,il=1/Math.hypot(dx,dy,1),i=(y*w+x)*4;n[i]=(-dx*il*.5+.5)*255;n[i+1]=(-dy*il*.5+.5)*255;n[i+2]=(il*.5+.5)*255;n[i+3]=255}return n;
}
function finish(color,height,rough,w,strength){
  return{map:dataTex(color,w,w,true),normalMap:dataTex(normalFromHeight(height,w,strength),w,w),roughnessMap:dataTex(rough,w,w)};
}
export function woodSurface(seed=3,size=256){
  const r=rng(seed),N=size*size,col=new Uint8Array(N*4),rough=new Uint8Array(N*4),height=new Float32Array(N),knots=Array.from({length:4},()=>[r(),r(),.025+r()*.04]);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){const u=x/size,v=y/size,i=y*size+x;let knot=0;
    for(const[kx,ky,kr]of knots){const dx=u-kx,dy=(v-ky)*.28,d=Math.hypot(dx,dy);knot+=Math.sin(d/kr*18)*Math.exp(-d*d/(kr*kr*2))*.32}
    const warp=Math.sin(v*13+u*8)*.7+Math.sin(v*39-u*3)*.22,grain=Math.sin(u*145+warp+knot*5),fine=Math.sin(u*510+v*7)*.16;
    const seam=Math.pow(Math.max(0,Math.sin(u*31.415)),70),crack=Math.pow(Math.max(0,Math.sin(u*94+v*2.2)),110)*(.3+.7*Math.sin(v*9)**2);
    const weather=.5+.5*Math.sin(v*5.3+u*7.1)*Math.sin(v*11.7-u*2.4),tone=grain*.055+fine*.025+knot*.09-weather*.045-seam*.18-crack*.2;
    const base=[190+weather*13,173+weather*12,148+weather*12];for(let c=0;c<3;c++)col[i*4+c]=clamp(base[c]*(1+tone),0,255);col[i*4+3]=255;
    height[i]=.54+grain*.055+fine*.018+knot*.1-seam*.22-crack*.25;const ro=clamp(.74+weather*.14+crack*.18-grain*.025,0,1)*255;rough[i*4]=rough[i*4+1]=rough[i*4+2]=ro;rough[i*4+3]=255;}
  return finish(col,height,rough,size,4.2);
}
export function paintedSurface(seed=5,size=512){
  const r=rng(seed),N=size*size,col=new Uint8Array(N*4),rough=new Uint8Array(N*4),height=new Float32Array(N),chips=Array.from({length:70},()=>[r(),r(),.002+r()*.013]);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){const u=x/size,v=y/size,i=y*size+x,bx=(u*9)%1,seam=Math.min(bx,1-bx),grain=Math.sin(v*260+Math.sin(u*19)*3)*.025+Math.sin(v*71+u*12)*.02;let chip=0;
    for(const[cx,cy,cr]of chips){const d=Math.hypot(u-cx,v-cy);if(d<cr)chip=Math.max(chip,1-d/cr)}
    chip=clamp(chip*2+(seam<.018?.65:0),0,1);const fade=.93+.07*Math.sin(u*17+v*9),paint=[64*fade,123*fade,136*fade],wood=[142,116,82];
    for(let c=0;c<3;c++)col[i*4+c]=paint[c]*(1-chip)+wood[c]*chip+grain*255;col[i*4+3]=255;
    height[i]=.58+grain-chip*.2-(seam<.012?.25:0);const ro=clamp(.57+chip*.32+grain,0,1)*255;rough[i*4]=rough[i*4+1]=rough[i*4+2]=ro;rough[i*4+3]=255;}
  return finish(col,height,rough,size,3.2);
}
export function createEnvironment(renderer,scene){
  const c=document.createElement('canvas');c.width=1024;c.height=512;const g=c.getContext('2d'),w=c.width,h=c.height;
  const sky=g.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#527da5');sky.addColorStop(.42,'#b9d0d8');sky.addColorStop(.51,'#d9dbcd');sky.addColorStop(.54,'#527b84');sky.addColorStop(1,'#102f3a');g.fillStyle=sky;g.fillRect(0,0,w,h);
  const sun=g.createRadialGradient(w*.72,h*.29,1,w*.72,h*.29,95);sun.addColorStop(0,'rgba(255,250,222,1)');sun.addColorStop(.04,'rgba(255,235,184,.9)');sun.addColorStop(.3,'rgba(255,215,155,.2)');sun.addColorStop(1,'rgba(255,205,140,0)');g.fillStyle=sun;g.fillRect(0,0,w,h);
  const r=rng(91);g.filter='blur(11px)';for(let i=0;i<34;i++){const x=r()*w,y=h*(.18+r()*.27),rx=25+r()*90,ry=5+r()*16;g.fillStyle=`rgba(238,242,239,${.04+r()*.12})`;g.beginPath();g.ellipse(x,y,rx,ry,0,0,Math.PI*2);g.fill()}g.filter='none';
  const source=new THREE.CanvasTexture(c);source.colorSpace=THREE.SRGBColorSpace;source.mapping=THREE.EquirectangularReflectionMapping;
  const pm=new THREE.PMREMGenerator(renderer);pm.compileEquirectangularShader();const target=pm.fromEquirectangular(source);scene.environment=target.texture;source.dispose();pm.dispose();return target;
}
