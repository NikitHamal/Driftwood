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

## Active overhaul

- Enterable cabin with real doorway, interior props, collision and animated door.
- Persistent cabin upgrade tiers with visible additions and functional perks.
- Pointer-lock first-person, center aiming, focal zoom, clean modal/pointer transitions.
- Procedural PBR maps, image-based lighting, cinematic post pipeline and richer ocean response.
- Geometry reuse, measured quality behavior, improved typography/HUD and documentation.

## Validation ledger

Detailed commands and results belong in `docs/CONTINUITY.md`. A feature is not marked verified until exercised in the built game. Headless WebGL screenshots and zero-error checks are required before final handoff.
