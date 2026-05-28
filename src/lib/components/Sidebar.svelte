<script>
  import { appState } from '$lib/stores/appState.svelte.js';

  let isHacker = $derived(appState.theme === 'hacker');
  let p = $derived(appState.player);

  let xpInLevel = $derived(p.xp % 500);
  let xpPct     = $derived((xpInLevel / 500) * 100);

  let classTitle = $derived(() => {
    const lvl = p.level || 1;
    const titles = {
      cottage: ['Seedling','Apprentice Maker','Journeyman','Artisan','Craftmaster','Elder Weaver'],
      hacker:  ['INIT_USER','APPRENTICE_DEV','JOURNEYMAN','SENIOR_PROC','ARCH_MASTER','ROOT_ACCESS'],
    };
    // @ts-ignore
    const arr = titles[appState.theme] || titles.cottage;
    return arr[Math.min(lvl - 1, arr.length - 1)];
  });

  let todayDone = $derived(
    appState.tasks.filter(t => t.doneChunks >= t.chunks).length
  );
  let toCollect = $derived(
    appState.tasks.filter(t => t.doneChunks >= t.chunks && !t.collected).length
  );

  // Pixel sprite drawn via canvas
  import { onMount } from 'svelte';
  // @ts-ignore
  let canvas;

  // @ts-ignore
  function drawSprite(el, theme) {
    if (!el) return;
    const ctx = el.getContext('2d');
    ctx.clearRect(0, 0, 48, 48);
    ctx.imageSmoothingEnabled = false;
    const isH = theme === 'hacker';
    const pal = isH
      ? { skin:'#00ff41', hair:'#003300', shirt:'#003300', pants:'#001400' }
      : { skin:'#f5c89a', hair:'#7a4020', shirt:'#5b7fa6', pants:'#3d2f1e' };
    const S = 3;
    // @ts-ignore
    const px = (x,y,c) => { ctx.fillStyle = pal[c]; ctx.fillRect(x*S, y*S, S, S); };
    [
      [5,3,'hair'],[6,3,'hair'],[7,3,'hair'],[8,3,'hair'],
      [5,4,'skin'],[6,4,'skin'],[7,4,'skin'],[8,4,'skin'],
      [5,5,'skin'],[6,5,'skin'],[7,5,'skin'],[8,5,'skin'],
      [4,6,'shirt'],[5,6,'shirt'],[6,6,'shirt'],[7,6,'shirt'],[8,6,'shirt'],[9,6,'shirt'],
      [4,7,'shirt'],[5,7,'shirt'],[6,7,'shirt'],[7,7,'shirt'],[8,7,'shirt'],[9,7,'shirt'],
      [4,8,'shirt'],[5,8,'shirt'],[6,8,'shirt'],[7,8,'shirt'],[8,8,'shirt'],[9,8,'shirt'],
      [5,9,'pants'],[6,9,'pants'],[7,9,'pants'],[8,9,'pants'],
      [5,10,'pants'],[6,10,'pants'],[7,10,'pants'],[8,10,'pants'],
      [4,11,'pants'],[5,11,'pants'],[7,11,'pants'],[8,11,'pants'],
    ].forEach(([x,y,c]) => px(x,y,c));
    if (isH) {
      ctx.fillStyle = '#00ff41';
      ctx.font = '7px monospace';
      ctx.fillText('> _', 2, 47);
    }
  }

  // @ts-ignore
  onMount(() => drawSprite(canvas, appState.theme));

  $effect(() => {
    // @ts-ignore
    drawSprite(canvas, appState.theme);
  });
</script>

