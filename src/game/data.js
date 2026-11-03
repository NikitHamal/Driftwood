export const CROP = {
  potato: { name: 'Potato', time: 150, item: 'potato', seed: 'seedPotato', y: [2, 3] },
  melon: { name: 'Melon', time: 300, item: 'melon', seed: 'seedMelon', y: [1, 2] },
};
export const FISH = [
  { n: 'Sardine', w: 40, f: 1, s: 0.9 },
  { n: 'Mackerel', w: 30, f: 1, s: 1.15 },
  { n: 'Sea Bream', w: 17, f: 2, s: 1.4 },
  { n: 'Bluefin Tuna', w: 8, f: 3, s: 1.75 },
  { n: 'Golden Koi', w: 3, f: 1, c: 40, s: 2.1 },
];
export const SELL = { smokedFish: 11, pearl: 30, rawFish: 3, cookedFish: 6, potato: 4, melon: 14, scrap: 4, wood: 1, plastic: 1, fiber: 1 };
export const BUY = [
  { id: 'seedPotato', n: 1, p: 4 },
  { id: 'seedMelon', n: 1, p: 14 },
  { id: 'wood', n: 5, p: 8 },
  { id: 'plastic', n: 4, p: 8 },
  { id: 'fiber', n: 4, p: 6 },
  { id: 'scrap', n: 1, p: 7 },
];
export const UPG = [
  { id: 'rod', lv: 1, name: 'Sturdy Rod', desc: 'Wider catch zone and quicker bites.', p: 60 },
  { id: 'rod', lv: 2, name: 'Master Rod', desc: 'Rare fish bite far more often.', p: 180 },
  { id: 'hook', lv: 1, name: 'Long Rope', desc: 'Hook range 10 m → 14 m.', p: 50 },
  { id: 'hook', lv: 2, name: 'Grappling Hook', desc: 'Hook range 14 m → 19 m.', p: 150 },
  { id: 'crab', lv: 1, name: 'Hermit Crab Helper', desc: 'Pip the crab collects ready stations for you, even while you are away.', p: 200 },
  { id: 'crab', lv: 2, name: 'Crab Crew', desc: 'Pip works three times as fast and never rests.', p: 450 },
  { id: 'store', lv: 1, name: 'Storage Crates', desc: 'Traps, nets, stills, smokers and pearl beds hold twice as much.', p: 140 },
  { id: 'still', lv: 1, name: 'Solar Still Blueprint', desc: 'Unlocks the Solar Still to build.', p: 120 },
  { id: 'coil', lv: 1, name: 'Copper Coil', desc: 'Purifiers make 3 water per boil.', p: 90 },
];
export const QUESTS = [
  {
    t: 'Hook floating debris',
    d: 'Select the Hook (1), then click debris drifting past the raft.',
    k: 'debris',
    n: 5,
    r: { coins: 10, wood: 4 },
  },
  {
    t: 'Catch a fish',
    d: 'Select the Rod (2) and click the water to cast. Click when the bobber dips!',
    k: 'fish',
    n: 1,
    r: { coins: 10 },
  },
  { t: 'Build a Grill', d: 'Select the Hammer (3) and choose Grill from the build menu.', k: 'b:grill', n: 1, r: { scrap: 2 } },
  { t: 'Cook and eat a fish', d: 'Put raw fish on the grill with E, collect it, then eat (5).', k: 'ate', n: 1, r: { coins: 10 } },
  { t: 'Build a Water Purifier', d: 'Fresh water keeps you alive out here.', k: 'b:purifier', n: 1, r: { wood: 4 } },
  { t: 'Drink purified water', d: 'Boil seawater in the purifier, collect it and drink (6).', k: 'drank', n: 1, r: { coins: 15 } },
  { t: 'Plant some seeds', d: 'Build a Planter, then press E beside it to plant.', k: 'planted', n: 1, r: { seedPotato: 2 } },
  { t: 'Harvest a crop', d: 'Water crops to make them grow nearly twice as fast.', k: 'harvest', n: 1, r: { coins: 20 } },
  { t: 'Expand your raft', d: 'Build 2 new foundations with the Hammer.', k: 'tiles', n: 2, r: { plastic: 4, wood: 4 } },
  { t: 'Trade with Marlo', d: 'The merchant visits every day between 09:00 and 15:00.', k: 'sold', n: 1, r: { coins: 25 } },
  { t: 'Build a Debris Net', d: 'Place it on an outer edge to catch debris automatically.', k: 'b:net', n: 1, r: { fiber: 4 } },
  { t: 'Build a Fish Trap', d: 'Fish traps fill up even while you are away.', k: 'b:trap', n: 1, r: { coins: 20 } },
  { t: 'Grow your raft to 16 tiles', d: 'A bigger home holds more of everything.', k: 'tileCount', n: 16, r: { coins: 60 } },
  { t: 'Earn 400 coins trading', d: 'Sell your fish and crops to Marlo.', k: 'earned', n: 400, r: { coins: 100 } },
  { t: 'Survive 10 days', d: 'You are becoming a true sea dweller.', k: 'day', n: 10, r: { coins: 200 } },
  { t: 'Build a Smokehouse', d: 'Load raw fish; it smokes them slowly into valuable smoked fish.', k: 'b:smoker', n: 1, r: { coins: 30 } },
  { t: 'Build a Pearl Bed', d: 'Oysters on an outer edge grow pearls over time. Marlo pays well.', k: 'b:pearl', n: 1, r: { coins: 40 } },
  { t: 'Hire Pip the crab', d: 'Buy the Hermit Crab Helper from Marlo to automate collection.', k: 'crab', n: 1, r: { coins: 50 } },
  { t: 'Build an Auto Winch', d: 'Place it on an edge; it reels in debris on its own.', k: 'b:winch', n: 1, r: { coins: 40 } },
  { t: 'Build a Sprinkler', d: 'Put it next to planters to water them automatically.', k: 'b:sprinkler', n: 1, r: { coins: 40 } },
  { t: 'Build a Trade Buoy', d: 'It auto-sells your spare goods, even while you are away.', k: 'b:buoy', n: 1, r: { coins: 60 } },
  {
    t: 'Reach Renown level 8',
    d: 'Everything you gather earns renown. Each level speeds up all stations.',
    k: 'renown',
    n: 8,
    r: { coins: 300 },
  },
];
export const NAMES = ['Seabreeze', 'Saltwind', 'Lantern Bay', 'Driftwood Haven', 'Coral Rest', 'Gullsong', 'Bluewater', 'Tidewatch'];
export const INV0 = {
  wood: 8,
  plastic: 4,
  fiber: 2,
  scrap: 1,
  rawFish: 0,
  cookedFish: 1,
  water: 1,
  potato: 0,
  melon: 0,
  seedPotato: 3,
  seedMelon: 0,
  coins: 15,
};
