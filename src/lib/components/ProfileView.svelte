<script>
import { appState, toggleEquip, saveEquipTransform, notify } from '$lib/stores/appState.svelte.js';
import { onMount } from 'svelte';

let isHacker = $derived(appState.theme === 'hacker');
let p = $derived(appState.player);
let profileTab = $state('overview');

// ── Attribute config ──────────────────────────────────────────────────────
const ATTRS     = ['Focus','Creative','Consist','Learning','Endurance'];
const ATTR_KEYS = ['focus','creativity','consistency','learning','endurance'];
// focus maxes at 1000 (count of focus sessions); all others cap at 100
const ATTR_MAXES = { focus: 1000, creativity: 100, consistency: 100, learning: 100, endurance: 100 };

// Time formatter
// @ts-ignore
function formatTime(mins) {
  if (!mins) return '0m';
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// ── Radar chart ───────────────────────────────────────────────────────────
// @ts-ignore
let radarCanvas = $state(null);

function drawRadar() {
  // @ts-ignore
  const c = radarCanvas;
  if (!c) return;
  const ctx = c.getContext('2d');
  const W = 220, H = 200, cx = 110, cy = 100, maxR = 70;
  ctx.clearRect(0, 0, W, H);
  const isH      = appState.theme === 'hacker';
  const accentCol  = isH ? '#00ff41' : '#7a9e5e';
  const fillCol    = isH ? '#00ff4122' : '#7a9e5e22';
  const gridCol    = isH ? '#1a3a1a' : '#c9b99a50';
  const labelCol   = isH ? '#4aaa4a' : '#7a6248';
  const overflowCol= isH ? '#00ffff' : '#c07030';
  const N = ATTRS.length;

  // grid rings at 25%, 50%, 75%, 100% of maxR
  [0.25, 0.5, 0.75, 1.0].forEach(frac => {
    ctx.beginPath();
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2 - Math.PI / 2;
      const x = cx + Math.cos(a) * maxR * frac;
      const y = cy + Math.sin(a) * maxR * frac;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = gridCol; ctx.lineWidth = 0.5; ctx.stroke();
  });

  // axis lines (extend a bit past label ring)
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2 - Math.PI / 2;
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * maxR * 1.15, cy + Math.sin(a) * maxR * 1.15);
    ctx.strokeStyle = gridCol; ctx.lineWidth = 0.5; ctx.stroke();
  }

  // data polygon — ratio = attrValue / attrMax
  // no hard cap: if ratio > 1 the polygon exceeds the outer ring proportionally
  const vals = ATTR_KEYS.map(k => {
    const maxVal = ATTR_MAXES[k] || 100;
    return (p.attributes[k] || 0) / maxVal;
  });

  ctx.beginPath();
  vals.forEach((v, i) => {
    // soft cap at 2.0 so we stay within the 220×200 canvas
    const r = maxR * Math.min(v, 2.0);
    const a = (i / N) * Math.PI * 2 - Math.PI / 2;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fillStyle = fillCol; ctx.fill();
  ctx.strokeStyle = accentCol; ctx.lineWidth = 1.5; ctx.stroke();

  // vertex dots (overflow highlighted in accent2 colour)
  vals.forEach((v, i) => {
    const r = maxR * Math.min(v, 2.0);
    const a = (i / N) * Math.PI * 2 - Math.PI / 2;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, v > 1 ? 4 : 3, 0, Math.PI * 2);
    ctx.fillStyle = v > 1 ? overflowCol : accentCol;
    ctx.fill();
  });

  // labels (fixed ring outside max boundary)
  ctx.fillStyle = labelCol;
  ctx.font = `10px ${isH ? 'Share Tech Mono, monospace' : 'Lora, serif'}`;
  ATTRS.forEach((label, i) => {
    const a = (i / N) * Math.PI * 2 - Math.PI / 2;
    const x = cx + Math.cos(a) * (maxR + 18);
    const y = cy + Math.sin(a) * (maxR + 18);
    ctx.textAlign = Math.abs(Math.cos(a)) < 0.15 ? 'center' : Math.cos(a) > 0 ? 'left' : 'right';
    ctx.fillText(label, x, y + 4);
  });
}

