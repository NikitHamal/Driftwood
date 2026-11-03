const s = (b, v = '0 0 24 24') => `<svg viewBox="${v}" aria-hidden="true">${b}</svg>`;
export const ICON = {
  cam: s(
    '<path fill="currentColor" d="M4 7h3l1.5-2h7L17 7h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.6" fill="rgba(0,0,0,.35)"/>',
  ),
  pearl: s('<circle cx="12" cy="13" r="6.5" fill="currentColor"/><circle cx="9.6" cy="10.6" r="2" fill="rgba(255,255,255,.7)"/>'),
  smoked: s(
    '<path fill="currentColor" d="M3 13c3-4 8-5 12-3l4-3v10l-4-3c-4 2-9 1-12-1z"/><path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" d="M8 7c-1-1.5 1-2.5 0-4M12 7c-1-1.5 1-2.5 0-4"/>',
  ),
  crab: s(
    '<ellipse cx="12" cy="14" rx="6" ry="4" fill="currentColor"/><circle cx="4.5" cy="8" r="2.4" fill="currentColor"/><circle cx="19.5" cy="8" r="2.4" fill="currentColor"/><path stroke="currentColor" stroke-width="1.8" stroke-linecap="round" d="M6 12 4.5 9M18 12l1.5-3M7 17l-3 2.5M17 17l3 2.5M9 18l-1.5 3M15 18l1.5 3"/>',
  ),
  crate: s(
    '<path fill="currentColor" d="M3 6h18v14H3z"/><path stroke="rgba(0,0,0,.35)" stroke-width="1.6" d="M3 11h18M3 15.5h18M3 6l18 14"/>',
  ),
  heart: s(
    '<path fill="currentColor" d="M12 20.5s-7.6-4.6-9.4-9.3C1.2 7.6 3.6 4.5 7 4.5c2 0 3.5 1 5 2.9 1.5-1.9 3-2.9 5-2.9 3.4 0 5.8 3.1 4.4 6.7C19.6 15.9 12 20.5 12 20.5z"/>',
  ),
  food: s(
    '<path fill="currentColor" d="M14.8 3.2a6 6 0 0 0-5.6 7.9l-4.6 4.6a2.2 2.2 0 1 0-1.3 3.7 2.2 2.2 0 1 0 3.7-1.3l4.6-4.6a6 6 0 1 0 3.2-10.3z"/>',
  ),
  drop: s('<path fill="currentColor" d="M12 2.6S5 10.3 5 14.7a7 7 0 0 0 14 0C19 10.3 12 2.6 12 2.6z"/>'),
  sun: s(
    '<circle cx="12" cy="12" r="4.6" fill="currentColor"/><g stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/></g>',
  ),
  moon: s('<path fill="currentColor" d="M20 14.6A8.4 8.4 0 1 1 9.4 4a6.8 6.8 0 0 0 10.6 10.6z"/>'),
  rain: s(
    '<path fill="currentColor" d="M7 14a4.5 4.5 0 0 1-.4-9A6 6 0 0 1 18 6.6 3.8 3.8 0 0 1 17.5 14z"/><g stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 17l-1 3M12 17l-1 3M16 17l-1 3"/></g>',
  ),
  coin: s(
    '<circle cx="12" cy="12" r="9" fill="currentColor"/><circle cx="12" cy="12" r="6" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="1.6"/><path d="M12 8.5v7" stroke="rgba(0,0,0,.3)" stroke-width="2" stroke-linecap="round"/>',
  ),
  wood: s(
    '<rect x="2" y="8" width="17" height="8.5" rx="4.2" fill="currentColor"/><ellipse cx="18.5" cy="12.2" rx="3.2" ry="4.2" fill="#f3d9a8"/><ellipse cx="18.5" cy="12.2" rx="1.4" ry="2" fill="none" stroke="#a87b4f" stroke-width="1"/>',
  ),
  plastic: s(
    '<path fill="currentColor" d="M10 2h4v3l1.5 2.5V20a2 2 0 0 1-2 2h-3a2 2 0 0 1-2-2V7.5L10 5z"/><rect x="9.6" y="11" width="4.8" height="4" rx="1" fill="rgba(255,255,255,.5)"/>',
  ),
  fiber: s(
    '<path fill="currentColor" d="M20 3C10 3 4 8 4 15c0 2 .6 3.8 1.6 5.2L4 22l1.5.5 1.4-1.5A8 8 0 0 0 11 22c7 0 9-9 9-19z"/><path d="M7 19C10 14 13 10 17 7" stroke="rgba(0,0,0,.25)" stroke-width="1.5" fill="none"/>',
  ),
  scrap: s(
    '<path fill="currentColor" d="M10.3 2h3.4l.5 2.6 1.9.8 2.2-1.5 2.4 2.4-1.5 2.2.8 1.9 2.6.5v3.4l-2.6.5-.8 1.9 1.5 2.2-2.4 2.4-2.2-1.5-1.9.8-.5 2.6h-3.4l-.5-2.6-1.9-.8-2.2 1.5-2.4-2.4 1.5-2.2-.8-1.9L2 13.7v-3.4l2.6-.5.8-1.9-1.5-2.2 2.4-2.4 2.2 1.5 1.9-.8z"/><circle cx="12" cy="12" r="3.3" fill="rgba(0,0,0,.35)"/>',
  ),
  fish: s(
    '<path fill="currentColor" d="M2.5 12c2.8-4.8 9-6.2 13.4-2.8L21.5 6v12l-5.6-3.2C11.5 18.2 5.3 16.8 2.5 12z"/><circle cx="7.3" cy="11" r="1.2" fill="rgba(0,0,0,.45)"/>',
  ),
  cooked: s(
    '<path fill="currentColor" d="M2.5 14c2.8-4.2 9-5.4 13.4-2.4L21.5 9v10.5l-5.6-2.8C11.5 19.6 5.3 18.4 2.5 14z"/><g stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"><path d="M8 7c-1-1.3 1-2 0-3.5M12 7c-1-1.3 1-2 0-3.5M16 7.5c-1-1.3 1-2 0-3.5"/></g>',
  ),
  water: s(
    '<path fill="currentColor" d="M9 2h6v2.5l1.7 2.3V20a2 2 0 0 1-2 2H9.3a2 2 0 0 1-2-2V6.8L9 4.5z"/><path fill="rgba(255,255,255,.65)" d="M12 10s-2.4 2.7-2.4 4.2a2.4 2.4 0 0 0 4.8 0C14.4 12.7 12 10 12 10z"/>',
  ),
  potato: s(
    '<path fill="currentColor" d="M6 7c3-4 10-4 13 0s1 11-5 12-11-2-11-6 1-4 3-6z"/><g fill="rgba(0,0,0,.25)"><circle cx="9" cy="10" r="1"/><circle cx="14" cy="13" r="1"/><circle cx="11" cy="16" r=".9"/></g>',
  ),
  melon: s(
    '<circle cx="12" cy="12.5" r="9" fill="currentColor"/><path d="M12 3.5c-3 3-3 15 0 18M12 3.5c3 3 3 15 0 18M5 7c2 3 2 8 0 11M19 7c-2 3-2 8 0 11" stroke="rgba(0,0,0,.25)" stroke-width="1.4" fill="none"/>',
  ),
  seed: s(
    '<path fill="currentColor" d="M12 3c4 4 6 7.5 6 11a6 6 0 0 1-12 0c0-3.5 2-7 6-11z"/><path d="M12 9v9" stroke="rgba(0,0,0,.25)" stroke-width="1.5"/>',
  ),
  hook: s(
    '<g fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M15 2.5v11a4.5 4.5 0 0 1-9 0v-3"/><path d="M6 10.5l-2.3 2.3"/><circle cx="15" cy="3" r="1.3"/></g>',
  ),
  rod: s(
    '<g fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M3 21L19 3"/><path d="M19 3c2 6 2 10 1 14"/><circle cx="7" cy="16.5" r="2.2"/></g><circle cx="20" cy="18.5" r="1.6" fill="currentColor"/>',
  ),
  hammer: s(
    '<path fill="currentColor" d="M13.5 3.5l4.5-1 4 4-1.2 1.2-2-.7-2.3 2.3 1 1-1.6 1.6-4.4-4.4 1.6-1.6 1 1z"/><path fill="currentColor" d="M11.2 9.2l3.6 3.6L5.6 22a2.5 2.5 0 0 1-3.6-3.6z"/>',
  ),
  eat: s(
    '<path fill="currentColor" d="M7 2v8a3 3 0 0 0 2 2.8V22h2v-9.2A3 3 0 0 0 13 10V2h-1.5v7h-1V2h-1v7h-1V2zM17 2c-2 1-3 4-3 8h2.5v12h2V2z"/>',
  ),
  tile: s(
    '<rect x="3" y="3" width="18" height="18" rx="2" fill="currentColor"/><path d="M3 9h18M3 15h18" stroke="rgba(0,0,0,.25)" stroke-width="1.6"/>',
  ),
  fire: s(
    '<path fill="currentColor" d="M12 2c1 4 5 6 5 11a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-6 1-9.5z"/><path fill="rgba(255,255,255,.4)" d="M12 13c1 1.5 2 2.5 2 4a2 2 0 0 1-4 0c0-1.5 1-2.5 2-4z"/>',
  ),
  plant: s(
    '<path fill="currentColor" d="M11 12C11 7 8 4 3 4c0 5 3 8 8 8zM13 10c0-4 3-7 8-7 0 4-3 7-8 7z"/><path d="M12 22v-12" stroke="currentColor" stroke-width="2"/><path fill="currentColor" d="M6 16h12l-1.5 6h-9z"/>',
  ),
  net: s(
    '<g fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9.3h18M3 14.6h18M9 4v16M15 4v16"/></g>',
  ),
  lamp: s(
    '<path fill="currentColor" d="M9 3h6l1 2H8zM7 6h10v11H7z"/><path fill="rgba(255,255,255,.55)" d="M9 8h6v7H9z"/><path fill="currentColor" d="M8 18h8v2H8z"/>',
  ),
  gear: s(
    '<path fill="currentColor" d="M10.3 2h3.4l.5 2.6 1.9.8 2.2-1.5 2.4 2.4-1.5 2.2.8 1.9 2.6.5v3.4l-2.6.5-.8 1.9 1.5 2.2-2.4 2.4-2.2-1.5-1.9.8-.5 2.6h-3.4l-.5-2.6-1.9-.8-2.2 1.5-2.4-2.4 1.5-2.2-.8-1.9L2 13.7v-3.4l2.6-.5.8-1.9-1.5-2.2 2.4-2.4 2.2 1.5 1.9-.8z"/><circle cx="12" cy="12" r="3.4" fill="#0d2b33"/>',
  ),
  pause: s(
    '<rect x="6" y="4" width="4" height="16" rx="1.2" fill="currentColor"/><rect x="14" y="4" width="4" height="16" rx="1.2" fill="currentColor"/>',
  ),
  bag: s('<path fill="currentColor" d="M8 7V6a4 4 0 0 1 8 0v1h3l1 14H4L5 7zm2 0h4V6a2 2 0 0 0-4 0z"/>'),
  close: s('<path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>'),
  check: s(
    '<path d="M5 12.5l4.5 4.5L19 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>',
  ),
  star: s('<path fill="currentColor" d="M12 2.5l2.9 6 6.6.8-4.9 4.6 1.3 6.6L12 17.2l-5.9 3.3 1.3-6.6L2.5 9.3l6.6-.8z"/>'),
  boat: s('<path fill="currentColor" d="M11 2v12H4zM13 5l6 9h-6zM2 16h20l-3 5H5z"/>'),
  shark: s(
    '<path fill="currentColor" d="M3 17c4-1 6-6 8-13 2 5 5 9 10 12z"/><path d="M1 20c2 0 2-1.5 4-1.5S7 20 9 20s2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5" fill="none" stroke="currentColor" stroke-width="1.6"/>',
  ),
  cat: s(
    '<path fill="currentColor" d="M5 3l3 4h8l3-4v9a7 7 0 0 1-14 0z"/><circle cx="9.3" cy="12" r="1.2" fill="#0d2b33"/><circle cx="14.7" cy="12" r="1.2" fill="#0d2b33"/>',
  ),
  bed: s(
    '<path fill="currentColor" d="M2 6h2v7h16a2 2 0 0 1 2 2v5h-2v-2H4v2H2z"/><rect x="6" y="9" width="5" height="3" rx="1" fill="currentColor"/>',
  ),
  ladder: s('<g stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M7 2v20M17 2v20M7 6h10M7 11h10M7 16h10"/></g>'),
  up: s(
    '<path d="M12 19V5M5 12l7-7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
  ),
  quest: s('<path fill="currentColor" d="M5 3h11l3 3v15H5z"/><path d="M8 9h8M8 13h8M8 17h5" stroke="#0d2b33" stroke-width="1.6"/>'),
  trash: s('<path fill="currentColor" d="M9 3h6l1 2h4v2H4V5h4zM6 8h12l-1 13H7z"/>'),
};
export const ITEM = {
  wood: { name: 'Wood', icon: 'wood', color: '#c99a63' },
  plastic: { name: 'Plastic', icon: 'plastic', color: '#7ec8e3' },
  fiber: { name: 'Fiber', icon: 'fiber', color: '#8bc34a' },
  scrap: { name: 'Scrap Metal', icon: 'scrap', color: '#b0bec5' },
  rawFish: { name: 'Raw Fish', icon: 'fish', color: '#90caf9' },
  cookedFish: { name: 'Cooked Fish', icon: 'cooked', color: '#ffb74d' },
  water: { name: 'Fresh Water', icon: 'water', color: '#4fc3f7' },
  potato: { name: 'Potato', icon: 'potato', color: '#d7b377' },
  melon: { name: 'Melon', icon: 'melon', color: '#81c784' },
  seedPotato: { name: 'Potato Seeds', icon: 'seed', color: '#c5a46d' },
  seedMelon: { name: 'Melon Seeds', icon: 'seed', color: '#a5d6a7' },
  smokedFish: { name: 'Smoked Fish', icon: 'smoked', color: '#d98a4a' },
  pearl: { name: 'Pearl', icon: 'pearl', color: '#f3e9ff' },
  coins: { name: 'Coins', icon: 'coin', color: '#ffd54f' },
};
