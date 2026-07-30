<script>
  // @ts-ignore
  import { appState, tickChunk, untickChunk, createTask, notify, collectTask } from '$lib/stores/appState.svelte.js';
  // @ts-ignore
  import { pushTaskToCalendar, syncCalendars, getCalendarAccounts, invalidateAccountCache } from '$lib/calendar.js';
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

  // ── Tab completion state ──
  // @ts-ignore
  let tabState = $state({ completions: [], index: -1, base: '' });

  const TOP_CMDS   = ['cal', 'clear', 'done', 'grep', 'help', 'history', 'log', 'ls', 'new'];
  const CAL_SUBS   = ['accounts', 'add', 'calendars', 'link', 'sync', 'update'];
  const CAL_FLAGS  = ['--account', '--cal', '--date', '--duration', '--invite', '--recur', '--time'];
  const RECUR_VALS = ['daily', 'monthly', 'none', 'weekly'];

  // @ts-ignore
  async function getTabCompletions(input) {
    const endsWithSpace = input.endsWith(' ');
    const parts   = input.trimStart().split(/\s+/).filter(Boolean);
    const cmd     = parts[0]?.toLowerCase() ?? '';
    const sub     = parts[1]?.toLowerCase() ?? '';
    const current = endsWithSpace ? '' : (parts[parts.length - 1] ?? '');
    const prev    = endsWithSpace ? parts[parts.length - 1] : parts[parts.length - 2];

    // Completing the first word
    if (parts.length === 0 || (parts.length === 1 && !endsWithSpace)) {
      return TOP_CMDS.filter(c => c.startsWith(current));
    }

    if (cmd !== 'cal') return [];

    // cal <sub>
    if (parts.length === 1 || (parts.length === 2 && !endsWithSpace)) {
      return CAL_SUBS.filter(s => s.startsWith(current));
    }

    if (!['add', 'update'].includes(sub)) return [];

    // cal add/update completions
    const prevLower = (prev ?? '').toLowerCase();

    if (prevLower === '--account') {
      const accounts = await getCalendarAccounts();
      return accounts.map(/** @type {any} */ (a) => a.google_email).filter(/** @type {any} */ (e) => e.startsWith(current));
    }

    if (prevLower === '--cal') {
      const accountMatch = input.match(/--account\s+(\S+)/);
      if (accountMatch) {
        const accounts = await getCalendarAccounts();
        const acc = accounts.find(/** @type {any} */ (a) => a.google_email === accountMatch[1]);
        const cals = (acc?.selected_calendars ?? []).filter(/** @type {any} */ (c) => c.enabled);
        return cals
          .map(/** @type {any} */ (c) => c.name.includes(' ') ? `"${c.name}"` : c.name)
          .filter(/** @type {any} */ (n) => n.toLowerCase().startsWith(current.toLowerCase()));
      }
      return [];
    }

    if (prevLower === '--recur') {
      return RECUR_VALS.filter(v => v.startsWith(current));
    }

    if (current.startsWith('-')) {
      return CAL_FLAGS.filter(f => f.startsWith(current));
    }

    return [];
  }

  // @ts-ignore
  async function handleTab(e) {
    e.preventDefault();

    // If we have active completions, cycle through them
    if (tabState.completions.length > 0) {
      tabState.index = (tabState.index + 1) % tabState.completions.length;
      _applyCompletion(tabState.base, tabState.completions[tabState.index]);
      return;
    }

    // Otherwise compute completions fresh
    const completions = await getTabCompletions(termInput);
    if (completions.length === 0) return;

    // Save the current input as the base (prefix before the current token)
    const endsWithSpace = termInput.endsWith(' ');
    const parts = termInput.trimStart().split(/\s+/).filter(Boolean);
    const base  = endsWithSpace
      ? termInput
      : termInput.slice(0, termInput.lastIndexOf(parts[parts.length - 1]));

    tabState = { completions, index: 0, base };
    _applyCompletion(base, completions[0]);
  }

  // @ts-ignore
  function _applyCompletion(base, completion) {
    termInput = base + completion;
  }

  function _resetTab() {
    tabState = { completions: [], index: -1, base: '' };
  }

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
  async function parseAndRun(raw) {
    const trimmed = raw.trim();
    if (!trimmed) return;
    inputHistory.unshift(trimmed);
    historyIdx = -1;
    _resetTab();
    termHistory.push({ type: 'input', text: `> ${trimmed}` });
    const parts = trimmed.split(/\s+/);
    const cmd   = parts[0].toLowerCase();

    if (cmd === 'help') {
      termHistory.push({ type: 'out', text: 'COMMANDS:' });
      termHistory.push({ type: 'out', text: '  new "task title" [--diff easy|med|hard] [--chunk N] [--time N]' });
      termHistory.push({ type: 'out', text: '  ls              list active tasks' });
      termHistory.push({ type: 'out', text: '  done <idx>      tick a chunk on task by index' });
      termHistory.push({ type: 'out', text: '  grep <query>    search task history' });
      termHistory.push({ type: 'out', text: '  history         show completed tasks' });
      termHistory.push({ type: 'out', text: '  log --date YYYY-MM-DD  |  --from X --to Y' });
      termHistory.push({ type: 'out', text: '  clear           clear terminal' });
      termHistory.push({ type: 'out', text: 'CALENDAR COMMANDS (hacker-mode only):' });
      termHistory.push({ type: 'out', text: '  cal link                     open Google OAuth to add an account' });
      termHistory.push({ type: 'out', text: '  cal accounts                 list linked Google accounts' });
      termHistory.push({ type: 'out', text: '  cal calendars --account <email>  list calendars for account' });
      termHistory.push({ type: 'out', text: '  cal sync                     pull latest events from all calendars' });
      termHistory.push({ type: 'out', text: '  cal add <idx> --account <email> --cal <name> --date YYYY-MM-DD --time HH:MM' });
      termHistory.push({ type: 'out', text: '                [--duration <mins>] [--recur daily|weekly|monthly] [--invite a@b.com,c@d.com]' });
      termHistory.push({ type: 'out', text: '  cal update <idx> [same flags as add]  update existing calendar event' });
      termHistory.push({ type: 'sys', text: '// Tab autocompletes commands, flags, accounts, calendars, and recur values.' });
    } else if (cmd === 'cal') {
      await runCal(parts.slice(1), trimmed);
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

  // ── cal command handler ──
  // @ts-ignore
  async function runCal(args, raw) {
    const sub = args[0]?.toLowerCase();

    if (!sub || sub === 'help') {
      termHistory.push({ type: 'out', text: '  cal link | accounts | calendars | sync | add | update' });

    } else if (sub === 'link') {
      termHistory.push({ type: 'sys', text: '// Opening Google OAuth in new tab…' });
      window.open('/auth/google-calendar', '_blank', 'width=500,height=640');
      invalidateAccountCache();

    } else if (sub === 'accounts') {
      termHistory.push({ type: 'sys', text: '// Fetching linked accounts…' });
      try {
        const accs = await getCalendarAccounts();
        if (accs.length === 0) {
          termHistory.push({ type: 'out', text: '  (none linked — run "cal link")' });
        } else {
          accs.forEach(/** @type {any} */ (a, i) => {
            const cals = (a.selected_calendars ?? []).filter(/** @type {any} */ (c) => c.enabled);
            termHistory.push({ type: 'out', text: `  [${i}] ${a.google_email}`, sub: `${cals.length} calendar(s) enabled` });
          });
        }
      } catch { termHistory.push({ type: 'err', text: 'ERROR: could not fetch accounts.' }); }

    } else if (sub === 'calendars') {
      const emailMatch = raw.match(/--account\s+(\S+)/i);
      if (!emailMatch) { termHistory.push({ type: 'err', text: 'ERROR: cal calendars --account <email>' }); return; }
      termHistory.push({ type: 'sys', text: `// Fetching calendars for ${emailMatch[1]}…` });
      try {
        const accs = await getCalendarAccounts();
        const acc  = accs.find(/** @type {any} */ (a) => a.google_email === emailMatch[1]);
        if (!acc) { termHistory.push({ type: 'err', text: `ERROR: no linked account for ${emailMatch[1]}` }); return; }
        const res  = await fetch(`/api/calendar/calendars?accountId=${acc.id}`);
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        const enabledIds = new Set((acc.selected_calendars ?? []).filter(/** @type {any} */ (c) => c.enabled).map(/** @type {any} */ (c) => c.id));
        data.calendars.forEach(/** @type {any} */ (c, i) => {
          const state = enabledIds.has(c.id) ? '[ON] ' : '[OFF]';
          termHistory.push({ type: 'out', text: `  ${state} ${c.name}`, sub: c.id });
        });
      } catch (/** @type {any} */ e) { termHistory.push({ type: 'err', text: `ERROR: ${e.message}` }); }

    } else if (sub === 'sync') {
      termHistory.push({ type: 'sys', text: '// Syncing calendars…' });
      try {
        await syncCalendars();
        termHistory.push({ type: 'ok', text: 'SYNC COMPLETE' });
      } catch (/** @type {any} */ e) { termHistory.push({ type: 'err', text: `SYNC FAILED: ${e.message}` }); }

    } else if (sub === 'add' || sub === 'update') {
      // cal add <idx> --account <email> --cal <name> --date YYYY-MM-DD --time HH:MM [--duration N] [--recur X] [--invite emails]
      const isUpdate   = sub === 'update';
      const idxStr     = args[1];
      const emailMatch = raw.match(/--account\s+(\S+)/i);
      const calMatch   = raw.match(/--cal\s+("([^"]+)"|(\S+))/i);
      const dateMatch  = raw.match(/--date\s+(\d{4}-\d{2}-\d{2})/i);
      const timeMatch  = raw.match(/--time\s+(\d{2}:\d{2})/i);
      const durMatch   = raw.match(/--duration\s+(\d+)/i);
      const recurMatch = raw.match(/--recur\s+(daily|weekly|monthly|none)/i);
      const invMatch   = raw.match(/--invite\s+(\S+)/i);

      if (!emailMatch || !calMatch || !dateMatch || !timeMatch) {
        termHistory.push({ type: 'err', text: 'ERROR: required: --account <email> --cal <name> --date YYYY-MM-DD --time HH:MM' });
        termInput = ''; scrollTerm(); return;
      }

      const taskIdx = parseInt(idxStr);
      const active  = appState.tasks.filter(/** @type {any} */ (t) => !t.collected);
      const task    = isNaN(taskIdx) ? null : active[taskIdx];

      if (isNaN(taskIdx) || !task) {
        termHistory.push({ type: 'err', text: `ERROR: invalid task index. Use "ls" to list.` });
        termInput = ''; scrollTerm(); return;
      }

      const calName    = calMatch[2] ?? calMatch[3];
      const duration   = durMatch ? parseInt(durMatch[1]) : Math.round((task.chunks * task.chunkMins) || 60);
      const recur      = recurMatch?.[1] ?? 'none';
      const invitees   = invMatch ? invMatch[1].split(',').map(/** @type {any} */ (s) => s.trim()) : [];

      // Look up the calendarId from the account's selected_calendars
      const accs = await getCalendarAccounts();
      const acc  = accs.find(/** @type {any} */ (a) => a.google_email === emailMatch[1]);
      if (!acc) { termHistory.push({ type: 'err', text: `ERROR: no linked account for ${emailMatch[1]}` }); termInput = ''; scrollTerm(); return; }
      const calEntry = (acc.selected_calendars ?? []).find(/** @type {any} */ (c) => c.name === calName || c.id === calName);
      if (!calEntry) { termHistory.push({ type: 'err', text: `ERROR: calendar "${calName}" not found in account. Use "cal calendars --account ${emailMatch[1]}" to list.` }); termInput = ''; scrollTerm(); return; }

      const eventId = isUpdate ? (task.calendarEventId ?? null) : null;

      termHistory.push({ type: 'sys', text: `// ${isUpdate ? 'Updating' : 'Creating'} calendar event…` });
      try {
        const result = await pushTaskToCalendar({
          accountEmail: emailMatch[1],
          calendarId:   calEntry.id,
          title:        task.title,
          date:         dateMatch[1],
          time:         timeMatch[1],
          durationMins: duration,
          recur,
          invitees,
          eventId,
        });

        // Pin the task so future syncs don't overwrite it
        task.calendarPinned       = true;
        task.calendarEventId      = result.eventId;
        task.calendarAccountEmail = emailMatch[1];
        task.calendarId           = calEntry.id;

        termHistory.push({ type: 'ok', text: `EVENT ${isUpdate ? 'UPDATED' : 'CREATED'}: ${task.title}` });
        termHistory.push({ type: 'sys', text: `// ${result.htmlLink}` });
      } catch (/** @type {any} */ e) {
        termHistory.push({ type: 'err', text: `ERROR: ${e.message}` });
      }

    } else {
      termHistory.push({ type: 'err', text: `UNKNOWN cal subcommand: "${sub}". Try "cal help".` });
    }

    termInput = '';
    scrollTerm();
  }

  // @ts-ignore
  function onTermKey(e) {
    if (e.key === 'Tab') {
      handleTab(e);
      return;
    }
    // Any non-Tab key resets tab cycling
    if (e.key !== 'Shift') _resetTab();

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

  // ── Mobile swipe state for cottage task cards ──
  let swipeState = $state({});

  function swipeStart(e, taskId) {
    swipeState[taskId] = {
      startX: e.touches[0].clientX,
      startY: e.touches[0].clientY,
      x: 0, active: true, committed: false
    };
  }

  function swipeMove(e, taskId) {
    const s = swipeState[taskId];
    if (!s?.active) return;
    const dx = e.touches[0].clientX - s.startX;
    const dy = e.touches[0].clientY - s.startY;
    // If more vertical than horizontal early on, cancel
    if (!s.committed && Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 8) {
      swipeState[taskId] = { ...s, active: false };
      return;
    }
    if (Math.abs(dx) > 6) {
      e.preventDefault();
      swipeState[taskId] = { ...s, x: dx, committed: true };
    }
  }

  function swipeEnd(e, taskId) {
    const s = swipeState[taskId];
    if (!s) return;
    if (s.x < -60) tickChunk(taskId);
    else if (s.x > 60) untickChunk(taskId);
    swipeState[taskId] = { x: 0, startX: 0, startY: 0, active: false, committed: false };
  }
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
      {@const sx = swipeState[task.id]?.x ?? 0}
      <div class="swipe-wrapper">
        {#if sx < -20}<div class="swipe-hint hint-right">✓ chunk</div>{/if}
        {#if sx > 20}<div class="swipe-hint hint-left">↩ undo</div>{/if}
        <div class="task-card"
          style="transform:translateX({sx}px);transition:{swipeState[task.id]?.active ? 'none' : 'transform .2s ease'}"
          ontouchstart={e => swipeStart(e, task.id)}
          ontouchmove={e => swipeMove(e, task.id)}
          ontouchend={e => swipeEnd(e, task.id)}
        >
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

.swipe-wrapper { position:relative; overflow:hidden; border-radius:var(--radius-lg); }
.swipe-hint { position:absolute; top:0; bottom:0; display:flex; align-items:center; padding:0 14px; font-size:11px; font-family:var(--font-mono); font-weight:600; pointer-events:none; }
.hint-right { right:0; background:rgba(30,90,30,.9); color:#4caf50; }
.hint-left  { left:0;  background:rgba(90,30,30,.9); color:#f44336; }
</style>