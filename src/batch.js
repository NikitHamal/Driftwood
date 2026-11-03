import * as THREE from '../three.module.js';

// Merge compatible opaque static meshes without dropping detail. Dynamic subtrees,
// transparency, shaders and existing instances retain their original render paths.
export function batchStatic(root){
  root.updateWorldMatrix(true,true);const inv=new THREE.Matrix4().copy(root.matrixWorld).invert(),groups=new Map();
  root.traverse(o=>{if(!o.isMesh||o.isInstancedMesh||o.isSkinnedMesh||Array.isArray(o.material)||o.material.transparent||o.material.isShaderMaterial||o.layers.mask!==1)return;
    let p=o;while(p&&p!==root){if(p.userData.dynamic)return;p=p.parent}const key=o.material.uuid+'|'+o.castShadow+'|'+o.receiveShadow;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(o)});
  for(const list of groups.values()){
    if(list.length<3)continue;let count=0;const prepared=[];
    for(const o of list){let g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv,o.matrixWorld));prepared.push([o,g]);count+=g.attributes.position.count}
    const pos=new Float32Array(count*3),nor=new Float32Array(count*3),uv=new Float32Array(count*2),col=new Float32Array(count*3);let at=0;
    for(const[o,g]of prepared){const n=g.attributes.position.count,p=g.attributes.position,no=g.attributes.normal,t=g.attributes.uv,c=g.attributes.color;for(let i=0;i<n;i++){
      pos.set([p.getX(i),p.getY(i),p.getZ(i)],(at+i)*3);if(no)nor.set([no.getX(i),no.getY(i),no.getZ(i)],(at+i)*3);else nor.set([0,1,0],(at+i)*3);
      if(t)uv.set([t.getX(i),t.getY(i)],(at+i)*2);if(c)col.set([c.getX(i),c.getY(i),c.getZ(i)],(at+i)*3);else col.set([1,1,1],(at+i)*3);
    }at+=n;g.dispose();o.removeFromParent()}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('normal',new THREE.BufferAttribute(nor,3));geo.setAttribute('uv',new THREE.BufferAttribute(uv,2));if(list[0].material.vertexColors)geo.setAttribute('color',new THREE.BufferAttribute(col,3));geo.computeBoundingSphere();
    const merged=new THREE.Mesh(geo,list[0].material);merged.castShadow=list[0].castShadow;merged.receiveShadow=list[0].receiveShadow;merged.userData.batched=list.length;root.add(merged);
  }
}
