// src/lib/data/achievementRules.js
// Achievement / badge definitions.
//
// Each rule:
//   id        – unique string key (also used as localStorage key)
//   label     – display name
//   icon      – emoji
//   type      – 'normal' | 'special'
//   desc      – short description shown in Awards
//   repeatable– if true, badge is awarded every time check passes (e.g. time-of-day badges)
//   check(state, ts) – returns true when the badge should be granted
//                      state = full appState object
//                      ts    = timestamp of the triggering event (ms)
//
// To add a new achievement: copy an existing entry, give it a unique id, and write your check().

export const ACHIEVEMENT_RULES = [
  // ── Milestone badges ────────────────────────────────────────────────────
  {
    id: 'first_task',
    label: 'First Flame',
    icon: '🔥',
    type: 'normal',
    desc: 'Completed your first task',
    check: (state) => state.player.totalDone >= 1,
  },
  {
    id: 'ten_tasks',
    label: 'Decade',
    icon: '🌟',
    type: 'normal',
    desc: '10 tasks completed',
    check: (state) => state.player.totalDone >= 10,
  },
  {
    id: 'fifty_tasks',
    label: 'Half-Century',
    icon: '🏅',
    type: 'normal',
    desc: '50 tasks completed',
    check: (state) => state.player.totalDone >= 50,
  },
  // ── Streak badges ────────────────────────────────────────────────────────
  {
    id: 'streak_7',
    label: '7-Day Ember',
    icon: '💎',
    type: 'special',
    desc: 'Maintained a 7-day streak',
    check: (state) => (state.player.longestStreak || 0) >= 7,
  },
  {
    id: 'streak_30',
    label: 'Eternal Flame',
    icon: '🌋',
    type: 'special',
    desc: 'Maintained a 30-day streak',
    check: (state) => (state.player.longestStreak || 0) >= 30,
  },
  // ── Level badges ─────────────────────────────────────────────────────────
  {
    id: 'level_5',
    label: 'Apprentice+',
    icon: '📈',
    type: 'normal',
    desc: 'Reached Level 5',
    check: (state) => state.player.level >= 5,
  },
  // ── Difficulty badges ─────────────────────────────────────────────────────
  {
    id: 'hard_5',
    label: 'Iron Will',
    icon: '⚔️',
    type: 'normal',
    desc: '5 hard tasks completed',
    check: (state) => state.taskHistory.filter(t => t.difficulty === 'hard').length >= 5,
  },
  // ── Time-of-day badges (repeatable) ──────────────────────────────────────
  {
    id: 'early_bird',
    label: 'Early Bird',
    icon: '🌅',
    type: 'normal',
    desc: 'Collected a task between 5am–9am',
    repeatable: true,
    check: (_state, ts) => {
      const h = new Date(ts).getHours();
      return h >= 5 && h < 9;
    },
  },
  {
    id: 'night_owl',
    label: 'Night Owl',
    icon: '🦉',
    type: 'normal',
    desc: 'Collected a task after 10pm or before 3am',
    repeatable: true,
    check: (_state, ts) => {
      const h = new Date(ts).getHours();
      return h >= 22 || h < 3;
    },
  },
  {
    id: 'midday',
    label: 'Sun-Chaser',
    icon: '☀️',
    type: 'normal',
    desc: 'Collected a task at noon (11am–1pm)',
    repeatable: true,
    check: (_state, ts) => {
      const h = new Date(ts).getHours();
      return h >= 11 && h < 13;
    },
  },
  // ── Focus badges ──────────────────────────────────────────────────────────
  {
    id: 'focus_50',
    label: 'Flow State',
    icon: '🎯',
    type: 'normal',
    desc: '50 focus sessions completed',
    check: (state) => (state.player.focusUses || 0) >= 50,
  },
  {
    id: 'focus_500',
    label: 'Locked In',
    icon: '🧠',
    type: 'special',
    desc: "500 focus sessions — you're dedicated",
    check: (state) => (state.player.focusUses || 0) >= 500,
  },
  // ── Attribute badges ──────────────────────────────────────────────────────
  {
    id: 'learning_10',
    label: 'Scholar',
    icon: '📚',
    type: 'normal',
    desc: '10 learning tasks completed',
    check: (state) => (state.player.attributes.learning || 0) >= 10,
  },
  {
    id: 'learning_50',
    label: 'Archivist',
    icon: '🗃️',
    type: 'special',
    desc: '50 learning tasks completed',
    check: (state) => (state.player.attributes.learning || 0) >= 50,
  },
  {
    id: 'creative_10',
    label: 'Artisan',
    icon: '🎨',
    type: 'normal',
    desc: '10 creative tasks or customisations',
    check: (state) => (state.player.attributes.creativity || 0) >= 10,
  },
  // ── Time badges ───────────────────────────────────────────────────────────
  {
    id: 'time_100h',
    label: 'Century',
    icon: '⏱️',
    type: 'special',
    desc: '100 hours of focused work',
    check: (state) => (state.player.totalTime || 0) >= 6000,
  },
  // ── Special / manual badges ───────────────────────────────────────────────
  {
    id: 'depth_seeker',
    label: 'Depth Seeker',
    icon: '🗝️',
    type: 'special',
    desc: 'Special: unlocks the Deep Archive',
    check: () => false, // granted manually / future quest
  },
];
