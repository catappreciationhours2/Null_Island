<script>
  import { appState } from '$lib/stores/appState.svelte.js';
</script>

<div class="notif-stack">
  {#each appState.notifications as n (n.id)}
    <div class="notif {n.type}" role="status">
      {n.message}
    </div>
  {/each}
</div>

<style>
.notif-stack {
  position: fixed;
  bottom: 20px;
  right: 20px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  z-index: 1000;
  pointer-events: none;
}
.notif {
  background: var(--bg2);
  border: 1px solid var(--accent);
  border-radius: var(--radius);
  padding: 8px 14px;
  font-size: 12px;
  font-family: var(--font-mono);
  color: var(--accent);
  max-width: 280px;
  animation: slideUp 0.25s ease;
  box-shadow: var(--shadow);
}
.notif.warn  { border-color: var(--accent2); color: var(--accent2); }
.notif.error { border-color: var(--hp-color); color: var(--hp-color); }
@keyframes slideUp {
  from { transform: translateY(12px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}
</style>
