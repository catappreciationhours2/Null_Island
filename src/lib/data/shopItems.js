// src/lib/data/shopItems.js
// Default items available to buy in the Shop → Browse tab.
// Fields: id (unique), label, icon (emoji), rarity, type, price (gold), desc.
// Rarity: 'common' | 'rare' | 'epic' | 'legendary'
// Type:   'weapon' | 'clothing' | 'accessory' | 'body' | 'hair' | 'outfit' | 'expression' | 'bg'

export const SHOP_DEFAULT_ITEMS = [
  { id: 's1',  label: 'Oak Staff',           icon: '🪄', rarity: 'common',    type: 'weapon',    price: 60,  desc: 'A sturdy staff carved from ancient oak.' },
  { id: 's2',  label: 'Moonstone Ring',       icon: '💍', rarity: 'rare',      type: 'accessory', price: 120, desc: 'Glows faintly under moonlight.' },
  { id: 's3',  label: 'Leather Cloak',        icon: '🧥', rarity: 'common',    type: 'clothing',  price: 80,  desc: 'Worn but reliable. Keeps the chill out.' },
  { id: 's4',  label: "Scholar's Tome",       icon: '📚', rarity: 'rare',      type: 'accessory', price: 150, desc: '+5 Learning on equip.' },
  { id: 's5',  label: 'Iron Shield',          icon: '🛡️', rarity: 'common',   type: 'weapon',    price: 90,  desc: 'Solid protection. Dented but dependable.' },
  { id: 's6',  label: 'Witch Hat',            icon: '🎩', rarity: 'epic',      type: 'clothing',  price: 200, desc: 'Adds an air of mystery to any outfit.' },
  { id: 's7',  label: 'Golden Compass',       icon: '🧭', rarity: 'rare',      type: 'accessory', price: 175, desc: 'Always points toward your goals.' },
  { id: 's8',  label: 'Flame Gauntlet',       icon: '🧤', rarity: 'epic',      type: 'clothing',  price: 220, desc: 'Heat resistant. Looks incredible.' },
  { id: 's9',  label: "Philosopher's Eye",    icon: '🔮', rarity: 'legendary', type: 'accessory', price: 500, desc: 'Reveals hidden patterns in everything.' },
  { id: 's10', label: 'Forest Boots',         icon: '👢', rarity: 'common',    type: 'clothing',  price: 70,  desc: 'Silent on any terrain.' },
  { id: 's11', label: 'Storm Amulet',         icon: '⚡', rarity: 'rare',      type: 'accessory', price: 140, desc: 'Crackles with stored energy.' },
  { id: 's12', label: 'Shadow Dagger',        icon: '🔪', rarity: 'epic',      type: 'weapon',    price: 280, desc: 'Leaves no trace. Hacker-exclusive lore.' },
];
