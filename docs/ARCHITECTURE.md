# Architecture

Driftwood is a dependency-free browser game written in vanilla JavaScript, HTML and CSS. Three.js r160 is vendored in `three.module.js`; no React, TSX, runtime package CDN or network asset is required for core gameplay.

## Entry and build

- `index.html` is the live source entry. It loads `style.css` and `src/main.js` directly and contains markers for standalone generation.
- `build.sh` uses esbuild to bundle/minify `src/main.js`, strips the source module and stylesheet references, then injects CSS and JavaScript into `dist/Driftwood.html`.
- `dist/game.js` is an ignored intermediate. `dist/Driftwood.html` is the self-contained playable artifact.

## Modules

| Module | Responsibility |
| --- | --- |
| `main.js` | State machine, fixed-cap delta loop, survival, quests, input, camera, UI, trading, save migration and offline progress |
| `house.js` | Segmented enterable cabin, hinged door, furniture, roof, visual upgrade tiers and static batch boundaries |
| `raft.js` | Instanced tile geometry, building lifecycle, visual station output, tile health and walkability/collision |
| `models.js` | Shared materials, foliage, props, blueprint data, stations, crops and debris |
| `characters.js` | Player/trader rigs, companion, gulls, shark variants and trader boat |
| `viewmodel.js` | Camera-relative first-person hands/tools, sway and action response on reflection-excluded layer 1 |
| `pbr.js` | Seeded local albedo/normal/roughness data textures and PMREM environment |
| `batch.js` | Material-compatible opaque static geometry merging with dynamic/transparent exclusions |
| `ocean.js`, `waves.js` | Radial ocean mesh, synchronized CPU/GLSL waves, reflections, foam and water shading |
| `sky.js`, `particles.js` | Atmosphere, clouds, weather and pooled effects |
| `pixel.js` | HDR scene target, depth texture, FXAA, depth AO, restrained bloom, grading and optional pixel treatment |
| `audio.js`, `icons.js`, `textures.js`, `util.js` | Procedural audio, inline SVG icons, auxiliary textures and shared math/geometry caches |

## Render flow

The default path renders the scene into a full-resolution half-float target with depth, then performs one post blit. FXAA handles edges, depth AO is distance-limited, bloom only lifts restrained highlights, and ACES/output conversion happens in the final pass. Pixel-art modes reuse the same pipeline at reduced target resolution with outlines, dithering and quantization. Low quality disables AO/bloom and reflections/shadows according to the quality table.

The cabin is batched per material and per upgrade tier. The moving door, glass, instanced foliage and shader meshes are never merged. This preserves silhouette, normals, UVs, vertex color, upgrade visibility and every source triangle while reducing draw overhead.

The ocean reflection uses a mirrored camera on layer 0. First-person tools and glow sprites use layer 1 and therefore do not contaminate reflections. Renderer info reset is manual so diagnostics include reflection, scene and post passes.

## Simulation and persistence

Gameplay uses capped frame deltas. Production also accepts explicit elapsed seconds for sleep/offline simulation; it is not tied to frame count. `window.__dw` exposes diagnostics and test hooks, but browser verification also uses real keyboard, pointer and button inputs.

The v2 save keys remain `driftwood.save.v2` and `driftwood.settings.v2`. Migration fills new fields including `houseLv` and serialized tile `health`. Save writes player location, structure state and the Raft health map; Continue restores them before offline simulation.
