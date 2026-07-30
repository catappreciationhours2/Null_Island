<script>
  import { onMount } from 'svelte';
  import { appState, setTab, toggleTheme } from '$lib/stores/appState.svelte.js';

  import TopBar        from '$lib/components/TopBar.svelte';
  import Sidebar       from '$lib/components/Sidebar.svelte';
  import Notifications from '$lib/components/Notifications.svelte';
  import TasksView     from '$lib/components/TasksView.svelte';
  import MapView       from '$lib/components/MapView.svelte';
  import ProfileView   from '$lib/components/ProfileView.svelte';
  import AwardsView    from '$lib/components/AwardsView.svelte';
  import ShopView      from '$lib/components/ShopView.svelte';
  import FocusView     from '$lib/components/FocusView.svelte';

  let isFocus     = $derived(appState.activeTab === 'focus');
  let drawerOpen  = $state(false);
  let touchStartX = 0;
  let touchStartY = 0;

  const TABS = [
    { id: 'tasks',   cottage: '📋 Tasks',   hacker: 'TASKS',   retro: '👾 TASKS'   },
    { id: 'map',     cottage: '🗺  Map',     hacker: 'MAP',     retro: '🕹 MAP'     },
    { id: 'profile', cottage: '👤 Profile',  hacker: 'PROFILE', retro: '🎮 PROFILE' },
    { id: 'awards',  cottage: '🏆 Awards',   hacker: 'AWARDS',  retro: '🏅 AWARDS'  },
    { id: 'shop',    cottage: '🏪 Shop',     hacker: 'SHOP',    retro: '🪙 SHOP'    },
    { id: 'focus',   cottage: '🎯 Focus',    hacker: 'FOCUS',   retro: '⏱ FOCUS'   },
  ];

  function tabLabel(tab) {
    if (appState.theme === 'hacker') return tab.hacker;
    if (appState.theme === 'retro')  return tab.retro;
    return tab.cottage;
  }

  function selectTab(id) {
    setTab(id);
    drawerOpen = false;
  }

  function onTouchStart(e) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }

  function onTouchEnd(e) {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) < 60 || Math.abs(dx) <= Math.abs(dy)) return;
    if (dx > 0 && touchStartX < 60) drawerOpen = true;   // right-swipe from edge
    if (dx < 0 && drawerOpen)       drawerOpen = false;  // left-swipe closes
  }

  onMount(() => {
    const saved = localStorage.getItem('hw-theme') || 'cottage';
    appState.theme = saved;
    document.documentElement.dataset.theme = saved;
  });
</script>

<!-- Always-mounted focus view (timers survive tab switches) -->
<FocusView visible={isFocus} />