onMount(() => drawRadar());
$effect(() => { appState.theme; appState.player.attributes.focus; drawRadar(); });

// ── Character Customizer ──────────────────────────────────────────────────
// @ts-ignore
let charCanvas   = $state(null);
let selectedEq   = $state(null);
let isDragging   = $state(false);
let dragStart    = $state(null);

function drawChar() {
  // @ts-ignore
  const c = charCanvas;
  if (!c) return;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 160, 160);
  ctx.imageSmoothingEnabled = false;
  const isH = appState.theme === 'hacker';
  ctx.fillStyle = isH ? '#0c110c' : '#f0ebe0';
  ctx.fillRect(0, 0, 160, 160);
  ctx.strokeStyle = isH ? '#1a3a1a' : '#c9b99a30';
  ctx.lineWidth = 0.5;
  for (let x = 0; x < 160; x += 16) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,160); ctx.stroke(); }
  for (let y = 0; y < 160; y += 16) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(160,y); ctx.stroke(); }
  const S = 5, ox = 56, oy = 16;
  const pal = isH
    ? { skin:'#00ff41', hair:'#003300', shirt:'#003300', pants:'#001400', eyes:'#00ffff' }
    : { skin:'#f5c89a', hair:'#7a4020', shirt:'#5b7fa6', pants:'#3d2f1e', eyes:'#3d2f1e' };
  // @ts-ignore
  const px = (x, y, col) => { ctx.fillStyle = pal[col]||col; ctx.fillRect(ox+x*S, oy+y*S, S, S); };
  [
    [2,0,'hair'],[3,0,'hair'],[4,0,'hair'],
    [1,1,'hair'],[2,1,'skin'],[3,1,'skin'],[4,1,'skin'],[5,1,'hair'],
    [1,2,'skin'],[2,2,'skin'],[3,2,'skin'],[4,2,'skin'],[5,2,'skin'],
    [2,2,'eyes'],[4,2,'eyes'],
    [1,3,'skin'],[2,3,'skin'],[3,3,'skin'],[4,3,'skin'],[5,3,'skin'],
    [0,4,'shirt'],[1,4,'shirt'],[2,4,'shirt'],[3,4,'shirt'],[4,4,'shirt'],[5,4,'shirt'],[6,4,'shirt'],
    [0,5,'shirt'],[1,5,'shirt'],[2,5,'shirt'],[3,5,'shirt'],[4,5,'shirt'],[5,5,'shirt'],[6,5,'shirt'],
    [0,6,'shirt'],[1,6,'shirt'],[2,6,'shirt'],[3,6,'shirt'],[4,6,'shirt'],[5,6,'shirt'],[6,6,'shirt'],
    [1,7,'pants'],[2,7,'pants'],[3,7,'pants'],[4,7,'pants'],[5,7,'pants'],
    [1,8,'pants'],[2,8,'pants'],[3,8,'pants'],[4,8,'pants'],[5,8,'pants'],
    [1,9,'pants'],[2,9,'pants'],[4,9,'pants'],[5,9,'pants'],
  ].forEach(([x, y, col]) => px(x, y, col));

  // @ts-ignore
  const equipped = appState.inventory.filter(i => i.equipped);
  // @ts-ignore
  equipped.forEach(item => {
    const t = item.equip || { x:80, y:80, scale:1, rotation:0 };
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.rotate((t.rotation||0) * Math.PI / 180);
    ctx.scale(t.scale||1, t.scale||1);
    if (item.isImage) {
      if (!item._canvasImg) {
        item._canvasImg = new Image();
        item._canvasImg.src = item.icon;
        item._canvasImg.onload = () => drawChar();
      }
      if (item._canvasImg.complete) ctx.drawImage(item._canvasImg, -16, -16, 32, 32);
    } else {
      ctx.font = `${Math.round(24*(t.scale||1))}px serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(item.icon, 0, 0);
    }
    // @ts-ignore
    if (selectedEq?.id === item.id) {
      ctx.strokeStyle = isH ? '#00ff41' : '#7a9e5e';
      ctx.lineWidth = 1.5 / (t.scale||1);
      ctx.strokeRect(-18, -18, 36, 36);
    }
    ctx.restore();
  });
}

onMount(() => { if (profileTab === 'overview') drawChar(); });
$effect(() => { appState.theme; appState.inventory; selectedEq; if (profileTab === 'overview') drawChar(); });

// @ts-ignore
function toCanvas(e) {
  // @ts-ignore
  const rect = charCanvas.getBoundingClientRect();
  return {
    // @ts-ignore
    mx: (e.clientX - rect.left) * (charCanvas.width / rect.width),
    // @ts-ignore
    my: (e.clientY - rect.top) * (charCanvas.height / rect.height),
  };
}

// @ts-ignore
function onCanvasClick(e) {
  const { mx, my } = toCanvas(e);
  // @ts-ignore
  const equipped = appState.inventory.filter(i => i.equipped);
  let hit = null;
  for (const item of equipped) {
    const t = item.equip || { x:80, y:80, scale:1, rotation:0 };
    const hitSize = 22 * Math.max(0.6, t.scale||1);
    if (Math.abs(mx - t.x) < hitSize && Math.abs(my - t.y) < hitSize) { hit = item; break; }
  }
  selectedEq = hit;
  // @ts-ignore
  charCanvas.focus();
}

// @ts-ignore
function onCanvasMouseDown(e) {
  if (!selectedEq) return;
  isDragging = true;
  const { mx, my } = toCanvas(e);
  // @ts-ignore
  dragStart = { mx, my, ox: selectedEq.equip?.x ?? 80, oy: selectedEq.equip?.y ?? 80 };
}

// @ts-ignore
function onCanvasMouseMove(e) {
  if (!isDragging || !selectedEq || !dragStart) return;
  const { mx, my } = toCanvas(e);
  // @ts-ignore
  const cur = selectedEq.equip || { x:80, y:80, scale:1, rotation:0 };
  // @ts-ignore
  saveEquipTransform(selectedEq.id, { ...cur, x: dragStart.ox+(mx-dragStart.mx), y: dragStart.oy+(my-dragStart.my) });
  drawChar();
}

function onCanvasMouseUp() { isDragging = false; dragStart = null; }

// @ts-ignore
function onCanvasKeyDown(e) {
  if (!selectedEq) return;
  const STEP = 3;
  // @ts-ignore
  const moves = { ArrowUp:[0,-STEP], ArrowDown:[0,STEP], ArrowLeft:[-STEP,0], ArrowRight:[STEP,0] };
  // @ts-ignore
  if (moves[e.key]) {
    e.preventDefault();
    // @ts-ignore
    let [dx, dy] = moves[e.key];
    if (e.shiftKey) {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') dx = e.key === 'ArrowUp' ? -STEP : STEP;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') dy = e.key === 'ArrowLeft' ? STEP : -STEP;
    }
    // @ts-ignore
    const cur = selectedEq.equip || { x:80, y:80, scale:1, rotation:0 };
    // @ts-ignore
    saveEquipTransform(selectedEq.id, { ...cur, x: cur.x+dx, y: cur.y+dy });
    // @ts-ignore
    selectedEq = appState.inventory.find(i => i.id === selectedEq.id);
    drawChar();
    return;
  }
  if (e.key === 'Escape') { e.preventDefault(); selectedEq = null; drawChar(); }
}

// @ts-ignore
function adjustSelected(prop, delta) {
  if (!selectedEq) return;
  // @ts-ignore
  const cur = selectedEq.equip || { x:80, y:80, scale:1, rotation:0 };
  let newVal = (cur[prop] ?? (prop === 'scale' ? 1 : 0)) + delta;
  if (prop === 'scale')    newVal = Math.max(0.2, Math.min(3, newVal));
  if (prop === 'rotation') { if (newVal > 360) newVal -= 360; if (newVal < -360) newVal += 360; }
  // @ts-ignore
  saveEquipTransform(selectedEq.id, { ...cur, [prop]: newVal });
  // @ts-ignore
  selectedEq = appState.inventory.find(i => i.id === selectedEq.id);
  drawChar();
}

// ── History search  (Fuse installed via npm: npm install fuse.js) ──────────
import Fuse from 'fuse.js';

let historyQuery  = $state('');
let searchResults = $state([]);

$effect(() => {
  if (!historyQuery.trim()) {
    searchResults = appState.taskHistory.slice(0, 50);
    return;
  }
  const fuse = new Fuse(appState.taskHistory, {
    keys: ['title', 'difficulty', 'tags'],
    threshold: 0.35,
  });
  searchResults = fuse.search(historyQuery).map(r => r.item).slice(0, 50);
});

$effect(() => {
  appState.taskHistory.length;
  if (!historyQuery.trim()) searchResults = appState.taskHistory.slice(0, 50);
});

// @ts-ignore
function fmtDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
}
</script>

<div class="profile-view">
  <div class="profile-subnav">
    <button class="subnav-btn" class:active={profileTab==='overview'} onclick={() => profileTab='overview'}>
      {isHacker ? 'OVERVIEW' : 'Overview'}
    </button>
    <button class="subnav-btn" class:active={profileTab==='history'} onclick={() => profileTab='history'}>
      {isHacker ? 'HISTORY' : 'Task History'}
    </button>
  </div>

  {#if profileTab === 'overview'}
  <div class="profile-grid">

    <!-- Character -->
    <div class="card char-card">
      <div class="card-title">{isHacker ? '// CHARACTER_CUSTOMIZER' : 'Character Studio'}</div>
      <div class="char-area">
        <canvas
          bind:this={charCanvas}
          width="160" height="160"
          class="char-canvas"
          tabindex="0"
          onclick={onCanvasClick}
          onmousedown={onCanvasMouseDown}
          onmousemove={onCanvasMouseMove}
          onmouseup={onCanvasMouseUp}
          onmouseleave={onCanvasMouseUp}
          onkeydown={onCanvasKeyDown}
          style="cursor:{selectedEq ? (isDragging ? 'grabbing' : 'grab') : 'default'};outline:none"
        ></canvas>

        {#if selectedEq}
        <div class="item-controls">
          <div class="ctrl-header">
            {#if selectedEq.isImage}
              <img src={selectedEq.icon} alt={selectedEq.label} class="ctrl-preview-img" />
            {:else}
              <span class="ctrl-icon">{selectedEq.icon}</span>
            {/if}
            <span class="ctrl-label">{selectedEq.label}</span>
          </div>
          <div class="ctrl-row">
            <span class="ctrl-key">rotate</span>
            <button class="ctrl-btn" onclick={() => adjustSelected('rotation', -15)}>↺</button>
            <button class="ctrl-btn" onclick={() => adjustSelected('rotation', 15)}>↻</button>
          </div>
          <div class="ctrl-row">
            <span class="ctrl-key">scale</span>
            <button class="ctrl-btn" onclick={() => adjustSelected('scale', 0.1)}>+</button>
            <button class="ctrl-btn" onclick={() => adjustSelected('scale', -0.1)}>−</button>
          </div>
          <button class="ctrl-btn unequip" onclick={() => { toggleEquip(selectedEq.id); selectedEq = null; }}>
            {isHacker ? 'UNEQUIP' : 'Unequip'}
          </button>
          <div class="ctrl-hint">
            {isHacker
              ? '// arrows · shift+diag · esc=deselect'
              : 'Arrow keys to move · Shift+arrow diagonal · Esc to deselect'}
          </div>
        </div>
        {:else}
        <div class="char-hint">
          {isHacker
            ? '// equip items below then click to select'
            : 'Equip items from inventory, then click them on canvas to reposition'}
        </div>
        {/if}
      </div>
    </div>

    <!-- Radar -->
    <div class="card radar-card">
      <div class="card-title">{isHacker ? '// ATTRIBUTE_RADAR' : 'Attribute Radar'}</div>
      <div class="radar-wrap">
        <canvas bind:this={radarCanvas} width="220" height="200"></canvas>
      </div>
      <div class="radar-sub">
        {isHacker
          ? '// exceed 100 (or 1000 for focus) to overflow the pentagon'
          : 'Surpass the cap to overflow the pentagon 🌿'}
      </div>
    </div>

    <!-- Stats -->
    <div class="card stats-card">
      <div class="card-title">{isHacker ? '// PLAYER_STATS' : 'Stats'}</div>
      <div class="stat-list">
        <div class="stat-row"><span class="stat-key">{isHacker?'TOTAL_XP':'Total XP'}</span><span class="stat-val accent">{p.xp}</span></div>
        <div class="stat-row"><span class="stat-key">{isHacker?'LEVEL':'Level'}</span><span class="stat-val">{p.level}</span></div>
        <div class="stat-row"><span class="stat-key">{isHacker?'GOLD':'Gold earned'}</span><span class="stat-val gold">{p.gold}</span></div>
        <div class="stat-row"><span class="stat-key">{isHacker?'STREAK':'Current streak'}</span><span class="stat-val">{p.streak}d</span></div>
        <div class="stat-row"><span class="stat-key">{isHacker?'BEST_STREAK':'Best streak'}</span><span class="stat-val accent">{p.longestStreak || 0}d</span></div>
        <div class="stat-row"><span class="stat-key">{isHacker?'TOTAL_DONE':'Total completed'}</span><span class="stat-val accent">{p.totalDone}</span></div>
        <div class="stat-row"><span class="stat-key">{isHacker?'FOCUS_USES':'Focus sessions'}</span><span class="stat-val">{p.focusUses || 0}</span></div>
        <div class="stat-row">
          <span class="stat-key">{isHacker?'TIME_LOGGED':'Time logged'}</span>
          <span class="stat-val accent">{formatTime(p.totalTime)}</span>
        </div>
      </div>

      <div class="card-title" style="margin-top:14px">{isHacker?'// ATTRIBUTES':'Attributes'}</div>
      {#each ATTR_KEYS as key, i}
        {@const val = p.attributes[key] || 0}
        {@const maxVal = ATTR_MAXES[key]}
        {@const pct = (val / maxVal) * 100}
        <div class="attr-row">
          <span class="attr-key">{ATTRS[i]}</span>
          <div class="attr-track">
            <div class="attr-fill" style="width:{Math.min(100, pct)}%"></div>
            {#if pct > 100}<div class="attr-overflow" style="width:{Math.min(pct - 100, 50)}%"></div>{/if}
          </div>
          <span class="attr-val">{val}<span class="attr-max">/{maxVal}</span></span>
        </div>
      {/each}
    </div>

    <!-- Monthly card -->
    <div class="card monthly-card">
      <div class="card-title">{isHacker?'// MONTHLY_CARD :: JUN_2026':'Jun 2026 Card'}</div>
      <div class="month-status">
        <span class="status-badge in-progress">{isHacker?'MISSION_IN_PROGRESS':'Mission In Progress'}</span>
      </div>
      <div class="month-stats">
        <div class="month-row"><span>Tasks</span><span class="accent">{p.totalDone}</span></div>
        <div class="month-row"><span>Streak</span><span>{p.streak}d</span></div>
        <div class="month-row"><span>Time</span><span class="accent">{formatTime(p.totalTime)}</span></div>
        <div class="month-row"><span>Gold</span><span class="gold">{p.gold}</span></div>
      </div>
      <div class="month-footer">{isHacker?'// card locks at month end · never repeats':'This card locks at month end and is yours forever 🌿'}</div>
    </div>

    <!-- Inventory -->
    <div class="card inventory-card">
      <div class="card-title">{isHacker?'// INVENTORY':'Inventory — click to equip/unequip'}</div>
      <div class="inventory-grid">
        {#each appState.inventory as item (item.id)}
        <button
          class="inv-slot rarity-{item.rarity}"
          class:equipped={item.equipped}
          onclick={() => toggleEquip(item.id)}
          title="{item.label} ({item.rarity}){item.equipped?' · equipped':''}"
        >
          <div class="inv-icon">
            {#if item.isImage}
              <img src={item.icon} alt={item.label} class="custom-item-img" />
            {:else}
              {item.icon}
            {/if}
          </div>
          <span class="inv-label">{item.label}</span>
          {#if item.equipped}<span class="eq-badge">{isHacker?'EQ':'✓'}</span>{/if}
        </button>
        {/each}
        {#each Array(Math.max(0, 8-appState.inventory.length)) as _}
          <div class="inv-slot empty"><span class="inv-empty-icon">{isHacker?'[ ]':'·'}</span></div>
        {/each}
      </div>
    </div>

  </div>

  <button class="motivate-btn" onclick={() => notify(isHacker?'> GRIND MODE ACTIVATED — lock in.':'🌿 You\'re doing amazing. One chunk at a time.','success')}>
    {isHacker?'> need_motivation()':'🌿 Need motivation?'}
  </button>

  {:else}
  <!-- History tab -->
  <div class="history-view">
    <div class="history-header">
      <div class="view-title">{isHacker?'// TASK_HISTORY':'Task History'}</div>
      <div class="view-sub">{appState.taskHistory.length} tasks completed · all time</div>
    </div>
    <div class="search-row">
      <input class="search-input" type="text" bind:value={historyQuery}
        placeholder={isHacker?'grep -i "query"...':'Search tasks...'} />
      {#if historyQuery}<button class="clear-btn" onclick={() => historyQuery=''}>✕</button>{/if}
    </div>
    {#if appState.taskHistory.length === 0}
      <div class="empty-state">
        <div class="empty-icon">{isHacker?'//':'📭'}</div>
        <div>{isHacker?'// no history records found':'No completed tasks yet. Go get some done!'}</div>
      </div>
    {:else if searchResults.length === 0}
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <div>No matches for "{historyQuery}"</div>
      </div>
    {:else}
      {#if historyQuery}<div class="results-label">{searchResults.length} match(es) located</div>{/if}
      <div class="history-list">
        {#each searchResults as task (task.id)}
        <div class="history-item">
          <div class="hist-top">
            <span class="hist-title">{task.title}</span>
            <span class="tag {task.difficulty}">{task.difficulty}</span>
          </div>
          <div class="hist-meta">
            <span>{fmtDate(task.collectedAt)}</span>
            <span class="accent">+{task.rewardXP} XP</span>
            <span class="gold">+{task.rewardGold} G</span>
            <span>{task.chunks} chunks · {task.chunkMins ?? 17.5}m</span>
          </div>
        </div>
        {/each}
      </div>
    {/if}
  </div>
  {/if}
</div>

<style>
.profile-view { flex:1; overflow-y:auto; padding:16px; display:flex; flex-direction:column; gap:12px; }

.profile-subnav { display:flex; gap:4px; border-bottom:1px solid var(--border); }
.subnav-btn {
  padding:6px 16px; font-size:12px; font-family:var(--font-ui);
  background:transparent; border:none; border-bottom:2px solid transparent;
  color:var(--text3); cursor:pointer; transition:all .15s;
  border-radius:var(--radius) var(--radius) 0 0;
}
.subnav-btn:hover { color:var(--text2); background:var(--bg3); }
.subnav-btn.active { color:var(--accent); border-bottom-color:var(--accent); background:var(--bg3); }
:global([data-theme="hacker"]) .subnav-btn { font-family:var(--font-mono); font-size:11px; letter-spacing:.8px; }

.profile-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.card { background:var(--surface); border:1px solid var(--border); border-radius:var(--radius-lg); padding:13px; display:flex; flex-direction:column; gap:8px; }
.card-title { font-size:10px; font-family:var(--font-mono); color:var(--text3); letter-spacing:.8px; text-transform:uppercase; padding-bottom:6px; border-bottom:1px solid var(--border); }

/* Character */
.char-area { display:flex; gap:10px; align-items:flex-start; margin-top:4px; }
.char-canvas { image-rendering:pixelated; border:1px solid var(--border); border-radius:var(--radius); flex-shrink:0; width:160px; height:160px; }
.char-canvas:focus { box-shadow:0 0 0 2px var(--accent); }
.item-controls { flex:1; display:flex; flex-direction:column; gap:6px; min-width:0; }
.ctrl-header { display:flex; align-items:center; gap:6px; }
.ctrl-icon { font-size:16px; }
.ctrl-preview-img { width:18px; height:18px; object-fit:contain; image-rendering:pixelated; flex-shrink:0; }
.ctrl-label { font-size:11px; color:var(--accent); font-family:var(--font-mono); font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.ctrl-row { display:flex; align-items:center; gap:4px; }
.ctrl-key { font-size:9px; color:var(--text3); font-family:var(--font-mono); min-width:36px; }
.ctrl-btn { padding:3px 9px; font-size:12px; background:var(--bg3); border:1px solid var(--border); border-radius:var(--radius); color:var(--text2); cursor:pointer; font-family:var(--font-mono); transition:all .12s; }
.ctrl-btn:hover { background:var(--border); color:var(--text); }
.ctrl-btn.unequip { color:var(--hp-color); border-color:var(--hp-color); margin-top:2px; background:transparent; }
.ctrl-btn.unequip:hover { background:var(--hp-color); color:#fff; }
.ctrl-hint { font-size:9px; color:var(--text3); font-family:var(--font-mono); line-height:1.5; margin-top:2px; opacity:.7; }
.char-hint { font-size:10px; color:var(--text3); font-family:var(--font-mono); align-self:flex-start; line-height:1.5; padding-top:4px; }

/* Radar */
.radar-card { align-items:center; }
.radar-wrap { display:flex; justify-content:center; align-items:center; width:100%; }
.radar-sub { font-size:9px; font-family:var(--font-mono); color:var(--text3); text-align:center; }

/* Monthly */
.month-status { display:flex; margin-top:2px; }
.status-badge { font-size:10px; font-family:var(--font-mono); padding:2px 7px; border-radius:var(--radius); border:1px solid; }
.status-badge.in-progress { color:var(--accent2); border-color:var(--accent2); }
.month-stats { display:flex; flex-direction:column; gap:4px; }
.month-row { display:flex; justify-content:space-between; font-size:11px; color:var(--text2); }
:global([data-theme="hacker"]) .month-row { font-family:var(--font-mono); font-size:10px; }
.month-footer { font-size:10px; color:var(--text3); font-family:var(--font-mono); margin-top:auto; }

/* Stats */
.stat-list { display:flex; flex-direction:column; gap:5px; }
.stat-row { display:flex; justify-content:space-between; font-size:11px; color:var(--text2); }
:global([data-theme="hacker"]) .stat-row { font-family:var(--font-mono); font-size:10px; }
.stat-key { color:var(--text3); font-family:var(--font-mono); font-size:10px; }
.stat-val { font-family:var(--font-mono); font-weight:600; }
.attr-row { display:flex; align-items:center; gap:5px; }
.attr-key { font-size:9px; font-family:var(--font-mono); color:var(--text3); width:58px; flex-shrink:0; }
.attr-track { flex:1; height:6px; background:var(--bg3); border-radius:3px; overflow:hidden; border:1px solid var(--border); position:relative; }
.attr-fill { height:100%; background:var(--xp-color); border-radius:3px; transition:width .4s ease; }
.attr-overflow { position:absolute; right:0; top:0; height:100%; background:var(--accent2); opacity:.8; }
.attr-val { font-size:9px; font-family:var(--font-mono); color:var(--accent); min-width:52px; text-align:right; }
.attr-max { color:var(--text3); font-weight:400; }

/* Inventory */
.inventory-card { grid-column:span 2; }
.inventory-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(84px,1fr)); gap:7px; margin-top:4px; }
.inv-slot { background:var(--bg3); border:1px solid var(--border); border-radius:var(--radius); padding:8px 6px; display:flex; flex-direction:column; align-items:center; gap:4px; cursor:pointer; transition:all .15s ease; min-height:64px; justify-content:center; position:relative; }
.inv-slot:hover:not(.empty) { border-color:var(--border2); box-shadow:var(--shadow); transform:translateY(-1px); }
.inv-slot.equipped { border-color:var(--accent); background:var(--bg2); box-shadow:0 0 6px color-mix(in srgb,var(--accent) 20%,transparent); }
.inv-slot.rarity-rare { box-shadow:0 0 5px color-mix(in srgb,var(--accent3) 15%,transparent); }
.inv-slot.rarity-epic { border-color:#aa44ff66; }
.inv-slot.rarity-legendary { border-color:var(--gold-color); box-shadow:0 0 7px color-mix(in srgb,var(--gold-color) 25%,transparent); }
.inv-slot.empty { opacity:.25; cursor:default; }
.inv-icon { width:22px; height:22px; font-size:20px; display:flex; align-items:center; justify-content:center; pointer-events:none; user-select:none; }
.custom-item-img { width:100%; height:100%; object-fit:contain; image-rendering:pixelated; -webkit-user-drag:none; }
.inv-label { font-size:9px; font-family:var(--font-mono); color:var(--text3); text-align:center; line-height:1.2; width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; pointer-events:none; }
.inv-empty-icon { font-size:11px; color:var(--text3); font-family:var(--font-mono); }
.eq-badge { position:absolute; top:2px; right:4px; font-size:8px; color:var(--accent); font-family:var(--font-mono); font-weight:bold; }

/* Motivation button */
.motivate-btn { padding:10px; background:var(--bg2); border:1px dashed var(--border); border-radius:var(--radius-lg); color:var(--text3); font-family:var(--font-ui); font-size:12px; cursor:pointer; transition:all .2s; text-align:center; margin-top:4px; }
.motivate-btn:hover { border-color:var(--accent); color:var(--accent); background:var(--surface); }
:global([data-theme="hacker"]) .motivate-btn { font-family:var(--font-mono); font-size:11px; }

/* History */
.history-view { display:flex; flex-direction:column; gap:10px; }
.history-header { display:flex; flex-direction:column; gap:2px; }
.view-title { font-size:14px; font-weight:600; color:var(--text); }
:global([data-theme="hacker"]) .view-title { font-family:var(--font-mono); color:var(--accent); font-size:12px; }
.view-sub { font-size:11px; color:var(--text3); font-family:var(--font-mono); }
.search-row { display:flex; gap:6px; position:relative; }
.search-input { flex:1; background:var(--surface); border:1px solid var(--border); border-radius:var(--radius); color:var(--text); font-family:var(--font-ui); font-size:13px; padding:7px 30px 7px 10px; outline:none; transition:border-color .15s; }
.search-input:focus { border-color:var(--accent); }
:global([data-theme="hacker"]) .search-input { font-family:var(--font-mono); font-size:11px; }
.clear-btn { position:absolute; right:8px; top:50%; transform:translateY(-50%); background:transparent; border:none; color:var(--text3); cursor:pointer; font-size:11px; padding:4px; }
.clear-btn:hover { color:var(--text); }
.results-label { font-size:11px; color:var(--accent); font-family:var(--font-mono); margin-bottom:-4px; }
.history-list { display:flex; flex-direction:column; gap:6px; }
.history-item { background:var(--surface); border:1px solid var(--border); border-radius:var(--radius-lg); padding:10px 13px; display:flex; flex-direction:column; gap:5px; }
.hist-top { display:flex; justify-content:space-between; align-items:flex-start; gap:8px; }
.hist-title { font-size:13px; color:var(--text); flex:1; line-height:1.3; }
:global([data-theme="hacker"]) .hist-title { font-family:var(--font-mono); font-size:11px; }
.tag { font-size:9px; font-family:var(--font-mono); padding:1px 5px; border-radius:3px; text-transform:uppercase; border:1px solid; }
.tag.easy { color:var(--accent); border-color:color-mix(in srgb,var(--accent) 30%,transparent); background:color-mix(in srgb,var(--accent) 5%,transparent); }
.tag.med  { color:var(--gold-color); border-color:color-mix(in srgb,var(--gold-color) 30%,transparent); background:color-mix(in srgb,var(--gold-color) 5%,transparent); }
.tag.hard { color:var(--hp-color); border-color:color-mix(in srgb,var(--hp-color) 30%,transparent); background:color-mix(in srgb,var(--hp-color) 5%,transparent); }
.hist-meta { display:flex; gap:12px; font-size:10px; color:var(--text3); font-family:var(--font-mono); flex-wrap:wrap; }
.empty-state { display:flex; flex-direction:column; align-items:center; gap:6px; padding:40px 0; color:var(--text3); font-size:12px; font-family:var(--font-mono); }
.empty-icon { font-size:24px; }
.accent { color:var(--accent); font-family:var(--font-mono); font-weight:600; }
.gold { color:var(--gold-color); font-family:var(--font-mono); font-weight:600; }
</style>