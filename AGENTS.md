# Driftwood agent handoff

## Environment and Git workflow

- Canonical checkout for this session: `/tmp/Driftwood`.
- Workspace symlink: `/home/user/sandbox/driftwood -> /tmp/Driftwood` (the File tools use `driftwood/...`).
- Repository: `https://github.com/NikitHamal/Driftwood`; base branch `main`; work branch `kimi`.
- Credentials must remain outside the repository. `/tmp/gitenv.sh` is a `GIT_ASKPASS` helper reading `GIT_PAT`; never write a token, token prefix, or credential URL into source, docs, Git config, or commits.
- Push every meaningful milestone and verify with `git ls-remote origin kimi`.
- This is intentionally **vanilla JavaScript + vendored Three.js r160**, not React and not TSX. Do not introduce a framework migration.

## Start here

Read `README.md`, `STATUS.md`, `docs/CONTINUITY.md`, `docs/ARCHITECTURE.md`, and `docs/GAMEPLAY.md`. `STATUS.md` is the latest verified state; `docs/CONTINUITY.md` contains the original request (credential redacted), design decisions, findings, and test notes.

## Build and serve

```sh
npm install --no-save --no-package-lock esbuild playwright
./build.sh
python3 -m http.server 8000
```

The root `index.html` must run the real source game directly. `build.sh` creates the self-contained `dist/Driftwood.html`; never make a generated-file-only edit. Three.js is vendored; retain `THREE-LICENSE.txt` and keep core gameplay network-independent.

## Architecture rules

- `src/main.js`: game state, loop, input, interaction, UI, persistence.
- `src/models.js`: shared materials, stations, foliage, crops, debris.
- `src/house.js`: enterable cabin, interior, animated door, visual upgrade tiers.
- `src/raft.js`: tile instances, structures, navigation and collision.
- `src/ocean.js`, `src/sky.js`, `src/waves.js`: synchronized ocean and atmosphere.
- `src/pixel.js`: full-resolution cinematic and optional pixel-art post pipeline.
- Keep CPU and GLSL wave functions synchronized. Avoid per-frame allocations and unbounded geometry/material creation. Reuse geometry where safe and dispose replaced render targets/textures.
- Preserve v2 save keys (`driftwood.save.v2`, `driftwood.settings.v2`) and migrate missing fields. Existing worlds must remain playable.

## Controls contract

- Third person: drag to orbit; WASD/arrow movement; Shift sprint.
- First person: click the viewport to pointer-lock; mouse look requires **no dragging**. Tool rays use screen center. UI/modal transitions release pointer lock.
- Wheel: focal-length zoom in every camera mode (Minecraft-like distant visibility), not merely a camera-distance change.
- C cycles camera, E interacts, Tab inventory, 1–6 hotbar, Esc pause/build cancel.

## Verification bar

Run `./build.sh`, serve the game, and use Playwright Chromium with software WebGL (`--use-gl=angle --use-angle=swiftshader`). Assert no page exceptions, console errors, or Three shader errors through boot and exercised state transitions. Capture and actually inspect title, third-person gameplay, first-person/interior, and upgrade/modal screenshots. Test real pointer/keyboard input; `window.__dw` is a debug aid, not a substitute. Do not claim untested devices or flows work.
