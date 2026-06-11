<script>
  import { appState, notify, setTab } from '$lib/stores/appState.svelte.js';
  import { onDestroy } from 'svelte';

  // ── Theme helpers ──────────────────────────────────────────────────────
  let theme    = $derived(appState.theme);
  let isCottage = $derived(theme === 'cottage');
  let isHacker  = $derived(theme === 'hacker');
  let isRetro   = $derived(theme === 'retro');

  // ── Mode ───────────────────────────────────────────────────────────────
  let mode = $state('timer'); // 'timer' | 'stopwatch'

  // ── Timer state ────────────────────────────────────────────────────────
  let timerHours   = $state(0);
  let timerMinutes = $state(25);
  let timerSeconds = $state(0);

  let totalTimerMs  = $derived((timerHours * 3600 + timerMinutes * 60 + timerSeconds) * 1000);
  let remainingMs   = $state(0);
  let timerRunning  = $state(false);
  let timerFinished = $state(false);
  let timerInterval = null;

  // ── Stopwatch state ────────────────────────────────────────────────────
  let swElapsed   = $state(0);   // ms
  let swRunning   = $state(false);
  let swInterval  = null;

  // ── Time stats (session + persistent total) ────────────────────────────
  let sessionMs = $state(0);     // total ms worked this session
  let totalMs   = $state(() => {
    if (typeof localStorage === 'undefined') return 0;
    return parseInt(localStorage.getItem('hw-total-time') || '0');
  });

  function addToTotal(ms) {
    totalMs += ms;
    sessionMs += ms;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('hw-total-time', String(totalMs));
    }
    // Also update appState player stats if it exists
    if (appState?.player) {
      appState.player.totalWorkMs = (appState.player.totalWorkMs || 0) + ms;
    }
  }

  // ── Audio ──────────────────────────────────────────────────────────────
  let audioCtx      = null;
  let customAudioUrl = $state(null);
  let customAudioName = $state('');
  let audioFileInput = $state(null);

  function playAlarm() {
    if (customAudioUrl) {
      const audio = new Audio(customAudioUrl);
      audio.play().catch(() => {});
      return;
    }
    // Default: synthesised alarm via Web Audio API
    try {
      audioCtx = audioCtx || new AudioContext();
      const ctx = audioCtx;
      const notes = [880, 1100, 880, 1100, 880];
      notes.forEach((freq, i) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = isHacker ? 'square' : isRetro ? 'square' : 'sine';
        const t = ctx.currentTime + i * 0.35;
        gain.gain.setValueAtTime(0.4, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        osc.start(t); osc.stop(t + 0.3);
      });
    } catch(e) {}
  }

  function onAudioUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    customAudioUrl  = URL.createObjectURL(file);
    customAudioName = file.name;
  }

  // ── Timer controls ─────────────────────────────────────────────────────
  function startTimer() {
    if (totalTimerMs === 0) return;
    if (remainingMs === 0) remainingMs = totalTimerMs;
    timerRunning  = true;
    timerFinished = false;
    const end = Date.now() + remainingMs;
    timerInterval = setInterval(() => {
      remainingMs = Math.max(0, end - Date.now());
      if (remainingMs === 0) {
        stopTimer(true);
        timerFinished = true;
        playAlarm();
        addToTotal(totalTimerMs);
        notify(isHacker ? '> TIMER COMPLETE' : isRetro ? '⏰ TIME UP!' : '🌿 Timer complete!', 'success');
      }
    }, 100);
  }

  function pauseTimer() {
    timerRunning = false;
    clearInterval(timerInterval);
  }

  function stopTimer(silent = false) {
    timerRunning = false;
    clearInterval(timerInterval);
    if (!silent && remainingMs > 0 && remainingMs < totalTimerMs) {
      const worked = totalTimerMs - remainingMs;
      addToTotal(worked);
    }
    remainingMs = 0;
  }

  function resetTimer() {
    stopTimer(true);
    timerFinished = false;
    remainingMs   = 0;
  }

  // ── Stopwatch controls ─────────────────────────────────────────────────
  function startSW() {
    swRunning = true;
    const start = Date.now() - swElapsed;
    swInterval = setInterval(() => { swElapsed = Date.now() - start; }, 100);
  }

  function pauseSW() {
    swRunning = false;
    clearInterval(swInterval);
  }

  function stopSW() {
    swRunning = false;
    clearInterval(swInterval);
    if (swElapsed > 0) {
      addToTotal(swElapsed);
      notify(
        isHacker ? `> STOPWATCH: +${fmtMs(swElapsed)} logged`
        : isRetro ? `LOGGED: ${fmtMs(swElapsed)}`
        : `🌿 ${fmtMs(swElapsed)} logged to your total`,
        'success'
      );
    }
    swElapsed = 0;
  }

  // ── Format helpers ─────────────────────────────────────────────────────
  function fmtMs(ms) {
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${pad(h)}:${pad(m)}:${pad(sec)}`;
    return `${pad(m)}:${pad(sec)}`;
  }

  function fmtMsLong(ms) {
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m ${s % 60}s`;
  }

  function pad(n) { return String(n).padStart(2, '0'); }

  // Display time for timer
  let displayMs   = $derived(mode === 'timer' ? (remainingMs > 0 ? remainingMs : totalTimerMs) : swElapsed);
  let displayTime = $derived(fmtMs(displayMs));

  // Timer progress 0–1
  let timerProgress = $derived(
    mode === 'timer' && totalTimerMs > 0
      ? 1 - (remainingMs / totalTimerMs)
      : 0
  );

  // ── Bomb fuse (hacker) ─────────────────────────────────────────────────
  // Retro score counter for display
  let retroScore = $derived(Math.floor(swElapsed / 1000) * 10);

  onDestroy(() => {
    clearInterval(timerInterval);
    clearInterval(swInterval);
  });

  // ── Floating particles ─────────────────────────────────────────────────
  // Generated once, CSS-animated
  const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    x:    Math.random() * 100,
    y:    Math.random() * 100,
    size: 4 + Math.random() * 14,
    dur:  4 + Math.random() * 8,
    delay: Math.random() * 6,
  }));
