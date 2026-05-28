<script>
  // @ts-ignore
  import { appState, tickChunk, createTask, notify, collectTask } from '$lib/stores/appState.svelte.js';
  // @ts-ignore
  import { onMount } from 'svelte';

  let isHacker = $derived(appState.theme === 'hacker');

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

  // ── Hacker terminal ──
  let termInput    = $state('');
  let termHistory  = $state([
    { type: 'sys', text: 'HEARTHWARD_OS v2.0 — task management subsystem' },
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

    // ── help ──
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

    // ── ls ──
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

    // ── clear ──
    } else if (cmd === 'clear') {
      termHistory.length = 0;
      termHistory.push({ type: 'sys', text: 'Terminal cleared. HEARTHWARD_OS ready.' });

    // ── new ──
    } else if (cmd === 'new') {
      const titleMatch = trimmed.match(/"([^"]+)"/);
      const diffMatch  = trimmed.match(/--diff\s+(easy|med|hard)/i);
      const chunkMatch = trimmed.match(/--chunk\s+(\d+)/i);
      const timeMatch  = trimmed.match(/--time\s+(\d+)/i);
      if (!titleMatch) {
        termHistory.push({ type: 'err', text: 'ERROR: title must be in quotes. new "my task" --diff med' });
      } else {
        const diff    = diffMatch  ? diffMatch[1].toLowerCase()  : 'med';
        const chunks  = chunkMatch ? parseInt(chunkMatch[1])     : null;
        const mins    = timeMatch  ? parseInt(timeMatch[1])      : null;
        // @ts-ignore
        createTask(titleMatch[1], diff, [], chunks, mins);
        // @ts-ignore
        const c = chunks ?? { easy:2, med:3, hard:5 }[diff];
        const m = mins   ?? 17.5;
        termHistory.push({ type: 'ok', text: `CREATED: "${titleMatch[1]}" [${diff}] ${c} chunks · ${m}min each` });
      }

    // ── done ──
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

    // ── history ──
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
        if (h.length > 20) termHistory.push({ type: 'sys', text: `  ... and ${h.length - 20} more. Use "grep" or "log" to filter.` });
      }

    // ── grep ──
    } else if (cmd === 'grep') {
      const query = parts.slice(1).join(' ').replace(/^["']|["']$/g, '').toLowerCase();
      if (!query) {
        termHistory.push({ type: 'err', text: 'ERROR: grep requires a search term. grep "design"' });
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

    // ── log ──
    } else if (cmd === 'log') {
      const dateMatch  = trimmed.match(/--date\s+(\d{4}-\d{2}-\d{2})/);
      const fromMatch  = trimmed.match(/--from\s+(\d{4}-\d{2}-\d{2})/);
      const toMatch    = trimmed.match(/--to\s+(\d{4}-\d{2}-\d{2})/);

      let results = [];
      let label   = '';

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
        termInput = '';
        scrollTerm();
        return;
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

  // 24h hide rule: show collected tasks only while within 24h of collection
  // @ts-ignore
  const NOW = Date.now();
  const H24 = 86400000;

  // @ts-ignore
  let activeTasks  = $derived(appState.tasks.filter(t => t.doneChunks < t.chunks));
  // @ts-ignore
  let readyTasks   = $derived(appState.tasks.filter(t => t.doneChunks >= t.chunks && !t.collected));
  // @ts-ignore
  let recentDone   = $derived(appState.tasks.filter(t =>
    t.collected && t.collectedAt && (Date.now() - t.collectedAt) < H24
  ));
</script>

<div class="tasks-view">

  {#if !isHacker}
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
        <textarea
          class="form-textarea"
          placeholder="What do you need to do? Describe it clearly — the more specific the better..."
          bind:value={cottageTitle}
          rows="3"
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
      <div class="empty-state">
        <div class="empty-icon">🌱</div>
        <div>No tasks yet. Plant your first seed!</div>
      </div>
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
              <div class="chunk" class:done={i < task.doneChunks} class:active={i === task.doneChunks && task.doneChunks > 0 && task.doneChunks < task.chunks}></div>
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

  {:else}
    <!-- ══════════ HACKER ══════════ -->
    <div class="terminal">
      <div class="term-titlebar">
        <span class="term-dot red"></span>
        <span class="term-dot yellow"></span>
        <span class="term-dot green"></span>
        <span class="term-title">hearthward — task_mgr.sh — root@aevyn</span>
      </div>
      <div class="term-body" bind:this={termEl}>
        {#each termHistory as line, i (i)}
          <div class="term-line">
            {#if line.type === 'input'}
              <span class="c-accent">{line.text}</span>
            {:else if line.type === 'err'}
              <span class="c-err">{line.text}</span>
            {:else if line.type === 'ok'}
              <span class="c-ok">{line.text}</span>
              {#if line.sub}<div class="term-sub">{line.sub}</div>{/if}
            {:else if line.type === 'out'}
              <span class="c-text">{line.text}</span>
              {#if line.sub}<div class="term-sub">{line.sub}</div>{/if}
            {:else}
              <span class="c-sys">{line.text}</span>
            {/if}
          </div>
        {/each}
      </div>
      <div class="term-inputrow">
        <span class="term-prompt">root@hearthward:~$</span>
        <input
          class="term-input"
          type="text"
          bind:value={termInput}
          onkeydown={onTermKey}
          placeholder='new "task title" --diff med'
          autocomplete="off"
          spellcheck="false"
        />
      </div>
    </div>

    <!-- Active task list below terminal -->
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
.tasks-view { flex:1; overflow-y:auto; padding:16px; display:flex; flex-direction:column; gap:10px; }

.view-header { display:flex; justify-content:space-between; align-items:flex-start; }
.view-title  { font-size:16px; font-weight:600; color:var(--text); }
.view-sub    { font-size:11px; color:var(--text3); font-family:var(--font-mono); margin-top:2px; }

/* Cottage form */
.cottage-form {
  background:var(--surface); border:1px solid var(--border);
  border-radius:var(--radius-lg); padding:14px;
  display:flex; flex-direction:column; gap:10px;
  animation:fadeIn .15s ease;
}
@keyframes fadeIn { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:none} }
.form-textarea {
  width:100%; background:var(--bg); border:1px solid var(--border);
  border-radius:var(--radius); color:var(--text); font-family:var(--font-body);
  font-size:14px; padding:10px; resize:vertical; outline:none; transition:border-color .15s;
}
.form-textarea:focus { border-color:var(--accent); }
.form-row { display:flex; justify-content:space-between; align-items:center; gap:8px; }
.diff-group { display:flex; gap:5px; }
.diff-btn {
  padding:4px 10px; font-size:11px; font-family:var(--font-mono);
  background:var(--bg3); border:1px solid var(--border); border-radius:var(--radius);
  cursor:pointer; transition:all .15s; color:var(--text3);
}
.diff-btn.easy { color:var(--easy); }
.diff-btn.med  { color:var(--med); }
.diff-btn.hard { color:var(--hard); }
.diff-btn.selected { background:var(--bg2); border-color:var(--accent); color:var(--text); font-weight:600; }
.form-hint { font-size:10px; color:var(--text3); font-family:var(--font-mono); }

/* Section labels */
.task-section-label {
  font-size:10px; font-family:var(--font-mono); color:var(--text3);
  letter-spacing:.8px; text-transform:uppercase;
  padding:2px 0; border-bottom:1px solid var(--border);
}
.ready-label     { color:var(--accent); border-color:var(--accent); }
.collected-label { color:var(--text3); opacity:.7; }

/* Task cards */
.task-card {
  background:var(--surface); border:1px solid var(--border);
  border-radius:var(--radius-lg); padding:11px 13px;
  display:flex; flex-direction:column; gap:8px;
  transition:border-color .15s, box-shadow .15s;
}
.task-card:hover { border-color:var(--border2); box-shadow:var(--shadow); }
.task-card.ready { border-color:var(--accent); background:var(--bg2); }
.task-card.collected { opacity:.55; }

.task-top { display:flex; align-items:flex-start; justify-content:space-between; gap:8px; }
.task-title { font-size:13px; color:var(--text); flex:1; line-height:1.4; }

.chunk-row { display:flex; align-items:center; gap:3px; flex-wrap:wrap; }

.chunk {
  height:6px; flex:1; max-width:30px; min-width:12px;
  border-radius:2px; background:var(--bg3); border:1px solid var(--border);
  transition:background .3s;
}
.chunk.done   { background-color:var(--accent); border-color:var(--xp-color); }
.chunk.active { background:var(--accent2); border-color:var(--accent2); }
.chunk-label { font-size:10px; color:var(--text3); font-family:var(--font-mono); white-space:nowrap; margin-left:4px; }

.task-actions { display:flex; justify-content:space-between; align-items:center; gap:8px; }
.task-xp  { font-size:10px; color:var(--accent); font-family:var(--font-mono); }
.task-meta-row { display:flex; justify-content:space-between; }
.task-meta { font-size:10px; color:var(--text3); font-family:var(--font-mono); }
.done-badge { font-size:10px; color:var(--xp-color); font-family:var(--font-mono); }

.empty-state {
  display:flex; flex-direction:column; align-items:center; gap:10px;
  padding:40px 0; color:var(--text3); font-size:13px;
}
.empty-icon { font-size:32px; }

/* Terminal */
.terminal {
  background:var(--surface); border:1px solid var(--border);
  border-radius:var(--radius); display:flex; flex-direction:column;
  height:300px; overflow:hidden; flex-shrink:0;
}
.term-titlebar {
  display:flex; align-items:center; gap:5px; padding:6px 10px;
  background:var(--bg3); border-bottom:1px solid var(--border);
}
.term-dot { width:10px; height:10px; border-radius:50%; }
.term-dot.red    { background:#ff5f57; }
.term-dot.yellow { background:#ffbd2e; }
.term-dot.green  { background:#28c840; }
.term-title { font-size:10px; color:var(--text3); font-family:var(--font-mono); margin-left:6px; }
.term-body {
  flex:1; overflow-y:auto; padding:8px 12px;
  display:flex; flex-direction:column; gap:1px;
}
.term-line { font-size:11px; font-family:var(--font-mono); line-height:1.6; }
.term-sub { color:var(--text3); margin-left:10px; font-size:10px; letter-spacing:.5px; }
.term-inputrow {
  display:flex; align-items:center; gap:8px; padding:6px 12px;
  border-top:1px solid var(--border); background:var(--bg2);
}
.term-prompt { color:var(--text3); font-family:var(--font-mono); font-size:10px; white-space:nowrap; }
.term-input {
  flex:1; background:transparent; border:none; outline:none;
  color:var(--accent); font-family:var(--font-mono); font-size:11px; caret-color:var(--accent);
}
.term-input::placeholder { color:var(--text3); }

/* Hacker task list */
.hacker-list-header {
  display:flex; justify-content:space-between;
  font-size:10px; font-family:var(--font-mono);
  padding:4px 0; border-bottom:1px solid var(--border);
}
.hacker-task {
  display:flex; align-items:center; gap:7px; padding:6px 10px;
  background:var(--surface); border:1px solid var(--border);
  border-radius:var(--radius); font-size:11px; font-family:var(--font-mono);
  transition:border-color .15s;
}
.hacker-task:hover { border-color:var(--border2); }
.hacker-task.ht-done { border-color:var(--accent); }
.ht-idx   { flex-shrink:0; min-width:24px; }
.ht-bar   { letter-spacing:1px; flex-shrink:0; font-size:10px; }
.ht-title { flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--text2); }

/* Color helpers */
.c-accent { color:var(--accent); }
.c-ok     { color:var(--xp-color); }
.c-err    { color:var(--hp-color); }
.c-sys    { color:var(--text3); }
.c-text   { color:var(--text2); }
</style>