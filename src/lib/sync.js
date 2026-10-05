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
  try {
    const { error } = await supabase.rpc('upsert_user_state', payload);
    if (error) {
      console.error('[sync] upsert FAILED:', error.message, error);
      return false;
    }
    console.log('[sync] upsert OK');
    return true;
  } catch (err) {
    console.error('[sync] upsert THREW (uncaught):', err);
    return false;
  }
}

// ─── Public API ───────────────────────────────────────────────
let _timer    = null;
let _supabase = null;
let _onlineListenerAdded = false;

/**
 * Register the layout's already-authenticated Supabase client.
 * Called once from +layout.svelte so sync.js reuses the same
 * instance that has the active session, rather than a fresh one
 * that may have not yet read the auth cookies.
 */
export function setSupabaseClient(client) {
  _supabase = client;
  console.log('[sync] supabase client set from layout');
}

function getSupabase() {
  if (!_supabase) {
    console.warn('[sync] no client set — creating fallback');
    _supabase = createSupabaseClient();
  }
  return _supabase;
}

/** Serialise current appState into a plain (non-reactive) sync payload. */
function buildPayload(userId) {
  try {
    const { notifications, _notifId, user, craftConversation, ...persistable } = appState;
    // $state.snapshot converts Svelte 5 reactive proxies cleanly to raw objects
    const plainState = JSON.parse(JSON.stringify(persistable));
    return {
      p_user_id: userId,
      p_state:   plainState,
      p_level:   appState.player?.level ?? 1,
      p_xp:      appState.player?.xp    ?? 0
    };
  } catch (err) {
    console.error('[sync] buildPayload failed to serialise appState:', err);
    return null;
  }
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

  const payload = buildPayload(userId);
  if (!payload) return; // Stop if payload generation failed

  console.log('[sync] push → user:', userId);
  const supabase = getSupabase();
  const ok = await _upsert(supabase, payload);

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

  let data, error;
  try {
    ({ data, error } = await supabase
      .from('user_state')
      .select('state, updated_at')
      .eq('user_id', userId)
      .single());
  } catch (err) {
    console.error('[sync] pull THREW:', err);
    return false;
  }

  if (error || !data) {
    console.warn('[sync] pull error or no data:', error?.message);
    return false;
  }

  const cloudUpdated = new Date(data.updated_at).getTime();
  const localUpdated = parseInt(localStorage.getItem('hw-last-sync') ?? '0');

  if (localUpdated === 0 || cloudUpdated > localUpdated) {
    console.log('[sync] Applying cloud state to appState');
    const remote = data.state;

    if (remote && typeof remote === 'object') {
      // Safely assign top-level keys
      for (const key of Object.keys(remote)) {
        if (key in appState && key !== 'user') {
          // If both are objects, shallow merge to preserve nested properties
          if (
            typeof remote[key] === 'object' &&
            remote[key] !== null &&
            !Array.isArray(remote[key]) &&
            typeof appState[key] === 'object' &&
            appState[key] !== null
          ) {
            Object.assign(appState[key], remote[key]);
          } else {
            appState[key] = remote[key];
          }
        }
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
    // 1. Pull cloud state first
    const appliedCloud = await pull();

    // 2. ONLY push if cloud didn't exist or didn't overwrite local state
    if (!appliedCloud) {
      await push();
    }

    await flushQueue(getSupabase());
  }
}
