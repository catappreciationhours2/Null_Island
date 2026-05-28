<script>
  import { appState, toggleTheme, setTab } from '$lib/stores/appState.svelte.js';

  const tabs = [
    { id: 'tasks',   cottage: '📋 Tasks',   hacker: 'TASKS'   },
    { id: 'map',     cottage: '🗺  Map',     hacker: 'MAP'     },
    { id: 'profile', cottage: '👤 Profile',  hacker: 'PROFILE' },
    { id: 'awards',  cottage: '🏆 Awards',   hacker: 'AWARDS'  },
    { id: 'shop',    cottage: '🏪 Shop',     hacker: 'SHOP'    },
  ];

  let isHacker = $derived(appState.theme === 'hacker');
</script>

<header class="topbar">
  <div class="brand">
    {#if isHacker}<span class="prompt">&gt;</span> NULL_ISLAND{:else}<span class="leaf">🌿</span> Null_Island{/if}
  </div>

  <nav class="tabs">
    {#each tabs as tab}
      <button class="tab" class:active={appState.activeTab === tab.id} onclick={() => setTab(tab.id)}>
        {isHacker ? tab.hacker : tab.cottage}
      </button>
    {/each}
  </nav>

  <div class="right-cluster">
    <span class="stat">{isHacker ? `STREAK:${appState.player.streak}d` : `🔥 ${appState.player.streak}d`}</span>
    <span class="stat gold">{isHacker ? `GOLD:${appState.player.gold}` : `💰 ${appState.player.gold}`}</span>
    <button class="toggle-btn" onclick={toggleTheme}>{isHacker ? '🌿 Cottage' : '⌨ Hacker'}</button>
  </div>
</header>

<style>
.topbar { display:flex; align-items:center; gap:12px; height:var(--topbar-h); padding:0 14px; background:var(--bg2); border-bottom:1px solid var(--border); flex-shrink:0; overflow:hidden; }
.brand { font-size:14px; font-weight:600; color:var(--accent); white-space:nowrap; flex-shrink:0; }
:global([data-theme="hacker"]) .brand { font-family:var(--font-mono); font-size:12px; letter-spacing:1.5px; }
.prompt { color:var(--text3); margin-right:3px; }
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
:global([data-theme="hacker"]) .tab { font-family:var(--font-mono); font-size:11px; letter-spacing:1px; }
:global([data-theme="hacker"]) .tab.active::before { content:'[ '; }
:global([data-theme="hacker"]) .tab.active::after  { content:' ]'; }
.right-cluster { display:flex; align-items:center; gap:10px; flex-shrink:0; }
.stat { font-size:11px; font-family:var(--font-mono); color:var(--text2); white-space:nowrap; }
.stat.gold { color:var(--gold-color); }
.toggle-btn {
  padding:4px 10px; font-size:11px; font-family:var(--font-ui);
  background:var(--bg3); border:1px solid var(--border); border-radius:var(--radius);
  color:var(--text2); cursor:pointer; white-space:nowrap; transition:all .15s;
}
.toggle-btn:hover { background:var(--border); color:var(--text); }
:global([data-theme="hacker"]) .toggle-btn { font-family:var(--font-mono); font-size:10px; }
</style>