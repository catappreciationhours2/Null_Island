<script>
  import '../app.css';
  import { onMount } from 'svelte';
  import { createSupabaseClient } from '$lib/supabase.js';
  import { appState, setSyncHook } from '$lib/stores/appState.svelte.js';
  import { initSync, scheduleSync, setSupabaseClient } from '$lib/sync.js';
  import { startAutoSync } from '$lib/calendar.js';

  let { data, children } = $props();

  // Create browser client
  const supabase = createSupabaseClient();

  // Register the sync hook so any save() in appState triggers a debounced push
  setSyncHook(() => scheduleSync());

  // ── PWA state ──────────────────────────────────────────────────────────────
  let isOffline     = $state(false);
  let installPrompt = $state(/** @type {Event|null} */ (null));
  let showInstall   = $state(false);

  onMount(() => {
    // 1. Pass browser client to sync manager
    setSupabaseClient(supabase);

    // 2. Set user from SSR data
    if (data.user) {
      appState.user = data.user;
    }

    // 3. Fetch active browser session and trigger sync in background
    supabase.auth.getSession().then(({ data: sessionData }) => {
      if (sessionData?.session?.user) {
        appState.user = sessionData.session.user;
      }
      if (appState.user) {
        initSync().catch((err) => console.error('[sync] initSync failed:', err));
      }
    });

    // 4. Listen for auth state updates
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      appState.user = session?.user ?? null;
      if (session?.user) {
        initSync().catch((err) => console.error('[sync] initSync failed:', err));
      }
    });

    // Start calendar auto-sync (30 minutes interval)
    const stopCalSync = startAutoSync(30 * 60 * 1000);

    // Show calendar accounts modal if redirected back from Google OAuth
    if (window.location.search.includes('cal_linked=1')) {
      appState.showCalendarModal = true;
      history.replaceState({}, '', '/');
    }

    // Show calendar error if redirected back with an error
    const calError = new URLSearchParams(window.location.search).get('cal_error');
    if (calError) {
      const messages = {
        missing_client_id: 'Google Calendar: GOOGLE_CLIENT_ID is not configured in Cloudflare.',
        not_signed_in: 'Google Calendar: you must be signed in first.',
        no_code: 'Google Calendar: OAuth returned no code.',
        oauth_failed: 'Google Calendar: OAuth exchange failed.',
      };
      appState.notifications = [
        ...(appState.notifications ?? []),
        { id: Date.now(), message: messages[calError] ?? `Calendar error: ${calError}`, type: 'error' }
      ];
      history.replaceState({}, '', '/');
    }

    // ── PWA: Safe Service Worker Registration ──────────────────────────────
    if ('serviceWorker' in navigator && typeof window !== 'undefined') {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((e) => {
          console.warn('[PWA] SW registration ignored:', e);
        });
      });
    }

    // ── PWA: online/offline banner ──────────────────────────────────────────
    isOffline = !navigator.onLine;
    const goOffline = () => { isOffline = true; };
    const goOnline  = () => { isOffline = false; };
    window.addEventListener('offline', goOffline);
    window.addEventListener('online',  goOnline);

    // ── PWA: install prompt (Android / Chrome desktop) ─────────────────────
    const onBeforeInstall = (e) => {
      e.preventDefault();
      installPrompt = e;
      showInstall   = true;
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);

    return () => {
      subscription.unsubscribe();
      if (typeof stopCalSync === 'function') stopCalSync();
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online',  goOnline);
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
    };
  });

  async function triggerInstall() {
    if (!installPrompt) return;
    /** @type {any} */ (installPrompt).prompt();
    const { outcome } = await /** @type {any} */ (installPrompt).userChoice;
    if (outcome === 'accepted') showInstall = false;
    installPrompt = null;
  }
</script>

{@render children()}

{#if isOffline}
  <div class="pwa-banner offline" role="status">
    {#if appState.theme === 'hacker'}
      ⚠ OFFLINE — changes queued locally
    {:else if appState.theme === 'retro'}
      📡 NO SIGNAL — saves queued
    {:else}
      📵 You're offline — changes will sync when reconnected
    {/if}
  </div>
{/if}

{#if showInstall}
  <div class="pwa-banner install" role="status">
    {#if appState.theme === 'hacker'}
      [INSTALL] Add NULL_ISLAND_OS to homescreen?
      <button onclick={triggerInstall}>INSTALL</button>
      <button onclick={() => showInstall = false}>DISMISS</button>
    {:else}
      🌿 Install Null Island as an app?
      <button onclick={triggerInstall}>Install</button>
      <button onclick={() => showInstall = false}>Not now</button>
    {/if}
  </div>
{/if}

<style>
.pwa-banner {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 8px 16px;
  font-size: 12px;
  font-family: var(--font-ui, system-ui, sans-serif);
}
.pwa-banner.offline {
  background: #b85c38;
  color: #fff;
}
.pwa-banner.install {
  background: var(--bg2, #e8e0d0);
  color: var(--text, #2c2c2c);
  border-top: 1px solid var(--border, #ccc);
}
:global([data-theme="hacker"]) .pwa-banner.install {
  background: #0d0d0d;
  color: #00ff41;
  border-top: 1px solid #00ff41;
  font-family: var(--font-mono, monospace);
  font-size: 11px;
}
:global([data-theme="retro"]) .pwa-banner.install {
  background: #000;
  color: #ffee00;
  border-top: 2px solid #ffee00;
  font-family: var(--font-mono, monospace);
  font-size: 11px;
}
.pwa-banner button {
  padding: 2px 10px;
  font-size: 11px;
  border-radius: 4px;
  border: 1px solid currentColor;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font-family: inherit;
}
.pwa-banner button:hover { opacity: 0.75; }
</style>