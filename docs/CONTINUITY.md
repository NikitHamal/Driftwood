# Continuity, request and decision log

## Original mission prompt (preserved; credential redacted)

> TOOL CONSTRAINTS (CRITICAL — learn from past sessions):
> - The File tool is rooted ONLY at /app (or the current workspace root — check with pwd). It CANNOT read/write paths outside of /app (e.g., /tmp).
> - Bash is NOT restricted and can access the whole filesystem.
> How to handle this:
> 1. Clone the repo to /tmp/Driftwood. You can either symlink `ln -sfn /tmp/Driftwood /app/driftwood` to use the File tool (and run `rm -f /app/driftwood` before running any `/app` host checks), OR write files directly into `/tmp/Driftwood` via bash heredocs/scripts.
> 2. Document your environment setup and progress in `AGENTS.md` and `STATUS.md` so future sessions inherit your exact state.
>
> PUSH DISCIPLINE (NON-NEGOTIABLE):
> - Push after EVERY meaningful milestone, game system, 3D scene/asset module, or bugfix. Never wait until the end of the session.
> - Sessions crash or hit step limits; unpushed work is lost forever.
> - After each push, verify the remote tip with: `git ls-remote origin <branch>`
>
> SECURITY & PAT HANDLING (CRITICAL):
> - GitHub PAT: [REDACTED — NEVER COMMIT CREDENTIALS]
> - NEVER commit the PAT (or even its prefix!) to any file, AGENTS.md, script, or .git/config in the repository.
> - Use an out-of-repo GIT_ASKPASS helper script in `/tmp/gitenv.sh` reading from an environment variable so `.git/config` stays clean.
>
> STREAM STABILITY & 75-STEP BUDGET RULES (CRITICAL):
> NEVER EXCEED ~4,000 OUTPUT TOKENS IN A SINGLE TOOL CALL: Do not dump 5 huge files in one bash call (truncating a tool call aborts the session). Write 1–2 modular files per tool call (<= 250 lines per call).
> STEP 1 SINGLE-CALL SETUP: Combine creating `/tmp/gitenv.sh`, cloning `https://github.com/NikitHamal/Driftwood.git` to `/tmp/Driftwood`, inspecting existing files/`AGENTS.md`/`package.json`, and installing dependencies (`npm install`) into ONE single bash step.
> RESERVE LAST ~8 STEPS: Stop starting new features when ~8 steps remain so you can run the headless WebGL visual check, fresh-clone build verification, and final report.
>
> ANTI-HALLUCINATION & THREE.JS / WEBGL VERIFICATION BAR:
> - Never claim a tool is missing without running a check command and pasting the real output.
> - Zero Placeholders / Zero AI Slop: No stubbed mechanics, empty meshes, broken shaders, or dead UI buttons.
> - Headless WebGL & Screenshot Verification:
>   * Start the dev/preview server and open the game in headless Chromium/Playwright (with `--use-gl=angle --use-angle=swiftshader` or WebGL software rendering flags enabled).
>   * Assert ZERO `console.error`, ZERO Three.js WebGL shader errors, and ZERO uncaught page exceptions during boot, gameplay loop, and state transitions.
>   * Capture real screenshots of the 3D viewport and HUD across gameplay states and inspect the PNGs with your file/image viewer to verify lighting, camera framing, geometry, shaders, and UI layout look great.
>
> MISSION: DRIFTWOOD — 3D THREE.JS GAME
> Repository: https://github.com/NikitHamal/Driftwood
> Branch: main
>
> I need you to use main branch then create new branch after your model name to push things there. SO currently. index html is just a nothing. need you to make the index html load the actual game not the driftwood html. and keep things modular and refactored. remove and cleanup any unncessary things. the main work in this session is, i need highly realistic and high fidelity game. the current graphics are too poor. they are nowhere real or anything. i need fully optimized performance and memory too without any quality compromises. add more game elements, enhance the existing ones, totally overhaul. also, the controls are not good. make the controls perfect. like when i am in fpv, the arrow shall not be dragged to look around. fix the controls. also, when i use scroll wheel, allow bit of a zoom view like in minecraft you can see the far things bit near. let users go inside the rooms too. make the houses upgradable, and so many other things. use better fonts and icons for the huds. make it top tier. save this exact prompt of mine as well as your findings, learnings, updates and all into agent md, continuity, and other docs so for new session after this, any agent can pickup any work or new works. go all out. show how goated model you are in 3d, game dev. and coding.
>
> IMPORTANT: PLEASE I DON'T WANT ANY TSX THINGS. I WANT WHAT MY REPO HAS. SAME FRAMEWORK AND SAME CODEBASE START.

The credential line is intentionally the only redaction. It must never be restored into repository content.

## Session findings and decisions

- Workspace is `/home/user/sandbox`, not `/app`; the symlink is `/home/user/sandbox/driftwood`.
- No package manifest exists. The source stack is plain JavaScript, HTML and CSS. Build tools are installed without saving a manifest or lockfile.
- `build.sh` was not executable in the checkout; its executable bit is now tracked.
- `index.html` will use a source module script for direct serving. The standalone build strips that development script and injects the minified bundle, avoiding double boot.
- New cabin architecture is isolated in `src/house.js`; navigation remains in `Raft.walkable` so visual and physical doorways agree.
- Fidelity work uses generated local PBR textures and post shaders, not remote assets. Pixel art remains an explicit option rather than the default.
- No gameplay feature is represented by a decorative button: upgrades spend resources, alter visible geometry and modify real simulation values.

## Test ledger

- Baseline `./build.sh`: passed after correcting executable permission; generated `dist/Driftwood.html` (~683 KiB) and intermediate `dist/game.js` (~661 KiB).
- Playwright Chromium executable resolved to `/home/user/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome`.
- Further visual, interaction and fresh-clone results must be appended with their actual outcomes.
