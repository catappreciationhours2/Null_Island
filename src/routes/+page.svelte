<script>
  import { onMount } from 'svelte';
  import { appState } from '$lib/stores/appState.svelte.js';

  import TopBar        from '$lib/components/TopBar.svelte';
  import Sidebar       from '$lib/components/Sidebar.svelte';
  import Notifications from '$lib/components/Notifications.svelte';
  import TasksView     from '$lib/components/TasksView.svelte';
  import MapView       from '$lib/components/MapView.svelte';
  import ProfileView   from '$lib/components/ProfileView.svelte';
  import AwardsView    from '$lib/components/AwardsView.svelte';
  import ShopView      from '$lib/components/ShopView.svelte';
  import FocusView     from '$lib/components/FocusView.svelte';

  // Focus mode = full screen, no shell visible
  let isFocus = $derived(appState.activeTab === 'focus');

  onMount(() => {
    const saved = localStorage.getItem('hw-theme') || 'cottage';
    appState.theme = saved;
    document.documentElement.dataset.theme = saved;
  });
</script>

<!-- FocusView is always mounted so running timers survive tab switches.
     It hides itself with display:none when not active. -->
<FocusView visible={isFocus} />

{#if !isFocus}
  <div class="app-shell">
    <TopBar />
    <div class="body-row">
      <Sidebar />
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

<Notifications />

<style>
  .app-shell    { display:flex; flex-direction:column; min-height:100dvh; zoom:1.5; }
  .body-row     { display:flex; flex:1; min-height:0; }
  .main-content { flex:1; display:flex; flex-direction:column; overflow-y:auto; background:var(--bg); transition:background .2s; }
</style>
