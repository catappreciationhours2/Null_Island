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
let _isPulling = false;

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

function buildPayload(userId) {
  try {
    const { notifications, _notifId, user, craftConversation, ...persistable } = appState;
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

export async function push() {
  const userId = appState.user?.id;
  if (!userId) {
    console.warn('[sync] push skipped — no user');
    return;
  }

  const payload = buildPayload(userId);
  if (!payload) return;

  console.log('[sync] push → user:', userId);
  const supabase = getSupabase();
  const ok = await _upsert(supabase, payload);

  if (!ok) {
    console.warn('[sync] push failed — queuing to IDB');
    await enqueue(payload);
  }
}

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

  if (error || !data || !data.state) {
    console.warn('[sync] pull error or no data:', error?.message);
    return false;
  }

  const cloudUpdated = new Date(data.updated_at).getTime();
  const localUpdated = parseInt(localStorage.getItem('hw-last-sync') ?? '0');

  if (localUpdated === 0 || cloudUpdated > localUpdated) {
    console.log('[sync] Applying cloud state to appState');
    const remote = data.state;

    _isPulling = true;
    try {
      if (remote && typeof remote === 'object') {
        for (const key of Object.keys(remote)) {
          if (key in appState && key !== 'user') {
            appState[key] = remote[key];
          }
        }
      }
      localStorage.setItem('hw-last-sync', String(cloudUpdated));
    } finally {
      _isPulling = false;
    }

    return true;
  }

  return false;
}

export function scheduleSync(delayMs = 2000) {
  if (_isPulling) return;

  console.log('[sync] scheduleSync — debounced push in', delayMs, 'ms');
  if (_timer) clearTimeout(_timer);
  _timer = setTimeout(() => {
    _timer = null;
    push();
  }, delayMs);
}

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
    const appliedCloud = await pull();
    if (!appliedCloud) {
      await push();
    }
    await flushQueue(getSupabase());
  }
}