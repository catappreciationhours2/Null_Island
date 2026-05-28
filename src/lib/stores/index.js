// src/lib/stores/index.js
// All app state lives here. Components import what they need.
// @ts-nocheck

import { writable, derived, get } from 'svelte/store';
import { db } from '$lib/db';

// ─────────────────────────────────────────
// THEME
// ─────────────────────────────────────────
function createThemeStore() {
  const stored = typeof localStorage !== 'undefined'
    ? localStorage.getItem('theme') || 'cottage'
    : 'cottage';

  const { subscribe, set, update } = writable(stored);

  return {
    subscribe,
    toggle() {
      update(t => {
        const next = t === 'cottage' ? 'hacker' : 'cottage';
        if (typeof localStorage !== 'undefined') localStorage.setItem('theme', next);
        if (typeof document !== 'undefined') document.documentElement.dataset.theme = next;
        return next;
      });
    },
    init() {
      const t = get({ subscribe });
      if (typeof document !== 'undefined') document.documentElement.dataset.theme = t;
    }
  };
}
export const theme = createThemeStore();

// ─────────────────────────────────────────
// ACTIVE TAB
// ─────────────────────────────────────────
export const activeTab = writable('tasks'); // 'tasks' | 'map' | 'profile' | 'awards'

// ─────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────
export const notifications = writable([]);
let notifId = 0;

export function notify(message, type = 'info') {
  const id = ++notifId;
  notifications.update(n => [...n, { id, message, type }]);
  setTimeout(() => {
    notifications.update(n => n.filter(x => x.id !== id));
  }, 3000);
}

// ─────────────────────────────────────────
// PLAYER
// ─────────────────────────────────────────
const DEFAULT_PLAYER = {
  name: 'Aevyn',
  xp: 0,
  level: 1,
  gold: 0,
  streak: 0,
  lastActive: null,
  totalDone: 0,
  attributes: {
    focus: 0,
    creativity: 0,
    consistency: 0,
    learning: 0,
    endurance: 0
  }
};

const XP_PER_LEVEL = 500;
const DIFF_MULT = { easy: 1, med: 1.4, hard: 2 };

function createPlayerStore() {
  const { subscribe, set, update } = writable(DEFAULT_PLAYER);
 
  return {
    subscribe,
    set,
    update,
 
    async load() {
      const saved = await db.getPlayer();
      if (saved) set(saved);
    },
 
    async awardXP(task, timeTakenMs) {
      const expectedMs = task.chunks * 17.5 * 60 * 1000; // 17.5 min avg per chunk
      const speed = timeTakenMs > 0 && timeTakenMs < expectedMs ? 1.2 : 1;
      const baseXP = task.baseXP || 30;
      const xp = Math.round(baseXP * (DIFF_MULT[task.difficulty] || 1) * speed);
      const gold = Math.floor(xp * 0.8);
 
      // attribute gains
      const attrGains = {
        focus:       task.difficulty === 'hard' ? 2 : 1,
        creativity:  task.tags?.includes('creative') ? 3 : 1,
        consistency: 1,
        learning:    task.tags?.includes('learning') ? 3 : 0,
        endurance:   task.difficulty === 'hard' ? 3 : task.difficulty === 'med' ? 1 : 0
      };
 
      let leveledUp = false;
 
      update(p => {
        const newXP = p.xp + xp;
        const newLevel = Math.floor(newXP / XP_PER_LEVEL) + 1;
        leveledUp = newLevel > p.level;
 
        const newAttrs = { ...p.attributes };
        for (const [k, v] of Object.entries(attrGains)) {
          newAttrs[k] = (newAttrs[k] || 0) + v;
        }
 
        const next = {
          ...p,
          xp: newXP,
          level: newLevel,
          gold: p.gold + gold,
          totalDone: (p.totalDone || 0) + 1,
          attributes: newAttrs
        };
 
        db.savePlayer(next);
        return next;
      });
 
      return { xp, gold, leveledUp };
    },
 
    async updateStreak() {
      update(p => {
        const today = new Date().toDateString();
        const last  = p.lastActive ? new Date(p.lastActive).toDateString() : null;
        const yesterday = new Date(Date.now() - 86400000).toDateString();
 
        let streak = p.streak || 0;
        if (last === today) {
          // already updated today
        } else if (last === yesterday) {
          streak += 1;
        } else {
          streak = 1;
        }
 
        const next = { ...p, streak, lastActive: Date.now() };
        db.savePlayer(next);
        return next;
      });
    }
  };
}
export const player = createPlayerStore();

// ─────────────────────────────────────────
// TASKS
// ─────────────────────────────────────────
function autoChunk(difficulty) {
  return { easy: 2, med: 3, hard: 5 }[difficulty] || 3;
}

function baseXP(difficulty) {
  return { easy: 25, med: 40, hard: 65 }[difficulty] || 35;
}

function randomMapPos() {
  return {
    mapX: 8 + Math.random() * 82,
    mapY: 8 + Math.random() * 78
  };
}

function createTasksStore() {
  const { subscribe, set, update } = writable([]);

  return {
    subscribe,
    set,

    async load() {
      const tasks = await db.getTasks();
      set(tasks || []);
    },

    async create({ title, difficulty = 'med', tags = [] }) {
      const chunks = autoChunk(difficulty);
      const task = {
        id: crypto.randomUUID(),
        title,
        difficulty,
        tags,
        chunks,
        doneChunks: 0,
        baseXP: baseXP(difficulty),
        collected: false,
        createdAt: Date.now(),
        completedAt: null,
        chunkTimes: [],       // timestamps when each chunk was ticked
        ...randomMapPos()
      };

      await db.saveTask(task);
      update(tasks => [task, ...tasks]);
      return task;
    },

    async tickChunk(taskId) {
      let result = null;

      update(tasks => tasks.map(t => {
        if (t.id !== taskId) return t;
        if (t.doneChunks >= t.chunks) return t;

        const doneChunks = t.doneChunks + 1;
        const chunkTimes = [...(t.chunkTimes || []), Date.now()];
        const completedAt = doneChunks >= t.chunks ? Date.now() : null;

        const updated = { ...t, doneChunks, chunkTimes, completedAt };
        db.saveTask(updated);
        result = updated;
        return updated;
      }));

      return result;
    },

    async collectReward(taskId) {
      let task = null;
      update(tasks => tasks.map(t => {
        if (t.id !== taskId) return t;
        task = { ...t, collected: true };
        db.saveTask(task);
        return task;
      }));
      return task;
    },

    async delete(taskId) {
      await db.deleteTask(taskId);
      update(tasks => tasks.filter(t => t.id !== taskId));
    }
  };
}
export const tasks = createTasksStore();

// Derived: active (not done), done (not collected), collected
export const activeTasks    = derived(tasks, $t => $t.filter(t => t.doneChunks < t.chunks));
export const completedTasks = derived(tasks, $t => $t.filter(t => t.doneChunks >= t.chunks && !t.collected));
export const collectedTasks = derived(tasks, $t => $t.filter(t => t.collected));
export const todayDone      = derived(tasks, $t => {
  const today = new Date().toDateString();
  return $t.filter(t => t.completedAt && new Date(t.completedAt).toDateString() === today).length;
});