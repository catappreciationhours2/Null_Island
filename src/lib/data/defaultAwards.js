// src/lib/data/defaultAwards.js
// Awards pre-loaded into a fresh save (for demo / onboarding purposes).
// These are NOT the achievement rules — see achievementRules.js for those.
// Remove or change these as you like; they only appear on first load.

export const DEFAULT_AWARDS = [
  { id: 'a1', label: 'First Flame',  type: 'normal',  desc: 'Completed your first task',          icon: '🔥' },
  { id: 'a2', label: '7-Day Ember',  type: 'special', desc: 'Special: unlocks hidden quest chain', icon: '💎' },
  { id: 'a3', label: 'Night Owl',    type: 'normal',  desc: '5 tasks completed after 10pm',        icon: '🦉' },
  { id: 'a4', label: 'Depth Seeker', type: 'special', desc: 'Special: unlocks the Deep Archive',   icon: '🗝️' },
  { id: 'a5', label: 'Word Smith',   type: 'normal',  desc: 'Created 10 writing tasks',            icon: '✍️' },
  { id: 'a6', label: 'Iron Will',    type: 'normal',  desc: 'Completed 5 hard tasks in a row',     icon: '⚔️' },
];
