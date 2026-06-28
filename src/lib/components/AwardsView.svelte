<script>
import {
  appState,
  ACHIEVEMENT_RULES,
  MONTHLY_CARD_DATA,
  getAllMonthKeys,
  currentMonthKey,
} from '$lib/stores/appState.svelte.js';

let isHacker = $derived(appState.theme === 'hacker');

// ── Badge collection ───────────────────────────────────────────────────────
// Group earned awards by id so we can show counts for repeatable badges
let badgeCounts = $derived(() => {
  // @ts-ignore
  const counts = {};
  for (const a of appState.awards) {
    counts[a.id] = (counts[a.id] || 0) + 1;
  }
  return counts;
});

// All possible badges (from rules), plus any earned ones not in rules (legacy)
let allBadges = $derived(() => {
  const ruleIds = new Set(ACHIEVEMENT_RULES.map(r => r.id));
  const extra   = appState.awards.filter(a => !ruleIds.has(a.id));
  // deduplicate extra by id
  // @ts-ignore
  const seen = new Set();
  // @ts-ignore
  const uniqueExtra = extra.filter(a => { if (seen.has(a.id)) return false; seen.add(a.id); return true; });
  return [...ACHIEVEMENT_RULES, ...uniqueExtra];
});

// ── Monthly card helpers ────────────────────────────────────────────────────
const ALL_MONTH_KEYS = getAllMonthKeys();
const CUR_KEY        = currentMonthKey();

// @ts-ignore
function monthStatus(key) {
  if (key === CUR_KEY)  return 'active';
  if (key  < CUR_KEY)  return 'past';
  return 'future';
}

// @ts-ignore
function monthData(key) {
  return MONTHLY_CARD_DATA[key] ?? { label: key, icon: '📖', desc: '' };
}

// Compute Personal Records for a given month by comparing against all other months
// @ts-ignore
function computePRs(key) {
  const ms = appState.monthlyStats;
  const cur = ms[key];
  if (!cur) return [];

  const prs = [];
  const allKeys = Object.keys(ms).filter(k => k !== key && k < key); // only compare to past months

  // Most tasks in a month
  const prevMaxTasks = allKeys.reduce((m, k) => Math.max(m, ms[k]?.tasks || 0), 0);
  if ((cur.tasks || 0) > prevMaxTasks && (cur.tasks || 0) > 0) prs.push(`🏆 Most tasks in a month (${cur.tasks})`);

  // Most XP in a month
  const prevMaxXP = allKeys.reduce((m, k) => Math.max(m, ms[k]?.xp || 0), 0);
  if ((cur.xp || 0) > prevMaxXP && (cur.xp || 0) > 0) prs.push(`⚡ Most XP earned (${cur.xp})`);

  // Most gold in a month
  const prevMaxGold = allKeys.reduce((m, k) => Math.max(m, ms[k]?.gold || 0), 0);
  if ((cur.gold || 0) > prevMaxGold && (cur.gold || 0) > 0) prs.push(`🪙 Most gold earned (${cur.gold})`);

  // Best streak that month
  const prevMaxStreak = allKeys.reduce((m, k) => Math.max(m, ms[k]?.longestStreak || 0), 0);
  if ((cur.longestStreak || 0) > prevMaxStreak && (cur.longestStreak || 0) > 0) prs.push(`🔥 Best streak (${cur.longestStreak}d)`);

  // Most focus sessions
  const prevMaxFocus = allKeys.reduce((m, k) => Math.max(m, ms[k]?.focusUses || 0), 0);
  if ((cur.focusUses || 0) > prevMaxFocus && (cur.focusUses || 0) > 0) prs.push(`🎯 Most focus sessions (${cur.focusUses})`);

  // Most learning tasks
  const prevMaxLearn = allKeys.reduce((m, k) => Math.max(m, ms[k]?.learningTasks || 0), 0);
  if ((cur.learningTasks || 0) > prevMaxLearn && (cur.learningTasks || 0) > 0) prs.push(`📚 Most learning tasks (${cur.learningTasks})`);

  return prs;
}