</script>

<div class="focus-shell theme-{theme}">

  <!-- Floating background particles -->
  <div class="particles" aria-hidden="true">
    {#each PARTICLES as p (p.id)}
      <div class="particle"
        style="
          left:{p.x}%;
          top:{p.y}%;
          width:{p.size}px;
          height:{p.size}px;
          animation-duration:{p.dur}s;
          animation-delay:-{p.delay}s;
        "
      ></div>
    {/each}
  </div>

  <!-- Back to app button -->
  <button class="back-btn" onclick={() => setTab('tasks')}>
    {#if isCottage}← Back to garden
    {:else if isHacker}// EXIT_FOCUS
    {:else}◄ EXIT FOCUS
    {/if}
  </button>

  <!-- Main focus card -->
  <div class="focus-card" class:alarm={timerFinished}>

    <!-- ── COTTAGE: alarm clock in a meadow ── -->
    {#if isCottage}
      <div class="clock-deco">
        <div class="clock-top">🌿</div>
        <div class="clock-bells">🔔</div>
      </div>
      <div class="focus-title">Focus Time</div>

    <!-- ── HACKER: ticking bomb ── -->
    {:else if isHacker}
      <div class="bomb-deco">
        <svg width="60" height="70" viewBox="0 0 60 70" class:ticking={timerRunning || swRunning}>
          <!-- Bomb body -->
          <circle cx="30" cy="44" r="22" fill="#1a1a1a" stroke="#00ff41" stroke-width="1.5"/>
          <!-- Fuse wire -->
          <path d="M30,22 Q42,10 38,4" fill="none" stroke="#ff8800" stroke-width="2.5"
            stroke-linecap="round"/>
          <!-- Spark at tip -->
          {#if timerRunning || swRunning}
            <circle cx="38" cy="4" r="4" fill="#ffee00" class="spark"/>
          {:else}
            <circle cx="38" cy="4" r="3" fill="#555"/>
          {/if}
          <!-- Progress fuse burn -->
          {#if mode === 'timer' && totalTimerMs > 0}
            <circle cx="30" cy="44" r="18" fill="none" stroke="#ff4400"
              stroke-width="3" stroke-dasharray="{113 * timerProgress} 113"
              stroke-dashoffset="28" transform="rotate(-90 30 44)" opacity="0.6"/>
          {/if}
          <!-- Skull -->
          <text x="30" y="50" text-anchor="middle" font-size="20" fill="#00ff41">💀</text>
        </svg>
      </div>
      <div class="focus-title">
        {#if timerFinished}💥 DETONATED{:else if timerRunning}ARMED · COUNTING DOWN{:else}NULL ISLAND BOMB TIMER{/if}
      </div>

    <!-- ── RETRO: pac-man score screen ── -->
    {:else}
      <div class="retro-deco">
        <div class="retro-header-row">
          <span class="retro-label">HIGH SCORE</span>
          <span class="retro-score">{String(retroScore).padStart(8,'0')}</span>
        </div>
        <div class="retro-pac-row">
          <span class="retro-pac" class:running={swRunning || timerRunning}>●</span>
          <span class="retro-dots">
            {#each Array(8) as _, i}
              <span class="retro-pellet" class:eaten={i < Math.floor((swElapsed/1000) % 8)}></span>
            {/each}
          </span>
          <span class="retro-ghost">👻</span>
        </div>
        <div class="retro-label">
          {#if timerFinished}GAME OVER
          {:else if timerRunning || swRunning}ROUND 1 · PLAYING
          {:else}PRESS START
          {/if}
        </div>
      </div>
    {/if}

    <!-- ── MODE SWITCH ── -->
    <div class="mode-switch">
      <button class="mode-btn" class:active={mode==='timer'}   onclick={() => { mode='timer'; resetTimer(); }}>
        {isCottage ? '⏰ Timer' : isHacker ? 'TIMER' : 'TIMER'}
      </button>
      <button class="mode-btn" class:active={mode==='stopwatch'} onclick={() => { mode='stopwatch'; stopSW(); }}>
        {isCottage ? '⏱ Stopwatch' : isHacker ? 'STOPWATCH' : 'STOP·WATCH'}
      </button>
    </div>

    <!-- ── BIG TIME DISPLAY ── -->
    <div class="time-display" class:pulse={timerRunning || swRunning} class:alarm={timerFinished}>
      {#if isHacker}
        <span class="time-prefix">T−</span>
      {/if}
      {displayTime}
      {#if isRetro && mode === 'stopwatch'}
        <div class="retro-centisec">.{String(Math.floor((swElapsed % 1000)/10)).padStart(2,'0')}</div>
      {/if}
    </div>

    <!-- ── TIMER SETUP (only when timer mode and not running) ── -->
    {#if mode === 'timer' && !timerRunning && remainingMs === 0}
      <div class="time-setter">
        {#if isCottage}
          <div class="setter-label">Set your focus time</div>
        {:else if isHacker}
          <div class="setter-label">// SET DETONATION TIMER</div>
        {:else}
          <div class="setter-label">SET TIME</div>
        {/if}
        <div class="setter-inputs">
          <div class="setter-unit">
            <button class="setter-arrow" onclick={() => timerHours = Math.min(23, timerHours+1)}>▲</button>
            <input class="setter-num" type="number" min="0" max="23" bind:value={timerHours}/>
            <button class="setter-arrow" onclick={() => timerHours = Math.max(0, timerHours-1)}>▼</button>
            <span class="setter-lbl">{isCottage ? 'hrs' : 'H'}</span>
          </div>
          <span class="setter-colon">:</span>
          <div class="setter-unit">
            <button class="setter-arrow" onclick={() => timerMinutes = Math.min(59, timerMinutes+1)}>▲</button>
            <input class="setter-num" type="number" min="0" max="59" bind:value={timerMinutes}/>
            <button class="setter-arrow" onclick={() => timerMinutes = Math.max(0, timerMinutes-1)}>▼</button>
            <span class="setter-lbl">{isCottage ? 'min' : 'M'}</span>
          </div>
          <span class="setter-colon">:</span>
          <div class="setter-unit">
            <button class="setter-arrow" onclick={() => timerSeconds = Math.min(59, timerSeconds+1)}>▲</button>
            <input class="setter-num" type="number" min="0" max="59" bind:value={timerSeconds}/>
            <button class="setter-arrow" onclick={() => timerSeconds = Math.max(0, timerSeconds-1)}>▼</button>
            <span class="setter-lbl">{isCottage ? 'sec' : 'S'}</span>
          </div>
        </div>
      </div>
    {/if}

    <!-- ── CONTROLS ── -->
    <div class="controls">
      {#if mode === 'timer'}
        {#if !timerRunning && remainingMs === 0 && !timerFinished}
          <button class="ctrl-btn primary" onclick={startTimer} disabled={totalTimerMs === 0}>
            {isCottage ? '▶ Start' : isHacker ? 'ARM' : 'START'}
          </button>
        {:else if timerRunning}
          <button class="ctrl-btn" onclick={pauseTimer}>
            {isCottage ? '⏸ Pause' : isHacker ? 'PAUSE' : 'PAUSE'}
          </button>
          <button class="ctrl-btn danger" onclick={() => stopTimer()}>
            {isCottage ? '⏹ Stop' : isHacker ? 'DEFUSE' : 'STOP'}
          </button>
        {:else if remainingMs > 0}
          <button class="ctrl-btn primary" onclick={startTimer}>
            {isCottage ? '▶ Resume' : isHacker ? 'RESUME' : 'RESUME'}
          </button>
          <button class="ctrl-btn danger" onclick={resetTimer}>
            {isCottage ? '↺ Reset' : isHacker ? 'ABORT' : 'RESET'}
          </button>
        {:else if timerFinished}
          <button class="ctrl-btn primary" onclick={resetTimer}>
            {isCottage ? '↺ New timer' : isHacker ? 'RESET' : 'NEW GAME'}
          </button>
        {/if}
      {:else}
        <!-- Stopwatch -->
        {#if !swRunning && swElapsed === 0}
          <button class="ctrl-btn primary" onclick={startSW}>
            {isCottage ? '▶ Start' : isHacker ? 'START' : 'START'}
          </button>
        {:else if swRunning}
          <button class="ctrl-btn" onclick={pauseSW}>
            {isCottage ? '⏸ Pause' : isHacker ? 'PAUSE' : 'PAUSE'}
          </button>
          <button class="ctrl-btn danger" onclick={stopSW}>
            {isCottage ? '✓ Done & Log' : isHacker ? 'LOG+STOP' : 'LOG TIME'}
          </button>
        {:else}
          <button class="ctrl-btn primary" onclick={startSW}>
            {isCottage ? '▶ Resume' : isHacker ? 'RESUME' : 'RESUME'}
          </button>
          <button class="ctrl-btn danger" onclick={stopSW}>
            {isCottage ? '✓ Log & Reset' : isHacker ? 'LOG+RESET' : 'LOG+RESET'}
          </button>
        {/if}
      {/if}
    </div>

    <!-- ── AUDIO UPLOAD ── -->
    <div class="audio-section">
      <button class="audio-btn" onclick={() => audioFileInput?.click()}>
        {isCottage ? '🎵 Custom alarm sound' : isHacker ? '// UPLOAD_ALARM.wav' : '🔊 ALARM SOUND'}
      </button>
      <input bind:this={audioFileInput} type="file" accept="audio/*"
        style="display:none" onchange={onAudioUpload}/>
      {#if customAudioName}
        <span class="audio-name">{customAudioName}</span>
      {:else}
        <span class="audio-name">
          {isCottage ? 'Default: soft chime' : isHacker ? '// default: beep sequence' : 'DEFAULT BEEP'}
        </span>
      {/if}
    </div>

    <!-- ── SESSION STATS ── -->
    <div class="stats-row">
      <div class="stat-item">
        <div class="stat-val">{fmtMsLong(sessionMs)}</div>
        <div class="stat-lbl">{isCottage ? 'This session' : isHacker ? 'SESSION' : 'SESSION'}</div>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <div class="stat-val">{fmtMsLong(totalMs)}</div>
        <div class="stat-lbl">{isCottage ? 'Total logged' : isHacker ? 'TOTAL_TIME' : 'ALL TIME'}</div>
      </div>
    </div>

  </div>
</div>

<style>
/* ── Shell & backgrounds ── */
.focus-shell {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  z-index: 500;
  font-family: var(--font-ui, 'Lora', serif);
  transition: background 0.3s;
}

/* Theme backgrounds */
.theme-cottage { background: #e8f0d8; }
.theme-hacker  { background: #080c08; }
.theme-retro   { background: #120018; }

/* ── Particles ── */
.particles { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }

.particle {
  position: absolute;
  border-radius: 50%;
  animation: floatUp linear infinite;
  opacity: 0;
}

/* Cottage: soft pastel circles */
.theme-cottage .particle {
  background: radial-gradient(circle, #a8d8a8 0%, #c8e8c844 100%);
  border-radius: 50%;
  filter: blur(2px);
}
/* Hacker: tiny green squares */
.theme-hacker .particle {
  background: #00ff4122;
  border-radius: 0;
  border: 1px solid #00ff4144;
  filter: none;
}
/* Retro: coloured pixel dots */
.theme-retro .particle {
  border-radius: 0;
  animation-name: floatSide;
}
.theme-retro .particle:nth-child(3n)   { background: #ff004d44; }
.theme-retro .particle:nth-child(3n+1) { background: #ffee0033; }
.theme-retro .particle:nth-child(3n+2) { background: #00ccff33; }

@keyframes floatUp {
  0%   { transform: translateY(0)  scale(0.6); opacity: 0; }
  15%  { opacity: 0.7; }
  85%  { opacity: 0.4; }
  100% { transform: translateY(-120px) scale(1.1); opacity: 0; }
}
@keyframes floatSide {
  0%   { transform: translate(0, 0) rotate(0deg); opacity: 0; }
  20%  { opacity: 0.8; }
  80%  { opacity: 0.4; }
  100% { transform: translate(40px, -80px) rotate(90deg); opacity: 0; }
}

/* ── Back button ── */
.back-btn {
  position: absolute;
  top: 20px; left: 20px;
  padding: 6px 14px;
  font-size: 12px;
  border-radius: 20px;
  border: 1px solid;
  cursor: pointer;
  transition: all 0.15s;
  z-index: 10;
  font-family: inherit;
}
.theme-cottage .back-btn { background: #ffffffaa; border-color: #b8d8a8; color: #5a7a4a; }
.theme-cottage .back-btn:hover { background: #fff; }
.theme-hacker  .back-btn { background: transparent; border-color: #00ff4155; color: #00ff41; font-family: 'Share Tech Mono', monospace; font-size: 11px; border-radius: 2px; }
.theme-hacker  .back-btn:hover { background: #00ff4114; }
.theme-retro   .back-btn { background: transparent; border-color: #ffee0055; color: #ffee00; font-family: 'Share Tech Mono', monospace; font-size: 11px; border-radius: 0; letter-spacing: 1px; }
.theme-retro   .back-btn:hover { background: #ffee0012; }

/* ── Focus card ── */
.focus-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 36px 44px;
  border-radius: 20px;
  min-width: 360px;
  max-width: 480px;
  transition: all 0.3s;
}

.theme-cottage .focus-card {
  background: #ffffffcc;
  border: 1px solid #c8d8b8;
  box-shadow: 0 8px 40px rgba(100,140,80,0.15), 0 2px 8px rgba(100,140,80,0.1);
  backdrop-filter: blur(8px);
}
.theme-hacker .focus-card {
  background: #0a0f0a;
  border: 1px solid #00ff4133;
  box-shadow: 0 0 40px #00ff4114, 0 0 80px #00ff410a;
  border-radius: 4px;
}
.theme-retro .focus-card {
  background: #1a0028;
  border: 1px solid #3300aa;
  box-shadow: 0 0 30px #3300aa44, 0 0 60px #3300aa22;
  border-radius: 0;
}

.focus-card.alarm { animation: alarmPulse 0.5s ease-in-out infinite alternate; }
@keyframes alarmPulse {
  from { box-shadow: 0 0 20px #ff4400; }
  to   { box-shadow: 0 0 60px #ff4400, 0 0 100px #ff440055; }
}

/* ── Decorations ── */
.clock-deco { text-align: center; }
.clock-top  { font-size: 28px; animation: sway 3s ease-in-out infinite; }
.clock-bells { font-size: 22px; }
@keyframes sway { 0%,100%{transform:rotate(-5deg)} 50%{transform:rotate(5deg)} }

.focus-title {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 1px;
  text-align: center;
}
.theme-cottage .focus-title { color: #7a9e5e; font-family: 'Lora', serif; }
.theme-hacker  .focus-title { color: #00ff41; font-family: 'Share Tech Mono', monospace; font-size: 11px; }
.theme-retro   .focus-title { color: #ff4400; font-family: 'Share Tech Mono', monospace; letter-spacing: 2px; font-size: 11px; }

.bomb-deco { display: flex; justify-content: center; }
.bomb-deco svg.ticking { animation: bombtick 0.5s steps(1) infinite; }
@keyframes bombtick { 0%{filter:drop-shadow(0 0 4px #00ff41)} 50%{filter:drop-shadow(0 0 12px #00ff41)} }
.spark { animation: sparkle 0.3s ease-in-out infinite alternate; }
@keyframes sparkle { from{opacity:1;r:4} to{opacity:0.4;r:6} }

/* Retro deco */
.retro-deco { width: 100%; display: flex; flex-direction: column; gap: 6px; }
.retro-header-row { display: flex; justify-content: space-between; align-items: center; font-family: 'Share Tech Mono', monospace; }
.retro-label { font-size: 10px; color: #5500cc; letter-spacing: 2px; }
.retro-score { font-size: 18px; color: #ffee00; letter-spacing: 3px; text-shadow: 0 0 8px #ffee0066; }
.retro-pac-row { display: flex; align-items: center; gap: 8px; justify-content: center; padding: 6px 0; }
.retro-pac { font-size: 22px; color: #ffee00; text-shadow: 0 0 10px #ffee00; }
.retro-pac.running { animation: retroChomp 0.3s ease-in-out infinite alternate; }
@keyframes retroChomp {
  from { clip-path: polygon(0% 0%, 100% 25%, 100% 75%, 0% 100%); }
  to   { clip-path: polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%); }
}
.retro-dots { display: flex; gap: 5px; }
.retro-pellet { width: 10px; height: 10px; border-radius: 50%; background: #ffee00; box-shadow: 0 0 4px #ffee00; transition: all 0.15s; }
.retro-pellet.eaten { background: transparent; border: 1.5px solid #3300aa; box-shadow: none; }
.retro-ghost { font-size: 20px; animation: ghostBob 1.2s ease-in-out infinite alternate; }
@keyframes ghostBob { from{transform:translateY(0)} to{transform:translateY(-4px)} }

/* ── Mode switch ── */
.mode-switch { display: flex; gap: 4px; background: rgba(0,0,0,0.06); border-radius: 30px; padding: 3px; }
.theme-hacker .mode-switch  { background: #0d150d; border-radius: 2px; border: 1px solid #1a3a1a; }
.theme-retro  .mode-switch  { background: #0a0010; border-radius: 0; border: 1px solid #3300aa; }

.mode-btn {
  padding: 6px 16px;
  font-size: 12px;
  border-radius: 24px;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}
.theme-cottage .mode-btn { background: transparent; color: #7a9e5e; }
.theme-cottage .mode-btn.active { background: #fff; color: #5a7a4a; box-shadow: 0 1px 4px rgba(0,0,0,0.1); }
.theme-hacker  .mode-btn { background: transparent; color: #276627; font-family: 'Share Tech Mono', monospace; font-size: 10px; letter-spacing: 1px; border-radius: 2px; }
.theme-hacker  .mode-btn.active { background: #00ff4120; color: #00ff41; }
.theme-retro   .mode-btn { background: transparent; color: #3300aa; font-family: 'Share Tech Mono', monospace; font-size: 10px; letter-spacing: 1px; border-radius: 0; }
.theme-retro   .mode-btn.active { background: #ffee0015; color: #ffee00; }

/* ── Big time display ── */
.time-display {
  font-size: 72px;
  font-weight: 700;
  letter-spacing: 4px;
  line-height: 1;
  text-align: center;
  transition: color 0.3s;
  position: relative;
}
.theme-cottage .time-display { color: #3d5a2e; font-family: 'Lora', serif; }
.theme-hacker  .time-display { color: #00ff41; font-family: 'Share Tech Mono', monospace; text-shadow: 0 0 20px #00ff4166; font-size: 64px; }
.theme-retro   .time-display { color: #ffee00; font-family: 'Share Tech Mono', monospace; text-shadow: 0 0 16px #ffee0066; font-size: 64px; letter-spacing: 6px; }

.time-display.alarm { color: #ff4400 !important; animation: alarmFlash 0.5s infinite; }
@keyframes alarmFlash { 0%,100%{opacity:1} 50%{opacity:0.5} }

.time-display.pulse { animation: timePulse 1s ease-in-out infinite; }
@keyframes timePulse { 0%,100%{opacity:1} 50%{opacity:0.85} }

.time-prefix { font-size: 28px; color: #00ff4188; vertical-align: super; margin-right: 4px; }
.retro-centisec { font-size: 24px; color: #ffee0088; text-align: center; margin-top: -8px; }

/* ── Timer setter ── */
.time-setter { display: flex; flex-direction: column; align-items: center; gap: 10px; }
.setter-label { font-size: 11px; letter-spacing: 0.5px; }
.theme-cottage .setter-label { color: #9ab888; }
.theme-hacker  .setter-label { color: #276627; font-family: 'Share Tech Mono', monospace; font-size: 10px; }
.theme-retro   .setter-label { color: #5500cc; font-family: 'Share Tech Mono', monospace; font-size: 10px; letter-spacing: 2px; }
.setter-inputs { display: flex; align-items: center; gap: 4px; }
.setter-colon  { font-size: 28px; font-weight: 700; padding: 0 2px; }
.theme-cottage .setter-colon { color: #9ab888; }
.theme-hacker  .setter-colon { color: #00ff4155; font-family: 'Share Tech Mono', monospace; }
.theme-retro   .setter-colon { color: #3300aa; font-family: 'Share Tech Mono', monospace; }
.setter-unit   { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.setter-arrow  { background: none; border: none; cursor: pointer; font-size: 12px; line-height: 1; padding: 2px 6px; border-radius: 4px; transition: background 0.1s; }
.theme-cottage .setter-arrow { color: #9ab888; } .theme-cottage .setter-arrow:hover { background: #e0f0d0; }
.theme-hacker  .setter-arrow { color: #00ff41; } .theme-hacker  .setter-arrow:hover { background: #00ff4118; }
.theme-retro   .setter-arrow { color: #ffee00; } .theme-retro   .setter-arrow:hover { background: #ffee0018; }
.setter-num {
  width: 54px; text-align: center; font-size: 28px; font-weight: 700;
  border: none; background: transparent; outline: none;
  -moz-appearance: textfield;
}
.setter-num::-webkit-inner-spin-button,
.setter-num::-webkit-outer-spin-button { -webkit-appearance: none; }
.theme-cottage .setter-num { color: #3d5a2e; font-family: 'Lora', serif; }
.theme-hacker  .setter-num { color: #00ff41; font-family: 'Share Tech Mono', monospace; }
.theme-retro   .setter-num { color: #ffee00; font-family: 'Share Tech Mono', monospace; }
.setter-lbl { font-size: 9px; letter-spacing: 1px; }
.theme-cottage .setter-lbl { color: #9ab888; }
.theme-hacker  .setter-lbl { color: #276627; font-family: 'Share Tech Mono', monospace; }
.theme-retro   .setter-lbl { color: #3300aa; font-family: 'Share Tech Mono', monospace; }

/* ── Controls ── */
.controls { display: flex; gap: 10px; }
.ctrl-btn {
  padding: 10px 24px;
  font-size: 14px;
  font-family: inherit;
  border-radius: 30px;
  border: 1px solid;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.15s;
  letter-spacing: 0.5px;
}
.ctrl-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.theme-cottage .ctrl-btn        { background: #f0f8e8; border-color: #b8d8a8; color: #5a7a4a; }
.theme-cottage .ctrl-btn:hover  { background: #e0f0d0; }
.theme-cottage .ctrl-btn.primary{ background: #7a9e5e; border-color: #7a9e5e; color: #fff; }
.theme-cottage .ctrl-btn.primary:hover { background: #5a7e3e; }
.theme-cottage .ctrl-btn.danger { background: #fee8e8; border-color: #f0a0a0; color: #c05050; }

.theme-hacker .ctrl-btn        { background: transparent; border-color: #1a4a1a; color: #4aaa4a; font-family: 'Share Tech Mono', monospace; font-size: 11px; border-radius: 2px; letter-spacing: 1.5px; }
.theme-hacker .ctrl-btn:hover  { background: #00ff4110; }
.theme-hacker .ctrl-btn.primary{ background: #00ff4120; border-color: #00ff41; color: #00ff41; box-shadow: 0 0 10px #00ff4133; }
.theme-hacker .ctrl-btn.danger { border-color: #ff440055; color: #ff4400; }
.theme-hacker .ctrl-btn.danger:hover { background: #ff440018; }

.theme-retro .ctrl-btn        { background: transparent; border-color: #3300aa; color: #5500cc; font-family: 'Share Tech Mono', monospace; font-size: 11px; border-radius: 0; letter-spacing: 2px; }
.theme-retro .ctrl-btn:hover  { border-color: #ffee00; color: #ffee00; }
.theme-retro .ctrl-btn.primary{ background: #ffee00; border-color: #ffee00; color: #0a0010; box-shadow: 0 0 12px #ffee0055; }
.theme-retro .ctrl-btn.primary:hover { background: #fff; box-shadow: 0 0 20px #ffee00; }
.theme-retro .ctrl-btn.danger { border-color: #ff004d55; color: #ff004d; }
.theme-retro .ctrl-btn.danger:hover { background: #ff004d18; }

/* ── Audio ── */
.audio-section { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.audio-btn {
  font-size: 11px; background: transparent; border: 1px dashed;
  border-radius: 20px; padding: 4px 12px; cursor: pointer; font-family: inherit; transition: all 0.15s;
}
.theme-cottage .audio-btn { border-color: #b8d8a8; color: #9ab888; }
.theme-cottage .audio-btn:hover { border-color: #7a9e5e; color: #5a7a4a; }
.theme-hacker  .audio-btn { border-color: #1a4a1a; color: #276627; font-family: 'Share Tech Mono', monospace; border-radius: 2px; font-size: 10px; }
.theme-hacker  .audio-btn:hover { border-color: #00ff41; color: #00ff41; }
.theme-retro   .audio-btn { border-color: #3300aa; color: #5500cc; font-family: 'Share Tech Mono', monospace; border-radius: 0; font-size: 10px; letter-spacing: 1px; }
.theme-retro   .audio-btn:hover { border-color: #ffee00; color: #ffee00; }
.audio-name { font-size: 10px; opacity: 0.6; font-family: 'Share Tech Mono', monospace; }
.theme-cottage .audio-name { color: #9ab888; }
.theme-hacker  .audio-name { color: #276627; }
.theme-retro   .audio-name { color: #3300aa; }

/* ── Stats ── */
.stats-row {
  display: flex;
  gap: 24px;
  align-items: center;
  padding-top: 8px;
  border-top: 1px solid;
  width: 100%;
  justify-content: center;
}
.theme-cottage .stats-row { border-color: #d8e8c8; }
.theme-hacker  .stats-row { border-color: #1a3a1a; }
.theme-retro   .stats-row { border-color: #3300aa; }

.stat-item { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.stat-val {
  font-size: 18px; font-weight: 700;
}
.theme-cottage .stat-val { color: #3d5a2e; font-family: 'Lora', serif; }
.theme-hacker  .stat-val { color: #00ff41; font-family: 'Share Tech Mono', monospace; font-size: 15px; }
.theme-retro   .stat-val { color: #ffee00; font-family: 'Share Tech Mono', monospace; font-size: 15px; text-shadow: 0 0 6px #ffee0066; }

.stat-lbl {
  font-size: 9px; letter-spacing: 0.8px; text-transform: uppercase;
}
.theme-cottage .stat-lbl { color: #9ab888; }
.theme-hacker  .stat-lbl { color: #276627; font-family: 'Share Tech Mono', monospace; }
.theme-retro   .stat-lbl { color: #5500cc; font-family: 'Share Tech Mono', monospace; letter-spacing: 1.5px; }

.stat-divider { width: 1px; height: 32px; }
.theme-cottage .stat-divider { background: #d8e8c8; }
.theme-hacker  .stat-divider { background: #1a3a1a; }
.theme-retro   .stat-divider { background: #3300aa; }
</style>
