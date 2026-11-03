# Gameplay guide

## Getting started

Gather floating debris with the hook to obtain wood, plastic, fiber and scrap. Select the rod and click open water to cast; click or press Space at the bite, then stop the moving marker within the highlighted zone. Use the hammer to place valid foundations and stations, paying the displayed costs. The objective card tracks a sequence of 15 goals; inventory includes items, objectives, upgrades and stats.

## Survival and idle loops

- **Food:** fish, then use a grill to cook raw fish. Planters grow potatoes or melons; planting consumes seeds and watering speeds growth. Eat using slot 5.
- **Water:** purifiers consume wood to boil seawater. Rain catchers collect water; an unlockable solar still is another source. Collect and drink using slot 6.
- **Automation:** debris nets, fish traps and production stations accumulate or finish output up to their individual limits. Collect the output at the station with E. Some production advances while away, capped at eight hours.
- **Building:** foundations expand the raft; build stations on valid unoccupied tiles, with edge-only placement where required. Demolition refunds half the cost.
- **Trading:** Marlo visits daily from 09:00 to 15:00 game time. Sell goods, buy supplies and purchase upgrades including improved hook/rod and the solar still blueprint.
- **Modes:** Cozy reduces survival drain and removes shark attacks. Survival includes a shark that can attack edge tiles; fend it off with E nearby or click it with the hook.
- **World:** day/night, weather, sleep, a cat companion and other ambient creatures add life. Sleep is available at night.

The game uses a single local world save. New World replaces that slot after the in-game warning. Balance, recipes and exact timing are defined in code; `src/main.js` contains progression and simulation, and `src/models.js` contains blueprints and loot definitions.

## Pixel-art renderer and idle additions

- **Visuals:** `src/pixel.js` renders the scene at low resolution and upscales it with depth outlines, edge highlights, palette quantisation and ordered dithering. Settings → Pixel art: Off, Fine, Classic or Chunky (off by default).
- **Smokehouse:** load up to 6 raw fish; it smokes one every 40 s (also offline) into Smoked Fish (eat or sell for 11).
- **Pearl Bed (edge):** grows a pearl every 150 s, up to 4; pearls sell for 30.
- **Upgrades:** Hermit Crab Helper (Pip walks to ready stations and collects them, including on return) and Storage Crates (doubles idle station capacity).
- Three new objectives follow the original 15.
- **Camera:** press C (or the camera button) to cycle Follow, Close, Overview and First person. The choice is saved in settings.
- **Renown:** every item gathered gives XP. Each level pays coins and makes all stations 6% faster, including offline.
- **More automation:** Auto Winch (edge, reels in debris), Sprinkler (waters planters on neighbouring tiles from its own tank), Trade Buoy (edge, auto-sells spare pearls/smoked fish/crops/scrap at 80%), Crab Crew upgrade (Pip ×3 speed).
