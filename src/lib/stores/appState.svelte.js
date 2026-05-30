// src/lib/stores/appState.svelte.js
// Svelte 5 runes — single source of truth.
// Full persistence via localStorage (migrates to Turso in Phase 4).

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
// DEFAULT DATA
// ─────────────────────────────────────────
const DEFAULT_PLAYER = {
  name: 'Aevyn', xp: 0, level: 1, gold: 0, streak: 0,
  lastActive: null, totalDone: 0,
  attributes: { focus: 0, creativity: 0, consistency: 0, learning: 0, endurance: 0 }
};

const DEFAULT_INVENTORY = [
  { id: 'i1', label: 'Tome of Focus',   icon: '📜', rarity: 'rare',      type: 'accessory', equipped: false, equip: null },
  { id: 'i2', label: 'Clarity Vial',    icon: '⚗️', rarity: 'common',    type: 'accessory', equipped: false, equip: null },
  { id: 'i3', label: 'Pixel Sword',     icon: '🗡️', rarity: 'epic',      type: 'weapon',    equipped: false, equip: null },
  { id: 'i4', label: 'Herbalist Badge', icon: '🌿', rarity: 'common',    type: 'badge',     equipped: false, equip: null },
  { id: 'i5', label: 'Archive Key',     icon: '🔑', rarity: 'legendary', type: 'accessory', equipped: false, equip: null },
  { id: 'i6', label: 'Ember Fragment',  icon: '🔥', rarity: 'rare',      type: 'accessory', equipped: false, equip: null },
];

const DEFAULT_AWARDS = [
  { id: 'a1', label: 'First Flame',  type: 'normal',  desc: 'Completed your first task',         icon: '🔥', earnedAt: Date.now() },
  { id: 'a2', label: '7-Day Ember',  type: 'special', desc: 'Special: unlocks hidden quest chain', icon: '💎', earnedAt: Date.now() },
  { id: 'a3', label: 'Night Owl',    type: 'normal',  desc: '5 tasks completed after 10pm',       icon: '🦉', earnedAt: Date.now() },
  { id: 'a4', label: 'Depth Seeker', type: 'special', desc: 'Special: unlocks the Deep Archive',  icon: '🗝️', earnedAt: Date.now() },
  { id: 'a5', label: 'Word Smith',   type: 'normal',  desc: 'Created 10 writing tasks',           icon: '✍️', earnedAt: Date.now() },
  { id: 'a6', label: 'Iron Will',    type: 'normal',  desc: 'Completed 5 hard tasks in a row',    icon: '⚔️', earnedAt: Date.now() },
];

const DEFAULT_MONTHLY = [
  { id: 'm1', label: 'May: Bloom',  desc: 'May 2026 limited drop · never returns', icon: '🌸', month: '2026-05' },
  { id: 'm2', label: 'Apr: Cipher', desc: 'April 2026 drop · locked forever',      icon: '🔐', month: '2026-04' },
  { id: 'm3', label: 'Mar: Thaw',   desc: 'March 2026 drop · locked forever',      icon: '❄️', month: '2026-03' },
];

const SHOP_DEFAULT_ITEMS = [
  { id: 's1',  label: 'Oak Staff',         icon: '🪄', rarity: 'common',    type: 'weapon',    price: 60,   desc: 'A sturdy staff carved from ancient oak.' },
  { id: 's2',  label: 'Moonstone Ring',    icon: '💍', rarity: 'rare',      type: 'accessory', price: 120,  desc: 'Glows faintly under moonlight.' },
  { id: 's3',  label: 'Leather Cloak',     icon: '🧥', rarity: 'common',    type: 'clothing',  price: 80,   desc: 'Worn but reliable. Keeps the chill out.' },
  { id: 's4',  label: 'Scholar\'s Tome',   icon: '📚', rarity: 'rare',      type: 'accessory', price: 150,  desc: '+5 Learning on equip.' },
  { id: 's5',  label: 'Iron Shield',       icon: '🛡️', rarity: 'common',    type: 'weapon',    price: 90,   desc: 'Solid protection. Dented but dependable.' },
  { id: 's6',  label: 'Witch Hat',         icon: '🎩', rarity: 'epic',      type: 'clothing',  price: 200,  desc: 'Adds an air of mystery to any outfit.' },
  { id: 's7',  label: 'Golden Compass',    icon: '🧭', rarity: 'rare',      type: 'accessory', price: 175,  desc: 'Always points toward your goals.' },
  { id: 's8',  label: 'Flame Gauntlet',    icon: '🧤', rarity: 'epic',      type: 'clothing',  price: 220,  desc: 'Heat resistant. Looks incredible.' },
  { id: 's9',  label: 'Philosopher\'s Eye',icon: '🔮', rarity: 'legendary', type: 'accessory', price: 500,  desc: 'Reveals hidden patterns in everything.' },
  { id: 's10', label: 'Forest Boots',      icon: '👢', rarity: 'common',    type: 'clothing',  price: 70,   desc: 'Silent on any terrain.' },
  { id: 's11', label: 'Storm Amulet',      icon: '⚡', rarity: 'rare',      type: 'accessory', price: 140,  desc: 'Crackles with stored energy.' },
  { id: 's12', label: 'Shadow Dagger',     icon: '🔪', rarity: 'epic',      type: 'weapon',    price: 280,  desc: 'Leaves no trace. Hacker-exclusive lore.' },
];

