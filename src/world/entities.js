import * as THREE from '../../vendor/three.module.js';
import { MAT } from './models.js';
import { HumanAnim, makeBoat, makeCat, makeGull, makeHuman, makeShark } from './characters.js';
import { sailTex } from '../render/textures.js';
import { setLoad } from '../ui/dom.js';
import { raft, scene } from '../render/stage.js';

export const P = makeHuman();
raft.group.add(P.root);
export const PA = new HumanAnim(P);
export const cat = makeCat();
raft.group.add(cat.root);
export const gulls = [0, 1, 2, 3].map((i) => {
  const g = makeGull();
  scene.add(g.root);
  return { R: g, ang: i * 1.7, r: 12 + i * 3, h: 9 + i * 1.6, spd: 0.18 + i * 0.03, ph: i };
});
export const shark = makeShark();
scene.add(shark.root);
export const boat = makeBoat(sailTex());
scene.add(boat.group);
boat.group.visible = false;
export const trader = makeHuman({
  shirt: '#f4e7c8',
  shirt2: '#8a3b2a',
  pants: '#4b3a2a',
  hair: '#cfc6b8',
  beard: true,
  hat: false,
  bandana: '#2f6e9a',
  skin: '#d49a72',
  pantsLong: true,
});
trader.root.position.set(0, 0.1, -0.25);
trader.root.rotation.y = Math.PI / 2;
boat.hull.add(trader.root);
trader.lHip.rotation.x = trader.rHip.rotation.x = -1.45;
trader.lKn.rotation.x = trader.rKn.rotation.x = 1.5;

// ---- fishing line, bobber, hook, hover ring, jumping fish, build ghost ----
export const lineGeo = new THREE.BufferGeometry();
lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(21 * 3), 3));
export const fishLine = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0xf5f1e6, transparent: true, opacity: 0.8 }));
fishLine.frustumCulled = false;
fishLine.layers.set(1);
scene.add(fishLine);
fishLine.visible = false;
export const bobber = new THREE.Group();
{
  const a = new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), MAT.red);
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), MAT.white);
  bobber.add(a, b);
}
scene.add(bobber);
bobber.visible = false;
export const hookObj = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.02, 8, 14, Math.PI * 1.4), MAT.metal);
scene.add(hookObj);
hookObj.visible = false;
export const hoverRing = new THREE.Mesh(
  new THREE.RingGeometry(1.0, 1.12, 64),
  new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false }),
);
hoverRing.rotation.x = -Math.PI / 2;
hoverRing.layers.set(1);
scene.add(hoverRing);
hoverRing.visible = false;
export const jumpFish = new THREE.Group();
{
  const mat = new THREE.MeshStandardMaterial({ color: '#a9c3cf', metalness: 0.6, roughness: 0.25 });
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 10), mat);
  b.scale.set(0.6, 0.8, 2);
  const t = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.15, 3), mat);
  t.rotation.x = -Math.PI / 2;
  t.position.z = -0.28;
  t.scale.set(0.3, 1, 1);
  jumpFish.add(b, t);
}
scene.add(jumpFish);
jumpFish.visible = false;
export const ghost = new THREE.Group();
raft.group.add(ghost);
export const ghostMat = new THREE.MeshBasicMaterial({ color: 0x7bd88f, transparent: true, opacity: 0.45, depthWrite: false });
setLoad(65, 'Teaching the seagulls to fly…');
