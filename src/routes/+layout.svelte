<script>
  import '../app.css';
  import { onMount } from 'svelte';
  import { createSupabaseClient } from '$lib/supabase.js';
  import { appState, setSyncHook } from '$lib/stores/appState.svelte.js';
  import { initSync, scheduleSync } from '$lib/sync.js';
  import { startAutoSync } from '$lib/calendar.js';

  let { data, children } = $props();

  // Browser-side Supabase client — shared via module-level singleton
  const supabase = createSupabaseClient();

  // Reflect server-side user into client state on first load
  $effect(() => {
    appState.user = data.user ?? null;
  });

  // Register the sync hook so any save() in appState triggers a debounced push
  setSyncHook(() => scheduleSync());

  // ── PWA state ──────────────────────────────────────────────────────────────
  let isOffline     = $state(false);
  let installPrompt = $state(/** @type {Event|null} */ (null));
  let showInstall   = $state(false);

  onMount(async () => {
    // Listen for auth state changes (sign-in, sign-out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      appState.user = session?.user ?? null;
      await initSync();
    });

    // Initial Supabase sync on page load
    await initSync();

    // Start calendar auto-sync (runs immediately, then every 30 min)
    // Only if user is signed in — startAutoSync handles the guard internally
    const stopCalSync = startAutoSync(30 * 60 * 1000);

    // Show calendar accounts modal if redirected back from Google OAuth
    if (window.location.search.includes('cal_linked=1')) {
      appState.showCalendarModal = true;
      history.replaceState({}, '', '/');
    }

    // ── PWA: service worker registration ───────────────────────────────────
    if ('serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      } catch (e) {
        console.warn('[PWA] SW registration failed:', e);
      }
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
      stopCalSync();
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
