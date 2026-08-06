/**
 * src/lib/sync.js
 *
 * Syncs appState to Supabase with debouncing.
 * Strategy:
 *   1. Any state change calls schedulSync() — debounced 2s.
 *   2. push() serialises appState and upserts to user_state table.
 *   3. pull() fetches the latest row and merges into appState
 *      (used on first load to restore cloud save).
 *   4. IDB offline queue: if push() fails (no network), the
 *      pending flag is set and retried on next online event.
 */

import { appState } from '$lib/stores/appState.svelte.js';
import { createSupabaseClient } from '$lib/supabase.js';
import { openDB } from 'idb';

// ─── IDB offline queue ───────────────────────────────────────
const DB_NAME    = 'null-island-sync';
const STORE_NAME = 'queue';

async function getDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { autoIncrement: true });
      }
    }
  });
}

async function enqueue(payload) {
  const db = await getDB();
  await db.put(STORE_NAME, payload);
}

async function flushQueue(supabase) {
  const db   = await getDB();
  const tx   = db.transaction(STORE_NAME, 'readwrite');
  const keys = await tx.store.getAllKeys();
  const vals = await tx.store.getAll();
  await tx.done;

  for (let i = 0; i < vals.length; i++) {
    const ok = await _upsert(supabase, vals[i]);
    if (ok) {
      const delTx = db.transaction(STORE_NAME, 'readwrite');
      await delTx.store.delete(keys[i]);
      await delTx.done;
    }
  }
}

// ─── Core upsert ─────────────────────────────────────────────
/** Returns true on success. */
async function _upsert(supabase, payload) {
  const { error } = await supabase.rpc('upsert_user_state', payload);
  return !error;
}

// ─── Public API ───────────────────────────────────────────────
let _timer = null;
let _supabase = null;

function getSupabase() {
  if (!_supabase) _supabase = createSupabaseClient();
  return _supabase;
}

/** Serialise current appState into a sync payload. */
function buildPayload(userId) {
  // Exclude runtime/ephemeral fields that don't need to persist
  const { notifications, _notifId, user, craftConversation, ...persistable } = appState;
  return {
    p_user_id: userId,
    p_state:   persistable,
    p_level:   appState.player?.level  ?? 1,
    p_xp:      appState.player?.xp     ?? 0
  };
}

/**
 * Push current state to Supabase.
 * Falls back to IDB queue on network failure.
 */
export async function push() {
  const userId = appState.user?.id;
  if (!userId) return;   // not signed in — nothing to sync

  const supabase = getSupabase();
  const payload  = buildPayload(userId);
  const ok       = await _upsert(supabase, payload);

  if (!ok) {
    await enqueue(payload);
  }
}

/**
 * Pull latest state from Supabase and merge into appState.
 * Returns true if cloud state was newer and was applied.
 */
export async function pull() {
  const userId = appState.user?.id;
  if (!userId) return false;

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('user_state')
    .select('state, updated_at')
    .eq('user_id', userId)
    .single();

  // No row yet (new user) or fetch error — nothing to pull
  if (error || !data) return false;

  // "Latest wins": apply cloud state only if it's newer than the last local sync
  const cloudUpdated = new Date(data.updated_at).getTime();
  const localUpdated = parseInt(localStorage.getItem('hw-last-sync') ?? '0');

  if (cloudUpdated > localUpdated) {
    const remote = data.state;
    for (const key of Object.keys(remote)) {
      if (key in appState) {
        // @ts-ignore
        appState[key] = remote[key];
      }
    }
    localStorage.setItem('hw-last-sync', String(cloudUpdated));
    return true;
  }

  return false;
}

/**
 * Schedule a debounced push (called after any significant state mutation).
 * Batches rapid changes into a single network request.
 */
export function scheduleSync(delayMs = 2000) {
  if (_timer) clearTimeout(_timer);
  _timer = setTimeout(() => {
    _timer = null;
    push();
  }, delayMs);
}

/**
 * Call once in the root layout after auth is known.
 * - Pulls cloud save if user is signed in.
 * - Sets up online/offline retry logic.
 */
export async function initSync() {
  if (typeof window === 'undefined') return;

  // Flush any queued offline writes when we come back online
  window.addEventListener('online', async () => {
    const supabase = getSupabase();
    await flushQueue(supabase);
    await push();
  });

  if (appState.user) {
    await pull();
    // Always push after pull: creates the row for new users, and uploads
    // local state when it's newer than what's in the cloud.
    await push();
    await flushQueue(getSupabase());
  }
}
