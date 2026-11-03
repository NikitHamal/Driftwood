# Architecture

## Build and runtime

`build.sh` bundles `src/main.js` with esbuild into `dist/game.js`, then injects the bundle and `style.css` into the placeholders in `index.html`, writing `dist/Driftwood.html`. The shipped HTML includes the game code and vendored Three.js; optional web fonts fall back to system fonts. Run the generated HTML, not the unprocessed template.

The browser initializes a Three.js renderer, scene, camera, lighting, procedural geometry/textures and DOM UI. A requestAnimationFrame loop advances the world, renders the scene and updates HUD elements. Game time and simulation use delta time, capped to limit large frame jumps; performance can affect apparent simulation speed under severe load.

## Source map

| File | Responsibility |
| --- | --- |
| `src/main.js` | Setup, game state, frame loop, movement and interactions, station simulation, world events, UI, saving/loading and debug interface |
| `src/waves.js` | CPU wave height/gradient and corresponding GLSL for consistent water and floating objects |
| `src/ocean.js` | Ocean mesh and shader, reflection render target, foam mask, wind streaks and fog |
| `src/sky.js` | Sky dome, clouds and celestial elements |
| `src/models.js` | Procedural cabin, objects, station models and blueprint/debris definitions |
| `src/raft.js` | Raft tile geometry, occupancy, placement, walking, edges and building instances |
| `src/characters.js` | Player rig and animation, cat, gulls, shark and trader boat |
| `src/textures.js` | Canvas-generated surface textures and sprites |
| `src/particles.js` | Particle effects and rain |
| `src/icons.js` | HUD icons and item presentation definitions |
| `src/audio.js` | Procedural sound and music |
| `src/util.js` | Shared math and geometry helpers |
| `index.html`, `style.css` | UI/template and styling |

## State and persistence

`freshState()` creates a world containing identity/mode, clock/weather, vitals, inventory, raft tile coordinates, building records and their state, upgrades, quest progress, statistics, player position and event scheduling. `applyState()` reconstructs scene objects. `migrate()` backfills missing fields when loading. Current constants: tile width `T=2.4`; `DECK=0.42`, `BAL=2.6`.

A single world is saved as JSON under `driftwood.save.v2`, settings under `driftwood.settings.v2`. Save events include world creation, periodic autosave, day changes, sleep, visibility/unload and Save & Quit. Storage can fail or be cleared; there is no server backup. Treat schema changes as migrations, not silent resets.

On Continue, station simulation can advance based on elapsed real time, capped at eight hours. It is station-specific rather than a full replay of the world: do not assume weather, hunger, shark attacks or every world system are simulated offline. The away summary reports qualifying changes ready to collect.

## Performance and debugging

Quality presets change pixel ratio, shadow maps and reflection resolution; Low disables reflections and shadows. Automatic quality can downgrade. `window.__dw` exposes selected state and actions for development, including state getters and test helpers; it is not a stable public API.
