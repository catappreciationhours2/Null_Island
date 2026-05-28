<script>
  import { appState } from '$lib/stores/appState.svelte.js';

  let isHacker = $derived(appState.theme === 'hacker');
  let selected = $state(null);
</script>

<div class="awards-view">

  <div class="view-header">
    <div class="view-title">{isHacker ? 'AWARDS_DB.exe' : 'Awards & Achievements'}</div>
    <div class="view-sub">
      {isHacker
        ? `${appState.awards.length} awards acquired · ${appState.monthlyAwards.length} limited drops`
        : `${appState.awards.length} awards earned · special awards unlock hidden chains`}
    </div>
  </div>

  <!-- Awards grid -->
  <div class="section-label">{isHacker ? '-- ACQUIRED --' : 'Earned Awards'}</div>
  <div class="awards-grid">
    {#each appState.awards as award (award.id)}
      <button
        class="award-chip type-{award.type}"
        class:selected={selected?.id === award.id}
        onclick={() => selected = selected?.id === award.id ? null : award}
      >
        <span class="award-icon">{award.icon}</span>
        <span class="award-label">{award.label}</span>
        {#if award.type === 'special'}
          <span class="special-badge">{isHacker ? 'SPEC' : '★'}</span>
        {/if}
      </button>
    {/each}
  </div>

  <!-- Selected award detail -->
  {#if selected}
    <div class="award-detail">
      <span class="detail-icon">{selected.icon}</span>
      <div class="detail-body">
        <div class="detail-title">{selected.label}</div>
        <div class="detail-desc">{selected.desc}</div>
        {#if selected.type === 'special'}
          <div class="detail-special">
            {isHacker ? '// SPECIAL: unlocks hidden award chains' : '✦ Special award — unlocks hidden achievement chains'}
          </div>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Monthly drops -->
  <div class="section-label monthly-section">{isHacker ? '-- LIMITED_DROPS --' : 'Monthly Drops'}</div>
  <div class="monthly-note">
    {isHacker
      ? '// time-limited · once the month ends these are gone forever'
      : 'These awards exist for one month only and will never return 🌸'}
  </div>
  <div class="awards-grid">
    {#each appState.monthlyAwards as award (award.id)}
      <button
        class="award-chip type-monthly"
        class:selected={selected?.id === award.id}
        onclick={() => selected = selected?.id === award.id ? null : award}
      >
        <span class="award-icon">{award.icon}</span>
        <span class="award-label">{award.label}</span>
        <span class="locked-badge">{isHacker ? 'LOCKED' : '🔒'}</span>
      </button>
    {/each}

    <!-- Placeholder for current month -->
    <div class="award-chip type-current">
      <span class="award-icon">🌸</span>
      <span class="award-label">May: Bloom</span>
      <span class="active-badge">{isHacker ? 'ACTIVE' : 'Now'}</span>
    </div>
  </div>

  <!-- Progress towards next award -->
  <div class="section-label">{isHacker ? '-- NEXT_AWARD --' : 'Working Towards'}</div>
  <div class="progress-card">
    <div class="progress-top">
      <span class="progress-icon">⚡</span>
      <div class="progress-body">
        <div class="progress-title">{isHacker ? 'SPEED_RUNNER' : 'Speed Runner'}</div>
        <div class="progress-desc">Complete 3 tasks under the estimated time</div>
      </div>
      <span class="progress-pct accent">2/3</span>
    </div>
    <div class="progress-track">
      <div class="progress-fill" style="width: 66%"></div>
    </div>
  </div>

  <div class="progress-card">
    <div class="progress-top">
      <span class="progress-icon">📚</span>
      <div class="progress-body">
        <div class="progress-title">{isHacker ? 'LORE_MASTER' : 'Lore Master'}</div>
        <div class="progress-desc">Complete 5 daily learning quests</div>
      </div>
      <span class="progress-pct gold">1/5</span>
    </div>
    <div class="progress-track">
      <div class="progress-fill learning" style="width: 20%"></div>
    </div>
  </div>

  <!-- Special unlocked content note -->
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
.awards-view {
  flex: 1; overflow-y: auto; padding: 16px;
  display: flex; flex-direction: column; gap: 12px;
}
.view-header { display: flex; flex-direction: column; gap: 3px; }
.view-title { font-size: 16px; font-weight: 600; color: var(--text); }
:global([data-theme="hacker"]) .view-title { font-family: var(--font-mono); color: var(--accent); font-size: 13px; letter-spacing: 1px; }
.view-sub { font-size: 11px; color: var(--text3); font-family: var(--font-mono); }

.section-label { font-size: 10px; font-family: var(--font-mono); color: var(--text3); letter-spacing: 0.8px; text-transform: uppercase; padding-bottom: 4px; border-bottom: 1px solid var(--border); }
.monthly-section { color: var(--accent3); border-color: var(--accent3); }

.monthly-note { font-size: 11px; color: var(--text3); font-family: var(--font-mono); }

.awards-grid { display: flex; flex-wrap: wrap; gap: 8px; }

.award-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  background: var(--bg3);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.15s;
  font-family: var(--font-ui);
}
.award-chip:hover { border-color: var(--border2); background: var(--bg2); }
.award-chip.selected { border-color: var(--accent); background: var(--surface); }

.award-chip.type-normal  { }
.award-chip.type-special { border-color: var(--gold-color); }
.award-chip.type-monthly { border-color: var(--accent3); opacity: 0.7; }
.award-chip.type-current { border-color: var(--accent); }

.award-icon  { font-size: 16px; }
.award-label { font-size: 12px; color: var(--text2); }
:global([data-theme="hacker"]) .award-label { font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.5px; color: var(--text); }

.special-badge { font-size: 9px; color: var(--gold-color); font-family: var(--font-mono); margin-left: 2px; }
.locked-badge  { font-size: 9px; color: var(--text3); font-family: var(--font-mono); }
.active-badge  { font-size: 9px; color: var(--accent); font-family: var(--font-mono); }

/* Detail panel */
.award-detail {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  background: var(--surface);
  border: 1px solid var(--accent);
  border-radius: var(--radius-lg);
  animation: fadeIn 0.15s ease;
}
@keyframes fadeIn { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:none} }
.detail-icon  { font-size: 28px; flex-shrink: 0; }
.detail-body  { flex: 1; }
.detail-title { font-size: 14px; font-weight: 600; color: var(--text); margin-bottom: 3px; }
:global([data-theme="hacker"]) .detail-title { font-family: var(--font-mono); color: var(--accent); font-size: 12px; }
.detail-desc  { font-size: 12px; color: var(--text2); }
:global([data-theme="hacker"]) .detail-desc { font-family: var(--font-mono); font-size: 11px; }
.detail-special { font-size: 11px; color: var(--gold-color); font-family: var(--font-mono); margin-top: 5px; }

/* Progress cards */
.progress-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 11px 13px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.progress-top { display: flex; align-items: center; gap: 10px; }
.progress-icon { font-size: 20px; flex-shrink: 0; }
.progress-body { flex: 1; }
.progress-title { font-size: 13px; font-weight: 600; color: var(--text); }
:global([data-theme="hacker"]) .progress-title { font-family: var(--font-mono); font-size: 11px; color: var(--accent); letter-spacing: 0.5px; }
.progress-desc { font-size: 11px; color: var(--text3); font-family: var(--font-mono); }
.progress-pct { font-family: var(--font-mono); font-size: 13px; font-weight: 700; flex-shrink: 0; }
.progress-pct.accent { color: var(--accent); }
.progress-pct.gold   { color: var(--gold-color); }

.progress-track { height: 5px; background: var(--bg3); border-radius: 3px; border: 1px solid var(--border); overflow: hidden; }
.progress-fill { height: 100%; background: var(--xp-color); border-radius: 3px; transition: width 0.5s ease; }
.progress-fill.learning { background: var(--accent3); }

/* Unlock note */
.unlock-note {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px;
  background: var(--bg3);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  font-size: 11px;
  color: var(--text3);
  font-family: var(--font-mono);
  line-height: 1.5;
}
.unlock-icon { flex-shrink: 0; }
</style>
