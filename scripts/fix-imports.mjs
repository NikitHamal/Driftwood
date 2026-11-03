// Maintenance tool: scans src/**/*.js, adds missing imports for names exported elsewhere in src/ and removes unused ones.
// Usage: node scripts/fix-imports.mjs [--check]
import fs from 'node:fs';
import path from 'node:path';
import * as acorn from 'acorn';
import * as escope from 'eslint-scope';

const root = path.resolve(import.meta.dirname, '..');
const files = fs.readdirSync(path.join(root, 'src'), { recursive: true }).filter((f) => f.endsWith('.js')).map((f) => path.join(root, 'src', f));
const parse = (src) => acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'module', ranges: true });
const exportIndex = new Map(); // name -> [files]
const asts = new Map();
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  const ast = parse(src);
  asts.set(f, { src, ast });
  for (const n of ast.body) {
    if (n.type !== 'ExportNamedDeclaration') continue;
    const names = [];
    if (n.declaration?.declarations) n.declaration.declarations.forEach((d) => names.push(d.id.name));
    else if (n.declaration?.id) names.push(n.declaration.id.name);
    n.specifiers?.forEach((s) => names.push(s.exported.name));
    for (const nm of names) exportIndex.set(nm, [...(exportIndex.get(nm) || []), f]);
  }
}
const GLOBALS = new Set([...Object.getOwnPropertyNames(globalThis), 'window', 'document', 'localStorage', 'performance', 'requestAnimationFrame', 'cancelAnimationFrame', 'matchMedia', 'innerWidth', 'innerHeight', 'devicePixelRatio', 'addEventListener', 'removeEventListener', 'navigator', 'location', 'AudioContext', 'webkitAudioContext', 'ResizeObserver', 'HTMLElement', 'Image', 'Float32Array', 'getComputedStyle', 'screen', 'screenX', 'KeyboardEvent', 'MouseEvent', 'OffscreenCanvas', 'fetch', 'alert']);
const check = process.argv.includes('--check');
let problems = 0;
for (const [f, { src, ast }] of asts) {
  const sm = escope.analyze(ast, { ecmaVersion: 2022, sourceType: 'module' });
  const gs = sm.globalScope;
  const modScope = sm.scopes.find((s) => s.type === 'module');
  const missing = new Set(gs.through.map((r) => r.identifier.name).filter((n) => !GLOBALS.has(n)));
  const declared = new Map(); // source -> {names:Set, ns}
  const keep = [];
  for (const n of ast.body) if (n.type === 'ImportDeclaration') {
    for (const s of n.specifiers) {
      const v = modScope.variables.find((x) => x.name === s.local.name);
      const used = v && v.references.length > 0;
      if (!used) { problems++; if (check) console.log(`${path.relative(root, f)}: unused import ${s.local.name}`); continue; }
      let srcv = n.source.value;
      if (s.type === 'ImportSpecifier' && srcv.startsWith('.')) {
        const target = path.resolve(path.dirname(f), srcv);
        const cands = exportIndex.get(s.imported.name);
        if (cands && !cands.includes(target) && cands.length === 1) {
          let rel = path.relative(path.dirname(f), cands[0]).replaceAll('\\', '/');
          srcv = rel.startsWith('.') ? rel : './' + rel;
          problems++; if (check) console.log(`${path.relative(root, f)}: wrong source for ${s.imported.name}`);
        }
      }
      keep.push({ src: srcv, spec: s });
    }
  }
  const have = new Set(keep.map((k) => k.spec.local.name));
  const add = [];
  for (const name of missing) {
    if (have.has(name)) continue;
    const cands = exportIndex.get(name);
    if (!cands || cands.length !== 1) { problems++; console.log(`${path.relative(root, f)}: UNRESOLVED ${name}${cands ? ' (ambiguous)' : ''}`); continue; }
    problems++; if (check) console.log(`${path.relative(root, f)}: missing import ${name}`);
    let rel = path.relative(path.dirname(f), cands[0]).replaceAll('\\', '/');
    if (!rel.startsWith('.')) rel = './' + rel;
    add.push({ src: rel, spec: { type: 'ImportSpecifier', imported: { name }, local: { name } } });
  }
  if (check) continue;
  const groups = new Map();
  for (const k of [...keep, ...add]) {
    if (!groups.has(k.src)) groups.set(k.src, { ns: null, def: null, named: new Map() });
    const g = groups.get(k.src);
    if (k.spec.type === 'ImportNamespaceSpecifier') g.ns = k.spec.local.name;
    else if (k.spec.type === 'ImportDefaultSpecifier') g.def = k.spec.local.name;
    else g.named.set(k.spec.local.name, k.spec.imported.name);
  }
  const lines = [];
  for (const [s, g] of groups) {
    if (g.ns) lines.push(`import * as ${g.ns} from '${s}';`);
    if (g.def || g.named.size) {
      const nm = [...g.named].sort(([a], [b]) => a.localeCompare(b)).map(([l, i]) => (l === i ? l : `${i} as ${l}`));
      lines.push(`import ${[g.def, nm.length ? `{ ${nm.join(', ')} }` : null].filter(Boolean).join(', ')} from '${s}';`);
    }
  }
  const imps = ast.body.filter((n) => n.type === 'ImportDeclaration');
  let body = src;
  for (const n of [...imps].reverse()) body = body.slice(0, n.start) + body.slice(n.end);
  // keep leading comments (header) before imports
  const firstImp = imps[0]?.start ?? 0;
  const head = src.slice(0, firstImp);
  body = body.slice(head.length).replace(/^\s*\n/, '');
  fs.writeFileSync(f, head + lines.join('\n') + '\n\n' + body.replace(/^\n+/, ''));
}
if (check) { console.log(problems ? `${problems} import problems` : 'imports OK'); process.exit(problems ? 1 : 0); }