// @ts-ignore
function formatTime(mins) {
  if (!mins) return '0m';
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// ── UI state ────────────────────────────────────────────────────────────────
let selectedBadge     = $state(null);   // expanded badge detail
let expandedMonthKey  = $state(null);   // month card expanded inline
let showAllMonths     = $state(false);  // Netflix grid overlay
let curMD = $derived(monthData(CUR_KEY));
let curMS = $derived(appState.monthlyStats[CUR_KEY]);
</script>

<!-- ════════════════════════════════════════════════════════════════════════
     NETFLIX GRID OVERLAY (all monthly cards)
     ═════════════════════════════════════════════════════════════════════ -->
{#if showAllMonths}
<div class="overlay" onclick={() => showAllMonths = false}>
  <div class="overlay-panel" onclick={e => e.stopPropagation()}>
    <div class="overlay-header">
      <div class="overlay-title">{isHacker ? '// MONTHLY_ARCHIVE' : 'All Monthly Cards'}</div>
      <button class="close-btn" onclick={() => showAllMonths = false}>✕</button>
    </div>
    <div class="netflix-grid">
      {#each ALL_MONTH_KEYS as key}
        {@const status = monthStatus(key)}
        {@const md     = monthData(key)}
        {@const ms     = appState.monthlyStats[key]}
        {@const prs    = status === 'past' ? computePRs(key) : []}
        <button
          class="nf-card status-{status}"
          class:expanded-card={expandedMonthKey === key}
          onclick={() => expandedMonthKey = expandedMonthKey === key ? null : key}
        >
          <div class="nf-icon">{md.icon}</div>
          <div class="nf-label">{md.label}</div>
          {#if status === 'active'}
            <div class="nf-badge active">{isHacker ? 'ACTIVE' : 'Now'}</div>
          {:else if status === 'future'}
            <div class="nf-badge future">{isHacker ? 'UPCOMING' : '🔒'}</div>
          {:else if ms}
            <div class="nf-stat">{ms.tasks || 0} tasks · {ms.xp || 0} XP</div>
          {:else}
            <div class="nf-badge missed">{isHacker ? 'MISSED' : 'No data'}</div>
          {/if}
          {#if prs.length > 0}
            <div class="nf-pr-dot" title="{prs.length} PR(s) this month">★</div>
          {/if}
        </button>
      {/each}
    </div>

    <!-- Expanded card detail inside overlay -->
    {#if expandedMonthKey}
      {@const key    = expandedMonthKey}
      {@const status = monthStatus(key)}
      {@const md     = monthData(key)}
      {@const ms     = appState.monthlyStats[key]}
      {@const prs    = computePRs(key)}
      <div class="overlay-detail">
        <div class="od-header">
          <span class="od-icon">{md.icon}</span>
          <div>
            <div class="od-title">{md.label}</div>
            <div class="od-desc">{md.desc}</div>
          </div>
          <div class="od-status status-{status}">{status.toUpperCase()}</div>
        </div>
        {#if ms}
          <div class="od-stats">
            <div class="od-stat"><span>Tasks</span><span class="accent">{ms.tasks || 0}</span></div>
            <div class="od-stat"><span>XP</span><span class="accent">{ms.xp || 0}</span></div>
            <div class="od-stat"><span>Gold</span><span class="gold">{ms.gold || 0}</span></div>
            <div class="od-stat"><span>Best streak</span><span>{ms.longestStreak || 0}d</span></div>
            <div class="od-stat"><span>Focus sessions</span><span>{ms.focusUses || 0}</span></div>
            <div class="od-stat"><span>Time logged</span><span>{formatTime(ms.time)}</span></div>
            <div class="od-stat"><span>Learning tasks</span><span class="accent">{ms.learningTasks || 0}</span></div>
            <div class="od-stat"><span>Creative tasks</span><span class="accent">{ms.creativeTasks || 0}</span></div>
          </div>
        {:else if status === 'active'}
          <div class="od-empty">{isHacker ? '// in progress — complete tasks to log stats' : 'Complete tasks this month to start logging stats 🌿'}</div>
        {:else if status === 'future'}
          <div class="od-empty">{isHacker ? '// not yet' : 'This month hasn\'t started yet'}</div>
        {:else}
          <div class="od-empty">{isHacker ? '// no data recorded' : 'No tasks completed this month'}</div>
        {/if}
        {#if prs.length > 0}
          <div class="od-prs">
            <div class="od-prs-title">{isHacker ? '// PERSONAL_RECORDS' : 'Personal Records'}</div>
            {#each prs as pr}
              <div class="od-pr">{pr}</div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>
{/if}

<!-- ════════════════════════════════════════════════════════════════════════
     MAIN VIEW
     ═════════════════════════════════════════════════════════════════════ -->
<div class="awards-view">

  <!-- Header -->
  <div class="view-header">
    <div class="view-title">{isHacker ? 'AWARDS_DB.exe' : 'Awards & Achievements'}</div>
    <div class="view-sub">
      {isHacker
        ? `${appState.awards.length} badges acquired`
        : `${appState.awards.length} badges earned · special awards unlock hidden chains`}
    </div>
  </div>

  <!-- ── Badge Collection ────────────────────────────────────────────────── -->
  <div class="section-label">{isHacker ? '-- BADGE_COLLECTION --' : 'Badge Collection'}</div>
  <div class="awards-grid">
    {#each allBadges() as rule}
      {@const count   = badgeCounts()[rule.id] || 0}
      {@const earned  = count > 0}
      <button
        class="award-chip type-{rule.type}"
        class:earned
        class:selected={selectedBadge?.id === rule.id}
        onclick={() => selectedBadge = selectedBadge?.id === rule.id ? null : { ...rule, count }}
        title="{rule.desc}"
      >
        <span class="award-icon" class:unearned-icon={!earned}>{rule.icon}</span>
        <span class="award-label">{rule.label}</span>
        {#if count > 1}
          <span class="count-badge">×{count}</span>
        {/if}
        {#if !earned}
          <span class="locked-badge">{isHacker ? '–' : '🔒'}</span>
        {/if}
        {#if rule.type === 'special' && earned}
          <span class="special-badge">{isHacker ? 'SPEC' : '★'}</span>
        {/if}
      </button>
    {/each}
  </div>

  <!-- Selected badge detail -->
  {#if selectedBadge}
  <div class="award-detail">
    <span class="detail-icon">{selectedBadge.icon}</span>
    <div class="detail-body">
      <div class="detail-title">{selectedBadge.label}</div>
      <div class="detail-desc">{selectedBadge.desc}</div>
      {#if selectedBadge.count > 1}
        <div class="detail-count">
          {isHacker ? `// collected ×${selectedBadge.count}` : `Collected ${selectedBadge.count} times`}
        </div>
      {/if}
      {#if selectedBadge.type === 'special' && selectedBadge.count > 0}
        <div class="detail-special">
          {isHacker ? '// SPECIAL: unlocks hidden award chains' : '✦ Special award — unlocks hidden achievement chains'}
        </div>
      {/if}
      {#if selectedBadge.count === 0}
        <div class="detail-locked">
          {isHacker ? '// not yet earned' : 'Not yet earned — keep going!'}
        </div>
      {/if}
    </div>
  </div>
  {/if}

  <!-- ── Monthly Cards ───────────────────────────────────────────────────── -->
  <div class="section-label monthly-section">{isHacker ? '-- MONTHLY_CARDS --' : 'Monthly Cards'}</div>
  <div class="monthly-note">
    {isHacker
      ? '// time-limited · once the month ends these are gone forever'
      : 'These cards exist for one month only and will never return'}
  </div>

  <!-- Active card (current month) — prominent, click to expand all -->
  <div class="active-month-card" onclick={() => showAllMonths = true} role="button" tabindex="0" onkeydown={e => e.key === 'Enter' && (showAllMonths = true)}>
    <div class="amc-left">
      <span class="amc-icon">{curMD.icon}</span>
      <div>
        <div class="amc-label">{curMD.label}</div>
        <div class="amc-desc">{curMD.desc}</div>
      </div>
    </div>
    <div class="amc-right">
      <div class="amc-badge">{isHacker ? 'ACTIVE' : 'Now'}</div>
      {#if curMS}
        <div class="amc-stat">{curMS.tasks || 0} tasks · {curMS.xp || 0} XP</div>
      {/if}
      <div class="amc-hint">{isHacker ? 'click → view all' : 'Click to view all months →'}</div>
    </div>
  </div>

  <!-- Past + future cards strip (most recent 6 past + next 3 upcoming) -->
  <div class="month-strip">
    {#each ALL_MONTH_KEYS as key}
      {@const status = monthStatus(key)}
      {#if status !== 'active'}
        {@const md  = monthData(key)}
        {@const ms  = appState.monthlyStats[key]}
        {@const prs = status === 'past' ? computePRs(key) : []}
        <button
          class="month-chip status-{status}"
          class:expanded={expandedMonthKey === key}
          onclick={() => expandedMonthKey = expandedMonthKey === key ? null : key}
        >
          <span class="mc-icon">{md.icon}</span>
          <span class="mc-label">{md.label.split(':')[0]}</span>
          {#if prs.length > 0}<span class="mc-pr">★</span>{/if}
          {#if ms && status === 'past'}<span class="mc-tasks">{ms.tasks || 0}</span>{/if}
        </button>
      {/if}
    {/each}
  </div>

  <!-- Inline expanded month detail (for strip chips) -->
  {#if expandedMonthKey && expandedMonthKey !== CUR_KEY}
    {@const key    = expandedMonthKey}
    {@const status = monthStatus(key)}
    {@const md     = monthData(key)}
    {@const ms     = appState.monthlyStats[key]}
    {@const prs    = computePRs(key)}
    <div class="month-detail-panel">
      <div class="mdp-header">
        <span class="mdp-icon">{md.icon}</span>
        <div class="mdp-title-group">
          <div class="mdp-title">{md.label}</div>
          <div class="mdp-desc">{md.desc}</div>
        </div>
        <button class="mdp-close" onclick={() => expandedMonthKey = null}>✕</button>
      </div>

      {#if ms}
        <div class="mdp-stats">
          <div class="mdp-stat"><span>{isHacker?'TASKS':'Tasks'}</span><span class="accent">{ms.tasks || 0}</span></div>
          <div class="mdp-stat"><span>{isHacker?'XP':'XP'}</span><span class="accent">{ms.xp || 0}</span></div>
          <div class="mdp-stat"><span>{isHacker?'GOLD':'Gold'}</span><span class="gold">{ms.gold || 0}</span></div>
          <div class="mdp-stat"><span>{isHacker?'STREAK':'Best streak'}</span><span>{ms.longestStreak || 0}d</span></div>
          <div class="mdp-stat"><span>{isHacker?'FOCUS':'Focus'}</span><span>{ms.focusUses || 0}</span></div>
          <div class="mdp-stat"><span>{isHacker?'TIME':'Time'}</span><span>{formatTime(ms.time)}</span></div>
          <div class="mdp-stat"><span>{isHacker?'LEARN':'Learning'}</span><span class="accent">{ms.learningTasks || 0}</span></div>
          <div class="mdp-stat"><span>{isHacker?'CREATE':'Creative'}</span><span class="accent">{ms.creativeTasks || 0}</span></div>
        </div>
        {#if prs.length > 0}
          <div class="mdp-prs">
            <div class="mdp-prs-label">{isHacker ? '// PERSONAL_RECORDS' : 'Personal Records'}</div>
            {#each prs as pr}
              <div class="mdp-pr">{pr}</div>
            {/each}
          </div>
        {/if}
      {:else if status === 'future'}
        <div class="mdp-empty">{isHacker ? '// month not yet reached' : 'This month hasn\'t started yet 🔒'}</div>
      {:else}
        <div class="mdp-empty">{isHacker ? '// no tasks recorded this month' : 'No tasks completed this month'}</div>
      {/if}
    </div>
  {/if}

  <!-- View all button -->
  <button class="view-all-btn" onclick={() => showAllMonths = true}>
    {isHacker ? '> view_all_months()' : '📅 View all months'}
  </button>

  <!-- ── Working Towards ────────────────────────────────────────────────── -->
  <div class="section-label">{isHacker ? '-- NEXT_UNLOCK --' : 'Working Towards'}</div>
  {#each ACHIEVEMENT_RULES.filter(r => !badgeCounts()[r.id] && !r.repeatable).slice(0, 3) as rule}
    <div class="progress-card">
      <div class="progress-top">
        <span class="progress-icon">{rule.icon}</span>
        <div class="progress-body">
          <div class="progress-title">{isHacker ? rule.label.toUpperCase().replace(/ /g,'_') : rule.label}</div>
          <div class="progress-desc">{rule.desc}</div>
        </div>
      </div>
    </div>
  {/each}

  <!-- Unlock note -->
  <div class="unlock-note">
    <span class="unlock-icon">🗝️</span>
    <span>
      {isHacker
        ? '// holding 7-Day Ember + Depth Seeker unlocks: SHADOW_QUEST chain'
        : 'Holding 7-Day Ember + Depth Seeker reveals: The Shadow Quest chain'}
    </span>
  </div>

</div>

<style>
/* ── Layout ────────────────────────────────────────────────────────────── */
.awards-view { flex:1; overflow-y:auto; padding:16px; display:flex; flex-direction:column; gap:12px; }
.view-header { display:flex; flex-direction:column; gap:3px; }
.view-title { font-size:16px; font-weight:600; color:var(--text); }
:global([data-theme="hacker"]) .view-title { font-family:var(--font-mono); color:var(--accent); font-size:13px; letter-spacing:1px; }
.view-sub { font-size:11px; color:var(--text3); font-family:var(--font-mono); }

.section-label { font-size:10px; font-family:var(--font-mono); color:var(--text3); letter-spacing:.8px; text-transform:uppercase; padding-bottom:4px; border-bottom:1px solid var(--border); }
.monthly-section { color:var(--accent3); border-color:var(--accent3); }
.monthly-note { font-size:11px; color:var(--text3); font-family:var(--font-mono); }

/* ── Badge grid ────────────────────────────────────────────────────────── */
.awards-grid { display:flex; flex-wrap:wrap; gap:8px; }
.award-chip {
  display:flex; align-items:center; gap:6px; padding:7px 12px;
  background:var(--bg3); border:1px solid var(--border);
  border-radius:var(--radius); cursor:pointer; transition:all .15s;
  font-family:var(--font-ui); position:relative;
}
.award-chip:hover { border-color:var(--border2); background:var(--bg2); }
.award-chip.selected { border-color:var(--accent); background:var(--surface); }
.award-chip.earned { opacity:1; }
.award-chip:not(.earned) { opacity:0.45; }
.award-chip.type-special.earned { border-color:var(--gold-color); }
.award-icon { font-size:16px; transition:filter .2s; }
.unearned-icon { filter:grayscale(100%); }
.award-label { font-size:12px; color:var(--text2); }
:global([data-theme="hacker"]) .award-label { font-family:var(--font-mono); font-size:10px; letter-spacing:.5px; color:var(--text); }
.special-badge { font-size:9px; color:var(--gold-color); font-family:var(--font-mono); margin-left:2px; }
.locked-badge { font-size:9px; color:var(--text3); font-family:var(--font-mono); }
.count-badge {
  position:absolute; top:-6px; right:-6px;
  background:var(--accent); color:var(--bg);
  font-size:9px; font-family:var(--font-mono); font-weight:700;
  border-radius:99px; padding:1px 5px; line-height:1.4;
  border:1px solid var(--bg);
}

/* ── Badge detail ──────────────────────────────────────────────────────── */
.award-detail {
  display:flex; align-items:flex-start; gap:12px; padding:12px;
  background:var(--surface); border:1px solid var(--accent);
  border-radius:var(--radius-lg); animation:fadeIn .15s ease;
}
@keyframes fadeIn { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:none} }
.detail-icon { font-size:28px; flex-shrink:0; }
.detail-body { flex:1; }
.detail-title { font-size:14px; font-weight:600; color:var(--text); margin-bottom:3px; }
:global([data-theme="hacker"]) .detail-title { font-family:var(--font-mono); color:var(--accent); font-size:12px; }
.detail-desc { font-size:12px; color:var(--text2); }
:global([data-theme="hacker"]) .detail-desc { font-family:var(--font-mono); font-size:11px; }
.detail-count { font-size:11px; color:var(--accent); font-family:var(--font-mono); margin-top:4px; }
.detail-special { font-size:11px; color:var(--gold-color); font-family:var(--font-mono); margin-top:5px; }
.detail-locked { font-size:11px; color:var(--text3); font-family:var(--font-mono); margin-top:4px; }

/* ── Active month card ─────────────────────────────────────────────────── */
.active-month-card {
  display:flex; justify-content:space-between; align-items:center; gap:12px;
  padding:14px 16px; background:var(--surface);
  border:1px solid var(--accent); border-radius:var(--radius-lg);
  cursor:pointer; transition:all .15s;
}
.active-month-card:hover { box-shadow:var(--shadow); transform:translateY(-1px); }
.amc-left { display:flex; align-items:center; gap:12px; }
.amc-icon { font-size:28px; }
.amc-label { font-size:14px; font-weight:600; color:var(--text); }
:global([data-theme="hacker"]) .amc-label { font-family:var(--font-mono); color:var(--accent); font-size:12px; letter-spacing:1px; }
.amc-desc { font-size:11px; color:var(--text3); font-family:var(--font-mono); }
.amc-right { display:flex; flex-direction:column; align-items:flex-end; gap:4px; }
.amc-badge { font-size:9px; font-family:var(--font-mono); color:var(--accent); border:1px solid var(--accent); padding:1px 6px; border-radius:var(--radius); }
.amc-stat { font-size:10px; color:var(--text3); font-family:var(--font-mono); }
.amc-hint { font-size:9px; color:var(--text3); font-family:var(--font-mono); }

/* ── Month strip ───────────────────────────────────────────────────────── */
.month-strip {
  display:flex; gap:6px; flex-wrap:wrap;
}
.month-chip {
  display:flex; flex-direction:column; align-items:center; gap:3px;
  padding:8px 10px; background:var(--bg3);
  border:1px solid var(--border); border-radius:var(--radius);
  cursor:pointer; transition:all .15s; min-width:52px; position:relative;
  font-family:var(--font-mono);
}
.month-chip:hover { border-color:var(--border2); background:var(--bg2); }
.month-chip.expanded { border-color:var(--accent); background:var(--surface); }
.month-chip.status-past { opacity:0.85; }
.month-chip.status-past:not(:has(.mc-tasks)) { opacity:0.45; }
.month-chip.status-future { opacity:0.35; cursor:default; }
.mc-icon { font-size:18px; }
.mc-label { font-size:9px; color:var(--text3); letter-spacing:.3px; }
.mc-pr { position:absolute; top:2px; right:3px; font-size:9px; color:var(--gold-color); }
.mc-tasks { font-size:9px; color:var(--accent); font-family:var(--font-mono); }

/* ── Inline month detail panel ─────────────────────────────────────────── */
.month-detail-panel {
  background:var(--surface); border:1px solid var(--border);
  border-radius:var(--radius-lg); padding:13px;
  display:flex; flex-direction:column; gap:10px;
  animation:fadeIn .15s ease;
}
.mdp-header { display:flex; align-items:flex-start; gap:10px; }
.mdp-icon { font-size:24px; flex-shrink:0; }
.mdp-title-group { flex:1; }
.mdp-title { font-size:13px; font-weight:600; color:var(--text); }
:global([data-theme="hacker"]) .mdp-title { font-family:var(--font-mono); color:var(--accent); font-size:11px; }
.mdp-desc { font-size:11px; color:var(--text3); font-family:var(--font-mono); }
.mdp-close { background:transparent; border:none; color:var(--text3); cursor:pointer; font-size:12px; padding:2px 6px; margin-left:auto; }
.mdp-close:hover { color:var(--text); }
.mdp-stats { display:grid; grid-template-columns:1fr 1fr; gap:5px; }
.mdp-stat { display:flex; justify-content:space-between; font-size:11px; color:var(--text2); background:var(--bg3); padding:4px 8px; border-radius:var(--radius); }
:global([data-theme="hacker"]) .mdp-stat { font-family:var(--font-mono); font-size:10px; }
.mdp-prs { display:flex; flex-direction:column; gap:3px; }
.mdp-prs-label { font-size:9px; font-family:var(--font-mono); color:var(--gold-color); letter-spacing:.8px; text-transform:uppercase; }
.mdp-pr { font-size:11px; color:var(--text2); font-family:var(--font-mono); }
:global([data-theme="hacker"]) .mdp-pr { font-size:10px; color:var(--accent); }
.mdp-empty { font-size:11px; color:var(--text3); font-family:var(--font-mono); text-align:center; padding:12px 0; }

/* ── View all button ───────────────────────────────────────────────────── */
.view-all-btn {
  padding:8px; background:var(--bg2); border:1px dashed var(--border);
  border-radius:var(--radius); color:var(--text3); font-family:var(--font-mono);
  font-size:11px; cursor:pointer; transition:all .2s; text-align:center;
}
.view-all-btn:hover { border-color:var(--accent3); color:var(--accent3); }

/* ── Progress cards ────────────────────────────────────────────────────── */
.progress-card { background:var(--surface); border:1px solid var(--border); border-radius:var(--radius-lg); padding:11px 13px; display:flex; flex-direction:column; gap:8px; }
.progress-top { display:flex; align-items:center; gap:10px; }
.progress-icon { font-size:20px; flex-shrink:0; }
.progress-body { flex:1; }
.progress-title { font-size:13px; font-weight:600; color:var(--text); }
:global([data-theme="hacker"]) .progress-title { font-family:var(--font-mono); font-size:11px; color:var(--accent); letter-spacing:.5px; }
.progress-desc { font-size:11px; color:var(--text3); font-family:var(--font-mono); }

/* ── Unlock note ───────────────────────────────────────────────────────── */
.unlock-note {
  display:flex; align-items:flex-start; gap:8px; padding:10px;
  background:var(--bg3); border:1px solid var(--border);
  border-radius:var(--radius); font-size:11px; color:var(--text3);
  font-family:var(--font-mono); line-height:1.5;
}
.unlock-icon { flex-shrink:0; }

/* ── Netflix grid overlay ──────────────────────────────────────────────── */
.overlay {
  position:fixed; inset:0; background:#00000080;
  display:flex; align-items:center; justify-content:center;
  z-index:1000; animation:fadeIn .15s ease;
}
.overlay-panel {
  background:var(--bg); border:1px solid var(--border);
  border-radius:var(--radius-lg); width:min(92vw, 640px);
  max-height:88vh; display:flex; flex-direction:column;
  overflow:hidden; box-shadow:0 20px 60px #0006;
}
.overlay-header {
  display:flex; justify-content:space-between; align-items:center;
  padding:14px 16px; border-bottom:1px solid var(--border);
  flex-shrink:0;
}
.overlay-title { font-size:14px; font-weight:600; color:var(--text); }
:global([data-theme="hacker"]) .overlay-title { font-family:var(--font-mono); color:var(--accent); font-size:12px; }
.close-btn { background:transparent; border:none; color:var(--text3); cursor:pointer; font-size:16px; padding:2px 8px; }
.close-btn:hover { color:var(--text); }
.netflix-grid {
  display:grid; grid-template-columns:repeat(auto-fill, minmax(110px, 1fr));
  gap:8px; padding:16px; overflow-y:auto; flex-shrink:0;
  max-height:320px;
}
.nf-card {
  display:flex; flex-direction:column; align-items:center; gap:4px;
  padding:10px 8px; background:var(--bg3);
  border:1px solid var(--border); border-radius:var(--radius);
  cursor:pointer; transition:all .15s; position:relative;
  text-align:center;
}
.nf-card:hover { border-color:var(--border2); transform:translateY(-2px); }
.nf-card.expanded-card { border-color:var(--accent); background:var(--surface); }
.nf-card.status-active { border-color:var(--accent); }
.nf-card.status-future { opacity:0.35; cursor:default; }
.nf-card.status-past:not(:has(.nf-stat)) { opacity:0.5; }
.nf-icon { font-size:22px; }
.nf-label { font-size:9px; font-family:var(--font-mono); color:var(--text3); line-height:1.3; }
.nf-badge { font-size:8px; font-family:var(--font-mono); padding:1px 5px; border-radius:3px; }
.nf-badge.active  { color:var(--accent); border:1px solid var(--accent); }
.nf-badge.future  { color:var(--text3); border:1px solid var(--border); }
.nf-badge.missed  { color:var(--text3); }
.nf-stat { font-size:8px; color:var(--text3); font-family:var(--font-mono); line-height:1.3; }
.nf-pr-dot { position:absolute; top:3px; right:5px; font-size:9px; color:var(--gold-color); }

/* ── Overlay detail panel ─────────────────────────────────────────────── */
.overlay-detail {
  padding:16px; border-top:1px solid var(--border); overflow-y:auto;
  flex:1; display:flex; flex-direction:column; gap:10px;
}
.od-header { display:flex; align-items:flex-start; gap:12px; }
.od-icon { font-size:28px; flex-shrink:0; }
.od-title { font-size:14px; font-weight:600; color:var(--text); }
:global([data-theme="hacker"]) .od-title { font-family:var(--font-mono); color:var(--accent); font-size:12px; }
.od-desc { font-size:11px; color:var(--text3); font-family:var(--font-mono); }
.od-status { font-size:9px; font-family:var(--font-mono); padding:2px 7px; border-radius:var(--radius); border:1px solid; margin-left:auto; flex-shrink:0; }
.od-status.status-active { color:var(--accent); border-color:var(--accent); }
.od-status.status-past   { color:var(--text3); border-color:var(--border); }
.od-status.status-future { color:var(--text3); border-color:var(--border); }
.od-stats { display:grid; grid-template-columns:1fr 1fr; gap:5px; }
.od-stat { display:flex; justify-content:space-between; font-size:11px; color:var(--text2); background:var(--bg3); padding:5px 9px; border-radius:var(--radius); }
:global([data-theme="hacker"]) .od-stat { font-family:var(--font-mono); font-size:10px; }
.od-prs { display:flex; flex-direction:column; gap:3px; }
.od-prs-title { font-size:9px; font-family:var(--font-mono); color:var(--gold-color); letter-spacing:.8px; text-transform:uppercase; margin-bottom:2px; }
.od-pr { font-size:11px; color:var(--text2); font-family:var(--font-mono); }
.od-empty { font-size:11px; color:var(--text3); font-family:var(--font-mono); padding:10px 0; }

/* ── Shared utils ──────────────────────────────────────────────────────── */
.accent { color:var(--accent); font-family:var(--font-mono); font-weight:600; }
.gold   { color:var(--gold-color); font-family:var(--font-mono); font-weight:600; }
</style>