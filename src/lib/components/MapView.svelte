<script>
  import { appState, collectTask, notify } from '$lib/stores/appState.svelte.js';
  import { onMount, onDestroy } from 'svelte';

  let isHacker = $derived(appState.theme === 'hacker');

  // Player position (%)
  let playerX = $state(50);
  let playerY = $state(50);
  let moving  = $state(false);

  // NPC positions
  let npcs = $state([
    { id:0, x:22, y:30, name:'Lyra' },
    { id:1, x:70, y:45, name:'Finn' },
    { id:2, x:45, y:72, name:'Zora' },
  ]);

  // Zones
  const zones = [
    { x:4,  y:8,  w:22, h:20, label:'The Glade',      hLabel:'GLADE_ZONE',    col:'#4a7a2a', hCol:'#003300', hText:'#00cc33' },
    { x:38, y:4,  w:26, h:16, label:'Crystal Shore',   hLabel:'SHORE_NET',     col:'#2a6a8a', hCol:'#001a33', hText:'#00b4ff' },
    { x:66, y:34, w:20, h:22, label:'Ember Peak',      hLabel:'PEAK_SRV',      col:'#8a3a1a', hCol:'#330d00', hText:'#ff6030' },
    { x:14, y:56, w:28, h:20, label:'Hollow Market',   hLabel:'MARKET_NODE',   col:'#7a5a2a', hCol:'#1a1000', hText:'#ffb800' },
    { x:54, y:62, w:24, h:18, label:'Deep Archive',    hLabel:'ARCHIVE_SRV',   col:'#5a2a8a', hCol:'#150033', hText:'#aa44ff' },
  ];

  function moveToZone(z) {
    playerX = z.x + z.w / 2;
    playerY = z.y + z.h / 2;
    moving  = true;
    setTimeout(() => moving = false, 700);
    notify(isHacker ? `> MOVING TO ${z.hLabel}` : `🌿 Travelling to ${z.label}...`);
  }

  function handleCollect(task) {
    collectTask(task.id);
    playerX = task.mapX;
    playerY = task.mapY;
  }

  // NPC wander loop
  let npcInterval;
  onMount(() => {
    npcInterval = setInterval(() => {
      npcs = npcs.map(n => ({
        ...n,
        x: Math.max(2, Math.min(95, n.x + (Math.random() - 0.5) * 7)),
        y: Math.max(2, Math.min(92, n.y + (Math.random() - 0.5) * 7)),
      }));
    }, 1600);
  });
  onDestroy(() => clearInterval(npcInterval));

  let pendingTasks    = $derived(appState.tasks.filter(t => t.doneChunks >= t.chunks && !t.collected));
  let collectedTasks  = $derived(appState.tasks.filter(t => t.collected));
  let inProgressTasks = $derived(appState.tasks.filter(t => t.doneChunks < t.chunks));
</script>