<!-- Mobile drawer overlay -->
{#if drawerOpen}
  <div class="drawer-overlay" role="presentation" onclick={() => drawerOpen = false}></div>
{/if}

<!-- Mobile slide-in drawer -->
<nav class="mobile-drawer" class:open={drawerOpen} aria-label="Navigation">
  <div class="drawer-header">
    <span class="drawer-brand">
      {#if appState.theme === 'hacker'}&gt; NULL_ISLAND
      {:else if appState.theme === 'retro'}● NULL ISLAND
      {:else}🌿 Null Island{/if}
    </span>
    <button class="drawer-close" onclick={() => drawerOpen = false} aria-label="Close menu">✕</button>
  </div>

  <div class="drawer-tabs">
    {#each TABS as tab}
      <button
        class="drawer-tab"
        class:active={appState.activeTab === tab.id}
        onclick={() => selectTab(tab.id)}
      >
        {tabLabel(tab)}
      </button>
    {/each}
  </div>

  <div class="drawer-divider"></div>

  <!-- Theme toggle inside drawer on mobile -->
  <div class="drawer-theme-row">
    <button class="drawer-theme-btn" onclick={toggleTheme}>
      {#if appState.theme === 'hacker'}👾 Switch to Retro
      {:else if appState.theme === 'retro'}🌿 Switch to Cottage
      {:else}⌨ Switch to Hacker{/if}
    </button>
  </div>

  <!-- Full sidebar content inside drawer on mobile -->
  <div class="drawer-sidebar-wrap">
    <Sidebar />
  </div>
</nav>

{#if !isFocus}
  <div
    class="app-shell"
    ontouchstart={onTouchStart}
    ontouchend={onTouchEnd}
  >
    <TopBar />
    <div class="body-row">
      <!-- Sidebar: visible on desktop, hidden on mobile (lives in drawer) -->
      <div class="desktop-sidebar"><Sidebar /></div>
      <main class="main-content">
        {#if appState.activeTab === 'tasks'}
          <TasksView />
        {:else if appState.activeTab === 'map'}
          <MapView />
        {:else if appState.activeTab === 'profile'}
          <ProfileView />
        {:else if appState.activeTab === 'awards'}
          <AwardsView />
        {:else if appState.activeTab === 'shop'}
          <ShopView />
        {/if}
      </main>
    </div>
  </div>
{/if}

<!-- Mobile hamburger FAB -->
<button
  class="mobile-fab"
  onclick={() => drawerOpen = true}
  aria-label="Open menu"
>☰</button>

<Notifications />

<style>
  /* ── App shell ── */
  .app-shell    { display:flex; flex-direction:column; min-height:100dvh; zoom:1.5; }
  .body-row     { display:flex; flex:1; min-height:0; }
  .main-content { flex:1; display:flex; flex-direction:column; overflow-y:auto; background:var(--bg); transition:background .2s; }

  /* ── Desktop sidebar (hide on mobile) ── */
  .desktop-sidebar { display: contents; }
  @media (max-width: 768px) {
    .desktop-sidebar { display: none; }
  }

  /* ── Mobile FAB ── */
  .mobile-fab {
    display: none;
    position: fixed;
    bottom: 20px;
    left: 16px;
    z-index: 800;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: 1px solid var(--border);
    background: var(--bg2);
    color: var(--text);
    font-size: 18px;
    cursor: pointer;
    box-shadow: 0 2px 12px rgba(0,0,0,.3);
    transition: background .15s;
  }
  .mobile-fab:hover { background: var(--bg3); }
  @media (max-width: 768px) {
    .mobile-fab { display: flex; align-items: center; justify-content: center; }
  }
  :global([data-theme="hacker"]) .mobile-fab { border-color: var(--accent); color: var(--accent); font-family: var(--font-mono); font-size: 12px; }
  :global([data-theme="retro"])  .mobile-fab { border-color: #ffee00; color: #ffee00; box-shadow: 0 0 10px #ffee0066; }

  /* ── Drawer overlay ── */
  .drawer-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,.5);
    z-index: 899;
  }

  /* ── Mobile drawer ── */
  .mobile-drawer {
    position: fixed;
    top: 0; left: 0;
    height: 100%;
    width: 280px;
    z-index: 900;
    background: var(--bg2);
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    transform: translateX(-100%);
    transition: transform .25s ease;
    overflow-y: auto;
  }
  .mobile-drawer.open { transform: translateX(0); }
  :global([data-theme="retro"]) .mobile-drawer { border-right-color: #3300aa; }

  .drawer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 14px 10px;
    flex-shrink: 0;
  }
  .drawer-brand {
    font-size: 13px;
    font-weight: 600;
    color: var(--accent);
  }
  :global([data-theme="hacker"]) .drawer-brand { font-family: var(--font-mono); font-size: 11px; letter-spacing: 1.5px; }
  :global([data-theme="retro"])  .drawer-brand { font-family: var(--font-mono); font-size: 12px; color: #ffee00; letter-spacing: 2px; text-shadow: 0 0 8px #ffee0066; }

  .drawer-close {
    background: none; border: none;
    color: var(--text3); font-size: 14px; cursor: pointer;
    padding: 4px 6px; border-radius: 4px;
  }
  .drawer-close:hover { background: var(--bg3); color: var(--text); }

  .drawer-tabs {
    display: flex;
    flex-direction: column;
    padding: 4px 10px 10px;
    gap: 2px;
    flex-shrink: 0;
  }
  .drawer-tab {
    text-align: left;
    padding: 9px 12px;
    border-radius: var(--radius);
    border: none;
    background: transparent;
    color: var(--text2);
    font-size: 13px;
    font-family: var(--font-ui);
    cursor: pointer;
    transition: background .12s, color .12s;
  }
  .drawer-tab:hover { background: var(--bg3); color: var(--text); }
  .drawer-tab.active { background: var(--bg3); color: var(--accent); font-weight: 600; }
  :global([data-theme="hacker"]) .drawer-tab { font-family: var(--font-mono); font-size: 11px; letter-spacing: 1px; }
  :global([data-theme="hacker"]) .drawer-tab.active { color: var(--accent); }
  :global([data-theme="retro"]) .drawer-tab { font-family: var(--font-mono); font-size: 10px; letter-spacing: 1.5px; }
  :global([data-theme="retro"]) .drawer-tab.active { color: #ffee00; text-shadow: 0 0 6px #ffee0066; }

  .drawer-divider {
    height: 1px;
    background: var(--border);
    margin: 0 10px 10px;
    flex-shrink: 0;
  }
  :global([data-theme="retro"]) .drawer-divider { background: #3300aa; }

  .drawer-theme-row {
    padding: 0 10px 10px;
    flex-shrink: 0;
  }
  .drawer-theme-btn {
    width: 100%;
    text-align: left;
    padding: 9px 12px;
    border-radius: var(--radius);
    border: 1px solid var(--border);
    background: var(--bg3);
    color: var(--text2);
    font-size: 12px;
    font-family: var(--font-ui);
    cursor: pointer;
    transition: background .12s, color .12s;
  }
  .drawer-theme-btn:hover { background: var(--border); color: var(--text); }
  :global([data-theme="hacker"]) .drawer-theme-btn { font-family: var(--font-mono); font-size: 11px; letter-spacing: 1px; border-color: var(--accent); color: var(--accent); }
  :global([data-theme="retro"])  .drawer-theme-btn { font-family: var(--font-mono); font-size: 10px; letter-spacing: 1.5px; border-color: #ffee00; color: #ffee00; text-shadow: 0 0 4px #ffee0066; }

  .drawer-sidebar-wrap {
    flex: 1;
    overflow-y: auto;
    /* Sidebar has its own padding; let it fill the drawer */
  }
  /* Override sidebar width inside drawer */
  .drawer-sidebar-wrap :global(.sidebar) {
    width: 100% !important;
    min-width: 0 !important;
    border-right: none !important;
  }
</style>