<aside class="sidebar">

  <!-- Character card -->
  <div class="char-card">
    <canvas bind:this={canvas} class="sprite" width="48" height="48"></canvas>
    <div class="char-info">
      <div class="char-name">
        {#if isHacker}<span class="dim">user@</span>{/if}{p.name}
      </div>
      <div class="char-class">{classTitle()}</div>
      <span class="level-badge">LVL {p.level}</span>
    </div>
  </div>

  <!-- XP bar -->
  <div class="stat-block">
    <div class="bar-label">
      <span>{isHacker ? 'XP' : 'Experience'}</span>
      <span class="mono">{xpInLevel}<span class="dim">/500</span></span>
    </div>
    <div class="bar-track"><div class="bar-fill xp" style="width:{xpPct}%"></div></div>
  </div>

  <div class="bar-block">
    <div class="bar-label">
      <span>{isHacker ? 'FOCUS' : 'Focus'}</span>
      <span class="mono">{p.attributes.focus}</span>
    </div>
    <div class="bar-track">
      <div class="bar-fill focus" style="width:{Math.min(100, p.attributes.focus)}%"></div>
    </div>
  </div>

  <div class="divider"></div>

  <!-- Stats -->
  <div class="section-label">{isHacker ? '-- TODAY --' : 'Today'}</div>
  <div class="stat-rows">
    <div class="stat-row"><span>Tasks done</span><span class="val accent">{todayDone}</span></div>
    <div class="stat-row"><span>Streak</span><span class="val">{isHacker ? '' : '🔥'} {p.streak}d</span></div>
    <div class="stat-row"><span>Gold</span><span class="val gold">{isHacker ? '' : '💰'} {p.gold}</span></div>
    <div class="stat-row"><span>To collect</span><span class="val accent2">{toCollect}</span></div>
  </div>

  <div class="divider"></div>

  <!-- Daily quest -->
  <div class="section-label">{isHacker ? '-- DAILY QUEST --' : 'Daily Quest'}</div>
  <div class="quest-card">
    {#if isHacker}<span class="dim">$ cat quest.md</span><br>{/if}
    <span class="quest-text">Read about the Bauhaus movement and its influence on modern design</span>
    <div class="quest-xp">+80 XP · Art</div>
  </div>

</aside>

<style>
.sidebar {
  width: var(--sidebar-w);
  min-width: var(--sidebar-w);
  background: var(--bg2);
  border-right: 1px solid var(--border);
  padding: 12px 11px;
  display: flex;
  flex-direction: column;
  gap: 9px;
  overflow-y: auto;
  flex-shrink: 0;
}

.char-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 10px;
  display: flex;
  gap: 9px;
  align-items: flex-start;
}
.sprite {
  image-rendering: pixelated;
  flex-shrink: 0;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg3);
}
.char-info { flex: 1; min-width: 0; }
.char-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
:global([data-theme="hacker"]) .char-name {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--accent);
}
.dim { color: var(--text3); }
.char-class {
  font-size: 10px;
  color: var(--text3);
  font-family: var(--font-mono);
  margin: 2px 0 5px;
}
:global([data-theme="hacker"]) .char-class::before { content: '// '; }
.level-badge {
  display: inline-block;
  background: var(--accent2);
  color: var(--bg);
  font-size: 9px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: var(--radius);
  font-family: var(--font-mono);
  letter-spacing: 0.5px;
}

.stat-block, .bar-block { display: flex; flex-direction: column; gap: 3px; }
.bar-label {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: var(--text3);
  font-family: var(--font-mono);
}
.mono { font-family: var(--font-mono); }
.bar-track {
  height: 5px;
  background: var(--bg3);
  border-radius: 3px;
  overflow: hidden;
  border: 1px solid var(--border);
}
.bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.5s ease;
}
.bar-fill.xp    { background: var(--xp-color); }
.bar-fill.focus { background: var(--hp-color); }

.divider { height: 1px; background: var(--border); }

.section-label {
  font-size: 10px;
  font-family: var(--font-mono);
  color: var(--text3);
  letter-spacing: 0.5px;
}

.stat-rows { display: flex; flex-direction: column; gap: 4px; }
.stat-row {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--text2);
}
:global([data-theme="hacker"]) .stat-row { font-family: var(--font-mono); font-size: 10px; }
.val { font-family: var(--font-mono); font-weight: 600; }
.val.accent  { color: var(--accent); }
.val.accent2 { color: var(--accent2); }
.val.gold    { color: var(--gold-color); }

.quest-card {
  background: var(--bg3);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 8px;
  font-size: 10px;
  line-height: 1.5;
}
.quest-text { color: var(--text2); display: block; margin-top: 2px; }
:global([data-theme="hacker"]) .quest-text { font-family: var(--font-mono); color: var(--text3); }
.quest-xp { margin-top: 5px; font-size: 10px; color: var(--accent); font-family: var(--font-mono); }
</style>
