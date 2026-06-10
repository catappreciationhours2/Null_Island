<script>
  import { appState, collectTask, notify } from '$lib/stores/appState.svelte.js';
  import { onMount, onDestroy, tick } from 'svelte';

  let isHacker = $derived(appState.theme === 'hacker');
  let isRetro  = $derived(appState.theme === 'retro');

  let canvasEl  = $state(null);
  let overlayEl = $state(null);

  const CELL = 6;
  const COLS = 120;
  const ROWS = 60;
  const CW   = COLS * CELL;
  const CH   = ROWS * CELL;

  function getBg() {
    if (appState.theme === 'hacker') return '#050e05';
    if (appState.theme === 'retro')  return '#1a001a';
    return '#f0ebe0';
  }

  // ── Paint a single bloom record onto the canvas ──────────────────────────
  // Reads the correct field for the current theme.
  //   cottage → b.cottage_color (filled rect)
  //   retro   → b.retro_color   (filled rect)
  //   hacker  → b.hacker_bit    (text '0' or '1', last-write-wins per cell)
  //
  // For hacker we still do last-write-wins in repaintGrid (via cellMap), and
  // the XOR logic is encoded at write-time into hacker_bit, so no extra work here.
  function paintCell(ctx, b, theme) {
    const x = b.col * CELL, y = b.row * CELL;
    if (theme === 'hacker') {
      ctx.clearRect(x, y, CELL, CELL);
      ctx.fillStyle = b.hacker_bit === 1 ? '#00ff41' : '#005510';
      ctx.fillText(String(b.hacker_bit ?? 0), x + 0.5, y + 0.5);
    } else if (theme === 'retro') {
      ctx.fillStyle = b.retro_color ?? '#ff004d';
      ctx.fillRect(x, y, CELL, CELL);
    } else {
      ctx.fillStyle = b.cottage_color ?? '#f4a8c7';
      ctx.fillRect(x, y, CELL, CELL);
    }
  }

  // ── Full repaint from appState.blooms ─────────────────────────────────────
  function repaintGrid() {
    const ctx = canvasEl?.getContext('2d');
    if (!ctx) return;
    const theme = appState.theme;

    ctx.fillStyle = getBg();
    ctx.fillRect(0, 0, CW, CH);

    ctx.font         = `bold ${CELL - 1}px monospace`;
    ctx.textBaseline = 'top';

    if (theme === 'hacker') {
      // For hacker: last hacker_bit per cell wins (most recent XOR result)
      const cellMap = new Map();
      for (const b of appState.blooms) {
        cellMap.set(`${b.col},${b.row}`, b);
      }
      for (const b of cellMap.values()) paintCell(ctx, b, theme);
    } else {
      // For cottage/retro: paint all entries in order; later overwrites earlier
      // This preserves the overlap-with-different-colour behaviour
      for (const b of appState.blooms) paintCell(ctx, b, theme);
    }
  }

  // ── Incremental paint for newly appended blooms ───────────────────────────
  let paintedCount = 0;

  function paintDelta() {
    const ctx = canvasEl?.getContext('2d');
    if (!ctx) return;
    const batch = appState.blooms.slice(paintedCount);
    if (!batch.length) return;
    const theme = appState.theme;

    ctx.font         = `bold ${CELL - 1}px monospace`;
    ctx.textBaseline = 'top';

    if (theme === 'hacker') {
      // For hacker delta: still need last-write-wins within this batch
      const batchMap = new Map();
      for (const b of batch) batchMap.set(`${b.col},${b.row}`, b);
      for (const b of batchMap.values()) paintCell(ctx, b, theme);
    } else {
      // cottage/retro: paint each new cell in arrival order
      for (const b of batch) paintCell(ctx, b, theme);
    }

    paintedCount = appState.blooms.length;
  }

  // Watch for new blooms
  $effect(() => {
    const len = appState.blooms.length;
    if (canvasEl && len > paintedCount) paintDelta();
  });

  // Watch theme changes → full repaint with correct colours
  $effect(() => {
    const _ = appState.theme;
    if (canvasEl) {
      paintedCount = 0;
      repaintGrid();
      paintedCount = appState.blooms.length;
    }
  });

  // ── Overlay: player + stars (rAF) ─────────────────────────────────────────
  let animFrame;
  let pulse = 0;

  function repaintOverlay() {
    const oc = overlayEl?.getContext('2d');
    if (!oc) return;
    oc.clearRect(0, 0, CW, CH);
    pulse += 0.05;
    const theme = appState.theme;

    for (const t of appState.tasks) {
      if (t.collected || t.doneChunks < t.chunks) continue;
      const pos = appState.taskPositions[t.id];
      if (!pos) continue;
      const px = pos.col * CELL + CELL / 2, py = pos.row * CELL + CELL / 2;
      const sc = 1 + Math.sin(pulse * 2) * 0.15;
      oc.save();
      oc.translate(px, py); oc.scale(sc, sc);
      oc.font = 'bold 13px sans-serif';
      oc.textAlign = 'center'; oc.textBaseline = 'middle';
      oc.fillStyle = theme === 'hacker' ? '#ffb800' : theme === 'retro' ? '#ffa300' : '#e8a030';
      oc.fillText('★', 0, 0);
      oc.restore();
    }

    for (const t of appState.tasks) {
      if (t.collected || t.doneChunks >= t.chunks) continue;
      const pos = appState.taskPositions[t.id];
      if (!pos) continue;
      const px = pos.col * CELL + CELL / 2, py = pos.row * CELL + CELL / 2;
      oc.fillStyle = theme === 'hacker' ? 'rgba(0,255,65,0.22)'
                   : theme === 'retro'  ? 'rgba(255,238,0,0.22)'
                   : 'rgba(90,70,50,0.28)';
      oc.beginPath(); oc.arc(px, py, 3, 0, Math.PI * 2); oc.fill();
    }

    const px = playerCol * CELL + CELL / 2, py = playerRow * CELL + CELL / 2;
    const pcol = theme === 'hacker' ? '#00ff41' : theme === 'retro' ? '#ffee00' : '#7a9e5e';
    oc.beginPath(); oc.arc(px, py, 9 + Math.sin(pulse) * 2, 0, Math.PI * 2);
    oc.strokeStyle = pcol + '44'; oc.lineWidth = 1; oc.stroke();
    if (theme === 'hacker') {
      oc.strokeStyle = pcol; oc.lineWidth = 1.5;
      oc.strokeRect(px - 5, py - 5, 10, 10);
      oc.fillStyle = pcol + '22'; oc.fillRect(px - 5, py - 5, 10, 10);
    } else {
      oc.fillStyle = pcol;
      oc.beginPath(); oc.arc(px, py, 5, 0, Math.PI * 2); oc.fill();
      oc.strokeStyle = theme === 'retro' ? '#0a0010' : '#fff';
      oc.lineWidth = 1.5; oc.stroke();
    }
    animFrame = requestAnimationFrame(repaintOverlay);
  }

  // ── Player ────────────────────────────────────────────────────────────────
  let playerCol = $state(Math.floor(COLS / 2));
  let playerRow = $state(Math.floor(ROWS / 2));

  function onKeyDown(e) {
    const d = { ArrowLeft:[-1,0], ArrowRight:[1,0], ArrowUp:[0,-1], ArrowDown:[0,1] }[e.key];
    if (!d) return;
    e.preventDefault();
    playerCol = Math.max(0, Math.min(COLS - 1, playerCol + d[0]));
    playerRow = Math.max(0, Math.min(ROWS - 1, playerRow + d[1]));
  }

  function onCanvasClick(e) {
    const rect   = canvasEl.getBoundingClientRect();
    const clickC = Math.floor((e.clientX - rect.left) * (CW / rect.width) / CELL);
    const clickR = Math.floor((e.clientY - rect.top)  * (CH / rect.height) / CELL);
    let hit = false;
    for (const t of appState.tasks) {
      if (hit || t.collected || t.doneChunks < t.chunks) continue;
      const pos = appState.taskPositions[t.id];
      if (!pos) continue;
      if (Math.abs(clickC - pos.col) <= 3 && Math.abs(clickR - pos.row) <= 3) {
        collectTask(t.id);
        hit = true;
      }
    }
    if (!hit) {
      playerCol = Math.max(0, Math.min(COLS - 1, clickC));
      playerRow = Math.max(0, Math.min(ROWS - 1, clickR));
    }
    canvasEl.focus();
  }

  // ── Snapshots ─────────────────────────────────────────────────────────────
  let snapshots   = $state([]);
  let snapBarOpen = $state(false);
  let editingSnap = $state(null);

  function saveSnapshot() {
    if (!canvasEl) return;
    const tmp = document.createElement('canvas');
    tmp.width = CW; tmp.height = CH;
    const tc = tmp.getContext('2d');
    tc.drawImage(canvasEl, 0, 0);
    tc.drawImage(overlayEl, 0, 0);
    snapshots = [{ dataUrl: tmp.toDataURL('image/png'), ts: Date.now(), label: '', featured: false, anniversaryLabel: null }, ...snapshots];
    snapBarOpen = true;
    checkAnniversaries();
    notify(isHacker ? '// SNAPSHOT SAVED' : isRetro ? 'MAP SAVED 💾' : 'Map snapshot saved 🌿', 'success');
  }

  function checkAnniversaries() {
    const now = Date.now(), M = 30*86400000, Y = 365*86400000;
    snapshots = snapshots.map(s => {
      const age = now - s.ts;
      if (Math.abs(age - Y) < 2*86400000) return { ...s, featured:true, anniversaryLabel:'1 year ago 🎉' };
      if (Math.abs(age - M) < 2*86400000) return { ...s, featured:true, anniversaryLabel:'1 month ago ✦' };
      return { ...s, featured:false, anniversaryLabel:null };
    });
  }

  function updateLabel(i, val) {
    snapshots = snapshots.map((s, si) => si === i ? { ...s, label: val.slice(0, 48) } : s);
    editingSnap = null;
  }

  function fmtDate(ts) {
    return new Date(ts).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
  }

  // ── Mount / destroy ───────────────────────────────────────────────────────
  onMount(async () => {
    await tick();
    paintedCount = 0;
    repaintGrid();
    paintedCount = appState.blooms.length;
    repaintOverlay();
    window.addEventListener('keydown', onKeyDown);
  });

  onDestroy(() => {
    cancelAnimationFrame(animFrame);
    window.removeEventListener('keydown', onKeyDown);
  });

  let pendingTasks      = $derived(appState.tasks.filter(t => t.doneChunks >= t.chunks && !t.collected));
  let anniversaryNotice = $derived(snapshots.find(s => s.featured)?.anniversaryLabel ?? null);
