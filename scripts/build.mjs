// Build / dev server. `node scripts/build.mjs` -> dist/ (index.html + hashed JS/CSS/fonts).
// `node scripts/build.mjs --serve` -> watch + serve dist/ on http://localhost:5173
import * as esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const dist = path.join(root, 'dist');
const serve = process.argv.includes('--serve');
const opts = {
  entryPoints: { game: path.join(root, 'src/main.js'), style: path.join(root, 'styles/main.css') },
  outdir: path.join(dist, 'assets'),
  entryNames: '[name]-[hash]',
  assetNames: '[name]-[hash]',
  bundle: true,
  format: 'esm',
  target: 'es2021',
  minify: !serve,
  sourcemap: serve ? 'inline' : false,
  metafile: true,
  loader: { '.woff2': 'file' },
  legalComments: 'none',
  logLevel: 'info',
};

function emitHtml(meta) {
  let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const out = Object.keys(meta.outputs).map((p) => path.relative(dist, path.join(root, p)).replaceAll('\\', '/'));
  const js = out.find((p) => /assets\/game-.*\.js$/.test(p));
  const css = out.find((p) => /assets\/style-.*\.css$/.test(p));
  html = html.replace('./src/main.js', './' + js).replace('./styles/main.css', './' + css);
  fs.writeFileSync(path.join(dist, 'index.html'), html);
  // the public favicon
  if (fs.existsSync(path.join(root, 'assets/favicon.svg'))) fs.copyFileSync(path.join(root, 'assets/favicon.svg'), path.join(dist, 'favicon.svg'));
}

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });
if (serve) {
  const plugin = { name: 'html', setup(b) { b.onEnd((r) => r.metafile && emitHtml(r.metafile)); } };
  const ctx = await esbuild.context({ ...opts, plugins: [plugin] });
  await ctx.watch();
  const { port } = await ctx.serve({ servedir: dist, port: 5173 });
  console.log(`Driftwood dev server: http://localhost:${port}`);
} else {
  const r = await esbuild.build(opts);
  emitHtml(r.metafile);
  const size = Object.values(r.metafile.outputs).reduce((a, o) => a + o.bytes, 0);
  console.log(`Built dist/index.html (${(size / 1024 / 1024).toFixed(2)} MB total assets)`);
}
