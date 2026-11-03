#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p dist
if [ -x node_modules/.bin/esbuild ]; then ESBUILD=node_modules/.bin/esbuild
elif command -v esbuild >/dev/null 2>&1; then ESBUILD=$(command -v esbuild)
elif [ -x /vercel/sandbox/node_modules/.bin/esbuild ]; then ESBUILD=/vercel/sandbox/node_modules/.bin/esbuild
else echo 'Install esbuild first: npm install --no-save esbuild' >&2; exit 1; fi
"$ESBUILD" src/main.js --bundle --format=iife --minify --target=es2020 --outfile=dist/game.js --log-level=warning
python3 - <<'PY'
h=open('index.html',encoding='utf-8').read();c=open('style.css',encoding='utf-8').read();j=open('dist/game.js',encoding='utf-8').read()
h=h.replace('<script type="module" src="./src/main.js"></script>','').replace('<link rel="stylesheet" href="./style.css">','')
h=h.replace('/*CSS*/',c).replace('<script>/*JS*/</script>','<script>'+j.replace('</script','<\\\\/script')+'</script>')
open('dist/Driftwood.html','w',encoding='utf-8').write(h)
PY