</script>

<div class="mv" class:hacker={isHacker} class:retro={isRetro}>

  <div class="mv-header">
    <div>
      <div class="mv-title">{isHacker ? 'WORLD_MAP.exe' : isRetro ? '▶ WORLD MAP' : 'World Map'}</div>
      <div class="mv-sub">
        {isHacker ? `${pendingTasks.length} rewards pending · arrows/click to move`
        : isRetro  ? `${pendingTasks.length} ITEMS READY · ARROWS TO MOVE`
        :            `${pendingTasks.length} rewards waiting · click stars to collect`}
      </div>
    </div>
    <div class="mv-right">
      <div class="legend">
        <span class="leg"><span class="dot player-dot"></span>{isHacker ? 'YOU' : 'You'}</span>
        <span class="leg"><span class="dot pending-dot"></span>{isHacker ? 'REWARD' : 'Reward'}</span>
        <span class="leg"><span class="dot inprog-dot"></span>{isHacker ? 'WIP' : 'In progress'}</span>
      </div>
      <button class="save-btn" onclick={saveSnapshot}>
        {isHacker ? '// SAVE' : isRetro ? 'SAVE 💾' : '↓ Save map'}
      </button>
    </div>
  </div>

  <div class="canvas-wrap">
    <canvas bind:this={canvasEl}  width={CW} height={CH} class="layer grid-layer"></canvas>
    <canvas bind:this={overlayEl} width={CW} height={CH} class="layer overlay-layer"
      tabindex="0" onclick={onCanvasClick}
      aria-label="World map — click stars to collect rewards, arrow keys to move"
    ></canvas>
    <div class="key-hint">
      {isHacker ? '// ← ↑ ↓ → · click ★ to collect'
      : isRetro  ? '← ↑ ↓ → · CLICK ★ TO COLLECT'
      :            'Arrow keys to move · click ★ to collect'}
    </div>
  </div>

  {#if pendingTasks.length > 0}
    <div class="reward-list">
      <div class="section-label">
        {isHacker ? '-- UNCLAIMED --' : isRetro ? '★ COLLECT BONUS' : 'Ready to collect'}
      </div>
      {#each pendingTasks as task (task.id)}
        <div class="reward-row">
          <span class="rstar">★</span>
          <span class="rtitle">{task.title}</span>
          <span class="tag {task.difficulty}">{task.difficulty}</span>
          <button class="collect-btn" onclick={() => collectTask(task.id)}>
            {isHacker ? 'COLLECT' : isRetro ? 'GRAB IT' : 'Collect →'}
          </button>
        </div>
      {/each}
    </div>
  {/if}

  {#if !snapBarOpen && snapshots.length > 0}
    <button class="snap-toggle" onclick={() => snapBarOpen = true}>
      {isHacker ? '// show saved maps' : isRetro ? '▸ SAVED MAPS' : '▸ Saved maps'}
    </button>
  {/if}

  {#if snapBarOpen}
    <div class="snap-bar">
      <div class="snap-bar-head">
        <span class="snap-bar-title">
          {isHacker ? '// SNAPSHOT_ARCHIVE' : isRetro ? '📼 SAVED MAPS' : 'Saved maps'}
        </span>
        {#if anniversaryNotice}<span class="ann-badge">{anniversaryNotice}</span>{/if}
        <button class="snap-close" onclick={() => snapBarOpen = false} aria-label="Close">⌄</button>
      </div>
      <div class="snap-scroll">
        {#each snapshots as snap, i}
          <div class="snap-item" class:featured={snap.featured}>
            {#if snap.anniversaryLabel}<div class="snap-ann">{snap.anniversaryLabel}</div>{/if}
            <img src={snap.dataUrl} alt="Map snapshot" class="snap-thumb" width="96" height="48" />
            {#if editingSnap === i}
              <input class="snap-input" type="text" value={snap.label} maxlength="48"
                placeholder="Name this map…"
                onblur={e => updateLabel(i, e.target.value)}
                onkeydown={e => e.key === 'Enter' && updateLabel(i, e.target.value)}
                autofocus />
            {:else}
              <button class="snap-label" onclick={() => editingSnap = i}>
                {snap.label || fmtDate(snap.ts)}
              </button>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {/if}

</div>

<style>
.mv { flex:1; overflow-y:auto; padding:16px; display:flex; flex-direction:column; gap:12px; }
.mv-header { display:flex; justify-content:space-between; align-items:flex-start; flex-shrink:0; }
.mv-title  { font-size:16px; font-weight:600; color:var(--text); }
.hacker .mv-title { font-family:var(--font-mono); color:#00ff41; font-size:13px; letter-spacing:1px; }
.retro  .mv-title { font-family:var(--font-mono); color:#ffee00; letter-spacing:2px; }
.mv-sub { font-size:11px; color:var(--text3); font-family:var(--font-mono); margin-top:2px; }
.retro .mv-sub { color:#ff4400; letter-spacing:1px; }
.mv-right { display:flex; align-items:center; gap:10px; }
.legend   { display:flex; gap:10px; align-items:center; }
.leg      { display:flex; align-items:center; gap:4px; font-size:10px; font-family:var(--font-mono); color:var(--text3); }
.dot { width:7px; height:7px; border-radius:50%; display:inline-block; flex-shrink:0; }
.player-dot  { background:#7a9e5e; }
.pending-dot { background:#e8a030; }
.inprog-dot  { background:rgba(90,70,50,0.4); border:1px solid rgba(90,70,50,0.6); }
.hacker .player-dot  { background:#00ff41; }
.hacker .pending-dot { background:#ffb800; }
.hacker .inprog-dot  { background:rgba(0,255,65,0.2); border-color:rgba(0,255,65,0.4); }
.retro  .player-dot  { background:#ffee00; }
.retro  .pending-dot { background:#ffa300; }
.retro  .inprog-dot  { background:rgba(255,238,0,0.2); border-color:rgba(255,238,0,0.4); }
.save-btn { padding:4px 11px; font-size:11px; font-family:var(--font-mono); background:var(--bg3); border:1px solid var(--border); border-radius:var(--radius); color:var(--text2); cursor:pointer; transition:all .15s; }
.save-btn:hover { border-color:var(--accent); color:var(--accent); }
.hacker .save-btn { background:transparent; border-color:#00ff41; color:#00ff41; }
.hacker .save-btn:hover { background:#00ff4114; }
.retro  .save-btn { background:#0a0010; border-color:#ffee00; color:#ffee00; border-radius:0; }
.retro  .save-btn:hover { background:#ffee0012; }
.canvas-wrap { position:relative; flex-shrink:0; line-height:0; border-radius:var(--radius-lg); overflow:hidden; border:1px solid var(--border); }
.hacker .canvas-wrap { border-color:#1a3a1a; }
.retro  .canvas-wrap { border-color:#3300aa; }
.layer { display:block; width:100%; height:auto; image-rendering:pixelated; image-rendering:crisp-edges; }
.grid-layer    { position:relative; z-index:1; }
.overlay-layer { position:absolute; inset:0; z-index:2; cursor:crosshair; outline:none; background:transparent; }
.overlay-layer:focus { box-shadow:0 0 0 2px var(--accent); }
.hacker .overlay-layer:focus { box-shadow:0 0 0 2px #00ff41; }
.retro  .overlay-layer:focus { box-shadow:0 0 0 2px #ffee00; }
.key-hint { position:absolute; bottom:7px; left:9px; z-index:3; font-size:9px; font-family:var(--font-mono); color:rgba(100,80,60,0.45); pointer-events:none; }
.hacker .key-hint { color:rgba(0,255,65,0.28); }
.retro  .key-hint { color:rgba(255,238,0,0.3); letter-spacing:1px; }
.reward-list   { display:flex; flex-direction:column; gap:6px; }
.section-label { font-size:10px; font-family:var(--font-mono); color:var(--text3); letter-spacing:.8px; text-transform:uppercase; padding-bottom:4px; border-bottom:1px solid var(--border); margin-bottom:2px; }
.hacker .section-label { color:#00ff41; border-color:#1a3a1a; }
.retro  .section-label { color:#ffee00; border-color:#3300aa; letter-spacing:2px; }
.reward-row { display:flex; align-items:center; gap:8px; padding:8px 12px; background:var(--surface); border:1px solid var(--border); border-radius:var(--radius); }
.hacker .reward-row { background:#050e05; border-color:#1a3a1a; }
.retro  .reward-row { background:#0a0010; border-color:#3300aa; border-radius:0; }
.rstar { color:#e8a030; font-size:13px; flex-shrink:0; }
.hacker .rstar { color:#ffb800; }
.retro  .rstar { color:#ffa300; }
.rtitle { flex:1; font-size:12px; color:var(--text); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.hacker .rtitle { font-family:var(--font-mono); font-size:11px; color:#aaa; }
.retro  .rtitle { font-family:var(--font-mono); font-size:11px; color:#ff8800; }
.tag { font-size:9px; font-family:var(--font-mono); padding:1px 5px; border:1px solid; border-radius:3px; text-transform:uppercase; flex-shrink:0; }
.tag.easy { color:var(--accent,#7a9e5e); border-color:color-mix(in srgb,var(--accent,#7a9e5e) 30%,transparent); }
.tag.med  { color:#b8870a; border-color:#b8870a44; }
.tag.hard { color:#aa3030; border-color:#aa303044; }
.hacker .tag.easy { color:#00ff41; border-color:#00ff4144; }
.hacker .tag.med  { color:#ffb800; border-color:#ffb80044; }
.hacker .tag.hard { color:#ff4400; border-color:#ff440044; }
.retro  .tag { border-radius:0; }
.retro  .tag.easy { color:#00e436; border-color:#00e43644; }
.retro  .tag.med  { color:#ffa300; border-color:#ffa30044; }
.retro  .tag.hard { color:#ff004d; border-color:#ff004d44; }
.collect-btn { padding:3px 10px; font-size:10px; font-family:var(--font-mono); background:var(--accent,#7a9e5e); border:none; border-radius:var(--radius); color:#fff; cursor:pointer; font-weight:600; flex-shrink:0; transition:opacity .15s; }
.collect-btn:hover { opacity:.82; }
.hacker .collect-btn { background:#00ff41; color:#050e05; border-radius:2px; }
.retro  .collect-btn { background:#ffee00; color:#0a0010; border-radius:0; letter-spacing:1px; }
.snap-toggle { font-size:11px; font-family:var(--font-mono); color:var(--text3); background:transparent; border:1px dashed var(--border); border-radius:var(--radius); padding:6px 12px; cursor:pointer; transition:all .15s; }
.snap-toggle:hover { border-color:var(--accent); color:var(--accent); }
.hacker .snap-toggle { border-color:#1a3a1a; color:#00aa30; }
.hacker .snap-toggle:hover { border-color:#00ff41; color:#00ff41; }
.retro  .snap-toggle { border-color:#3300aa; color:#5500cc; border-radius:0; }
.retro  .snap-toggle:hover { border-color:#ffee00; color:#ffee00; }
.snap-bar { background:var(--bg2); border:1px solid var(--border); border-radius:var(--radius-lg); overflow:hidden; flex-shrink:0; }
.hacker .snap-bar { background:#050e05; border-color:#1a3a1a; border-radius:3px; }
.retro  .snap-bar { background:#0a0010; border-color:#3300aa; border-radius:0; }
.snap-bar-head { display:flex; align-items:center; gap:8px; padding:8px 12px; border-bottom:1px solid var(--border); }
.hacker .snap-bar-head { border-color:#1a3a1a; }
.retro  .snap-bar-head { border-color:#3300aa; }
.snap-bar-title { font-size:10px; font-family:var(--font-mono); color:var(--text3); flex:1; letter-spacing:.5px; }
.hacker .snap-bar-title { color:#00aa30; }
.retro  .snap-bar-title { color:#5500cc; letter-spacing:2px; }
.ann-badge { font-size:10px; font-family:var(--font-mono); padding:1px 7px; border-radius:4px; color:var(--accent,#7a9e5e); background:color-mix(in srgb,var(--accent,#7a9e5e) 12%,transparent); border:1px solid color-mix(in srgb,var(--accent,#7a9e5e) 35%,transparent); }
.hacker .ann-badge { color:#00ff41; background:#00ff4114; border-color:#00ff4140; }
.retro  .ann-badge { color:#ffee00; background:#ffee0014; border-color:#ffee0040; border-radius:0; }
.snap-close { font-size:16px; background:none; border:none; cursor:pointer; color:var(--text3); padding:0 2px; flex-shrink:0; }
.snap-close:hover { color:var(--text); }
.snap-scroll { display:flex; gap:12px; padding:10px 12px; overflow-x:auto; scrollbar-width:thin; scrollbar-color:var(--border) transparent; }
.snap-scroll::-webkit-scrollbar { height:4px; }
.snap-scroll::-webkit-scrollbar-thumb { background:var(--border); border-radius:2px; }
.snap-item { flex-shrink:0; display:flex; flex-direction:column; align-items:center; gap:5px; position:relative; }
.snap-item.featured .snap-thumb { border-width:2px; border-color:var(--accent,#7a9e5e); }
.hacker .snap-item.featured .snap-thumb { border-color:#00ff41; }
.retro  .snap-item.featured .snap-thumb { border-color:#ffee00; }
.snap-ann { position:absolute; top:-20px; left:50%; transform:translateX(-50%); font-size:9px; font-family:var(--font-mono); white-space:nowrap; background:var(--accent,#7a9e5e); color:#fff; padding:1px 5px; border-radius:3px; }
.hacker .snap-ann { background:#00ff41; color:#050e05; }
.retro  .snap-ann { background:#ffee00; color:#0a0010; border-radius:0; }
.snap-thumb { display:block; width:96px; height:48px; border-radius:5px; border:1px solid var(--border); object-fit:cover; image-rendering:pixelated; transition:border-color .15s; }
.snap-item:hover .snap-thumb { border-color:var(--text2); }
.hacker .snap-thumb { border-color:#1a3a1a; border-radius:2px; }
.retro  .snap-thumb { border-color:#3300aa; border-radius:0; }
.snap-label { font-size:10px; font-family:var(--font-mono); color:var(--text3); text-align:center; max-width:96px; word-break:break-word; white-space:normal; line-height:1.4; background:none; border:none; cursor:text; padding:0; }
.snap-label:hover { color:var(--text2); }
.hacker .snap-label { color:#1a5a1a; }
.hacker .snap-label:hover { color:#00ff41; }
.retro  .snap-label { color:#3300aa; }
.retro  .snap-label:hover { color:#ffee00; }
.snap-input { font-size:10px; font-family:var(--font-mono); color:var(--text); background:var(--bg); border:1px solid var(--accent,#7a9e5e); border-radius:3px; padding:2px 5px; width:96px; text-align:center; outline:none; }
.hacker .snap-input { background:#050e05; color:#00ff41; border-color:#00ff41; }
.retro  .snap-input { background:#0a0010; color:#ffee00; border-color:#ffee00; border-radius:0; }
</style>