// Furniture for the enterable house rooms. Each builder adds meshes to group H (house-local space, y = world height
// above the raft origin), registers walk-blockers (x0,z0,x1,z1) and interaction spots on `ctx`.
import * as THREE from '../../vendor/three.module.js';
import { box, cyl, M, sph } from '../core/util.js';
import { makeLantern, MAT } from './models.js';

const F = {
  quilt: () => M('#2f7f9a', 0.95),
  sheet: () => M('#efe6d2', 0.95),
  pillow: () => M('#f6f1e6', 0.95),
  red: () => M('#b9473a', 0.9),
  paper: () => M('#efe8d4', 0.9),
  ink: () => M('#2a4f86', 0.6),
  iron: () => M('#2b2e31', 0.55, { metalness: 0.7 }),
  brass: () => M('#c49a45', 0.35, { metalness: 0.85 }),
  glassJar: () => M('#9ed0d6', 0.1, { metalness: 0.1, transparent: true, opacity: 0.55 }),
  tile: () => M('#d8d2c4', 0.5),
  cream: () => M('#e6dcc3', 0.8),
  green: () => M('#3f7a4a', 0.9),
  books: ['#a94438', '#2f6e9a', '#c79a3a', '#4f8a5a', '#7a4a8a', '#d9d2c0'],
};
const blocker = (ctx, x0, z0, x1, z1) => ctx.blockers.push([Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1)]);

/** Hanging oil lamp: returns the emissive lantern so it can glow at night. */
function hangingLamp(H, ctx, x, y, z) {
  cyl(0.008, 0.008, 0.35, MAT.metal, x, y + 0.2, z, H, 4);
  const l = makeLantern();
  l.position.set(x, y - 0.1, z);
  l.scale.setScalar(0.9);
  H.add(l);
  ctx.lanterns.push(l);
  ctx.lampSpots.push(new THREE.Vector3(x, y - 0.05, z));
}

export function furnishMain(H, ctx, cy, ry) {
  // --- bed (back-left corner) ---
  const bx = -0.575,
    bz = -0.78;
  box(0.86, 0.26, 1.0, MAT.darkWood, bx, cy + 0.13, bz, H);
  for (const [sx, sz] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ])
    box(0.07, 0.34, 0.07, MAT.darkWood, bx + sx * 0.41, cy + 0.17, bz + sz * 0.48, H);
  box(0.8, 0.12, 0.94, F.sheet(), bx, cy + 0.32, bz, H);
  box(0.82, 0.07, 0.62, F.quilt(), bx, cy + 0.4, bz + 0.17, H);
  box(0.5, 0.09, 0.22, F.pillow(), bx, cy + 0.42, bz - 0.34, H);
  box(0.86, 0.5, 0.06, MAT.darkWood, bx, cy + 0.5, bz - 0.5, H);
  blocker(ctx, bx - 0.44, bz - 0.52, bx + 0.44, bz + 0.52);
  ctx.spots.bed = new THREE.Vector3(bx + 0.55, 0, bz + 0.55);
  // --- drafting / blueprint desk (back wall centre) ---
  const dx = 0.15,
    dz = -1.02;
  box(0.62, 0.05, 0.36, MAT.darkWood, dx, cy + 0.78, dz, H);
  for (const sx of [-1, 1]) box(0.05, 0.78, 0.32, MAT.darkWood, dx + sx * 0.28, cy + 0.39, dz, H);
  const sheet = box(0.5, 0.012, 0.3, F.paper(), dx, cy + 0.81, dz, H);
  sheet.rotation.y = 0.05;
  for (let i = 0; i < 4; i++) box(0.4, 0.004, 0.012, F.ink(), dx, cy + 0.82, dz - 0.1 + i * 0.07, H);
  cyl(0.02, 0.02, 0.09, F.red(), dx + 0.22, cy + 0.86, dz - 0.1, H, 8);
  blocker(ctx, dx - 0.33, dz - 0.2, dx + 0.33, dz + 0.2);
  ctx.spots.desk = new THREE.Vector3(dx, 0, dz + 0.55);
  // --- table + stool (back-right) ---
  box(0.4, 0.04, 0.4, MAT.plank, 0.72, cy + 0.55, -1.0, H);
  for (const [sx, sz] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ])
    box(0.04, 0.55, 0.04, MAT.darkWood, 0.72 + sx * 0.16, cy + 0.27, -1.0 + sz * 0.16, H);
  cyl(0.06, 0.06, 0.1, MAT.terracotta, 0.72, cy + 0.62, -1.0, H, 12);
  sph(0.045, F.green(), 0.72, cy + 0.74, -1.0, H, 8, 6);
  blocker(ctx, 0.5, -1.22, 0.94, -0.78);
  // --- storage chest (front-left) ---
  box(0.46, 0.3, 0.3, MAT.plank, -0.78, cy + 0.15, 0.08, H);
  box(0.48, 0.05, 0.32, MAT.darkWood, -0.78, cy + 0.32, 0.08, H);
  box(0.06, 0.1, 0.01, F.brass(), -0.78, cy + 0.22, 0.24, H);
  blocker(ctx, -1.02, -0.09, -0.54, 0.25);
  // --- wall shelf with jars and books (west wall) ---
  for (let i = 0; i < 2; i++) {
    box(0.18, 0.03, 0.8, MAT.darkWood, -0.99, cy + 1.05 + i * 0.4, -0.55, H);
    for (let k = 0; k < 4; k++) {
      if (i === 0) cyl(0.04, 0.04, 0.12, F.glassJar(), -0.99, cy + 1.12 + i * 0.4, -0.85 + k * 0.17, H, 10);
      else box(0.05, 0.16 + (k % 2) * 0.04, 0.08, M(F.books[(k + i) % 6], 0.8), -0.99, cy + 1.14 + i * 0.4, -0.85 + k * 0.1, H);
    }
  }
  // --- rug + lantern + pegs ---
  const rug = box(1.1, 0.012, 0.8, F.red(), 0.05, cy + 0.008, -0.35, H);
  rug.castShadow = false;
  box(0.9, 0.013, 0.6, F.cream(), 0.05, cy + 0.011, -0.35, H).castShadow = false;
  for (let i = 0; i < 3; i++) box(0.04, 0.04, 0.1, MAT.darkWood, 0.5 + i * 0.16, cy + 1.55, 0.27, H);
  hangingLamp(H, ctx, 0.05, ry - 0.18, -0.55);
  ctx.rooms.push({ x0: -1.0, x1: 1.0, z0: -1.25, z1: 0.25, light: [0.05, ry - 0.5, -0.55] });
}

