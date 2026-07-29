/**
 * src/lib/calendar.js
 * Client-side calendar utilities — sync trigger, task mutation helpers.
 * Server-side Google API logic lives in src/lib/server/gcal.js.
 */
import { appState, calcReward } from '$lib/stores/appState.svelte.js';

// ─── Sync ────────────────────────────────────────────────────

let _syncTimer = null;

/**
 * Pull events from all enabled calendars and apply diff to appState.
 * Safe to call multiple times — will debounce if called rapidly.
 */
export async function syncCalendars() {
  try {
    const res = await fetch('/api/calendar/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tasks: appState.tasks }),
    });
    if (!res.ok) return;
    const { toCreate, toUpdate, toDelete } = await res.json();

    // Create new tasks from calendar events
    for (const fields of toCreate) {
      _createCalendarTask(fields);
    }

    // Update existing tasks (only non-pinned fields)
    for (const update of toUpdate) {
      const task = appState.tasks.find(t => t.id === update.id);
      if (task && !task.calendarPinned) {
        task.title         = update.title;
        task.difficulty    = update.difficulty;
        task.chunks        = update.chunks;
        task.chunkMins     = update.chunkMins;
        task.calendarStart = update.calendarStart;
        task.calendarEnd   = update.calendarEnd;
      }
    }

    // Mark deleted calendar tasks
    for (const id of toDelete) {
      const task = appState.tasks.find(t => t.id === id);
      if (task) task.calendarDeleted = true;
    }

    // Re-sort to keep calendar tasks in chronological order
    _sortCalendarTasks();

  } catch (e) {
    // Silently ignore network errors (offline, corporate SSL, etc.)
    console.warn('[calendar] sync failed:', e.message);
  }
}

/**
 * Start auto-sync: runs immediately, then every intervalMs.
 * Returns a cleanup function.
 */
export function startAutoSync(intervalMs = 30 * 60 * 1000) {
  syncCalendars();
  const id = setInterval(syncCalendars, intervalMs);
  return () => clearInterval(id);
}

// ─── Task creation from calendar event ───────────────────────

const MAP_COLS = 120;
const MAP_ROWS = 60;

function _createCalendarTask(fields) {
  const { xp, gold } = calcReward({ difficulty: fields.difficulty, chunks: fields.chunks, chunkMins: fields.chunkMins });

  const id = crypto.randomUUID();

  // Inline position assignment (ensureTaskPosition is not exported)
  if (!appState.taskPositions[id]) {
    appState.taskPositions[id] = {
      col: Math.floor(Math.random() * MAP_COLS),
      row: Math.floor(Math.random() * MAP_ROWS),
    };
  }
  const pos = appState.taskPositions[id];

  appState.tasks.push({
    id,
    title:         fields.title,
    difficulty:    fields.difficulty,
    chunks:        fields.chunks,
    chunkMins:     fields.chunkMins,
    doneChunks:    0,
    tags:          [],
    collected:     false,
    createdAt:     Date.now(),
    completedAt:   null,
    collectedAt:   null,
    mapX:          pos.col / 120,
    mapY:          pos.row / 60,
    rewardXP:      xp,
    rewardGold:    gold,
    // Calendar-specific fields
    calendarEventId:      fields.calendarEventId,
    calendarAccountEmail: fields.calendarAccountEmail,
    calendarId:           fields.calendarId,
    calendarStart:        fields.calendarStart,
    calendarEnd:          fields.calendarEnd,
    calendarPinned:       false,
    calendarDeleted:      false,
    calendarSource:       true,
  });
}


/**
 * Keep calendar tasks sorted by calendarStart while preserving
 * the relative order of non-calendar tasks among themselves.
 */
function _sortCalendarTasks() {
  const calTasks    = appState.tasks.filter(t => t.calendarSource).sort((a, b) => (a.calendarStart ?? 0) - (b.calendarStart ?? 0));
  const regularTasks = appState.tasks.filter(t => !t.calendarSource);

  // Interleave: calendar tasks go first, in time order
  appState.tasks.length = 0;
  appState.tasks.push(...calTasks, ...regularTasks);
}

// ─── Push task to calendar (called from terminal commands) ────

/**
 * Creates or updates a Google Calendar event for a task.
 * @param {object} opts
 */
export async function pushTaskToCalendar({ accountEmail, calendarId, title, date, time, durationMins = 60, recur, invitees = [], eventId }) {
  const res = await fetch('/api/calendar/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accountEmail, calendarId, title, date, time, durationMins, recur, invitees, eventId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'unknown error');
  return data;
}

// ─── Account list (cached for tab completion) ─────────────────

let _cachedAccounts = null;

export async function getCalendarAccounts() {
  if (_cachedAccounts) return _cachedAccounts;
  try {
    const res  = await fetch('/api/calendar/accounts');
    const data = await res.json();
    _cachedAccounts = data.accounts ?? [];
    return _cachedAccounts;
  } catch {
    return [];
  }
}

export function invalidateAccountCache() {
  _cachedAccounts = null;
}