<div class="map-view">
  <div class="map-header">
    <div>
      <div class="view-title">{isHacker ? 'WORLD_MAP.exe' : 'World Map'}</div>
      <div class="view-sub">
        {isHacker
          ? `${pendingTasks.length} rewards pending · ${npcs.length} users online`
          : `${pendingTasks.length} rewards waiting · ${npcs.length} adventurers online`}
      </div>
    </div>
    <div class="legend">
      <span class="legend-item"><span class="dot player-dot"></span>{isHacker ? 'YOU' : 'You'}</span>
      <span class="legend-item"><span class="dot npc-dot"></span>{isHacker ? 'USERS' : 'Others'}</span>
      <span class="legend-item"><span class="dot reward-dot"></span>{isHacker ? 'REWARD' : 'Reward'}</span>
    </div>
  </div>

  <div class="map-container">
    <!-- Grid lines -->
    <svg class="map-grid" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      {#each Array(20) as _, i}
        <line x1="{i * 5}%" y1="0" x2="{i * 5}%" y2="100%"
          stroke="var(--border)" stroke-width="0.5" opacity="0.4"/>
      {/each}
      {#each Array(16) as _, i}
        <line x1="0" y1="{i * 6.25}%" x2="100%" y2="{i * 6.25}%"
          stroke="var(--border)" stroke-width="0.5" opacity="0.4"/>
      {/each}
    </svg>

    <!-- Zones -->
    {#each zones as z}
      <button
        class="zone"
        style="
          left:{z.x}%; top:{z.y}%;
          width:{z.w}%; height:{z.h}%;
          background:{isHacker ? z.hCol + 'bb' : z.col + '44'};
          border-color:{isHacker ? z.hText : z.col};
          color:{isHacker ? z.hText : '#fff'};
        "
        onclick={() => moveToZone(z)}
        title={isHacker ? z.hLabel : z.label}
      >
        <span class="zone-label">{isHacker ? z.hLabel : z.label}</span>
      </button>
    {/each}

    <!-- In-progress task markers (dim) -->
    {#each inProgressTasks as task (task.id)}
      <div
        class="task-marker dim-marker"
        style="left:{task.mapX}%; top:{task.mapY}%"
        title="{task.title} (in progress)"
      >◦</div>
    {/each}

    <!-- Pending reward markers -->
    {#each pendingTasks as task (task.id)}
      <button
        class="task-marker reward-marker"
        style="left:{task.mapX}%; top:{task.mapY}%"
        onclick={() => handleCollect(task)}
        title="Collect: {task.title}"
      >★</button>
    {/each}

    <!-- Collected markers -->
    {#each collectedTasks as task (task.id)}
      <div
        class="task-marker collected-marker"
        style="left:{task.mapX}%; top:{task.mapY}%"
        title="Collected: {task.title}"
      >✓</div>
    {/each}

    <!-- NPCs -->
    {#each npcs as npc (npc.id)}
      <div
        class="npc"
        style="left:{npc.x}%; top:{npc.y}%"
        title={npc.name}
      ></div>
    {/each}

    <!-- Player -->
    <div
      class="player"
      class:moving
      style="left:{playerX}%; top:{playerY}%"
    >
      <div class="player-pulse"></div>
    </div>
  </div>

  <!-- Reward list -->
  {#if pendingTasks.length > 0}
    <div class="reward-list">
      <div class="section-label">{isHacker ? '-- UNCLAIMED REWARDS --' : 'Ready to collect'}</div>
      {#each pendingTasks as task (task.id)}
        <div class="reward-item">
          <span class="reward-star">★</span>
          <span class="reward-title">{task.title}</span>
          <span class="tag {task.difficulty}">{task.difficulty}</span>
          <button class="btn primary" onclick={() => handleCollect(task)}>
            {isHacker ? 'COLLECT' : 'Collect'}
          </button>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
.map-view {
  flex: 1; overflow-y: auto; padding: 16px;
  display: flex; flex-direction: column; gap: 12px;
}
.map-header { display: flex; justify-content: space-between; align-items: flex-start; }
.view-title { font-size: 16px; font-weight: 600; color: var(--text); }
:global([data-theme="hacker"]) .view-title { font-family: var(--font-mono); color: var(--accent); font-size: 13px; letter-spacing: 1px; }
.view-sub { font-size: 11px; color: var(--text3); font-family: var(--font-mono); margin-top: 1px; }
.legend { display: flex; gap: 12px; align-items: center; }
.legend-item { display: flex; align-items: center; gap: 4px; font-size: 10px; font-family: var(--font-mono); color: var(--text3); }
.dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
.player-dot { background: var(--accent); box-shadow: 0 0 4px var(--accent); }
.npc-dot    { background: var(--text3); }
.reward-dot { background: var(--accent2); }

.map-container {
  position: relative;
  height: 280px;
  background: var(--bg3);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  flex-shrink: 0;
}
.map-grid { position: absolute; inset: 0; pointer-events: none; }

.zone {
  position: absolute;
  border: 1px solid;
  border-radius: var(--radius);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background: transparent;
  transition: filter 0.15s, transform 0.1s;
  padding: 0;
}
.zone:hover { filter: brightness(1.3); transform: scale(1.02); z-index: 5; }
.zone-label { font-size: 9px; font-family: var(--font-mono); font-weight: 600; text-align: center; padding: 0 4px; }

.task-marker {
  position: absolute;
  transform: translate(-50%, -50%);
  font-size: 13px;
  z-index: 15;
  line-height: 1;
  border: none;
  background: none;
  padding: 0;
}
.dim-marker  { color: var(--text3); font-size: 10px; }
.reward-marker {
  color: var(--accent2);
  cursor: pointer;
  animation: markerPulse 2s ease-in-out infinite;
  font-size: 14px;
  text-shadow: 0 0 8px var(--accent2);
}
.reward-marker:hover { transform: translate(-50%, -50%) scale(1.3); }
.collected-marker { color: var(--xp-color); font-size: 11px; opacity: 0.7; }
@keyframes markerPulse { 0%,100%{transform:translate(-50%,-50%) scale(1)} 50%{transform:translate(-50%,-50%) scale(1.25)} }

.npc {
  position: absolute;
  width: 8px; height: 8px;
  border-radius: 50%;
  background: var(--text3);
  border: 1px solid var(--bg);
  transform: translate(-50%, -50%);
  transition: left 1.4s ease, top 1.4s ease;
  z-index: 12;
}
:global([data-theme="hacker"]) .npc { border-radius: 0; background: var(--accent3); }

.player {
  position: absolute;
  width: 12px; height: 12px;
  background: var(--accent);
  border: 2px solid var(--bg);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  transition: left 0.6s ease, top 0.6s ease;
  z-index: 20;
  box-shadow: 0 0 8px var(--accent);
}
:global([data-theme="hacker"]) .player { border-radius: 0; }
.player.moving { animation: movePulse 0.6s ease; }
@keyframes movePulse { 0%{box-shadow:0 0 8px var(--accent)} 50%{box-shadow:0 0 20px var(--accent)} 100%{box-shadow:0 0 8px var(--accent)} }

.player-pulse {
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 1px solid var(--accent);
  opacity: 0.4;
  animation: ripple 2s ease-out infinite;
}
:global([data-theme="hacker"]) .player-pulse { border-radius: 0; }
@keyframes ripple { 0%{transform:scale(1);opacity:0.4} 100%{transform:scale(2.5);opacity:0} }

/* Reward list */
.reward-list { display: flex; flex-direction: column; gap: 6px; }
.section-label { font-size: 10px; font-family: var(--font-mono); color: var(--text3); letter-spacing: 0.8px; text-transform: uppercase; padding-bottom: 4px; border-bottom: 1px solid var(--border); margin-bottom: 2px; }
.reward-item {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
.reward-star { color: var(--accent2); font-size: 13px; flex-shrink: 0; }
.reward-title { flex: 1; font-size: 12px; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
:global([data-theme="hacker"]) .reward-title { font-family: var(--font-mono); font-size: 11px; }
</style>