export function furnishKitchen(H, ctx, cy, ry, s = 1) {
  // s = +1 (east wing). Room x in [1.15, 2.75]
  const X = (x) => s * x;
  box(1.5, 0.78, 0.4, MAT.plank, X(2.0), cy + 0.39, -1.05, H);
  box(1.56, 0.05, 0.44, F.tile(), X(2.0), cy + 0.8, -1.05, H);
  box(0.45, 0.4, 0.02, MAT.darkWood, X(1.62), cy + 0.5, -0.85, H);
  box(0.45, 0.4, 0.02, MAT.darkWood, X(2.12), cy + 0.5, -0.85, H);
  // iron stove with chimney
  box(0.5, 0.42, 0.42, F.iron(), X(2.52), cy + 0.5, -0.97, H);
  const fire = box(
    0.22,
    0.14,
    0.02,
    M('#ff7a2a', 0.5, { emissive: new THREE.Color('#ff6a1a'), emissiveIntensity: 1.2 }),
    X(2.52),
    cy + 0.42,
    -0.755,
    H,
  );
  ctx.fire = fire;
  cyl(0.05, 0.05, 1.3, F.iron(), X(2.52), cy + 1.5, -1.0, H, 10);
  cyl(0.11, 0.11, 0.1, F.iron(), X(2.15), cy + 0.88, -1.05, H, 14);
  cyl(0.1, 0.12, 0.14, MAT.metal, X(1.65), cy + 0.89, -1.05, H, 12);
  blocker(ctx, X(1.25), -1.25, X(2.75), -0.85);
  // table + stools
  box(0.62, 0.04, 0.44, MAT.plank, X(1.95), cy + 0.58, -0.25, H);
  for (const [sx, sz] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ])
    box(0.04, 0.58, 0.04, MAT.darkWood, X(1.95) + sx * 0.26, cy + 0.29, -0.25 + sz * 0.18, H);
  for (const z of [-0.62, 0.12]) cyl(0.13, 0.12, 0.34, MAT.darkWood, X(1.95), cy + 0.17, z, H, 10);
  blocker(ctx, X(1.65), -0.5, X(2.25), 0.0);
  // hanging pans and herbs
  box(0.9, 0.025, 0.025, MAT.metal, X(1.95), cy + 1.55, -1.22, H);
  for (let i = 0; i < 3; i++) cyl(0.09, 0.09, 0.015, F.iron(), X(1.65 + i * 0.3), cy + 1.38, -1.21, H, 14);
  hangingLamp(H, ctx, X(1.95), ry - 0.2, -0.45);
  ctx.spots.hearth = new THREE.Vector3(X(2.2), 0, -0.55);
  ctx.rooms.push({ x0: 1.2, x1: 2.75, z0: -1.25, z1: 0.25, light: [X(1.95), ry - 0.5, -0.45] });
}

