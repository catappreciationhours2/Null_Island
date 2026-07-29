// src/lib/data/defaultInventory.js
// Starting inventory items given to every new player.
// These are the items in a fresh save — edit freely.

export const DEFAULT_INVENTORY = [
  { id: 'i1', label: 'Tome of Focus',    icon: '📜', rarity: 'rare',      type: 'accessory', equipped: false, equip: null },
  { id: 'i2', label: 'Clarity Vial',     icon: '⚗️', rarity: 'common',    type: 'accessory', equipped: false, equip: null },
  { id: 'i3', label: 'Pixel Sword',      icon: '🗡️', rarity: 'epic',      type: 'weapon',    equipped: false, equip: null },
  { id: 'i4', label: 'Herbalist Badge',  icon: '🌿', rarity: 'common',    type: 'badge',     equipped: false, equip: null },
  { id: 'i5', label: 'Archive Key',      icon: '🔑', rarity: 'legendary', type: 'accessory', equipped: false, equip: null },
  { id: 'i6', label: 'Ember Fragment',   icon: '🔥', rarity: 'rare',      type: 'accessory', equipped: false, equip: null },
];
