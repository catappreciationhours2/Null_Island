<script>
  import { appState, toggleTheme, setTab } from '$lib/stores/appState.svelte.js';

  const tabs = [
    { id: 'tasks',   cottage: '📋 Tasks',   hacker: 'TASKS',   retro: '👾 TASKS'  },
    { id: 'map',     cottage: '🗺  Map',     hacker: 'MAP',     retro: '🕹 MAP'    },
    { id: 'profile', cottage: '👤 Profile',  hacker: 'PROFILE', retro: '🎮 PROFILE'},
    { id: 'awards',  cottage: '🏆 Awards',   hacker: 'AWARDS',  retro: '🏅 AWARDS' },
    { id: 'shop',    cottage: '🏪 Shop',     hacker: 'SHOP',    retro: '🪙 SHOP'   },
    { id: 'focus',   cottage: '🎯 Focus',    hacker: 'FOCUS',   retro: '⏱ FOCUS'  },
  ];

  let theme    = $derived(appState.theme);
  let isHacker = $derived(theme === 'hacker');
  let isRetro  = $derived(theme === 'retro');

  function tabLabel(tab) {
    if (isRetro)  return tab.retro;
    if (isHacker) return tab.hacker;
    return tab.cottage;
  }

  const NEXT_THEME_LABEL = { cottage: '⌨ Hacker', hacker: '👾 Retro', retro: '🌿 Cottage' };
</script>

<header class="topbar" class:retro={isRetro}>
  <div class="brand">
    {#if isHacker}
      <span class="prompt">&gt;</span> NULL_ISLAND_OS
    {:else if isRetro}
      <span class="retro-brand">
        <span class="pac">●</span> NULL ISLAND
      </span>
    {:else}
      <span class="leaf">🌿</span> Null_Island
    {/if}
  </div>

  <nav class="tabs">
    {#each tabs as tab}
      <button
        class="tab"
        class:active={appState.activeTab === tab.id}
        class:focus-tab={tab.id === 'focus'}
        onclick={() => setTab(tab.id)}
      >
        {tabLabel(tab)}
      </button>
    {/each}
  </nav>

  <div class="right-cluster">
    <span class="stat">
      {#if isHacker}STREAK:{appState.player.streak}d
      {:else if isRetro}×{appState.player.streak} COMBO
      {:else}🔥 {appState.player.streak}d{/if}
    </span>
    <span class="stat gold">
      {#if isHacker}GOLD:{appState.player.gold}
      {:else if isRetro}🪙{appState.player.gold}
      {:else}💰 {appState.player.gold}{/if}
    </span>
    <button class="toggle-btn" onclick={toggleTheme}>
      {NEXT_THEME_LABEL[appState.theme] || '🌿 Cottage'}
    </button>
  </div>
</header>

<style>
.topbar {
  display:flex; align-items:center; gap:12px;
  height:var(--topbar-h); padding:0 14px;
  background:var(--bg2); border-bottom:1px solid var(--border);
  flex-shrink:0; overflow:hidden;
  transition:background .2s, border-color .2s;
}
.topbar.retro { border-bottom:2px solid #ffee00; box-shadow:0 2px 12px #ffee0022; }

.brand { font-size:14px; font-weight:600; color:var(--accent); white-space:nowrap; flex-shrink:0; }
:global([data-theme="hacker"]) .brand { font-family:var(--font-mono); font-size:12px; letter-spacing:1.5px; }
:global([data-theme="retro"])  .brand { font-family:var(--font-mono); font-size:13px; letter-spacing:2px; text-shadow:0 0 8px #ffee00; }

.prompt { color:var(--text3); margin-right:3px; }
.retro-brand { display:flex; align-items:center; gap:6px; }
.pac {
  display:inline-block; color:#ffee00; font-size:16px;
  animation:pacMouth .5s ease-in-out infinite alternate;
  text-shadow:0 0 8px #ffee00;
}
@keyframes pacMouth {
  from { clip-path:polygon(0% 0%,100% 25%,100% 75%,0% 100%); }
  to   { clip-path:polygon(0% 0%,100% 0%,100% 100%,0% 100%); }
}

.tabs { display:flex; gap:1px; flex:1; overflow-x:auto; scrollbar-width:none; }
.tabs::-webkit-scrollbar { display:none; }
.tab {
  padding:6px 14px; font-size:12px; font-family:var(--font-ui);
  color:var(--text3); background:transparent; border:none;
  border-bottom:2px solid transparent; cursor:pointer; white-space:nowrap;
  transition:color .15s, background .15s, border-color .15s;
  border-radius:var(--radius) var(--radius) 0 0;
}
.tab:hover { color:var(--text2); background:var(--bg3); }
.tab.active { color:var(--accent); border-bottom-color:var(--accent); background:var(--bg3); }

/* Focus tab gets a distinct colour so it stands out as a mode change */
.tab.focus-tab { color:var(--accent2); }
.tab.focus-tab:hover { color:var(--accent2); opacity:.8; }
.tab.focus-tab.active { color:var(--accent2); border-bottom-color:var(--accent2); }

:global([data-theme="hacker"]) .tab { font-family:var(--font-mono); font-size:11px; letter-spacing:1px; }
:global([data-theme="hacker"]) .tab.active::before { content:'[ '; }
:global([data-theme="hacker"]) .tab.active::after  { content:' ]'; }
:global([data-theme="retro"]) .tab { font-family:var(--font-mono); font-size:10px; letter-spacing:1.5px; }
:global([data-theme="retro"]) .tab.active { color:#ffee00; border-bottom-color:#ffee00; text-shadow:0 0 6px #ffee00; }
:global([data-theme="retro"]) .tab.active::before { content:'◄ '; color:#ff4400; }
:global([data-theme="retro"]) .tab.active::after  { content:' ►'; color:#ff4400; }
:global([data-theme="retro"]) .tab.focus-tab { color:#ff4400; }

.right-cluster { display:flex; align-items:center; gap:10px; flex-shrink:0; }
.stat { font-size:11px; font-family:var(--font-mono); color:var(--text2); white-space:nowrap; }
.stat.gold { color:var(--gold-color); }
:global([data-theme="retro"]) .stat { font-size:10px; letter-spacing:1px; }
:global([data-theme="retro"]) .stat.gold { color:#ffbb00; text-shadow:0 0 5px #ffbb0066; }
.toggle-btn {
  padding:4px 10px; font-size:11px; font-family:var(--font-ui);
  background:var(--bg3); border:1px solid var(--border);
  border-radius:var(--radius); color:var(--text2); cursor:pointer;
  white-space:nowrap; transition:all .15s;
}
.toggle-btn:hover { background:var(--border); color:var(--text); }
:global([data-theme="hacker"]) .toggle-btn { font-family:var(--font-mono); font-size:10px; }
:global([data-theme="retro"])  .toggle-btn { font-family:var(--font-mono); font-size:10px; letter-spacing:1px; border-color:#3300aa; }
:global([data-theme="retro"])  .toggle-btn:hover { border-color:#ffee00; color:#ffee00; box-shadow:0 0 6px #ffee0066; }
</style>
