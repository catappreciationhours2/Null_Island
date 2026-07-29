// src/lib/stores/appState.svelte.js
// Svelte 5 runes — single source of truth.

// ─────────────────────────────────────────
// DATA IMPORTS  (edit the files in src/lib/data/ to change game content)
// ─────────────────────────────────────────
import { LEARNING_TAGS as _LEARNING_TAGS, CREATIVE_TAGS as _CREATIVE_TAGS } from '$lib/data/tags.js';
import { MONTHLY_CARD_DATA as _MONTHLY_CARD_DATA } from '$lib/data/monthlyCards.js';
import { SHOP_DEFAULT_ITEMS as _SHOP_DEFAULT_ITEMS } from '$lib/data/shopItems.js';
import { NPC_CRAFTSMEN as _NPC_CRAFTSMEN } from '$lib/data/craftsmen.js';
import { ACHIEVEMENT_RULES as _ACHIEVEMENT_RULES } from '$lib/data/achievementRules.js';
import { DEFAULT_INVENTORY as _DEFAULT_INVENTORY } from '$lib/data/defaultInventory.js';
import { DEFAULT_AWARDS as _DEFAULT_AWARDS } from '$lib/data/defaultAwards.js';

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
  _syncHook();
}

// Sync hook — set by the layout once sync.js is initialised
// (avoids circular import between appState ↔ sync)
let _syncHook = () => {};
export function setSyncHook(fn) { _syncHook = fn; }

// ─────────────────────────────────────────
// TAG CATEGORIES  (edit src/lib/data/tags.js)
// ─────────────────────────────────────────
export const LEARNING_TAGS = _LEARNING_TAGS;
export const CREATIVE_TAGS  = _CREATIVE_TAGS;

// ─────────────────────────────────────────
// MONTHLY CARD DATA  (edit src/lib/data/monthlyCards.js)
// ─────────────────────────────────────────
export const MONTHLY_CARD_DATA = _MONTHLY_CARD_DATA;

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

// (edit src/lib/data/defaultInventory.js)
const DEFAULT_INVENTORY = _DEFAULT_INVENTORY;
// (edit src/lib/data/defaultAwards.js)
const DEFAULT_AWARDS = _DEFAULT_AWARDS.map(a => ({ ...a, earnedAt: Date.now() }));
// (edit src/lib/data/shopItems.js)
const SHOP_DEFAULT_ITEMS = _SHOP_DEFAULT_ITEMS;

// (edit src/lib/data/craftsmen.js)
export const NPC_CRAFTSMEN = _NPC_CRAFTSMEN;

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

  // Auth — set by +layout.svelte after Supabase initialises
  user: null,

  // UI flags
  showCalendarModal: false,
});

// Migrate old player data: ensure new fields exist
if (appState.player.totalTime      === undefined) appState.player.totalTime      = 0;
if (appState.player.longestStreak  === undefined) appState.player.longestStreak  = appState.player.streak || 0;
if (appState.player.focusUses      === undefined) appState.player.focusUses      = 0;
// Ensure all attribute keys are present (old saves may be missing some)
if (!appState.player.attributes) appState.player.attributes = {};
for (const k of ['focus','creativity','consistency','learning','endurance']) {
  if (appState.player.attributes[k] === undefined) appState.player.attributes[k] = 0;
}

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
/** Call this whenever the user completes a focus session. */
export function addFocusUse() {
  appState.player.focusUses = (appState.player.focusUses || 0) + 1;
  // focus attribute: raw count of sessions, max 1000 for radar scaling
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
// ACHIEVEMENTS  (edit src/lib/data/achievementRules.js)
// ─────────────────────────────────────────
// Rules now use check(state, ts) — state is the full appState, ts is the event timestamp.
export const ACHIEVEMENT_RULES = _ACHIEVEMENT_RULES;

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
    const triggered = rule.check(appState, collectedAt);
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
// Layer types that allow only one equipped item at a time
const SINGLETON_LAYERS = new Set(['body', 'hair', 'outfit', 'expression', 'bg']);

export function toggleEquip(itemId) {
  // @ts-ignore
  const item = appState.inventory.find(i => i.id === itemId);
  if (!item) return;
  // Singleton layers: unequip any other item of the same type before equipping
  if (SINGLETON_LAYERS.has(item.type) && !item.equipped) {
    // @ts-ignore
    appState.inventory.forEach(i => { if (i.type === item.type) i.equipped = false; });
  }
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
export function submitCustomItem(itemLabel, imageDataUrl, itemDesc, layerTypeOverride) {
  const npc = appState.activeCraftsman;
  if (!npc) return;
  // @ts-ignore
  const itemType = layerTypeOverride || npc.itemType;
  const newItem = {
    id: crypto.randomUUID(),
    label: itemLabel,
    icon: imageDataUrl,
    isImage: true,
    rarity: 'epic',
    type: itemType,
    desc: itemDesc || `Custom ${itemType} crafted by ${npc.name}.`,
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

// Free upload — no craftsman or gold required
// @ts-ignore
export function uploadItem(itemLabel, imageDataUrl, itemDesc, itemType) {
  if (!itemLabel?.trim() || !imageDataUrl) return;
  const newItem = {
    id: crypto.randomUUID(),
    label: itemLabel.trim(),
    icon: imageDataUrl,
    isImage: true,
    rarity: 'common',
    type: itemType || 'accessory',
    desc: itemDesc?.trim() || '',
    equipped: false, equip: null, custom: true,
  };
  appState.inventory.push(newItem);
  appState.player.attributes.creativity = (appState.player.attributes.creativity || 0) + 1;
  const key = currentMonthKey();
  const ms  = getOrCreateMonthlyStats(key);
  ms.creativeTasks = (ms.creativeTasks || 0) + 1;
  notify(
    appState.theme === 'hacker'
      ? `> UPLOADED: ${itemLabel} added to inventory`
      : `📁 Uploaded: ${itemLabel}! Check your inventory.`,
    'success'
  );
}