export function furnishStudy(H, ctx, cy, ry, s = -1) {
  const X = (x) => s * x;
  // bookshelf wall
  box(1.5, 1.7, 0.26, MAT.darkWood, X(2.0), cy + 0.85, -1.12, H);
  for (let r = 0; r < 4; r++) {
    box(1.42, 0.03, 0.24, MAT.plank, X(2.0), cy + 0.28 + r * 0.4, -1.1, H);
    for (let k = 0; k < 11; k++)
      box(
        0.09,
        0.26 + ((k * 7 + r) % 3) * 0.04,
        0.17,
        M(F.books[(k + r * 3) % 6], 0.85),
        X(1.4 + k * 0.125),
        cy + 0.43 + r * 0.4,
        -1.08,
        H,
      );
  }
  blocker(ctx, X(1.25), -1.25, X(2.75), -0.95);
  // desk with lamp and maps
  box(0.9, 0.05, 0.45, MAT.darkWood, X(2.3), cy + 0.74, 0.0, H);
  for (const sx of [-1, 1]) box(0.05, 0.74, 0.4, MAT.darkWood, X(2.3) + sx * 0.4, cy + 0.37, 0.0, H);
  box(0.5, 0.01, 0.34, F.paper(), X(2.25), cy + 0.77, 0.0, H);
  cyl(0.02, 0.02, 0.2, F.brass(), X(2.62), cy + 0.88, -0.1, H, 8);
  sph(0.06, MAT.lamp, X(2.62), cy + 1.0, -0.1, H, 10, 8);
  blocker(ctx, X(1.85), -0.24, X(2.75), 0.24);
  // armchair
  box(0.55, 0.3, 0.55, F.red(), X(1.55), cy + 0.2, -0.35, H);
  box(0.55, 0.45, 0.12, F.red(), X(1.55), cy + 0.5, -0.58, H);
  blocker(ctx, X(1.27), -0.64, X(1.84), -0.07);
  // telescope on a tripod (front, by the window)
  const tp = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const leg = cyl(0.012, 0.012, 1.1, MAT.darkWood, Math.cos(a) * 0.15, 0.5, Math.sin(a) * 0.15, tp, 5);
    leg.rotation.set(Math.sin(a) * 0.28, 0, -Math.cos(a) * 0.28);
  }
  const tube = cyl(0.045, 0.055, 0.8, F.brass(), 0, 1.12, 0, tp, 14);
  tube.rotation.x = Math.PI / 2 - 0.25;
  tube.rotation.z = 0.25 * s;
  tp.position.set(X(1.6), cy, 0.0);
  H.add(tp);
  blocker(ctx, X(1.6) - 0.2, -0.2, X(1.6) + 0.2, 0.2);
  ctx.spots.scope = new THREE.Vector3(X(1.6), 0, 0.12 + 0.35);
  // map + trophy fish on walls
  box(0.7, 0.5, 0.02, F.paper(), X(1.7), cy + 1.35, 0.27, H);
  const fish = sph(0.12, M('#7aa9bf', 0.35, { metalness: 0.5 }), X(2.45), cy + 1.35, 0.26, H, 12, 8);
  fish.scale.set(2, 0.8, 0.3);
  box(0.4, 0.04, 0.02, MAT.darkWood, X(2.45), cy + 1.35, 0.255, H);
  hangingLamp(H, ctx, X(1.95), ry - 0.2, -0.45);
  ctx.rooms.push({ x0: -2.75, x1: -1.2, z0: -1.25, z1: 0.25, light: [X(1.95), ry - 0.5, -0.45] });
}
