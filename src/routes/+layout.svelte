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

  // Keep appState user synced with SvelteKit SSR data
  $effect(() => {
    if (data.user) {
      appState.user = data.user;
    }
  });

  // Register the sync hook so any save() in appState triggers a debounced push
  setSyncHook(() => scheduleSync());

  // ── PWA state ──────────────────────────────────────────────────────────────
  let isOffline     = $state(false);
  let installPrompt = $state(/** @type {Event|null} */ (null));
  let showInstall   = $state(false);

  onMount(async () => {
    // 1. Ensure sync module uses client instance in browser context
    setSupabaseClient(supabase);

    // 2. Fetch active browser session to set auth token in headers
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      appState.user = session.user;
    }

    // 3. Perform initial cloud sync
    if (appState.user) {
      await initSync();
    }

    // 4. Listen for auth state updates (sign-in, refresh, sign-out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      appState.user = session?.user ?? null;
      if (session?.user) {
        await initSync();
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