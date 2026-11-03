# Gameplay guide

## Controls

- **WASD / arrows:** camera-relative movement. **Shift:** sprint.
- **Third person:** drag the viewport to orbit. **C** cycles Follow, Close, Overview and First person.
- **First person:** click the viewport to capture the pointer, then move the mouse freely—no dragging. Tools and building rays aim through the center reticle. Opening UI releases the pointer; click the viewport to capture it again.
- **Wheel:** smooth focal zoom from 1× to 3× in every camera mode. This changes projection so distant objects genuinely come closer, rather than only moving the follow camera.
- **E:** interact. **Click:** use equipped tool. **1–6:** hotbar. **Tab:** inventory. **Space:** fishing response. **Esc:** close UI, cancel building/fishing, or pause.

Touch devices retain the movement joystick and interaction button.

## Core survival loops

- Gather planks, bottles, fronds, barrels and crates with the hook. Fish with the rod, respond to the bite, then stop the moving marker in the catch zone.
- Cook fish, boil seawater, plant and water crops, and keep Hunger/Thirst above zero. Cozy mode slows vital drain and removes shark attacks; Survival enables the complete threat system.
- Foundations expand the raft. The hammer places structures only on valid tiles and displays real resource costs; demolition refunds half.
- Stations accumulate or process output with individual storage limits. Storage Crates, Renown and cabin tiers modify their real production speed/capacity. Offline production is capped at 8 hours, or 12 with Captain’s Retreat.
- Marlo visits daily from 09:00 to 15:00. Sell produce, buy supplies and purchase rod, hook, automation, storage and blueprint upgrades.

## Enterable cabin and upgrades

Climb the ladder and walk through the hinged front door; it opens automatically at close range. Walls, doorway and furniture have matching collision. The interior contains a functional bed, table, shelves, lighting and storage. Sleep in the bed at night to advance to morning.

Use **Cabin upgrades** near the doormat. Each tier consumes the displayed resources, immediately changes visible geometry and persists in the world save:

1. **Weatherproof Cabin:** shutters, copper brackets and gutters; +5% station speed and 8% slower vital drain.
2. **Solar Workshop:** roof solar array and craftsman’s bench; +12% total station speed and 16% slower vital drain.
3. **Captain’s Retreat:** weather vane and telescope; +20% total station speed and 24% slower vital drain, plus 12-hour offline progress.

## Structures and automation

In addition to grills, purifiers, planters, rain catchers, solar stills, traps, nets, smokers, pearl beds, winches, sprinklers, trade buoys and lamps:

- **Repair Bench:** when shark damage exists, spend scrap to restore 45 integrity to every damaged foundation. The cost scales with the number of damaged tiles. Tile integrity persists through saves and slowly regenerates between attacks.
- **Salvage Bell (edge):** produces a salvage unit every 95 seconds (up to 5, or 10 with Storage Crates) and a pearl every 430 seconds (up to 2). Each unit yields 2 scrap. Collection, offline reports, visible output and Pip automation use the same real station state.

Pip the hermit crab collects ready station output when hired. Nets, traps, smokers, stills, sprinklers, buoys, winches and salvage bells continue their defined offline simulation.

## Shark encounters

- **Reef shark:** the early foundation attacker; one successful close-range defense repels it.
- **Hammerhead (day 3+):** faster, prefers occupied edge foundations and deals more damage.
- **Great white (day 7+):** a three-stage assault. Each defensive hit stuns it and forces another approach; later stages move faster and deal more damage. Three hits drive it off and award 40 coins and 4 scrap.

Warnings name the species and great-white hits remaining. Defend with E nearby or the Hook at close range. Repair or replace damaged foundations before they break.

## Saves

One local world slot uses `driftwood.save.v2`; New World warns before replacing it. Save & Quit and Continue preserve inventory, player location, structures and station state, cabin tier, tile damage, objectives and progression. Direct-file and HTTP origins have separate browser storage.
