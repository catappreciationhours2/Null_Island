<script>
  import { createSupabaseClient } from '$lib/supabase.js';
  import { appState } from '$lib/stores/appState.svelte.js';

  /** @type {{ onclose?: () => void }} */
  let { onclose } = $props();

  const supabase = createSupabaseClient();

  let loading = $state('');   // 'google' | 'github' | 'anon' | ''
  let error   = $state('');

  const REDIRECT = typeof window !== 'undefined'
    ? `${window.location.origin}/auth/callback`
    : '/auth/callback';

  async function signInWith(provider) {
    loading = provider;
    error   = '';
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: REDIRECT }
    });
    if (err) { error = err.message; loading = ''; }
    // On success the page will redirect — no further action needed
  }

  async function signInAnon() {
    loading = 'anon';
    error   = '';
    const { error: err } = await supabase.auth.signInAnonymously();
    if (err) { error = err.message; }
    else     { onclose?.(); }
    loading = '';
  }

  async function signOut() {
    loading = 'out';
    // Race against a 6-second timeout — signOut's network request can hang
    const timeout = new Promise(resolve => setTimeout(resolve, 6000));
    await Promise.race([supabase.auth.signOut().catch(() => {}), timeout]);
    appState.user = null;
    loading = '';
    onclose?.();
  }
</script>

<!-- Backdrop -->
<div class="backdrop" role="presentation" onclick={onclose}></div>

<div class="modal" role="dialog" aria-modal="true" aria-label="Sign in">
  <button class="close-btn" onclick={onclose} aria-label="Close">✕</button>

  {#if appState.user}
    <!-- ── Signed-in state ── -->
    <div class="signed-in">
      <div class="avatar">⚔</div>
      <p class="email">{appState.user.email ?? 'Anonymous adventurer'}</p>
      <p class="uid">ID: {appState.user.id.slice(0, 8)}…</p>
      <button class="btn-danger" onclick={signOut} disabled={loading === 'out'}>
        {loading === 'out' ? 'Signing out…' : 'Sign out'}
      </button>
    </div>
  {:else}
    <!-- ── Sign-in state ── -->
    <h2>Save your progress</h2>
    <p class="subtitle">Sign in to sync Null Island across devices.</p>

    {#if error}
      <p class="error">{error}</p>
    {/if}

    <div class="providers">
      <button class="provider-btn google" onclick={() => signInWith('google')} disabled={!!loading}>
        <span class="provider-icon">G</span>
        {loading === 'google' ? 'Redirecting…' : 'Continue with Google'}
      </button>

      <button class="provider-btn github" onclick={() => signInWith('github')} disabled={!!loading}>
        <span class="provider-icon">⌥</span>
        {loading === 'github' ? 'Redirecting…' : 'Continue with GitHub'}
      </button>
    </div>

    <div class="divider"><span>or</span></div>

    <button class="anon-btn" onclick={signInAnon} disabled={!!loading}>
      {loading === 'anon' ? 'Creating guest session…' : 'Play as guest (no account needed)'}
    </button>

    <p class="fine-print">Guest progress is saved to this browser only. Sign in later to link it to an account.</p>
  {/if}
</div>

<style>
  .backdrop {
    position: fixed; inset: 0;
    background: rgba(0,0,0,.55);
    z-index: 900;
  }

  .modal {
    position: fixed;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    z-index: 901;
    width: min(420px, 90vw);
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 2rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    box-shadow: 0 8px 32px rgba(0,0,0,.4);
  }

  .close-btn {
    position: absolute; top: .75rem; right: .75rem;
    background: none; border: none;
    color: var(--text3); font-size: 1rem; cursor: pointer;
    line-height: 1; padding: 2px 6px; border-radius: 4px;
  }
  .close-btn:hover { background: var(--bg3); color: var(--text); }

  h2 { margin: 0; font-size: 1.3rem; color: var(--text); }
  .subtitle { margin: 0; font-size: .9rem; color: var(--text2); }

  .error {
    background: #ff4444;
    color: #fff;
    padding: .5rem .75rem;
    border-radius: 6px;
    font-size: .85rem;
    margin: 0;
  }

  .providers { display: flex; flex-direction: column; gap: .6rem; }

  .provider-btn {
    display: flex; align-items: center; gap: .75rem;
    padding: .65rem 1rem;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--bg3);
    color: var(--text);
    font-size: .95rem;
    cursor: pointer;
    transition: background .15s;
  }
  .provider-btn:hover:not(:disabled) { background: var(--border); }
  .provider-btn:disabled { opacity: .5; cursor: not-allowed; }

  .provider-icon {
    width: 1.4rem; height: 1.4rem;
    display: flex; align-items: center; justify-content: center;
    font-weight: bold; font-size: .9rem;
    border-radius: 4px;
    background: var(--bg);
    flex-shrink: 0;
  }

  .divider {
    display: flex; align-items: center; gap: .5rem;
    color: var(--text3); font-size: .8rem;
  }
  .divider::before, .divider::after {
    content: ''; flex: 1; height: 1px; background: var(--border);
  }

  .anon-btn {
    padding: .6rem 1rem;
    border-radius: 8px;
    border: 1px dashed var(--border2);
    background: transparent;
    color: var(--text2);
    font-size: .9rem;
    cursor: pointer;
    transition: color .15s, border-color .15s;
  }
  .anon-btn:hover:not(:disabled) { color: var(--text); border-color: var(--border); }
  .anon-btn:disabled { opacity: .5; cursor: not-allowed; }

  .fine-print {
    margin: -.25rem 0 0;
    font-size: .75rem;
    color: var(--text3);
    line-height: 1.4;
  }

  /* Signed-in state */
  .signed-in {
    display: flex; flex-direction: column; align-items: center;
    gap: .6rem; padding: .5rem 0;
  }
  .avatar {
    font-size: 2.5rem; line-height: 1;
  }
  .email { margin: 0; font-size: 1rem; color: var(--text); font-weight: 600; }
  .uid   { margin: 0; font-size: .75rem; color: var(--text3); font-family: monospace; }

  .btn-danger {
    margin-top: .5rem;
    padding: .5rem 1.5rem;
    border-radius: 8px;
    border: 1px solid #cc3333;
    background: transparent;
    color: #ff6666;
    font-size: .9rem;
    cursor: pointer;
    transition: background .15s;
  }
  .btn-danger:hover:not(:disabled) { background: rgba(204,51,51,.2); }
  .btn-danger:disabled { opacity: .5; cursor: not-allowed; }
</style>
