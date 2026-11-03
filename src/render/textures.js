import * as THREE from '../../vendor/three.module.js';
import { rng } from '../core/util.js';

function cv(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}
function tex(c, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
function speckle(g, w, h, r, n, a) {
  for (let i = 0; i < n; i++) {
    const l = r() > 0.5;
    g.fillStyle = l ? `rgba(255,255,240,${a * r()})` : `rgba(40,25,10,${a * r()})`;
    g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 3);
  }
}
export function woodTex(seed = 3) {
  const r = rng(seed),
    W = 128,
    H = 512,
    [c, g] = cv(W, H);
  g.fillStyle = '#cdbda4';
  g.fillRect(0, 0, W, H);
  for (let i = 0; i < 14; i++) {
    const x = r() * W,
      y = r() * H,
      rw = 10 + r() * 40,
      rh = 30 + r() * 120;
    const gr = g.createRadialGradient(x, y, 1, x, y, Math.max(rw, rh));
    const gy = r() < 0.6;
    gr.addColorStop(0, gy ? 'rgba(150,150,145,.35)' : 'rgba(120,85,50,.25)');
    gr.addColorStop(1, 'rgba(150,150,145,0)');
    g.fillStyle = gr;
    g.fillRect(x - rh, y - rh, rh * 2, rh * 2);
  }
  for (let i = 0; i < 70; i++) {
    const x0 = r() * W,
      dk = r();
    g.strokeStyle = `rgba(${(70 + dk * 40) | 0},${(48 + dk * 30) | 0},${28},${0.08 + r() * 0.22})`;
    g.lineWidth = 0.6 + r() * 2.2;
    g.beginPath();
    for (let y = 0; y <= H; y += 12) {
      const x = x0 + Math.sin(y * 0.013 + i) * 3 + Math.sin(y * 0.05 + i * 3) * 1.2;
      y ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.stroke();
  }
  for (let i = 0; i < 3; i++) {
    const x = 10 + r() * (W - 20),
      y = r() * H;
    const gr = g.createRadialGradient(x, y, 1, x, y, 14);
    gr.addColorStop(0, 'rgba(70,45,25,.75)');
    gr.addColorStop(0.5, 'rgba(90,60,35,.3)');
    gr.addColorStop(1, 'rgba(90,60,35,0)');
    g.fillStyle = gr;
    g.beginPath();
    g.ellipse(x, y, 8, 18, 0, 0, 7);
    g.fill();
  }
  speckle(g, W, H, r, 1800, 0.12);
  for (let i = 0; i < 8; i++) {
    const y = r() * H,
      x = 6 + r() * (W - 12);
    g.fillStyle = 'rgba(40,30,25,.7)';
    g.fillRect(x, y, 3, 3);
    g.fillStyle = 'rgba(255,240,220,.25)';
    g.fillRect(x, y, 1, 1);
  }
  let gr = g.createLinearGradient(0, 0, W, 0);
  gr.addColorStop(0, 'rgba(50,30,15,.35)');
  gr.addColorStop(0.08, 'rgba(50,30,15,0)');
  gr.addColorStop(0.92, 'rgba(50,30,15,0)');
  gr.addColorStop(1, 'rgba(50,30,15,.35)');
  g.fillStyle = gr;
  g.fillRect(0, 0, W, H);
  return tex(c);
}
export function clapTex(seed = 5) {
  const r = rng(seed),
    S = 512,
    [c, g] = cv(S, S),
    n = 9,
    bw = S / n;
  for (let i = 0; i < n; i++) {
    const h = 190 + r() * 6,
      s = 56 + r() * 10,
      l = 46 + r() * 7;
    g.fillStyle = `hsl(${h},${s}%,${l}%)`;
    g.fillRect(i * bw, 0, bw, S);
    const gr = g.createLinearGradient(i * bw, 0, (i + 1) * bw, 0);
    gr.addColorStop(0, 'rgba(255,255,255,.10)');
    gr.addColorStop(0.5, 'rgba(255,255,255,0)');
    gr.addColorStop(1, 'rgba(0,30,50,.22)');
    g.fillStyle = gr;
    g.fillRect(i * bw, 0, bw, S);
    g.fillStyle = 'rgba(10,50,70,.85)';
    g.fillRect(i * bw, 0, 2.5, S);
  }
  for (let i = 0; i < 70; i++) {
    g.fillStyle = `rgba(${(190 + r() * 40) | 0},${(170 + r() * 30) | 0},${130},${0.25 + r() * 0.4})`;
    const x = r() * S,
      y = r() * S;
    g.beginPath();
    g.ellipse(x, y, 1 + r() * 5, 1 + r() * 3, r() * 3, 0, 7);
    g.fill();
  }
  for (let i = 0; i < 500; i++) {
    g.fillStyle = `rgba(255,255,255,${r() * 0.08})`;
    g.fillRect(r() * S, r() * S, 1, 6 + r() * 20);
  }
  const gr = g.createLinearGradient(0, S * 0.7, 0, S);
  gr.addColorStop(0, 'rgba(30,40,30,0)');
  gr.addColorStop(1, 'rgba(30,40,30,.35)');
  g.fillStyle = gr;
  g.fillRect(0, 0, S, S);
  return tex(c);
}
export function soilTex() {
  const r = rng(9),
    S = 128,
    [c, g] = cv(S, S);
  g.fillStyle = '#4a2f1d';
  g.fillRect(0, 0, S, S);
  for (let i = 0; i < 900; i++) {
    g.fillStyle = `rgba(${r() > 0.5 ? 110 : 20},${r() > 0.5 ? 75 : 12},${40},${0.3 * r()})`;
    g.beginPath();
    g.arc(r() * S, r() * S, 0.5 + r() * 2, 0, 7);
    g.fill();
  }
  return tex(c);
}
export function leafTex() {
  const r = rng(11),
    S = 128,
    [c, g] = cv(S, S);
  for (let i = 0; i < 7; i++) {
    const x = 24 + r() * 80,
      y = 24 + r() * 80,
      a = r() * 6.28;
    g.save();
    g.translate(x, y);
    g.rotate(a);
    const gr = g.createLinearGradient(-20, 0, 20, 0);
    gr.addColorStop(0, '#cfe9a6');
    gr.addColorStop(0.5, '#ffffff');
    gr.addColorStop(1, '#b9d98e');
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(-22, 0);
    g.quadraticCurveTo(0, -13, 22, 0);
    g.quadraticCurveTo(0, 13, -22, 0);
    g.fill();
    g.strokeStyle = 'rgba(80,120,40,.35)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(-20, 0);
    g.lineTo(20, 0);
    g.stroke();
    g.restore();
  }
  const t = tex(c);
  return t;
}
export function netTex() {
  const S = 128,
    [c, g] = cv(S, S);
  g.strokeStyle = 'rgba(235,225,190,1)';
  g.lineWidth = 3;
  for (let i = 0; i <= S; i += 16) {
    g.beginPath();
    g.moveTo(i, 0);
    g.lineTo(i, S);
    g.stroke();
    g.beginPath();
    g.moveTo(0, i);
    g.lineTo(S, i);
    g.stroke();
  }
  const t = tex(c);
  t.repeat.set(3, 2);
  return t;
}
export function sailTex() {
  const S = 256,
    [c, g] = cv(S, S);
  g.fillStyle = '#f1e6cc';
  g.fillRect(0, 0, S, S);
  g.fillStyle = '#d8573f';
  g.fillRect(0, S * 0.62, S, S * 0.12);
  g.fillStyle = 'rgba(120,90,50,.1)';
  for (let i = 0; i < S; i += 32) g.fillRect(0, i, S, 2);
  return tex(c);
}
export function cloudTex(seed) {
  const r = rng(seed),
    W = 512,
    H = 256,
    [m, mg] = cv(W, H),
    [c, g] = cv(W, H),
    base = H * 0.72;
  mg.fillStyle = '#fff';
  mg.beginPath();
  mg.ellipse(W / 2, base, W * 0.4, H * 0.1, 0, 0, 7);
  mg.fill();
  const n = 6 + ((r() * 5) | 0),
    blobs = [];
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n,
      x = W * (0.13 + 0.74 * t) + (r() - 0.5) * 30,
      rad = H * (0.12 + 0.26 * Math.pow(Math.sin(Math.PI * t), 0.8) * (0.55 + r() * 0.6)),
      y = base - rad * 0.5 - r() * 12;
    blobs.push([x, y, rad]);
    mg.beginPath();
    mg.arc(x, y, rad, 0, 7);
    mg.fill();
  }
  mg.clearRect(0, base + H * 0.06, W, H);
  g.filter = 'blur(4px)';
  g.drawImage(m, 0, 0);
  g.filter = 'none';
  g.globalCompositeOperation = 'source-atop';
  const gr = g.createLinearGradient(0, H * 0.1, 0, base + H * 0.07);
  gr.addColorStop(0, '#ffffff');
  gr.addColorStop(0.6, '#f2f9fc');
  gr.addColorStop(1, '#a8c9dc');
  g.fillStyle = gr;
  g.fillRect(0, 0, W, H);
  g.filter = 'blur(14px)';
  g.fillStyle = 'rgba(140,180,205,.42)';
  for (const [x, y, rad] of blobs) {
    g.beginPath();
    g.arc(x + rad * 0.25, y + rad * 0.55, rad * 0.7, 0, 7);
    g.fill();
  }
  g.fillStyle = 'rgba(255,255,255,.7)';
  for (const [x, y, rad] of blobs) {
    g.beginPath();
    g.arc(x - rad * 0.25, y - rad * 0.35, rad * 0.45, 0, 7);
    g.fill();
  }
  g.filter = 'none';
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
export function glowTex() {
  const S = 64,
    [c, g] = cv(S, S);
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.3, 'rgba(255,240,200,.5)');
  gr.addColorStop(1, 'rgba(255,220,150,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, S, S);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
