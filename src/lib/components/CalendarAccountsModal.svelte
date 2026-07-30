<script>
  import { appState } from '$lib/stores/appState.svelte.js';
  import { syncCalendars, invalidateAccountCache } from '$lib/calendar.js';

  let { onclose } = $props();

  let accounts      = $state([]);
  let calendarLists = $state({});  // accountId → [{id, name, color, enabled}]
  let loading       = $state('');
  let error         = $state('');
  let expandedId    = $state(null);

  const isHacker = $derived(appState.theme === 'hacker');

  async function fetchAccounts() {
    loading = 'accounts';
    try {
      const res  = await fetch('/api/calendar/accounts');
      const data = await res.json();
      accounts = data.accounts ?? [];
    } catch (e) {
      error = 'Failed to load accounts.';
    }
    loading = '';
  }

  async function fetchCalendars(accountId) {
    if (calendarLists[accountId]) { expandedId = expandedId === accountId ? null : accountId; return; }
    loading = accountId;
    try {
      const res  = await fetch(`/api/calendar/calendars?accountId=${accountId}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const account = accounts.find(a => a.id === accountId);
      const selected = account?.selected_calendars ?? [];
      const enabledIds = new Set(selected.filter(s => s.enabled).map(s => s.id));

      calendarLists[accountId] = data.calendars.map(c => ({
        ...c,
        enabled: enabledIds.has(c.id),
      }));
      expandedId = accountId;
    } catch (e) {
      error = `Could not load calendars: ${e.message}`;
    }
    loading = '';
  }

  async function toggleCalendar(accountId, calId) {
    const list = calendarLists[accountId];
    if (!list) return;
    const cal = list.find(c => c.id === calId);
    if (!cal) return;
    cal.enabled = !cal.enabled;

    await saveCalendarSelection(accountId);
    invalidateAccountCache();
  }

  async function saveCalendarSelection(accountId) {
    const list = calendarLists[accountId] ?? [];
    const selected = list.map(c => ({ id: c.id, name: c.name, color: c.color, enabled: c.enabled }));
    await fetch('/api/calendar/accounts', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id: accountId, selected_calendars: selected }),
    });
    // Update local account record
    const acc = accounts.find(a => a.id === accountId);
    if (acc) acc.selected_calendars = selected;
  }

  async function unlinkAccount(accountId) {
    if (!confirm('Unlink this calendar account? Tasks synced from it will not be removed.')) return;
    loading = accountId;
    await fetch(`/api/calendar/accounts?id=${accountId}`, { method: 'DELETE' });
    accounts = accounts.filter(a => a.id !== accountId);
    delete calendarLists[accountId];
    invalidateAccountCache();
    loading = '';
  }

  async function syncNow() {
    loading = 'sync';
    await syncCalendars();
    loading = '';
  }

  function addAccount() {
    window.location.href = '/auth/google-calendar';
  }

  // Fetch accounts on mount
  $effect(() => { fetchAccounts(); });
</script>

<div class="backdrop" role="presentation" onclick={onclose}></div>

<div class="modal" role="dialog" aria-modal="true">
  <button class="close-btn" onclick={onclose}>✕</button>

  <h2>{isHacker ? '> CALENDAR_ACCOUNTS' : '📅 Calendar Accounts'}</h2>

  {#if error}
    <p class="error">{error}</p>
  {/if}

  {#if loading === 'accounts'}
    <p class="loading">{isHacker ? 'LOADING...' : 'Loading…'}</p>
  {:else}
    <div class="accounts-list">
      {#each accounts as acc (acc.id)}
        <div class="account-card">
          <div class="account-header">
            <span class="account-email">{acc.google_email}</span>
            <div class="account-actions">
              <button class="btn-sm" onclick={() => fetchCalendars(acc.id)} disabled={loading === acc.id}>
                {loading === acc.id ? '…' : expandedId === acc.id ? '▲ Hide' : '▼ Calendars'}
              </button>
              <button class="btn-sm danger" onclick={() => unlinkAccount(acc.id)}>Unlink</button>
            </div>
          </div>

          {#if expandedId === acc.id && calendarLists[acc.id]}
            <div class="calendar-list">
              {#each calendarLists[acc.id] as cal (cal.id)}
                <label class="cal-row">
                  <input
                    type="checkbox"
                    checked={cal.enabled}
                    onchange={() => toggleCalendar(acc.id, cal.id)}
                  />
                  <span class="cal-dot" style="background:{cal.color ?? '#4a90d9'}"></span>
                  <span class="cal-name">{cal.name}</span>
                  {#if cal.primary}<span class="cal-badge">primary</span>{/if}
                </label>
              {/each}
              {#if calendarLists[acc.id].length === 0}
                <p class="empty">No calendars found.</p>
              {/if}
            </div>
          {/if}
        </div>
      {/each}

      {#if accounts.length === 0}
        <p class="empty-state">
          {isHacker ? '// no linked accounts' : 'No linked Google Calendar accounts yet.'}
        </p>
      {/if}
    </div>

    <div class="footer-btns">
      <button class="btn-primary" onclick={addAccount}>
        {isHacker ? '+ LINK_ACCOUNT' : '+ Add Google Account'}
      </button>
      {#if accounts.length > 0}
        <button class="btn-secondary" onclick={syncNow} disabled={loading === 'sync'}>
          {loading === 'sync' ? (isHacker ? 'SYNCING…' : 'Syncing…') : (isHacker ? 'SYNC_NOW' : 'Sync now')}
        </button>
      {/if}
    </div>

    <p class="tip">
      {isHacker
        ? '// use "cal link" in terminal · "cal sync" to force sync'
        : 'Tip: use "cal link" and "cal sync" in hacker mode terminal.'}
    </p>
  {/if}
</div>

<style>
.backdrop {
  position:fixed; inset:0; background:rgba(0,0,0,.55); z-index:900;
}
.modal {
  position:fixed; top:50%; left:50%; transform:translate(-50%,-50%);
  z-index:901; width:min(520px,92vw);
  background:var(--bg2); border:1px solid var(--border); border-radius:12px;
  padding:1.75rem; display:flex; flex-direction:column; gap:1rem;
  box-shadow:0 8px 32px rgba(0,0,0,.4); max-height:80vh; overflow-y:auto;
}
.close-btn {
  position:absolute; top:.75rem; right:.75rem;
  background:none; border:none; color:var(--text3); font-size:1rem;
  cursor:pointer; padding:2px 6px; border-radius:4px;
}
.close-btn:hover { background:var(--bg3); color:var(--text); }
h2 { margin:0; font-size:1.1rem; color:var(--text); font-family:var(--font-ui); }
:global([data-theme="hacker"]) h2 { font-family:var(--font-mono); font-size:.95rem; color:var(--accent); letter-spacing:1px; }

.error   { color:#ff6666; font-size:.85rem; margin:0; }
.loading { color:var(--text3); font-size:.85rem; margin:0; }

.accounts-list { display:flex; flex-direction:column; gap:.6rem; }

.account-card {
  background:var(--bg3); border:1px solid var(--border); border-radius:8px;
  overflow:hidden;
}
.account-header {
  display:flex; align-items:center; justify-content:space-between;
  padding:.6rem .75rem; gap:.5rem;
}
.account-email { font-size:.85rem; color:var(--text); font-family:var(--font-mono); }
.account-actions { display:flex; gap:.4rem; flex-shrink:0; }

.btn-sm {
  padding:3px 8px; font-size:.75rem; border-radius:4px;
  border:1px solid var(--border); background:var(--bg2);
  color:var(--text2); cursor:pointer; transition:all .15s;
}
.btn-sm:hover:not(:disabled) { background:var(--border); color:var(--text); }
.btn-sm:disabled { opacity:.5; cursor:not-allowed; }
.btn-sm.danger { border-color:#993333; color:#ff6666; }
.btn-sm.danger:hover { background:#993333; color:#fff; }

.calendar-list {
  border-top:1px solid var(--border); padding:.5rem .75rem;
  display:flex; flex-direction:column; gap:.35rem;
}
.cal-row {
  display:flex; align-items:center; gap:.5rem;
  cursor:pointer; font-size:.85rem; color:var(--text);
  padding:.2rem 0;
}
.cal-row input { cursor:pointer; accent-color:var(--accent); }
.cal-dot { width:10px; height:10px; border-radius:50%; flex-shrink:0; }
.cal-name { flex:1; }
.cal-badge {
  font-size:.65rem; padding:1px 5px; border-radius:3px;
  background:var(--accent); color:var(--bg); font-weight:600;
}
.empty { color:var(--text3); font-size:.8rem; margin:0; padding:.25rem 0; }
.empty-state { color:var(--text3); font-size:.9rem; margin:0; text-align:center; padding:.5rem 0; }

.footer-btns { display:flex; gap:.6rem; }
.btn-primary {
  flex:1; padding:.6rem 1rem; border-radius:8px;
  border:1px solid var(--accent); background:transparent;
  color:var(--accent); font-size:.9rem; cursor:pointer; transition:all .15s;
}
.btn-primary:hover { background:var(--accent); color:var(--bg); }
.btn-secondary {
  padding:.6rem 1rem; border-radius:8px;
  border:1px solid var(--border); background:var(--bg3);
  color:var(--text2); font-size:.9rem; cursor:pointer; transition:all .15s;
}
.btn-secondary:hover:not(:disabled) { background:var(--border); color:var(--text); }
.btn-secondary:disabled { opacity:.5; cursor:not-allowed; }

.tip { font-size:.75rem; color:var(--text3); margin:0; }
:global([data-theme="hacker"]) .tip { font-family:var(--font-mono); }
</style>
