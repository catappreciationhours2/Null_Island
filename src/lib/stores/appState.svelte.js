// src/lib/stores/appState.svelte.js
// Svelte 5 runes — single source of truth.

// ─────────────────────────────────────────
// PERSISTENCE HELPERS
// ─────────────────────────────────────────
// @ts-ignore
function load(key, fallback) {
  if (typeof localStorage === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

// @ts-ignore
function save(key, val) {
  if (typeof localStorage === 'undefined') return;
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

// ─────────────────────────────────────────
// TAG CATEGORIES
// ─────────────────────────────────────────
export const LEARNING_TAGS = ['law', 'technology', 'biology', 'physics', 'engineering', 'space', 'science'];
export const CREATIVE_TAGS  = ['art', 'history', 'make', 'literature'];

// ─────────────────────────────────────────
// MONTHLY CARD DATA  (Jun 2025 → Dec 2027)
// ─────────────────────────────────────────
export const MONTHLY_CARD_DATA = {
  '2025-06': { label: 'Jun: Solstice',  icon: '☀️',  desc: 'June 2025 · the beginning' },
  '2025-07': { label: 'Jul: Tide',      icon: '🌊',  desc: 'July 2025 · flow with the current' },
  '2025-08': { label: 'Aug: Ember',     icon: '🔥',  desc: 'August 2025 · burn steady' },
  '2025-09': { label: 'Sep: Harvest',   icon: '🍂',  desc: 'September 2025 · collect what you planted' },
  '2025-10': { label: 'Oct: Veil',      icon: '🌑',  desc: 'October 2025 · the thinning of things' },
  '2025-11': { label: 'Nov: Fog',       icon: '🌫️', desc: 'November 2025 · visibility low, pace steady' },
  '2025-12': { label: 'Dec: Lantern',   icon: '🏮',  desc: 'December 2025 · light in the long dark' },
  '2026-01': { label: 'Jan: Frost',     icon: '❄️',  desc: 'January 2026 · cold start, clear mind' },
  '2026-02': { label: 'Feb: Drift',     icon: '🌬️', desc: 'February 2026 · let it settle' },
  '2026-03': { label: 'Mar: Thaw',      icon: '🫧',  desc: 'March 2026 · things begin to move' },
  '2026-04': { label: 'Apr: Cipher',    icon: '🔐',  desc: 'April 2026 · decode the pattern' },
  '2026-05': { label: 'May: Bloom',     icon: '🌸',  desc: 'May 2026 · something is growing' },
  '2026-06': { label: 'Jun: Haze',      icon: '🌿',  desc: 'June 2026 · warm and full of motion' },
  '2026-07': { label: 'Jul: Mirage',    icon: '🌅',  desc: 'July 2026 · keep going' },
  '2026-08': { label: 'Aug: Monsoon',   icon: '🌧️', desc: 'August 2026 · let it rain' },
  '2026-09': { label: 'Sep: Amber',     icon: '🍁',  desc: 'September 2026 · things hold colour' },
  '2026-10': { label: 'Oct: Shadow',    icon: '🕸️', desc: 'October 2026 · the archive grows' },
  '2026-11': { label: 'Nov: Iron',      icon: '⚙️',  desc: 'November 2026 · built to last' },
  '2026-12': { label: 'Dec: Solstice',  icon: '✨',  desc: 'December 2026 · the year closes' },
  '2027-01': { label: 'Jan: Silence',   icon: '🤍',  desc: 'January 2027 · space to begin' },
  '2027-02': { label: 'Feb: Pulse',     icon: '❤️',  desc: 'February 2027 · something alive here' },
  '2027-03': { label: 'Mar: Bloom',     icon: '🌺',  desc: 'March 2027 · second spring' },
  '2027-04': { label: 'Apr: Fracture',  icon: '⚡',  desc: 'April 2027 · break and rebuild' },
  '2027-05': { label: 'May: Ritual',    icon: '🕯️', desc: 'May 2027 · the practice deepens' },
  '2027-06': { label: 'Jun: Prism',     icon: '🔮',  desc: 'June 2027 · light through glass' },
  '2027-07': { label: 'Jul: Zenith',    icon: '🌟',  desc: 'July 2027 · peak of the arc' },
  '2027-08': { label: 'Aug: Flux',      icon: '🌀',  desc: 'August 2027 · everything in motion' },
  '2027-09': { label: 'Sep: Archive',   icon: '📚',  desc: 'September 2027 · the record grows' },
  '2027-10': { label: 'Oct: Phantom',   icon: '👻',  desc: 'October 2027 · haunt the old patterns' },
  '2027-11': { label: 'Nov: Ruin',      icon: '🏚️', desc: 'November 2027 · beautiful wreckage' },
  '2027-12': { label: 'Dec: Epoch',     icon: '🌍',  desc: 'December 2027 · end of an era' },
};

// Build the full ordered list of month keys
export function getAllMonthKeys() {
  const keys = [];
  const start = new Date(2025, 5, 1); // Jun 2025
  const end   = new Date(2027, 11, 1); // Dec 2027
  let d = new Date(start);
  while (d <= end) {
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    d.setMonth(d.getMonth() + 1);
  }
  return keys;
}

export function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// ─────────────────────────────────────────
// DEFAULT DATA
// ─────────────────────────────────────────
const DEFAULT_PLAYER = {
  name: 'Aevyn', xp: 0, level: 1, gold: 0, streak: 0,
  lastActive: null, totalDone: 0,
  // New fields
  totalTime: 0,        // total minutes spent on chunks
  longestStreak: 0,    // all-time longest streak
  focusUses: 0,        // times focus mode activated
  attributes: { focus: 0, creativity: 0, consistency: 0, learning: 0, endurance: 0 }
};

const DEFAULT_INVENTORY = [
  { id: 'i1', label: 'Tome of Focus',    icon: '📜', rarity: 'rare',      type: 'accessory', equipped: false, equip: null },
  { id: 'i2', label: 'Clarity Vial',     icon: '⚗️', rarity: 'common',    type: 'accessory', equipped: false, equip: null },
  { id: 'i3', label: 'Pixel Sword',      icon: '🗡️', rarity: 'epic',      type: 'weapon',    equipped: false, equip: null },
  { id: 'i4', label: 'Herbalist Badge',  icon: '🌿', rarity: 'common',    type: 'badge',     equipped: false, equip: null },
  { id: 'i5', label: 'Archive Key',      icon: '🔑', rarity: 'legendary', type: 'accessory', equipped: false, equip: null },
  { id: 'i6', label: 'Ember Fragment',   icon: '🔥', rarity: 'rare',      type: 'accessory', equipped: false, equip: null },
];

const DEFAULT_AWARDS = [
  { id: 'a1', label: 'First Flame',  type: 'normal',  desc: 'Completed your first task',         icon: '🔥', earnedAt: Date.now() },
  { id: 'a2', label: '7-Day Ember',  type: 'special', desc: 'Special: unlocks hidden quest chain',icon: '💎', earnedAt: Date.now() },
  { id: 'a3', label: 'Night Owl',    type: 'normal',  desc: '5 tasks completed after 10pm',       icon: '🦉', earnedAt: Date.now() },
  { id: 'a4', label: 'Depth Seeker', type: 'special', desc: 'Special: unlocks the Deep Archive',  icon: '🗝️',earnedAt: Date.now() },
  { id: 'a5', label: 'Word Smith',   type: 'normal',  desc: 'Created 10 writing tasks',           icon: '✍️',earnedAt: Date.now() },
  { id: 'a6', label: 'Iron Will',    type: 'normal',  desc: 'Completed 5 hard tasks in a row',    icon: '⚔️',earnedAt: Date.now() },
];

const SHOP_DEFAULT_ITEMS = [
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

export const NPC_CRAFTSMEN = [
  {
    id: 'tailor', name: 'Mireille', title: 'The Tailor', icon: '🧵', cost: 50,
    desc: 'Crafts custom clothing & cloaks',
    personality: 'refined, slightly dramatic, uses fashion metaphors',
    greetings: [
      "Ah, a visitor! Please, do come in — I was just finishing a rather *spectacular* hemline.",
      "Oh darling, your timing is impeccable. I have thread to spare and ideas to burn.",
      "Welcome to my atelier. Mind the pins — they have opinions of their own.",
      "A customer! How delightful. Tell me, what silhouette are we going for today?",
      "Come in, come in. I can tell just by looking at you that we have *work* to do.",
    ],
    reactions: [
      "Magnificent. Truly, I have outdone myself once again.",
      "Oh this is *divine*. You have impeccable taste. Clearly.",
      "Stunning. I may weep. Just a little. It's very on-brand for me.",
      "Perfection, wrapped in fabric and tied with ambition. That's you now.",
      "I'll remember this commission. Frame-worthy, truly.",
    ],
    itemType: 'clothing',
  },
  {
    id: 'blacksmith', name: 'Rork', title: 'The Blacksmith', icon: '⚒️', cost: 75,
    desc: 'Forges custom weapons & tools',
    personality: 'gruff, honest, secretly sentimental, hates small talk',
    greetings: [
      "Aye. What do you need. Speak fast, I've got iron in the fire.",
      "You look like someone who needs a weapon. Or a tool. Either way, I can help.",
      "Don't touch anything. Tell me what you want. I'll make it. That's how this works.",
      "Heard you coming from three blocks. Good. Means you're not trying to sneak up on me.",
      "Workshop's open. Name's Rork. What are we making.",
    ],
    reactions: [
      "It's done. Don't break it. I mean it.",
      "Good steel. Good work. You won't find better. Now go.",
      "...I'm actually proud of this one. Don't tell anyone I said that.",
      "Functional. Beautiful. Built to outlast everything. Just like me.",
      "Hm. Yeah. That's a good piece. Take care of it.",
    ],
    itemType: 'weapon',
  },
  {
    id: 'artisan', name: 'Pip', title: 'The Artisan', icon: '🎨', cost: 60,
    desc: 'Creates accessories & art pieces',
    personality: 'chaotic enthusiastic, talks too fast, always paint-stained',
    greetings: [
      "OH! A customer! Sorry I'm just — hold on — there we go. Hi! What are we making today?!",
      "You came at the perfect time, I just had the most INCREDIBLE idea and I need someone to make it for.",
      "Welcome welcome welcome! Ignore the mess. Actually no, the mess is part of the process. Sit down!",
      "I was JUST thinking about you! Well, not you specifically, but someone like you. Same thing.",
      "New commission! YES. Okay. Tell me everything. No, wait. Let ME guess first.",
    ],
    reactions: [
      "I LOVE it. I love it so much. This is my best work ever. Until next time.",
      "Oh it's PERFECT. Are you crying? I'm crying. This is fine.",
      "Stunning! Breathtaking! Museum-worthy! Okay maybe that's too much but STILL.",
      "Yes yes YES. That's exactly what I pictured and somehow even better.",
      "Done! Wait — one more tiny detail — DONE. Okay now it's done. Go enjoy it!",
    ],
    itemType: 'accessory',
  },
  {
    id: 'collector', name: 'Vesper', title: 'The Antique Collector', icon: '🏺', cost: 100,
    desc: 'Provides rare relics & curiosities',
    personality: 'mysterious, speaks in half-riddles, knows too much',
    greetings: [
      "I was expecting you. Not today specifically, but... soon. And here you are.",
      "Every object has a story. Yours is still being written. Interesting.",
      "Sit. Don't ask how I got these things. Focus on what you need.",
      "You have the look of someone searching for something they can't name yet.",
      "My collection grows stranger every season. As do my customers. Welcome.",
    ],
    reactions: [
      "This item will serve you in ways you don't yet understand. Keep it close.",
      "Curious. I've never made one quite like that before. It suits you.",
      "Take it. Some objects choose their owners. This one has chosen you.",
      "Remarkable. Even I am surprised, and I am rarely surprised.",
      "Guard it well. Things of meaning have a way of attracting attention.",
    ],
    itemType: 'accessory',
  },
];

// ─────────────────────────────────────────
// XP / REWARD CALCULATION
// ─────────────────────────────────────────
export const XP_PER_LEVEL = 500;
const DIFF_BASE_XP  = { easy: 25, med: 40, hard: 65 };
const DIFF_CHUNKS   = { easy: 2,  med: 3,  hard: 5  };

// @ts-ignore
export function calcReward(task) {
  const chunkMins  = task.chunkMins || 17.5;
  const timeScale  = Math.sqrt(chunkMins / 17.5);
  // @ts-ignore
  const diffMult   = { easy: 1, med: 1.4, hard: 2 }[task.difficulty] || 1;
  // @ts-ignore
  const baseXP     = DIFF_BASE_XP[task.difficulty] || 40;
  const xp         = Math.round(baseXP * diffMult * timeScale);
  const gold       = Math.floor(xp * 0.8);
  return { xp, gold };
}

// ─────────────────────────────────────────
// BLOOM HELPERS
// ─────────────────────────────────────────
export const PALETTE_COTTAGE = ['#f4a8c7','#a8c4f4','#a8f4c4','#f4e4a8','#c4a8f4','#a8f0f4','#f4c4a8'];
export const PALETTE_RETRO   = ['#ff004d','#ffa300','#00e436','#29adff','#ff77a8','#ffccaa','#83769c'];
export const BLOOM_RADIUS    = { easy: 5, med: 9, hard: 15 };
const MAP_COLS = 120;
const MAP_ROWS = 60;

// @ts-ignore
export function buildBloomCells(col, row, difficulty) {
  // @ts-ignore
  const radius  = BLOOM_RADIUS[difficulty] ?? BLOOM_RADIUS.med;
  const cells   = [];
  const visited = new Set();
  // @ts-ignore
  const key     = (c, r) => `${c},${r}`;
  const queue   = [{ c: col, r: row, depth: 0 }];
  visited.add(key(col, row));
  while (queue.length) {
    // @ts-ignore
    const { c, r, depth } = queue.shift();
    if (c < 0 || c >= MAP_COLS || r < 0 || r >= MAP_ROWS) continue;
    cells.push({ c, r });
    if (depth >= radius) continue;
    for (const [dc, dr] of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]]) {
      const nc = c + dc, nr = r + dr, nk = key(nc, nr);
      if (!visited.has(nk) && Math.random() < 0.65 - depth * 0.04) {
        visited.add(nk);
        queue.push({ c: nc, r: nr, depth: depth + 1 });
      }
    }
  }
  return cells;
}

const bloomColorIdx = {};

// @ts-ignore
export function addBloom(taskId, difficulty) {
  const pos = appState.taskPositions[taskId];
  if (!pos) return;
  const cells = buildBloomCells(pos.col, pos.row, difficulty);
  // @ts-ignore
  const cIdx = bloomColorIdx[`${taskId}_c`] ?? Math.floor(Math.random() * PALETTE_COTTAGE.length);
  // @ts-ignore
  const rIdx = bloomColorIdx[`${taskId}_r`] ?? Math.floor(Math.random() * PALETTE_RETRO.length);
  // @ts-ignore
  bloomColorIdx[`${taskId}_c`] = (cIdx + 1) % PALETTE_COTTAGE.length;
  // @ts-ignore
  bloomColorIdx[`${taskId}_r`] = (rIdx + 1) % PALETTE_RETRO.length;
  cells.forEach(({ c, r }) => {
    const prevHacker = [...appState.blooms].reverse().find(b => b.col === c && b.row === r);
    const randomBit  = Math.random() < 0.5 ? 0 : 1;
    const hasExisting = appState.blooms.some(b => b.col === c && b.row === r);
    const cottagePick = hasExisting ? PALETTE_COTTAGE[(cIdx + 1) % PALETTE_COTTAGE.length] : PALETTE_COTTAGE[cIdx % PALETTE_COTTAGE.length];
    const retroPick   = hasExisting ? PALETTE_RETRO[(rIdx + 1) % PALETTE_RETRO.length]   : PALETTE_RETRO[rIdx % PALETTE_RETRO.length];
    appState.blooms.push({
      col: c, row: r,
      cottage_color: cottagePick,
      retro_color: retroPick,
      hacker_bit: prevHacker ? ((prevHacker.hacker_bit ?? 0) ^ randomBit) : randomBit,
    });
  });
}

// @ts-ignore
function ensureTaskPosition(taskId) {
  if (appState.taskPositions[taskId]) return;
  const margin = 6;
  const taken  = Object.values(appState.taskPositions);
  // @ts-ignore
  let col, row, tries = 0;
  do {
    col = margin + Math.floor(Math.random() * (MAP_COLS - margin * 2));
    row = margin + Math.floor(Math.random() * (MAP_ROWS - margin * 2));
    // @ts-ignore
    const clash = taken.some(p => Math.abs(p.col - col) < 10 && Math.abs(p.row - row) < 6);
    if (!clash) break;
  } while (++tries < 300);
  appState.taskPositions[taskId] = { col, row };
}

// ─────────────────────────────────────────
// REACTIVE STATE
// ─────────────────────────────────────────
export const appState = $state({
  theme:    load('hw-theme', 'cottage'),
  activeTab: 'tasks',

  player:        load('hw-player',      DEFAULT_PLAYER),
  tasks:         load('hw-tasks',       []),
  taskHistory:   load('hw-history',     []),
  awards:        load('hw-awards',      DEFAULT_AWARDS),
  inventory:     load('hw-inventory',   DEFAULT_INVENTORY),
  shopItems:     SHOP_DEFAULT_ITEMS,

  // Monthly stats keyed by 'YYYY-MM'
  monthlyStats:  load('hw-monthly-stats', {}),

  blooms:        load('hw-blooms',      []),
  taskPositions: load('hw-task-pos',    {}),

  notifications: [],
  _notifId: 0,

  shopTab: 'browse',
  activeCraftsman: null,
  craftConversation: [],

  profileTab: 'overview',
});

// Migrate old player data: ensure new fields exist
if (appState.player.totalTime      === undefined) appState.player.totalTime      = 0;
if (appState.player.longestStreak  === undefined) appState.player.longestStreak  = appState.player.streak || 0;
if (appState.player.focusUses      === undefined) appState.player.focusUses      = 0;

// ─────────────────────────────────────────
// AUTO-PERSIST
// ─────────────────────────────────────────
$effect.root(() => {
  $effect(() => { save('hw-player',        appState.player); });
  $effect(() => { save('hw-tasks',         appState.tasks); });
  $effect(() => { save('hw-history',       appState.taskHistory); });
  $effect(() => { save('hw-awards',        appState.awards); });
  $effect(() => { save('hw-theme',         appState.theme); });
  $effect(() => { save('hw-blooms',        appState.blooms); });
  $effect(() => { save('hw-task-pos',      appState.taskPositions); });
  $effect(() => { save('hw-monthly-stats', appState.monthlyStats); });
});

// ─────────────────────────────────────────
// MONTHLY STATS HELPER
// ─────────────────────────────────────────
// @ts-ignore
function getOrCreateMonthlyStats(monthKey) {
  if (!appState.monthlyStats[monthKey]) {
    appState.monthlyStats[monthKey] = {
      tasks: 0, xp: 0, gold: 0, time: 0,
      longestStreak: 0, focusUses: 0,
      learningTasks: 0, creativeTasks: 0,
    };
  }
  return appState.monthlyStats[monthKey];
}

// ─────────────────────────────────────────
// THEME
// ─────────────────────────────────────────
export function toggleTheme() {
  const next = appState.theme === 'cottage' ? 'hacker'
             : appState.theme === 'hacker'  ? 'retro'
             : 'cottage';
  appState.theme = next;
  if (typeof document !== 'undefined') document.documentElement.dataset.theme = next;
}

// ─────────────────────────────────────────
// TABS
// ─────────────────────────────────────────
// @ts-ignore
export function setTab(tab) { appState.activeTab = tab; }

// ─────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────
// @ts-ignore
export function notify(message, type = 'info') {
  const id = ++appState._notifId;
  // @ts-ignore
  appState.notifications.push({ id, message, type });
  setTimeout(() => {
    // @ts-ignore
    const idx = appState.notifications.findIndex(n => n.id === id);
    if (idx !== -1) appState.notifications.splice(idx, 1);
  }, 3200);
}

// ─────────────────────────────────────────
// FOCUS MODE
// ─────────────────────────────────────────
/** Call this whenever the user starts a focus session. */
export function addFocusUse() {
  appState.player.focusUses = (appState.player.focusUses || 0) + 1;
  // focus attribute: raw count, max 1000 for radar scaling
  appState.player.attributes.focus = appState.player.focusUses;

  // track in monthly stats
  const key = currentMonthKey();
  const ms  = getOrCreateMonthlyStats(key);
  ms.focusUses = (ms.focusUses || 0) + 1;
}

/** Call this when the player uploads a custom alarm sound (creative credit). */
export function trackCustomSound() {
  appState.player.attributes.creativity = Math.min(
    9999,
    (appState.player.attributes.creativity || 0) + 1
  );
  const key = currentMonthKey();
  const ms  = getOrCreateMonthlyStats(key);
  ms.creativeTasks = (ms.creativeTasks || 0) + 1;
  notify(
    appState.theme === 'hacker' ? '> +1 CREATIVE (custom sound)' : '🎨 +1 Creative — nice customisation',
    'info'
  );
}

// ─────────────────────────────────────────
// TASKS
// ─────────────────────────────────────────
// @ts-ignore
export function createTask(title, difficulty = 'med', tags = [], customChunks = null, chunkMins = null) {
  // @ts-ignore
  const chunks  = customChunks ?? (DIFF_CHUNKS[difficulty] || 3);
  const mins    = chunkMins ?? 17.5;
  const { xp, gold } = calcReward({ difficulty, chunks, chunkMins: mins });

  const id = crypto.randomUUID();
  ensureTaskPosition(id);
  const { col, row } = appState.taskPositions[id];

  const task = {
    id, title, difficulty, chunks, doneChunks: 0,
    chunkMins: mins, tags,
    collected: false, createdAt: Date.now(),
    completedAt: null, collectedAt: null,
    mapX: col / MAP_COLS, mapY: row / MAP_ROWS,
    rewardXP: xp, rewardGold: gold,
  };

  appState.tasks.unshift(task);
  notify(
    appState.theme === 'hacker'
      ? `> TASK CREATED — ${chunks} chunks · ${mins}min each · +${xp}XP on collect`
      : `Task created — split into ${chunks} chunks · ~${mins} min each 🌿`,
    'success'
  );
}

// @ts-ignore
export function tickChunk(taskId) {
  // @ts-ignore
  const task = appState.tasks.find(t => t.id === taskId);
  if (!task || task.doneChunks >= task.chunks) return;
  task.doneChunks++;
  if (task.doneChunks >= task.chunks) {
    task.completedAt = Date.now();
    checkAchievements();
    notify(
      appState.theme === 'hacker'
        ? `> TASK COMPLETE → go collect at map marker`
        : `🌿 Done! Head to the map to collect your reward`,
      'success'
    );
  } else {
    notify(
      appState.theme === 'hacker'
        ? `> CHUNK ${task.doneChunks}/${task.chunks} COMPLETE`
        : `Chunk ${task.doneChunks}/${task.chunks} done! Keep going 🌱`,
      'info'
    );
  }
}

// @ts-ignore
export function collectTask(taskId) {
  // @ts-ignore
  const task = appState.tasks.find(t => t.id === taskId);
  if (!task) return;
  if (task.doneChunks < task.chunks) {
    notify(appState.theme === 'hacker' ? '> ERROR: task incomplete' : 'Finish all chunks first!', 'warn');
    return;
  }
  if (task.collected) {
    notify(appState.theme === 'hacker' ? '> ALREADY CLAIMED' : 'Already collected!', 'warn');
    return;
  }

  const collectedAt = Date.now();
  task.collected    = true;
  task.collectedAt  = collectedAt;

  // ── XP / Gold ──────────────────────────────────────────────────────────
  appState.player.xp   += task.rewardXP;
  appState.player.gold += task.rewardGold;
  appState.player.totalDone += 1;

  // ── Time tracking ───────────────────────────────────────────────────────
  const taskMins = (task.chunks || 1) * (task.chunkMins || 17.5);
  appState.player.totalTime = (appState.player.totalTime || 0) + taskMins;

  // ── Level up ────────────────────────────────────────────────────────────
  const newLevel  = Math.floor(appState.player.xp / XP_PER_LEVEL) + 1;
  const leveledUp = newLevel > appState.player.level;
  if (leveledUp) {
    appState.player.level = newLevel;
    notify(appState.theme === 'hacker'
      ? `> LEVEL UP → LVL ${newLevel} UNLOCKED`
      : `✨ Level up! You're now Level ${newLevel}!`, 'success');
  }

  // ── Attributes ──────────────────────────────────────────────────────────
  const attrs = appState.player.attributes;

  // endurance = total tasks done (sync directly)
  attrs.endurance = appState.player.totalDone;

  // learning: +1 per task tagged with a serious topic
  const isLearning = task.tags?.some(t => LEARNING_TAGS.includes(t));
  if (isLearning) attrs.learning = (attrs.learning || 0) + 1;

  // creative: +1 per task tagged with a chill creative topic
  const isCreative = task.tags?.some(t => CREATIVE_TAGS.includes(t));
  if (isCreative) attrs.creativity = (attrs.creativity || 0) + 1;

  // consistency: synced to longestStreak (updated in updateStreak below)
  // focus: only via addFocusUse(), not here

  // ── Streak + consistency ────────────────────────────────────────────────
  updateStreak(collectedAt);
  attrs.consistency = appState.player.longestStreak;

  // ── History ─────────────────────────────────────────────────────────────
  appState.taskHistory.unshift({ ...task });

  // ── Monthly stats ────────────────────────────────────────────────────────
  const d   = new Date(collectedAt);
  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const ms  = getOrCreateMonthlyStats(key);
  ms.tasks++;
  ms.xp   += task.rewardXP;
  ms.gold += task.rewardGold;
  ms.time  = (ms.time || 0) + taskMins;
  ms.longestStreak = Math.max(ms.longestStreak || 0, appState.player.streak);
  if (isLearning)  ms.learningTasks  = (ms.learningTasks  || 0) + 1;
  if (isCreative)  ms.creativeTasks  = (ms.creativeTasks  || 0) + 1;

  // ── Bloom ───────────────────────────────────────────────────────────────
  ensureTaskPosition(task.id);
  // @ts-ignore
  addBloom(task.id, task.difficulty, appState.theme);

  notify(
    appState.theme === 'hacker'
      ? `> +${task.rewardXP}XP +${task.rewardGold}G ACQUIRED`
      : `✨ +${task.rewardXP} XP and ${task.rewardGold} gold!`,
    'success'
  );

  checkAchievements(collectedAt);
}

// @ts-ignore
function updateStreak(collectedAt = Date.now()) {
  const today     = new Date(collectedAt).toDateString();
  const last      = appState.player.lastActive
    ? new Date(appState.player.lastActive).toDateString()
    : null;
  const yesterday = new Date(collectedAt - 86400000).toDateString();

  if (last === today) {
    // already active today — no change
  } else if (last === yesterday) {
    appState.player.streak++;
  } else {
    appState.player.streak = 1;
  }
  appState.player.lastActive = collectedAt;

  // track all-time longest streak
  appState.player.longestStreak = Math.max(
    appState.player.longestStreak || 0,
    appState.player.streak
  );
}

// ─────────────────────────────────────────
// ACHIEVEMENTS
// ─────────────────────────────────────────
/**
 * ACHIEVEMENT_RULES
 * repeatable: true  → badge can be earned multiple times (e.g. Early Bird each morning)
 * check(collectedAt) → receives the timestamp of the triggering action
 */
export const ACHIEVEMENT_RULES = [
  {
    id: 'first_task',  label: 'First Flame',   icon: '🔥', type: 'normal',
    desc: 'Completed your first task',
    check: () => appState.player.totalDone >= 1,
  },
  {
    id: 'ten_tasks',   label: 'Decade',         icon: '🌟', type: 'normal',
    desc: '10 tasks completed',
    check: () => appState.player.totalDone >= 10,
  },
  {
    id: 'fifty_tasks', label: 'Half-Century',   icon: '🏅', type: 'normal',
    desc: '50 tasks completed',
    check: () => appState.player.totalDone >= 50,
  },
  {
    id: 'streak_7',    label: '7-Day Ember',    icon: '💎', type: 'special',
    desc: 'Maintained a 7-day streak',
    check: () => (appState.player.longestStreak || 0) >= 7,
  },
  {
    id: 'streak_30',   label: 'Eternal Flame',  icon: '🌋', type: 'special',
    desc: 'Maintained a 30-day streak',
    check: () => (appState.player.longestStreak || 0) >= 30,
  },
  {
    id: 'level_5',     label: 'Apprentice+',    icon: '📈', type: 'normal',
    desc: 'Reached Level 5',
    check: () => appState.player.level >= 5,
  },
  {
    id: 'hard_5',      label: 'Iron Will',      icon: '⚔️', type: 'normal',
    desc: '5 hard tasks completed',
    check: () => appState.taskHistory.filter(t => t.difficulty === 'hard').length >= 5,
  },
  // ── Time-of-day badges (use local time, repeatable) ────────────────────
  {
    id: 'early_bird',  label: 'Early Bird',     icon: '🌅', type: 'normal',
    desc: 'Collected a task between 5am–9am',
    repeatable: true,
    // @ts-ignore
    check: (ts = Date.now()) => {
      const h = new Date(ts).getHours(); // local time
      return h >= 5 && h < 9;
    },
  },
  {
    id: 'night_owl',   label: 'Night Owl',      icon: '🦉', type: 'normal',
    desc: 'Collected a task after 10pm or before 3am',
    repeatable: true,
    // @ts-ignore
    check: (ts = Date.now()) => {
      const h = new Date(ts).getHours(); // local time
      return h >= 22 || h < 3;
    },
  },
  {
    id: 'midday',      label: 'Sun-Chaser',     icon: '☀️', type: 'normal',
    desc: 'Collected a task at noon (11am–1pm)',
    repeatable: true,
    // @ts-ignore
    check: (ts = Date.now()) => {
      const h = new Date(ts).getHours();
      return h >= 11 && h < 13;
    },
  },
  // ── Skill badges ─────────────────────────────────────────────────────────
  {
    id: 'focus_50',    label: 'Flow State',     icon: '🎯', type: 'normal',
    desc: '50 focus sessions completed',
    check: () => (appState.player.focusUses || 0) >= 50,
  },
  {
    id: 'focus_500',   label: 'Locked In',      icon: '🧠', type: 'special',
    desc: '500 focus sessions — you\'re dedicated',
    check: () => (appState.player.focusUses || 0) >= 500,
  },
  {
    id: 'learning_10', label: 'Scholar',        icon: '📚', type: 'normal',
    desc: '10 learning tasks completed',
    check: () => (appState.player.attributes.learning || 0) >= 10,
  },
  {
    id: 'learning_50', label: 'Archivist',      icon: '🗃️', type: 'special',
    desc: '50 learning tasks completed',
    check: () => (appState.player.attributes.learning || 0) >= 50,
  },
  {
    id: 'creative_10', label: 'Artisan',        icon: '🎨', type: 'normal',
    desc: '10 creative tasks or customisations',
    check: () => (appState.player.attributes.creativity || 0) >= 10,
  },
  {
    id: 'time_100h',   label: 'Century',        icon: '⏱️', type: 'special',
    desc: '100 hours of focused work',
    check: () => (appState.player.totalTime || 0) >= 6000,
  },
  {
    id: 'depth_seeker',label: 'Depth Seeker',   icon: '🗝️', type: 'special',
    desc: 'Special: unlocks the Deep Archive',
    check: () => false, // granted manually / future quest
  },
];

// @ts-ignore
export function checkAchievements(collectedAt = Date.now()) {
  // Build a map: id → count already earned
  // @ts-ignore
  const earnedCounts = {};
  // @ts-ignore
  for (const a of appState.awards) {
    earnedCounts[a.id] = (earnedCounts[a.id] || 0) + 1;
  }

  for (const rule of ACHIEVEMENT_RULES) {
    const triggered = rule.check(collectedAt);
    if (!triggered) continue;

    if (rule.repeatable) {
      // Always grant repeatable badges when triggered
      appState.awards.push({ ...rule, earnedAt: collectedAt });
      notify(
        appState.theme === 'hacker'
          ? `> BADGE: ${rule.label}`
          : `🏅 Badge: ${rule.label}!`,
        'success'
      );
    } else if (!earnedCounts[rule.id]) {
      // Only grant once
      appState.awards.push({ ...rule, earnedAt: collectedAt });
      earnedCounts[rule.id] = 1;
      notify(
        appState.theme === 'hacker'
          ? `> ACHIEVEMENT UNLOCKED: ${rule.label}`
          : `🏆 Achievement unlocked: ${rule.label}!`,
        'success'
      );
    }
  }
}

// ─────────────────────────────────────────
// INVENTORY / EQUIP
// ─────────────────────────────────────────
// @ts-ignore
export function toggleEquip(itemId) {
  // @ts-ignore
  const item = appState.inventory.find(i => i.id === itemId);
  if (!item) return;
  item.equipped = !item.equipped;
  notify(
    appState.theme === 'hacker'
      ? `> ITEM ${item.equipped ? 'EQUIPPED' : 'UNEQUIPPED'}: ${item.label}`
      : `${item.equipped ? '⚔️ Equipped' : '📦 Unequipped'}: ${item.label}`,
    'info'
  );
}

// @ts-ignore
export function saveEquipTransform(itemId, transform) {
  // @ts-ignore
  const item = appState.inventory.find(i => i.id === itemId);
  if (item) item.equip = transform;
}

// ─────────────────────────────────────────
// SHOP
// ─────────────────────────────────────────
// @ts-ignore
export function buyItem(shopItemId) {
  const item = appState.shopItems.find(i => i.id === shopItemId);
  if (!item) return;
  // @ts-ignore
  if (appState.inventory.some(i => i.label === item.label)) {
    notify(appState.theme === 'hacker' ? '> ALREADY OWNED' : 'You already own this!', 'warn');
    return;
  }
  if (appState.player.gold < item.price) {
    notify(
      appState.theme === 'hacker'
        ? `> INSUFFICIENT FUNDS: need ${item.price}G`
        : `Not enough gold! Need ${item.price} 💰`,
      'warn'
    );
    return;
  }
  appState.player.gold -= item.price;
  appState.inventory.push({ ...item, id: crypto.randomUUID(), equipped: false, equip: null });

  // buying an item counts as a creative action
  appState.player.attributes.creativity = (appState.player.attributes.creativity || 0) + 1;
  const key = currentMonthKey();
  const ms  = getOrCreateMonthlyStats(key);
  ms.creativeTasks = (ms.creativeTasks || 0) + 1;

  notify(
    appState.theme === 'hacker'
      ? `> PURCHASED: ${item.label} (-${item.price}G)`
      : `🛍️ Purchased: ${item.label}! (-${item.price} gold)`,
    'success'
  );
}

// @ts-ignore
export function visitCraftsman(craftsmanId) {
  const npc = NPC_CRAFTSMEN.find(n => n.id === craftsmanId);
  if (!npc) return false;
  // @ts-ignore
  appState.activeCraftsman = npc;
  appState.shopTab = 'craft';
  const greeting = npc.greetings[Math.floor(Math.random() * npc.greetings.length)];
  // @ts-ignore
  appState.craftConversation = [{ role: 'npc', text: greeting }];
  return true;
}

// @ts-ignore
export function submitCustomItem(itemLabel, imageDataUrl, itemDesc) {
  const npc = appState.activeCraftsman;
  if (!npc) return;
  const newItem = {
    id: crypto.randomUUID(),
    label: itemLabel,
    icon: imageDataUrl,
    isImage: true,
    rarity: 'epic',
    // @ts-ignore
    type: npc.itemType,
    // @ts-ignore
    desc: itemDesc || `Custom ${npc.itemType} crafted by ${npc.name}.`,
    equipped: false, equip: null, custom: true,
    // @ts-ignore
    craftedBy: npc.name,
  };
  appState.inventory.push(newItem);

  // crafting a custom item counts as a creative action
  appState.player.attributes.creativity = (appState.player.attributes.creativity || 0) + 2;
  const key = currentMonthKey();
  const ms  = getOrCreateMonthlyStats(key);
  ms.creativeTasks = (ms.creativeTasks || 0) + 2;

  // @ts-ignore
  const reaction = npc.reactions[Math.floor(Math.random() * npc.reactions.length)];
  // @ts-ignore
  appState.craftConversation.push({ role: 'npc', text: reaction });
  notify(
    appState.theme === 'hacker'
      ? `> ITEM CRAFTED: ${itemLabel} added to inventory`
      // @ts-ignore
      : `✨ ${npc.name} crafted: ${itemLabel}! Check your inventory.`,
    'success'
  );
}