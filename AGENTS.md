# Agent handoff

## Start here

Read `README.md`, then `docs/CONTEXT.md` and `docs/ARCHITECTURE.md`. For gameplay changes, also read `docs/GAMEPLAY.md`; use `docs/DEVELOPMENT.md` for build and validation. This is a playable procedural Three.js game, not a mockup. Preserve the experience while making focused changes.

## Project conventions

- Work in `src/`, `style.css`, and the `index.html` template. Rebuild the standalone HTML with `./build.sh`; do not make a one-off edit only in `dist/Driftwood.html`.
- `src/main.js` owns the game loop, state, UI, interactions, saving and progression. Modules under `src/` own rendering, models and supporting systems. Read the relevant implementation before editing; the docs are a guide, not a substitute for the code.
- Keep the CPU wave functions and GLSL wave functions in `src/waves.js` consistent, so floating objects and the rendered sea remain aligned.
- Preserve save compatibility when changing state. The v2 keys are `driftwood.save.v2` and `driftwood.settings.v2`; `migrate()` fills in missing fields. Consider older saves and the offline simulation when changing station state.
- The game uses real-time simulation with a capped frame delta. Avoid introducing frame-rate-dependent gameplay or expensive per-frame allocations where possible. Keep quality settings and a lower-end path usable.
- Preserve the title screen, New World / Continue, clean HUD, player and companion, building, survival and idle systems. Match the stylized ocean-house reference without claiming an exact replica.
- Three.js is vendored; retain `THREE-LICENSE.txt`. Avoid adding a runtime network dependency for core gameplay. Fonts have fallbacks.

## Before handing off

1. Run `./build.sh` and confirm `dist/Driftwood.html` opens and has no console errors.
2. Check the changed flow and a representative title, gameplay and modal state. Use `docs/DEVELOPMENT.md` for a fuller smoke test.
3. Check saving and Continue after any state or persistence change. Check both Cozy and Survival when modifying hazards or vitals.
4. Describe what was actually tested and any remaining limitations. Never assert that untested flows or devices work.

`window.__dw` exposes a development/debug interface in the build. It is useful for inspection and tests, but direct state injection does not replace testing actual user inputs.
