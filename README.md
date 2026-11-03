# Driftwood

A single-player, procedural Three.js survival/idle game set on an endless ocean. Gather drifting debris, fish, grow food, purify water, trade and expand a floating home. The teal stilt house, roof tree, turquoise sea and cloud reflections are inspired by the supplied floating-house reference; the scene is an original procedural interpretation, not a pixel-perfect reproduction.

## Play

1. Open `dist/Driftwood.html` in a modern WebGL-capable browser.
2. Choose **New World**, enter a name, and pick **Cozy** or **Survival**. The title screen offers **Continue** after a world has been saved.
3. Follow the objective card. Select the hook with **1** and click nearby debris to gather initial materials.

If opening the file directly causes a browser restriction, from this directory run `python3 -m http.server 8000` and open `http://localhost:8000/dist/Driftwood.html`. Use the same browser and origin to keep access to the same save. Saves and settings are stored in local browser storage, not in a cloud account; clearing site data can delete them. The game needs WebGL. Google Fonts are optional and system fallbacks are provided if unavailable.

## Controls

| Input | Action |
| --- | --- |
| W A S D / Shift | Move / run |
| Drag / scroll | Orbit camera / zoom |
| E | Interact with the nearby object |
| 1 / 2 / 3 | Hook / fishing rod / build hammer |
| 4 / 5 / 6 | Select seeds / eat / drink |
| Click | Use the selected tool, place a build, or reel |
| Space | Respond to a fish bite or stop the reel marker |
| Tab or I / Esc | Inventory / pause or close |

Choose a structure from the build bar and click a valid highlighted location. Select the hammer again or press Esc to leave build mode. In-game **How to Play** and the objective card provide further guidance.

## Develop

The playable build is already included. To rebuild it, install Node.js, Python 3 and esbuild, then:

```sh
npm install --no-save esbuild
./build.sh
```

The script bundles `src/main.js` and inlines the script and CSS into `dist/Driftwood.html`. `index.html` is a build template, not the standalone game. Three.js r160 is vendored as `three.module.js`; its license is in `THREE-LICENSE.txt`.

## Documentation

- [Project context and design intent](docs/CONTEXT.md)
- [Architecture and data flow](docs/ARCHITECTURE.md)
- [Gameplay systems and progression](docs/GAMEPLAY.md)
- [Development and verification](docs/DEVELOPMENT.md)
- [Agent handoff and working rules](AGENTS.md)
