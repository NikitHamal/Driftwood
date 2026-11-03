# Development and verification

## Requirements and build

A WebGL-capable browser, Node.js, esbuild and Python 3 are needed for development. Install esbuild locally with `npm install --no-save esbuild`, then run `./build.sh`. The output is `dist/Driftwood.html`; `dist/game.js` is an intermediate bundle. Serve from the repository root using `python3 -m http.server 8000` if desired. The optional fonts may require network access; gameplay does not require those fonts.

## Manual smoke test

Use a fresh browser profile or back up the existing localStorage first. New World replaces the existing slot.

1. Load the standalone HTML; check the title, Settings and How to Play. Create a world and confirm the HUD and player appear.
2. Move and orbit; hook debris; cast a fishing line, respond to a bite and complete or fail the timing challenge.
3. Build a foundation and stations on valid tiles. Try cooking, boiling water, planting, watering and collecting output. Confirm inventory and objective progress.
4. Visit Marlo during the stated hours; sell, buy and inspect upgrades. In Survival, verify shark warnings and defense; compare Cozy behavior.
5. Check day/night readability, rain, inventory, pause, audio and quality settings. Test after a resize and at the target device size.
6. Save & Quit and Continue, confirming world, inventory and structures persist. For offline progress, create an active station, leave and return after at least a minute; verify its output and the eight-hour cap without assuming every system advances.
7. Inspect browser console for exceptions. Test the actual input flow; `window.__dw` may help set up conditions but does not prove mouse or keyboard interaction works.

The previous development checks exercised creation, building, a forced fishing outcome, local save/Continue, trader modal content and console errors in headless Chromium. These are smoke checks rather than exhaustive or cross-browser certification. Timed actions can run slowly under software rendering because frame delta is capped.

## Troubleshooting

- **Black or blank scene:** check WebGL support and browser console; try a different browser or lower graphics quality.
- **Slow rendering:** choose Low or Medium in Settings, lower display resolution, or close other GPU-heavy tabs.
- **Save missing:** use the same browser, profile and origin. Direct-file and local-server origins can have separate storage; private browsing and clearing site data can remove it.
- **Build fails:** confirm esbuild is installed locally or on PATH and Python 3 is available. Do not edit only the generated HTML, because rebuilding overwrites it.
