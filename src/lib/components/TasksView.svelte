<script>
  // @ts-ignore
  import { appState, tickChunk, createTask, notify, collectTask } from '$lib/stores/appState.svelte.js';
  // @ts-ignore
  import { onMount } from 'svelte';

  let isHacker = $derived(appState.theme === 'hacker');
  let isRetro  = $derived(appState.theme === 'retro');

  // ── Cottage form ──
  let cottageTitle = $state('');
  let cottageDiff  = $state('med');
  let showForm     = $state(false);

  function submitCottage() {
    if (!cottageTitle.trim()) return;
    createTask(cottageTitle.trim(), cottageDiff);
    cottageTitle = '';
    showForm = false;
  }

  // ── Retro Pac-Man task creation ──
  let retroTitle          = $state('');
  let retroDiff           = $state('med');
  let retroPhase          = $state('idle'); // 'idle' | 'eating' | 'done'
  let retroChomps         = $state(0);
  // @ts-ignore
  let retroChompInterval  = null;

  function submitRetro() {
    if (!retroTitle.trim()) return;
    retroPhase  = 'eating';
    retroChomps = 0;
    retroChompInterval = setInterval(() => {
      retroChomps++;
      if (retroChomps >= retroTitle.length) {
        // @ts-ignore
        clearInterval(retroChompInterval);
        retroPhase = 'done';
        setTimeout(() => {
          createTask(retroTitle.trim(), retroDiff);
          retroTitle  = '';
          retroPhase  = 'idle';
          retroChomps = 0;
        }, 600);
      }
    }, 60);
  }

  // ── Retro: track which task is animating after EAT click ──
  // animatingId  — the task currently mid-chomp animation
  // animPos      — how far (0–chunks) the pac-man has travelled
  let animatingId  = $state(null);
  let animPos      = $state(0);
  // @ts-ignore
  let animInterval = null;

  // @ts-ignore
  function eatChunk(taskId) {
    // Fire the store action immediately so doneChunks increments
    tickChunk(taskId);

    // Then animate pac-man travelling to the new position
    // @ts-ignore
    const task = appState.tasks.find(t => t.id === taskId);
    if (!task) return;

    // @ts-ignore
    clearInterval(animInterval);
    animatingId = taskId;
    // Start pac-man slightly behind the newly eaten pellet
    animPos = Math.max(0, task.doneChunks - 1);

    const target = task.doneChunks;  // where pac-man should end up
    animInterval = setInterval(() => {
      animPos += 0.02;               // smooth sub-pixel movement
      if (animPos >= target) {
        animPos     = target;
        animatingId = null;
        // @ts-ignore
        clearInterval(animInterval);
      }
    }, 16); // ~60fps
  }

  // ── Hacker terminal ──
  let termInput    = $state('');
  let termHistory  = $state([
    { type: 'sys', text: 'NULL_ISLAND v2.0 — task management subsystem' },
    { type: 'sys', text: 'Type "help" for available commands.' },
  ]);
  let termEl       = $state(null);
  let historyIdx   = $state(-1);
  // @ts-ignore
  let inputHistory = $state([]);

  function scrollTerm() {
    // @ts-ignore
    setTimeout(() => { if (termEl) termEl.scrollTop = termEl.scrollHeight; }, 20);
  }

  // @ts-ignore
  function fmtDate(ts) {
    if (!ts) return '—';
    return new Date(ts).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
  }

  // @ts-ignore
  function parseAndRun(raw) {
    const trimmed = raw.trim();
    if (!trimmed) return;
    inputHistory.unshift(trimmed);
    historyIdx = -1;
    termHistory.push({ type: 'input', text: `> ${trimmed}` });
    const parts = trimmed.split(/\s+/);
    const cmd   = parts[0].toLowerCase();

    if (cmd === 'help') {
      termHistory.push({ type: 'out', text: 'COMMANDS:' });
      termHistory.push({ type: 'out', text: '  new "task title" [--diff easy|med|hard] [--chunk N] [--time N]' });
      termHistory.push({ type: 'out', text: '  ls              list active tasks' });
      termHistory.push({ type: 'out', text: '  done <id>       tick a chunk on task by index' });
      termHistory.push({ type: 'out', text: '  grep <query>    search task history' });
      termHistory.push({ type: 'out', text: '  history         show all completed tasks' });
      termHistory.push({ type: 'out', text: '  log --date YYYY-MM-DD         tasks on a specific day' });
      termHistory.push({ type: 'out', text: '  log --from YYYY-MM-DD --to YYYY-MM-DD   date range' });
      termHistory.push({ type: 'out', text: '  clear           clear terminal' });
      termHistory.push({ type: 'sys', text: '// --chunk overrides default chunk count' });
      termHistory.push({ type: 'sys', text: '// --time sets minutes per chunk (affects XP/gold)' });
    } else if (cmd === 'ls') {
      // @ts-ignore
      const active = appState.tasks.filter(t => !t.collected);
      if (active.length === 0) {
        termHistory.push({ type: 'out', text: '  (no active tasks)' });
      } else {
        // @ts-ignore
        active.forEach((t, i) => {
          const bar = '█'.repeat(t.doneChunks) + '░'.repeat(t.chunks - t.doneChunks);
          // @ts-ignore
          termHistory.push({ type: 'out', text: `  [${i}] ${t.title}`, sub: `${bar} ${t.doneChunks}/${t.chunks} · ${t.difficulty} · ${t.chunkMins}min/chunk` });
        });
      }
    } else if (cmd === 'clear') {
      termHistory.length = 0;
      termHistory.push({ type: 'sys', text: 'Terminal cleared. NULL_ISLAND ready.' });
    } else if (cmd === 'new') {
      const titleMatch = trimmed.match(/"([^"]+)"/);
      const diffMatch  = trimmed.match(/--diff\s+(easy|med|hard)/i);
      const chunkMatch = trimmed.match(/--chunk\s+(\d+)/i);
      const timeMatch  = trimmed.match(/--time\s+(\d+)/i);
      if (!titleMatch) {
        termHistory.push({ type: 'err', text: 'ERROR: title must be in quotes. new "my task" --diff med' });
      } else {
        const diff   = diffMatch  ? diffMatch[1].toLowerCase() : 'med';
        const chunks = chunkMatch ? parseInt(chunkMatch[1])    : null;
        const mins   = timeMatch  ? parseInt(timeMatch[1])     : null;
        // @ts-ignore
        createTask(titleMatch[1], diff, [], chunks, mins);
        // @ts-ignore
        const c = chunks ?? { easy:2, med:3, hard:5 }[diff];
        const m = mins   ?? 17.5;
        termHistory.push({ type: 'ok', text: `CREATED: "${titleMatch[1]}" [${diff}] ${c} chunks · ${m}min each` });
      }
    } else if (cmd === 'done') {
      // @ts-ignore
      const active = appState.tasks.filter(t => !t.collected);
      const idx    = parseInt(parts[1]);
      if (isNaN(idx) || idx < 0 || idx >= active.length) {
        termHistory.push({ type: 'err', text: `ERROR: invalid index. Use "ls" to list active tasks.` });
      } else {
        const task = active[idx];
        tickChunk(task.id);
        const bar = '█'.repeat(task.doneChunks) + '░'.repeat(task.chunks - task.doneChunks);
        // @ts-ignore
        termHistory.push({ type: 'ok', text: `TICK: [${idx}] ${task.title}`, sub: bar });
      }
    } else if (cmd === 'history') {
      const h = appState.taskHistory;
      if (h.length === 0) {
        termHistory.push({ type: 'out', text: '  (no history)' });
      } else {
        termHistory.push({ type: 'out', text: `  ${h.length} completed tasks:` });
        // @ts-ignore
        h.slice(0, 20).forEach((t, i) => {
          // @ts-ignore
          termHistory.push({ type: 'out', text: `  [${i}] ${fmtDate(t.collectedAt)} — ${t.title}`, sub: `+${t.rewardXP}XP · ${t.difficulty}` });
        });
        if (h.length > 20) termHistory.push({ type: 'sys', text: `  ... and ${h.length - 20} more.` });
      }
    } else if (cmd === 'grep') {
      const query = parts.slice(1).join(' ').replace(/^["']|["']$/g, '').toLowerCase();
      if (!query) {
        termHistory.push({ type: 'err', text: 'ERROR: grep requires a search term.' });
      } else {
        // @ts-ignore
        const results = appState.taskHistory.filter(t => t.title.toLowerCase().includes(query));
        if (results.length === 0) {
          termHistory.push({ type: 'out', text: `  no matches for "${query}"` });
        } else {
          termHistory.push({ type: 'ok', text: `  ${results.length} match(es) for "${query}":` });
          // @ts-ignore
          results.forEach((t, i) => {
            // @ts-ignore
            termHistory.push({ type: 'out', text: `  [${i}] ${fmtDate(t.collectedAt)} — ${t.title}`, sub: `${t.difficulty} · +${t.rewardXP}XP` });
          });
        }
      }
    } else if (cmd === 'log') {
      const dateMatch = trimmed.match(/--date\s+(\d{4}-\d{2}-\d{2})/);
      const fromMatch = trimmed.match(/--from\s+(\d{4}-\d{2}-\d{2})/);
      const toMatch   = trimmed.match(/--to\s+(\d{4}-\d{2}-\d{2})/);
      let results = [], label = '';
      if (dateMatch) {
        const target = new Date(dateMatch[1]).toDateString();
        // @ts-ignore
        results = appState.taskHistory.filter(t => t.collectedAt && new Date(t.collectedAt).toDateString() === target);
        label = `on ${dateMatch[1]}`;
      } else if (fromMatch && toMatch) {
        const from = new Date(fromMatch[1]).getTime();
        const to   = new Date(toMatch[1]).getTime() + 86400000;
        // @ts-ignore
        results = appState.taskHistory.filter(t => t.collectedAt && t.collectedAt >= from && t.collectedAt <= to);
        label = `from ${fromMatch[1]} to ${toMatch[1]}`;
      } else {
        termHistory.push({ type: 'err', text: 'ERROR: use --date YYYY-MM-DD or --from X --to Y' });
        termInput = ''; scrollTerm(); return;
      }
      if (results.length === 0) {
        termHistory.push({ type: 'out', text: `  no tasks ${label}` });
      } else {
        termHistory.push({ type: 'ok', text: `  ${results.length} task(s) ${label}:` });
        // @ts-ignore
        results.forEach((t, i) => {
          // @ts-ignore
          termHistory.push({ type: 'out', text: `  [${i}] ${fmtDate(t.collectedAt)} — ${t.title}`, sub: `${t.difficulty} · +${t.rewardXP}XP · +${t.rewardGold}G` });
        });
      }
    } else {
      termHistory.push({ type: 'err', text: `UNKNOWN: "${cmd}". Type "help".` });
    }
    termInput = '';
    scrollTerm();
  }

  // @ts-ignore
  function onTermKey(e) {
    if (e.key === 'Enter') {
      parseAndRun(termInput);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      historyIdx = Math.min(historyIdx + 1, inputHistory.length - 1);
      if (inputHistory[historyIdx]) termInput = inputHistory[historyIdx];
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      historyIdx = Math.max(historyIdx - 1, -1);
      termInput = historyIdx === -1 ? '' : inputHistory[historyIdx];
    }
  }

  const H24 = 86400000;
  // @ts-ignore
  let activeTasks = $derived(appState.tasks.filter(t => t.doneChunks < t.chunks));
  // @ts-ignore
  let readyTasks  = $derived(appState.tasks.filter(t => t.doneChunks >= t.chunks && !t.collected));
  // @ts-ignore
  let recentDone  = $derived(appState.tasks.filter(t =>
    t.collected && t.collectedAt && (Date.now() - t.collectedAt) < H24
  ));

  // Pellet colours — each pellet in a track gets one of these
  const PELLET_COLS = ['#ffee00','#ff8800','#ff4488','#00ccff','#00ff88','#aa44ff'];
</script>

<div class="tasks-view">

  {#if !isHacker && !isRetro}
    <!-- ══════════ COTTAGE ══════════ -->
    <div class="view-header">
      <div>
        <div class="view-title">Task Queue</div>
        <div class="view-sub">Break work into focused chunks · 15–20 min each</div>
      </div>
      <button class="btn primary" onclick={() => showForm = !showForm}>
        {showForm ? '✕ Cancel' : '+ New Task'}
      </button>
    </div>

    {#if showForm}
      <div class="cottage-form">
        <textarea class="form-textarea"
          placeholder="What do you need to do? Describe it clearly..."
          bind:value={cottageTitle} rows="3"
          onkeydown={e => e.key === 'Enter' && e.ctrlKey && submitCottage()}
        ></textarea>
        <div class="form-row">
          <div class="diff-group">
            {#each ['easy','med','hard'] as d}
              <button class="diff-btn {d}" class:selected={cottageDiff===d} onclick={() => cottageDiff=d}>
                {d === 'easy' ? '🌱 easy' : d === 'med' ? '🌿 med' : '🌲 hard'}
              </button>
            {/each}
          </div>
          <button class="btn primary" onclick={submitCottage}>Add Task →</button>
        </div>
        <div class="form-hint">Ctrl+Enter to submit · difficulty auto-sets chunk count</div>
      </div>
    {/if}

    {#if activeTasks.length === 0 && readyTasks.length === 0}
      <div class="empty-state"><div class="empty-icon">🌱</div><div>No tasks yet. Plant your first seed!</div></div>
    {/if}

    {#if activeTasks.length > 0}
      <div class="task-section-label">Active</div>
      {#each activeTasks as task (task.id)}
        <div class="task-card">
          <div class="task-top">
            <span class="task-title">{task.title}</span>
            <span class="tag {task.difficulty}">{task.difficulty}</span>
          </div>
          <div class="chunk-row">
            {#each Array(task.chunks) as _, i}
              <div class="chunk"
                class:done={i < task.doneChunks}
                class:active={i === task.doneChunks && task.doneChunks > 0 && task.doneChunks < task.chunks}>
              </div>
            {/each}
            <span class="chunk-label">{task.doneChunks}/{task.chunks} · ~{task.chunkMins ?? 17.5}min each</span>
          </div>
          <div class="task-actions">
            <span class="task-xp">+{task.rewardXP} XP on collect</span>
            <button class="btn" onclick={() => tickChunk(task.id)}>✓ Tick chunk</button>
          </div>
        </div>
      {/each}
    {/if}

    {#if readyTasks.length > 0}
      <div class="task-section-label ready-label">✨ Ready to collect</div>
      {#each readyTasks as task (task.id)}
        <div class="task-card ready">
          <div class="task-top">
            <span class="task-title">{task.title}</span>
            <span class="tag {task.difficulty}">{task.difficulty}</span>
          </div>
          <div class="task-actions">
            <span class="task-xp">+{task.rewardXP} XP · +{task.rewardGold} gold</span>
            <button class="btn primary" onclick={() => collectTask(task.id)}>Collect reward →</button>
          </div>
        </div>
      {/each}
    {/if}

    {#if recentDone.length > 0}
      <div class="task-section-label collected-label">Completed (disappears in 24h)</div>
      {#each recentDone as task (task.id)}
        <div class="task-card collected">
          <div class="task-top">
            <span class="task-title">{task.title}</span>
            <span class="done-badge">✓ collected</span>
          </div>
          <div class="task-meta-row">
            <span class="task-meta">+{task.rewardXP} XP · +{task.rewardGold} gold</span>
            <span class="task-meta">fades in {Math.max(0, Math.round((H24 - (Date.now() - task.collectedAt)) / 3600000))}h</span>
          </div>
        </div>
      {/each}
    {/if}

  {:else if isRetro}
    <!-- ══════════ RETRO / PAC-MAN ══════════ -->
    <div class="retro-header">
      <div class="retro-title">
        <span class="pac-icon">●</span> TASK QUEUE
        <span class="ghost-icons">
          <span class="ghost ghost-red">👻</span>
          <span class="ghost ghost-blue">👻</span>
          <span class="ghost ghost-pink">👻</span>
        </span>
      </div>
      <div class="retro-sub">EAT THE TASKS · COLLECT THE DOTS</div>
    </div>

    <div class="retro-input-zone">
      <div class="retro-pellet-row">
        {#if retroPhase === 'eating'}
          <span class="pac-chomping">●</span>
          {#each retroTitle.split('') as ch, i}
            <span class="retro-letter" style="opacity:{i < retroChomps ? 0 : 1}">{ch}</span>
          {/each}
        {:else if retroPhase === 'done'}
          <span class="retro-done-msg">TASK ADDED TO MAP ✓</span>
        {:else}
          <input class="retro-input" type="text" bind:value={retroTitle}
            placeholder="ENTER TASK NAME..."
            onkeydown={e => e.key === 'Enter' && submitRetro()}
            maxlength="60" />
        {/if}
      </div>
      <div class="retro-controls">
        <div class="diff-pills">
          {#each ['easy','med','hard'] as d}
            <button class="retro-pill {d}" class:selected={retroDiff===d} onclick={() => retroDiff=d}>
              {d === 'easy' ? '○ EASY' : d === 'med' ? '◎ MED' : '● HARD'}
            </button>
          {/each}
        </div>
        <button class="retro-submit" onclick={submitRetro} disabled={!retroTitle.trim() || retroPhase !== 'idle'}>
          {retroPhase === 'idle' ? 'EAT IT ●' : retroPhase === 'eating' ? 'NOM NOM...' : 'DONE!'}
        </button>
      </div>
    </div>

    {#if activeTasks.length === 0 && readyTasks.length === 0}
      <div class="retro-empty">
        <div class="empty-pac">●</div>
        <div>NO TASKS · INSERT COIN TO CONTINUE</div>
      </div>
    {/if}

    {#if activeTasks.length > 0}
      <div class="retro-section-label">▶ ACTIVE</div>
      {#each activeTasks as task (task.id)}
        {@const isAnimating = animatingId === task.id}
        {@const pacX = isAnimating ? animPos : task.doneChunks}
        <!-- pac position as a % of the track width -->
        {@const pacPct = task.chunks > 0 ? (pacX / task.chunks) * 100 : 0}

        <div class="retro-task-card" class:hovering={true}>
          <!-- top row: title + tag + xp + button -->
          <div class="rtc-top">
            <span class="retro-task-title">{task.title}</span>
            <span class="retro-tag {task.difficulty}">{task.difficulty.toUpperCase()}</span>
            <span class="retro-xp">+{task.rewardXP}pts</span>
            <button class="retro-btn" onclick={() => eatChunk(task.id)}>EAT</button>
          </div>

          <!-- pac-man track -->
          <div class="pac-track" style="--chunks:{task.chunks}">
            <!-- pellets -->
            {#each Array(task.chunks) as _, i}
              {@const col = PELLET_COLS[i % PELLET_COLS.length]}
              {#if i < task.doneChunks}
                <!-- eaten: just an outline ring in the pellet's colour -->
                <div class="pellet eaten" style="--pcol:{col}; left:calc({((i + 0.5) / task.chunks) * 100}% - 7px)"></div>
              {:else}
                <!-- uneaten: filled dot -->
                <div class="pellet uneaten" style="--pcol:{col}; left:calc({((i + 0.5) / task.chunks) * 100}% - 7px)"></div>
              {/if}
            {/each}

            <!-- pac-man character travelling along the track -->
            <div
              class="pac-man-char"
              class:chomping={isAnimating}
              style="left:calc({pacPct}% - 9px)">
            </div>
          </div>

          <div class="rtc-meta">
            <span>{task.doneChunks}/{task.chunks} chunks · ~{task.chunkMins ?? 17.5}min each</span>
          </div>
        </div>
      {/each}
    {/if}

    {#if readyTasks.length > 0}
      <div class="retro-section-label" style="color:#ffee00">★ COLLECT BONUS</div>
      {#each readyTasks as task (task.id)}
        <div class="retro-task-card ready-card">
          <div class="rtc-top">
            <span class="retro-task-title" style="color:#ffee00">{task.title}</span>
            <span class="retro-xp">+{task.rewardXP}pts +{task.rewardGold}🪙</span>
            <button class="retro-btn primary" onclick={() => collectTask(task.id)}>COLLECT</button>
          </div>
          <!-- full completed track -->
          <div class="pac-track" style="--chunks:{task.chunks}">
            {#each Array(task.chunks) as _, i}
              {@const col = PELLET_COLS[i % PELLET_COLS.length]}
              <div class="pellet eaten" style="--pcol:{col}; left:calc({((i + 0.5) / task.chunks) * 100}% - 7px)"></div>
            {/each}
            <div class="pac-man-char" style="left:calc(100% - 9px)">
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path class="pac-body" d="M9,9 L18,7.6 A9,9 0 1,1 18,10.4 Z" fill="#ffee00"/>
                <circle cx="9" cy="4.5" r="1.5" fill="#0a0010"/>
              </svg>
            </div>
          </div>
        </div>
      {/each}
    {/if}

    {#if recentDone.length > 0}
      <div class="retro-section-label" style="color:#3300aa;opacity:.7">✓ CLEARED</div>
      {#each recentDone as task (task.id)}
        <div class="retro-task-card" style="opacity:.4">
          <div class="rtc-top">
            <span style="color:#3300aa;font-family:var(--font-mono);font-size:12px">✓</span>
            <span class="retro-task-title" style="text-decoration:line-through">{task.title}</span>
          </div>
        </div>
      {/each}
    {/if}

  {:else}
    <!-- ══════════ HACKER ══════════ -->
    <div class="terminal">
      <div class="term-titlebar">
        <span class="term-dot red"></span>
        <span class="term-dot yellow"></span>
        <span class="term-dot green"></span>
        <span class="term-title">null_island — task_mgr.sh — root@aevyn</span>
      </div>
      <div class="term-body" bind:this={termEl}>
        {#each termHistory as line, i (i)}
          <div class="term-line">
            {#if line.type === 'input'}<span class="c-accent">{line.text}</span>
            {:else if line.type === 'err'}<span class="c-err">{line.text}</span>
            {:else if line.type === 'ok'}<span class="c-ok">{line.text}</span>{#if line.sub}<div class="term-sub">{line.sub}</div>{/if}
            {:else if line.type === 'out'}<span class="c-text">{line.text}</span>{#if line.sub}<div class="term-sub">{line.sub}</div>{/if}
            {:else}<span class="c-sys">{line.text}</span>
            {/if}
          </div>
        {/each}
      </div>
      <div class="term-inputrow">
        <span class="term-prompt">root@null_island:~$</span>
        <input class="term-input" type="text" bind:value={termInput} onkeydown={onTermKey}
          placeholder='new "task title" --diff med' autocomplete="off" spellcheck="false"/>
      </div>
    </div>
    <div class="hacker-list-header">
      <span class="c-sys">// active process list</span>
      <span class="c-sys">{appState.tasks.filter(t => !t.collected).length} running</span>
    </div>
    {#each appState.tasks.filter(t => !t.collected) as task, i (task.id)}
      <div class="hacker-task" class:ht-done={task.doneChunks >= task.chunks}>
        <span class="ht-idx c-sys">[{i}]</span>
        <span class="ht-bar c-accent">{'█'.repeat(task.doneChunks)}{'░'.repeat(task.chunks - task.doneChunks)}</span>
        <span class="ht-title">{task.title}</span>
        <span class="tag {task.difficulty}">{task.difficulty}</span>
        <span class="c-sys">{task.chunkMins ?? 17.5}m</span>
        {#if task.doneChunks < task.chunks}
          <button class="btn" onclick={() => tickChunk(task.id)}>TICK</button>
        {:else if !task.collected}
          <button class="btn primary" onclick={() => collectTask(task.id)}>COLLECT</button>
        {/if}
      </div>
    {/each}
    {#if appState.tasks.filter(t => !t.collected).length === 0}
      <div class="c-sys" style="font-family:var(--font-mono);font-size:11px;padding:8px 0">// no active tasks — use "new" to create one</div>
    {/if}
  {/if}

</div>

<style>
/* ── shared layout ── */
.tasks-view { flex:1; overflow-y:auto; padding:16px; display:flex; flex-direction:column; gap:10px; }
.view-header { display:flex; justify-content:space-between; align-items:flex-start; }
.view-title  { font-size:16px; font-weight:600; color:var(--text); }
.view-sub    { font-size:11px; color:var(--text3); font-family:var(--font-mono); margin-top:2px; }

/* Cottage */
.cottage-form { background:var(--surface); border:1px solid var(--border); border-radius:var(--radius-lg); padding:14px; display:flex; flex-direction:column; gap:10px; animation:fadeIn .15s ease; }
@keyframes fadeIn { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:none} }
.form-textarea { width:100%; background:var(--bg); border:1px solid var(--border); border-radius:var(--radius); color:var(--text); font-family:var(--font-body); font-size:14px; padding:10px; resize:vertical; outline:none; transition:border-color .15s; }
.form-textarea:focus { border-color:var(--accent); }
.form-row { display:flex; justify-content:space-between; align-items:center; gap:8px; }
.diff-group { display:flex; gap:5px; }
.diff-btn { padding:4px 10px; font-size:11px; font-family:var(--font-mono); background:var(--bg3); border:1px solid var(--border); border-radius:var(--radius); cursor:pointer; transition:all .15s; color:var(--text3); }
.diff-btn.easy { color:var(--easy); } .diff-btn.med { color:var(--med); } .diff-btn.hard { color:var(--hard); }
.diff-btn.selected { background:var(--bg2); border-color:var(--accent); color:var(--text); font-weight:600; }
.form-hint { font-size:10px; color:var(--text3); font-family:var(--font-mono); }
.task-section-label { font-size:10px; font-family:var(--font-mono); color:var(--text3); letter-spacing:.8px; text-transform:uppercase; padding:2px 0; border-bottom:1px solid var(--border); }
.ready-label { color:var(--accent); border-color:var(--accent); }
.collected-label { color:var(--text3); opacity:.7; }
.task-card { background:var(--surface); border:1px solid var(--border); border-radius:var(--radius-lg); padding:11px 13px; display:flex; flex-direction:column; gap:8px; transition:border-color .15s, box-shadow .15s; }
.task-card:hover { border-color:var(--border2); box-shadow:var(--shadow); }
.task-card.ready { border-color:var(--accent); background:var(--bg2); }
.task-card.collected { opacity:.55; }
.task-top { display:flex; align-items:flex-start; justify-content:space-between; gap:8px; }
.task-title { font-size:13px; color:var(--text); flex:1; line-height:1.4; }
.chunk-row { display:flex; align-items:center; gap:3px; flex-wrap:wrap; }
.chunk { height:6px; flex:1; max-width:30px; min-width:12px; border-radius:2px; background:var(--bg3); border:1px solid var(--border); transition:background .3s; }
:global(.chunk.done)   { background:var(--xp-color) !important; border-color:var(--xp-color) !important; }
:global(.chunk.active) { background:var(--gold-light) !important; border-color:var(--gold-light) !important; }
.chunk-label { font-size:10px; color:var(--text3); font-family:var(--font-mono); white-space:nowrap; margin-left:4px; }
.task-actions { display:flex; justify-content:space-between; align-items:center; gap:8px; }
.task-xp { font-size:10px; color:var(--accent); font-family:var(--font-mono); }
.task-meta-row { display:flex; justify-content:space-between; }
.task-meta { font-size:10px; color:var(--text3); font-family:var(--font-mono); }
.done-badge { font-size:10px; color:var(--xp-color); font-family:var(--font-mono); }
.empty-state { display:flex; flex-direction:column; align-items:center; gap:10px; padding:40px 0; color:var(--text3); font-size:13px; }
.empty-icon { font-size:32px; }

/* Hacker terminal */
.terminal { background:var(--surface); border:1px solid var(--border); border-radius:var(--radius); display:flex; flex-direction:column; height:300px; overflow:hidden; flex-shrink:0; }
.term-titlebar { display:flex; align-items:center; gap:5px; padding:6px 10px; background:var(--bg3); border-bottom:1px solid var(--border); }
.term-dot { width:10px; height:10px; border-radius:50%; }
.term-dot.red{background:#ff5f57;} .term-dot.yellow{background:#ffbd2e;} .term-dot.green{background:#28c840;}
.term-title { font-size:10px; color:var(--text3); font-family:var(--font-mono); margin-left:6px; }
.term-body { flex:1; overflow-y:auto; padding:8px 12px; display:flex; flex-direction:column; gap:1px; }
.term-line { font-size:11px; font-family:var(--font-mono); line-height:1.6; }
.term-sub { color:var(--text3); margin-left:10px; font-size:10px; letter-spacing:.5px; }
.term-inputrow { display:flex; align-items:center; gap:8px; padding:6px 12px; border-top:1px solid var(--border); background:var(--bg2); }
.term-prompt { color:var(--text3); font-family:var(--font-mono); font-size:10px; white-space:nowrap; }
.term-input { flex:1; background:transparent; border:none; outline:none; color:var(--accent); font-family:var(--font-mono); font-size:11px; caret-color:var(--accent); }
.term-input::placeholder { color:var(--text3); }
.hacker-list-header { display:flex; justify-content:space-between; font-size:10px; font-family:var(--font-mono); padding:4px 0; border-bottom:1px solid var(--border); }
.hacker-task { display:flex; align-items:center; gap:7px; padding:6px 10px; background:var(--surface); border:1px solid var(--border); border-radius:var(--radius); font-size:11px; font-family:var(--font-mono); transition:border-color .15s; }
.hacker-task:hover { border-color:var(--border2); }
.hacker-task.ht-done { border-color:var(--accent); }
.ht-idx{flex-shrink:0;min-width:24px;} .ht-bar{letter-spacing:1px;flex-shrink:0;font-size:10px;} .ht-title{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text2);}
.c-accent{color:var(--accent);} .c-ok{color:var(--xp-color);} .c-err{color:var(--hp-color);} .c-sys{color:var(--text3);} .c-text{color:var(--text2);}
.tag{font-size:9px;font-family:var(--font-mono);padding:1px 5px;border-radius:3px;border:1px solid;}
.tag.easy{color:var(--easy);border-color:var(--easy);} .tag.med{color:var(--med);border-color:var(--med);} .tag.hard{color:var(--hard);border-color:var(--hard);}

/* ══════ RETRO HEADER ══════ */
.retro-header { display:flex; flex-direction:column; gap:4px; }
.retro-title { font-family:var(--font-mono); font-size:15px; font-weight:700; color:#ffee00; letter-spacing:3px; text-shadow:0 0 10px #ffee00; display:flex; align-items:center; gap:10px; }
.pac-icon { color:#ffee00; font-size:18px; animation:pacChomp .4s ease-in-out infinite alternate; text-shadow:0 0 10px #ffee00; }
@keyframes pacChomp {
  from { clip-path:polygon(0% 0%, 100% 25%, 100% 75%, 0% 100%); }
  to   { clip-path:polygon(0% 0%, 100% 0%,  100% 100%, 0% 100%); }
}
.ghost-icons{display:flex;gap:4px;font-size:14px;}
.ghost{animation:ghostFloat 1.2s ease-in-out infinite alternate;}
.ghost-red{color:#ff0000;animation-delay:0s;} .ghost-blue{color:#00ccff;animation-delay:.4s;} .ghost-pink{color:#ffaacc;animation-delay:.8s;}
@keyframes ghostFloat{from{transform:translateY(0)}to{transform:translateY(-3px)}}
.retro-sub{font-family:var(--font-mono);font-size:10px;color:#ff4400;letter-spacing:2px;}

/* ══════ RETRO INPUT ══════ */
.retro-input-zone { background:#0a0010; border:1px solid #3300aa; padding:12px; display:flex; flex-direction:column; gap:10px; box-shadow:0 0 12px #3300aa44; }
.retro-pellet-row { display:flex; align-items:center; gap:3px; min-height:32px; flex-wrap:wrap; }
.retro-input { flex:1; min-width:200px; background:transparent; border:none; border-bottom:1px solid #3300aa; color:#ffee00; font-family:var(--font-mono); font-size:13px; letter-spacing:2px; outline:none; padding:4px 0; caret-color:#ffee00; }
.retro-input::placeholder{color:#3300aa;}
.pac-chomping{color:#ffee00;font-size:16px;flex-shrink:0;animation:pacChomp .15s ease-in-out infinite alternate;text-shadow:0 0 8px #ffee00;}
.retro-letter{font-family:var(--font-mono);color:#ff8800;font-size:13px;letter-spacing:1px;}
.retro-done-msg{font-family:var(--font-mono);color:#00ff88;font-size:12px;letter-spacing:2px;text-shadow:0 0 6px #00ff8888;}
.retro-controls{display:flex;justify-content:space-between;align-items:center;gap:8px;}
.diff-pills{display:flex;gap:5px;}
.retro-pill{font-family:var(--font-mono);font-size:9px;letter-spacing:1px;padding:3px 8px;background:#0a0010;border:1px solid #3300aa;color:#5500cc;cursor:pointer;transition:all .12s;border-radius:0;}
.retro-pill.easy.selected{border-color:#00ff88;color:#00ff88;box-shadow:0 0 5px #00ff8866;}
.retro-pill.med.selected {border-color:#ffbb00;color:#ffbb00;box-shadow:0 0 5px #ffbb0066;}
.retro-pill.hard.selected{border-color:#ff4400;color:#ff4400;box-shadow:0 0 5px #ff440066;}
.retro-pill:hover{border-color:#5500cc;color:#aa44ff;}
.retro-submit{font-family:var(--font-mono);font-size:10px;letter-spacing:2px;padding:5px 14px;background:#ffee00;border:none;color:#0a0010;cursor:pointer;font-weight:700;transition:all .15s;border-radius:0;box-shadow:0 0 8px #ffee0066;}
.retro-submit:hover{background:#fff;box-shadow:0 0 14px #ffee00;}
.retro-submit:disabled{background:#3300aa;color:#5500cc;box-shadow:none;cursor:default;}
.retro-empty{display:flex;flex-direction:column;align-items:center;gap:10px;padding:30px 0;color:#3300aa;font-family:var(--font-mono);font-size:11px;letter-spacing:2px;}
.empty-pac{font-size:32px;color:#ffee00;text-shadow:0 0 10px #ffee00;}
.retro-section-label{font-family:var(--font-mono);font-size:10px;color:#ff4400;letter-spacing:3px;padding:2px 0;border-bottom:1px solid #3300aa;}

/* ══════ RETRO TASK CARD ══════ */
.retro-task-card {
  background:#0a0010;
  border:1px solid #3300aa;
  padding:10px 12px;
  display:flex; flex-direction:column; gap:8px;
  transition:border-color .15s;
}
.retro-task-card:hover { border-color:#5500cc; }
.retro-task-card.ready-card { border-color:#ffee0066; box-shadow:0 0 8px #ffee0022; }

.rtc-top { display:flex; align-items:center; gap:8px; }
.retro-task-title { flex:1; font-size:11px; color:#ff8800; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; letter-spacing:0.5px; font-family:var(--font-mono); }
.retro-tag { font-size:9px; letter-spacing:1px; padding:1px 5px; border:1px solid; border-radius:0; flex-shrink:0; font-family:var(--font-mono); }
.retro-tag.easy{color:#00ff88;border-color:#00ff88;} .retro-tag.med{color:#ffbb00;border-color:#ffbb00;} .retro-tag.hard{color:#ff4400;border-color:#ff4400;}
.retro-xp { font-size:9px; color:#ffbb00; letter-spacing:1px; flex-shrink:0; font-family:var(--font-mono); }
.retro-btn { font-family:var(--font-mono); font-size:9px; letter-spacing:1px; padding:3px 9px; background:#0a0010; border:1px solid #5500cc; color:#aa44ff; cursor:pointer; transition:all .12s; border-radius:0; flex-shrink:0; }
.retro-btn:hover { border-color:#ffee00; color:#ffee00; box-shadow:0 0 6px #ffee0044; }
.retro-btn.primary { background:#ffee00; color:#0a0010; border-color:#ffee00; box-shadow:0 0 8px #ffee0066; font-weight:700; }
.retro-btn.primary:hover { box-shadow:0 0 14px #ffee00; }
.rtc-meta { font-size:9px; font-family:var(--font-mono); color:#3300aa; letter-spacing:0.5px; }

/* ══════ PAC-MAN TRACK ══════ */
.pac-track {
  position: relative;
  height: 24px;
  background: #05000a;
  border: 1px solid #220088;
  border-radius: 12px;
  overflow: visible;
}

/* The dashed centre line */
.pac-track::before {
  content: '';
  position: absolute;
  top: 50%; left: 4px; right: 4px;
  height: 1px;
  background: repeating-linear-gradient(90deg, #3300aa 0px, #3300aa 4px, transparent 4px, transparent 10px);
  transform: translateY(-50%);
}

/* Pellets */
.pellet {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 14px; height: 14px;
  border-radius: 50%;
  transition: background 0.2s, box-shadow 0.2s;
}
.pellet.uneaten {
  background: var(--pcol);
  box-shadow: 0 0 5px var(--pcol);
}
.pellet.eaten {
  background: transparent;
  border: 2px solid var(--pcol);
  box-shadow: 0 0 3px var(--pcol);
  opacity: 0.6;
}

/* Pac-Man character on the track */
.pac-man-char {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 18px; height: 18px;
  transition: left 0.12s linear;
  z-index: 2;
  filter: drop-shadow(0 0 4px #ffee00);
}
.pac-man-char {
  position: absolute;
  top: 50%;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #ffee00;
  transform: translateY(-50%);
  z-index: 2;
  filter: drop-shadow(0 0 4px #ffee00);
  overflow: hidden;
}

/* mouth */
.pac-man-char::before {
  content: '';
  position: absolute;
  inset: 0;
  background: #05000a;

  clip-path: polygon(
    100% 50%,
    100% 15%,
    65% 50%,
    100% 85%
  );
}

.pac-man-char.chomping::before {
  animation: pacChomp 0.3s linear infinite;
}

.retro-task-card:hover .pac-man-char::before {
  animation: pacChomp 0.3s linear infinite;
}

@keyframes pacChomp {
  0%,100% {
    clip-path: polygon(
      100% 50%,
      100% 5%,
      55% 50%,
      100% 95%
    );
  }

  50% {
    clip-path: polygon(
      100% 50%,
      100% 45%,
      95% 50%,
      100% 55%
    );
  }
}
</style>