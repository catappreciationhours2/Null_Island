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
  console.log('[sync] upsert → user_id:', payload.p_user_id);
  const { error } = await supabase.rpc('upsert_user_state', payload);
  if (error) {
    console.error('[sync] upsert FAILED:', error.message, error);
    return false;
  }
  console.log('[sync] upsert OK');
  return true;
}

// ─── Public API ───────────────────────────────────────────────
let _timer    = null;
let _supabase = null;
let _onlineListenerAdded = false;

function getSupabase() {
  if (!_supabase) _supabase = createSupabaseClient();
  return _supabase;
}

/** Serialise current appState into a plain (non-reactive) sync payload. */
function buildPayload(userId) {
  // Exclude runtime/ephemeral fields
  const { notifications, _notifId, user, craftConversation, ...persistable } = appState;
  // JSON round-trip strips Svelte 5 reactive proxies → plain object Supabase can serialise cleanly
  const plainState = JSON.parse(JSON.stringify(persistable));
  return {
    p_user_id: userId,
    p_state:   plainState,
    p_level:   appState.player?.level ?? 1,
    p_xp:      appState.player?.xp    ?? 0
  };
}

/**
 * Push current state to Supabase.
 * Falls back to IDB queue on network failure.
 */
export async function push() {
  const userId = appState.user?.id;
  if (!userId) {
    console.warn('[sync] push skipped — no user');
    return;
  }

  console.log('[sync] push → user:', userId);
  const supabase = getSupabase();
  const payload  = buildPayload(userId);
  const ok       = await _upsert(supabase, payload);

  if (!ok) {
    console.warn('[sync] push failed — queuing to IDB');
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

  console.log('[sync] pull → user:', userId);
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('user_state')
    .select('state, updated_at')
    .eq('user_id', userId)
    .single();

  // No row yet (new user) or fetch error — nothing to pull
  if (error) {
    console.warn('[sync] pull error (may be new user — no row yet):', error.message, error.code);
    return false;
  }
  if (!data) {
    console.log('[sync] pull — no row found (new user)');
    return false;
  }
  console.log('[sync] pull — row found, updated_at:', data.updated_at);

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
  console.log('[sync] scheduleSync — debounced push in', delayMs, 'ms');
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

  // Guard: only add the online listener once (initSync may be called on auth state change too)
  if (!_onlineListenerAdded) {
    _onlineListenerAdded = true;
    window.addEventListener('online', async () => {
      console.log('[sync] back online — flushing queue');
      const supabase = getSupabase();
      await flushQueue(supabase);
      await push();
    });
  }

  console.log('[sync] initSync — user:', appState.user?.id ?? 'none');

  if (appState.user) {
    await pull();
    // Always push after pull: creates the row for new users, uploads local state when newer.
    await push();
    await flushQueue(getSupabase());
  }
}
