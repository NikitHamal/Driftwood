# Current status

Last updated: overhaul session, branch `kimi`.

## Verified baseline

- Cloned `main` into `/tmp/Driftwood`; source is vanilla ES modules with vendored Three.js r160. No `package.json` exists and no TSX is used.
- Installed local, untracked build/test tools with `npm install --no-save --no-package-lock esbuild playwright`.
- `build.sh` originally lacked execute permission; permission corrected. Baseline standalone build is being used as the comparison point.
- Existing game includes gathering, fishing, crafting stations, farming, trading, quests, offline progress, a trader, a shark, weather, survival vitals and local saves.

## Audit findings

1. Root `index.html` was only a standalone-build template and did not load source modules when served directly.
2. First-person used the same drag-to-orbit handler as third person; no pointer lock or centered aiming existed.
3. Wheel changed follow distance only and did nothing in first person; there was no focal zoom.
4. The cabin was a sealed box. Level-one navigation allowed only a narrow balcony strip, and sleep was triggered outside the door.
5. Houses had no progression or persistent visual tiers.
6. Materials primarily used small albedo canvases and bump mapping, without a scene environment or full-resolution cinematic post processing.
7. Auto quality could step down but its upgrade branch was empty. Static primitive geometry was repeatedly allocated.

## Implemented overhaul systems

- Enterable, furnished cabin with real segmented walls, windows, hinged animated door, matching interior collision, bed sleep interaction and three persistent visual/functional upgrade tiers.
- Pointer-lock first-person with free mouse look, center aiming, camera-relative tool view-models, modal pointer release and focal zoom in all views.
- Procedural wood/chipped-paint albedo, normal and roughness maps; PMREM environment lighting; full-resolution FXAA/AO/bloom pipeline; optional pixel-art path retained.
- Shared primitive geometry, repaired auto-quality upgrade behavior, revised ocean highlight energy, new Manrope/Marcellus typography and responsive cabin UI.
- Root `index.html` directly loads the source game and stylesheet. Standalone build strips both development references before inlining.

## Latest verification

- `DW_FAST=1 DW_SHOTS=0 node scripts/verify.cjs`: PASS on WebGL 2 / SwiftShader.
- Real inputs verified pointer lock, mouse look, 1.402× scroll zoom, W movement through the doorway (`z 0.9 → 0.24`), opening the upgrade modal with E and purchasing tier 1.
- Zero console errors and zero uncaught page exceptions in that run.
- Full-quality title, gameplay, first-person and upgrade screenshots captured; final interior/standalone capture remains part of final validation.

Detailed commands and results are in `docs/CONTINUITY.md`.
