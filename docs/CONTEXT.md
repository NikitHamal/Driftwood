# Project context

## Vision

Driftwood is a cozy but functional 3D ocean survival and idle game. Its visual starting point was a reference showing a teal clapboard cabin elevated above a wooden raft, a tree growing from its roof, a lantern pole and ropes, plants, soft clouds and a turquoise ocean with cloud reflections and wind streaks. The implementation uses generated geometry, textures, shaders and audio; it is an interpretation rather than a literal recreation of the video.

## Experience goals

- Present a welcoming title screen with New World and Continue, then a readable, unobtrusive HUD.
- Give the player a visible character and a sense of inhabiting a living raft, including Biscuit the cat and visiting trader Marlo.
- Make gathering, fishing, cooking, fresh water, crops, building and trading into playable loops, not decorative placeholders.
- Support relaxed play as well as survival pressure; let selected stations produce while the player is away.
- Retain responsive performance via quality presets and conservative procedural assets.

## Scope and constraints

Single-player and browser-based; one local world save per browser origin, plus separate settings. No server, accounts, multiplayer, cloud sync, imported art pipeline or exact-video reproduction is implemented. Autosave and offline progress depend on browser storage. The game is intentionally stylized, not photorealistic. Features and values may change; check source before depending on a specific balance number.

## Practical handoff

The deliverable is `dist/Driftwood.html`, generated from the source tree. Source files are the editable truth; see `AGENTS.md` for guardrails and `docs/DEVELOPMENT.md` for verification.