const NPC_CRAFTSMEN = [
  {
    id: 'tailor',
    name: 'Mireille',
    title: 'The Tailor',
    icon: '🧵',
    cost: 50,
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
    id: 'blacksmith',
    name: 'Rork',
    title: 'The Blacksmith',
    icon: '⚒️',
    cost: 75,
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
    id: 'artisan',
    name: 'Pip',
    title: 'The Artisan',
    icon: '🎨',
    cost: 60,
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
    id: 'collector',
    name: 'Vesper',
    title: 'The Antique Collector',
    icon: '🏺',
    cost: 100,
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
const DIFF_BASE_XP = { easy: 25, med: 40, hard: 65 };
const DIFF_CHUNKS  = { easy: 2,  med: 3,  hard: 5  };

// @ts-ignore
export function calcReward(task) {
  const chunkMins  = task.chunkMins || 17.5;
  const timeScale  = Math.sqrt(chunkMins / 17.5); // longer chunks = more XP
  // @ts-ignore
  const diffMult   = { easy: 1, med: 1.4, hard: 2 }[task.difficulty] || 1;
  // @ts-ignore
  const baseXP     = DIFF_BASE_XP[task.difficulty] || 40;
  const xp         = Math.round(baseXP * diffMult * timeScale);
  const gold       = Math.floor(xp * 0.8);
  return { xp, gold };
}

// ─────────────────────────────────────────
// REACTIVE STATE
// ─────────────────────────────────────────
export const appState = $state({
  theme:     load('hw-theme', 'cottage'),
  activeTab: 'tasks',

  player:       load('hw-player',    DEFAULT_PLAYER),
  tasks:        load('hw-tasks',     []),
  taskHistory:  load('hw-history',   []),
  awards:       load('hw-awards',    DEFAULT_AWARDS),
  monthlyAwards:load('hw-monthly',   DEFAULT_MONTHLY),
  inventory:    load('hw-inventory', DEFAULT_INVENTORY),
  shopItems:    SHOP_DEFAULT_ITEMS,

  notifications: [],
  _notifId: 0,

  // Shop state
  shopTab: 'browse',
  activeCraftsman: null,
  craftConversation: [],

  // Profile sub-tab
  profileTab: 'overview',

  // Map snapshots — array of { id, dataUrl, label, savedAt }
  mapSnapshots: load('hw-map-snapshots', []),
});

// ─────────────────────────────────────────
// AUTO-PERSIST on every mutation
// ─────────────────────────────────────────
$effect.root(() => {
  $effect(() => { save('hw-player',    JSON.parse(JSON.stringify(appState.player))); });
  $effect(() => { save('hw-tasks',     JSON.parse(JSON.stringify(appState.tasks))); });
  $effect(() => { save('hw-history',   JSON.parse(JSON.stringify(appState.taskHistory))); });
  $effect(() => { save('hw-awards',    JSON.parse(JSON.stringify(appState.awards))); });
  $effect(() => { save('hw-monthly',   JSON.parse(JSON.stringify(appState.monthlyAwards))); });
  $effect(() => { save('hw-inventory', JSON.parse(JSON.stringify(appState.inventory))); });
  $effect(() => { save('hw-theme',     appState.theme); });
});

// ─────────────────────────────────────────
// THEME
// ─────────────────────────────────────────
export function toggleTheme() {
  const next = appState.theme === 'cottage' ? 'hacker' : 'cottage';
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
// TASKS
// ─────────────────────────────────────────
// @ts-ignore
export function createTask(title, difficulty = 'med', tags = [], customChunks = null, chunkMins = null) {
  // @ts-ignore
  const chunks    = customChunks ?? (DIFF_CHUNKS[difficulty] || 3);
  const mins      = chunkMins ?? 17.5;
  const { xp, gold } = calcReward({ difficulty, chunks, chunkMins: mins });

  const task = {
    id:          crypto.randomUUID(),
    title,
    difficulty,
    chunks,
    doneChunks:  0,
    chunkMins:   mins,
    tags,
    collected:   false,
    createdAt:   Date.now(),
    completedAt: null,
    collectedAt: null,
    mapX:        8 + Math.random() * 82,
    mapY:        8 + Math.random() * 78,
    rewardXP:    xp,
    rewardGold:  gold,
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

  task.collected   = true;
  task.collectedAt = Date.now();

  // Award XP + gold
  appState.player.xp        += task.rewardXP;
  appState.player.gold      += task.rewardGold;
  appState.player.totalDone += 1;

  // Level up check
  const newLevel = Math.floor(appState.player.xp / XP_PER_LEVEL) + 1;
  const leveledUp = newLevel > appState.player.level;
  if (leveledUp) {
    appState.player.level = newLevel;
    notify(appState.theme === 'hacker'
      ? `> LEVEL UP → LVL ${newLevel} UNLOCKED`
      : `✨ Level up! You're now Level ${newLevel}!`, 'success');
  }

  // Attribute gains
  const attrs = appState.player.attributes;
  attrs.consistency += 1;
  attrs.focus       += task.difficulty === 'hard' ? 2 : 1;
  attrs.endurance   += task.difficulty === 'hard' ? 3 : task.difficulty === 'med' ? 1 : 0;
  if (task.tags?.includes('creative'))  attrs.creativity += 3;
  if (task.tags?.includes('learning'))  attrs.learning   += 3;

  // Update streak
  updateStreak();

  // Archive to history
  appState.taskHistory.unshift({ ...task });

  // Remove from active list after adding to history
  // (task card disappears from tasks view 24h after collect — handled in view)

  notify(
    appState.theme === 'hacker'
      ? `> +${task.rewardXP}XP +${task.rewardGold}G ACQUIRED`
      : `✨ +${task.rewardXP} XP and ${task.rewardGold} gold!`,
    'success'
  );

  checkAchievements();
}

function updateStreak() {
  const today = new Date().toDateString();
  const last  = appState.player.lastActive
    ? new Date(appState.player.lastActive).toDateString()
    : null;
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  if (last === today) {
    // already active today
  } else if (last === yesterday) {
    appState.player.streak++;
  } else {
    appState.player.streak = 1;
  }
  appState.player.lastActive = Date.now();
}

// ─────────────────────────────────────────
// ACHIEVEMENTS
// ─────────────────────────────────────────
const ACHIEVEMENT_RULES = [
  { id: 'first_task',  label: 'First Flame',   icon: '🔥', type: 'normal',
    check: () => appState.player.totalDone >= 1 },
  { id: 'ten_tasks',   label: 'Decade',         icon: '🌟', type: 'normal',
    check: () => appState.player.totalDone >= 10 },
  { id: 'streak_7',    label: '7-Day Ember',    icon: '💎', type: 'special',
    check: () => appState.player.streak >= 7 },
  { id: 'streak_30',   label: 'Eternal Flame',  icon: '🌋', type: 'special',
    check: () => appState.player.streak >= 30 },
  { id: 'level_5',     label: 'Apprentice+',    icon: '📈', type: 'normal',
    check: () => appState.player.level >= 5 },
  { id: 'hard_5',      label: 'Iron Will',      icon: '⚔️', type: 'normal',
    // @ts-ignore
    check: () => appState.taskHistory.filter(t => t.difficulty === 'hard').length >= 5 },
];

function checkAchievements() {
  // @ts-ignore
  const earnedIds = new Set(appState.awards.map(a => a.id));
  for (const rule of ACHIEVEMENT_RULES) {
    if (!earnedIds.has(rule.id) && rule.check()) {
      appState.awards.push({ ...rule, earnedAt: Date.now() });
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
  if (!item.equipped) {
    // keep equip transform state when un-equipping so it restores on re-equip
  }
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
  appState.inventory.push({
    ...item,
    id:       crypto.randomUUID(),
    equipped: false,
    equip:    null,
  });
  notify(
    appState.theme === 'hacker'
      ? `> PURCHASED: ${item.label} (-${item.price}G)`
      : `🛍️ Purchased: ${item.label}! (-${item.price} gold)`,
    'success'
  );
}

// visitCraftsman opens the chat for free — gold charged only on commission
// @ts-ignore
export function visitCraftsman(craftsmanId) {
  const npc = NPC_CRAFTSMEN.find(n => n.id === craftsmanId);
  if (!npc) return false;
  // No gold deduction here — charged in ShopView when commission is submitted
  // @ts-ignore
  appState.activeCraftsman = npc;
  appState.shopTab = 'craft';
  const greeting = npc.greetings[Math.floor(Math.random() * npc.greetings.length)];
  // @ts-ignore
  appState.craftConversation = [{ role: 'npc', text: greeting }];
  return true;
}

// imageDataUrl is a base64 PNG already resized to 48x48 by ShopView
// @ts-ignore
export function submitCustomItem(itemLabel, imageDataUrl, itemDesc) {
  const npc = appState.activeCraftsman;
  if (!npc) return;

  const newItem = {
    id:        crypto.randomUUID(),
    label:     itemLabel,
    icon:      imageDataUrl,  // base64 PNG dataUrl
    isImage:   true,          // flag so inventory renders <img> not emoji
    rarity:    'epic',
    // @ts-ignore
    type:      npc.itemType,
    // @ts-ignore
    desc:      itemDesc || `Custom ${npc.itemType} crafted by ${npc.name}.`,
    equipped:  false,
    equip:     null,
    custom:    true,
    // @ts-ignore
    craftedBy: npc.name,
  };

  appState.inventory.push(newItem);
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

export { NPC_CRAFTSMEN };