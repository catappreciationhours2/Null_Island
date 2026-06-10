<script>
  import { appState } from '$lib/stores/appState.svelte.js';
  import { onMount } from 'svelte';

  let theme    = $derived(appState.theme);
  let isHacker = $derived(theme === 'hacker');
  let isRetro  = $derived(theme === 'retro');
  let p        = $derived(appState.player);

  let xpInLevel = $derived(p.xp % 500);
  let xpPct     = $derived((xpInLevel / 500) * 100);

  let classTitle = $derived(() => {
    const lvl = p.level || 1;
    const titles = {
      cottage: ['Seedling','Apprentice Maker','Journeyman','Artisan','Craftmaster','Elder Weaver'],
      hacker:  ['INIT_USER','APPRENTICE_DEV','JOURNEYMAN','SENIOR_PROC','ARCH_MASTER','ROOT_ACCESS'],
      retro:   ['1-UP','LEVEL 2','POWER-UP','BOSS STAGE','HIGH SCORE','INSERT COIN'],
    };
    // @ts-ignore
    const arr = titles[theme] || titles.cottage;
    return arr[Math.min(lvl - 1, arr.length - 1)];
  });

  // @ts-ignore
  let todayDone = $derived(appState.tasks.filter(t => t.doneChunks >= t.chunks).length);
  // @ts-ignore
  let toCollect = $derived(appState.tasks.filter(t => t.doneChunks >= t.chunks && !t.collected).length);

  // Sprite
  // @ts-ignore
  let canvas;
  // @ts-ignore
  function drawSprite(el, thm) {
    if (!el) return;
    const ctx = el.getContext('2d');
    ctx.clearRect(0, 0, 48, 48);
    ctx.imageSmoothingEnabled = false;
    const S = 3;

    if (thm === 'retro') {
      // Draw Pac-Man!
      ctx.fillStyle = '#ffee00';
      ctx.beginPath();
      ctx.arc(24, 24, 18, 0.25*Math.PI, 1.75*Math.PI);
      ctx.lineTo(24, 24);
      ctx.closePath();
      ctx.fill();
      // Eye
      ctx.fillStyle = '#0a0010';
      ctx.beginPath();
      ctx.arc(24, 14, 3, 0, Math.PI*2);
      ctx.fill();
      // Glow
      ctx.strokeStyle = '#ffee0066';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(24, 24, 20, 0, Math.PI*2);
      ctx.stroke();
    } else {
      const pal = thm === 'hacker'
        ? { skin:'#00ff41', hair:'#003300', shirt:'#003300', pants:'#001400' }
        : { skin:'#f5c89a', hair:'#7a4020', shirt:'#5b7fa6', pants:'#3d2f1e' };
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
      if (thm === 'hacker') { ctx.fillStyle='#00ff41'; ctx.font='7px monospace'; ctx.fillText('> _', 2, 47); }
    }
  }

  // @ts-ignore
  onMount(() => drawSprite(canvas, appState.theme));
  // @ts-ignore
  $effect(() => { drawSprite(canvas, appState.theme); });

  // Quests (same pool as before — abbreviated here, full in your Sidebar)
// ── Daily quests — 3 per day, each from a different category ──
  // Quest pool: each entry belongs to one category.
  // Seeded by date so they're consistent within a day but rotate daily.
  const QUEST_POOL = [
    // Art & Design
    { cat:'Art',         icon:'🎨', xp:80,  text:'Study the Bauhaus movement — how did it reshape modern design?' },
    { cat:'Art',         icon:'🎨', xp:70,  text:'Sketch a still-life of 3 objects on your desk right now.' },
    { cat:'Art',         icon:'🎨', xp:75,  text:'Look up one artwork by Katsushika Hokusai and note what draws your eye.' },
    { cat:'Art',         icon:'🎨', xp:80,  text:'Draw your own pixel art character sprite in any tool.' },
    { cat:'Art',         icon:'🎨', xp:70,  text:'Read about colour theory — learn the split-complementary scheme.' },
    // History
    { cat:'History',     icon:'📜', xp:75,  text:'Read about the fall of Constantinople and its impact on Europe.' },
    { cat:'History',     icon:'📜', xp:70,  text:'Learn the timeline of the Industrial Revolution in 10 minutes.' },
    { cat:'History',     icon:'📜', xp:80,  text:'Who was Ada Lovelace and why does she matter to computing today?' },
    { cat:'History',     icon:'📜', xp:70,  text:'Read about the Silk Road — what travelled along it beyond silk?' },
    { cat:'History',     icon:'📜', xp:75,  text:'Explore the history of the printing press and its societal ripple effects.' },
    // Science
    { cat:'Science',     icon:'🔬', xp:85,  text:'Read about CRISPR-Cas9 — what problem does it actually solve?' },
    { cat:'Science',     icon:'🔬', xp:80,  text:'Learn what a mRNA vaccine is and how it differs from traditional vaccines.' },
    { cat:'Science',     icon:'🔬', xp:75,  text:'Study the water cycle: evaporation, condensation, precipitation, collection.' },
    { cat:'Science',     icon:'🔬', xp:80,  text:'Read about symbiosis — find one example of mutualism, commensalism, and parasitism.' },
    { cat:'Science',     icon:'🔬', xp:85,  text:'Explore what dark matter is and why physicists think it exists.' },
    // Space
    { cat:'Space',       icon:'🚀', xp:85,  text:'Read about the James Webb Telescope — what can it see that Hubble could not?' },
    { cat:'Space',       icon:'🚀', xp:80,  text:'Learn the difference between a neutron star and a black hole.' },
    { cat:'Space',       icon:'🚀', xp:75,  text:'Study the Drake Equation — what does it try to estimate?' },
    { cat:'Space',       icon:'🚀', xp:85,  text:'Read about the Voyager probes — where are they now and what have they taught us?' },
    { cat:'Space',       icon:'🚀', xp:80,  text:'Learn what Lagrange points are and why satellites park there.' },
    // Engineering
    { cat:'Engineering', icon:'⚙️', xp:90,  text:'Read about how a bridge stays up — learn the role of compression vs tension.' },
    { cat:'Engineering', icon:'⚙️', xp:85,  text:'Study how a transistor works at a conceptual level.' },
    { cat:'Engineering', icon:'⚙️', xp:80,  text:'Learn what PID controllers are and where they\'re used in everyday life.' },
    { cat:'Engineering', icon:'⚙️', xp:90,  text:'Explore how lithium-ion batteries store and release energy.' },
    { cat:'Engineering', icon:'⚙️', xp:85,  text:'Read about the engineering behind the Panama Canal locks.' },
    // Physics
    { cat:'Physics',     icon:'⚛️', xp:90,  text:'Learn what the Heisenberg Uncertainty Principle actually says (not just the meme).' },
    { cat:'Physics',     icon:'⚛️', xp:85,  text:'Read about Bernoulli\'s Principle — how does it explain how planes fly?' },
    { cat:'Physics',     icon:'⚛️', xp:95,  text:'Study the formula E = mc² — what does each variable actually represent?' },
    { cat:'Physics',     icon:'⚛️', xp:90,  text:'Learn about entropy — why does disorder naturally increase over time?' },
    { cat:'Physics',     icon:'⚛️', xp:85,  text:'Explore the photoelectric effect — why did it prove light behaves as particles?' },
    // Biology
    { cat:'Biology',     icon:'🧬', xp:80,  text:'Read about how mitochondria produce ATP — trace the electron transport chain.' },
    { cat:'Biology',     icon:'🧬', xp:75,  text:'Learn how neurons transmit electrical signals across a synapse.' },
    { cat:'Biology',     icon:'🧬', xp:80,  text:'Study the difference between DNA, RNA, and proteins and how they relate.' },
    { cat:'Biology',     icon:'🧬', xp:75,  text:'Read about epigenetics — how can genes be switched on or off?' },
    { cat:'Biology',     icon:'🧬', xp:80,  text:'Explore the microbiome — what role do gut bacteria play in health?' },
    // Technology
    { cat:'Technology',  icon:'💻', xp:80,  text:'Read about how end-to-end encryption works in messaging apps.' },
    { cat:'Technology',  icon:'💻', xp:85,  text:'Learn what a neural network is — trace data through one layer conceptually.' },
    { cat:'Technology',  icon:'💻', xp:80,  text:'Study the difference between TCP and UDP — when would you choose each?' },
    { cat:'Technology',  icon:'💻', xp:75,  text:'Read about WebAssembly — what problem does it solve that JS cannot?' },
    { cat:'Technology',  icon:'💻', xp:85,  text:'Learn what a blockchain is structurally — ignore the hype, study the data structure.' },
    // Make / Build
    { cat:'Make',        icon:'🛠️', xp:100, text:'Write a script in any language that converts Celsius to Fahrenheit for any input.' },
    { cat:'Make',        icon:'🛠️', xp:100, text:'Build a tiny CLI tool that outputs a random motivational quote from a hardcoded list.' },
    { cat:'Make',        icon:'🛠️', xp:110, text:'Create a single-page HTML file with a working dark/light mode toggle.' },
    { cat:'Make',        icon:'🛠️', xp:100, text:'Write a function that checks whether a string is a palindrome.' },
    { cat:'Make',        icon:'🛠️', xp:110, text:'Make a small drawing: design your own map of an imaginary place.' },
    // Literature
    { cat:'Literature',  icon:'📖', xp:75,  text:'Read the first chapter of a book you\'ve been meaning to start. Just one.' },
    { cat:'Literature',  icon:'📖', xp:70,  text:'Learn about magical realism as a genre — read a summary of "One Hundred Years of Solitude".' },
    { cat:'Literature',  icon:'📖', xp:75,  text:'Read a short story by Ursula K. Le Guin — find one free online.' },
    { cat:'Literature',  icon:'📖', xp:70,  text:'Study the structure of a haiku — then write three of your own.' },
    { cat:'Literature',  icon:'📖', xp:75,  text:'Read about unreliable narrators in fiction — find two famous examples.' },
    // Law
    { cat:'Law',         icon:'⚖️', xp:80,  text:'Read about the difference between civil and criminal law.' },
    { cat:'Law',         icon:'⚖️', xp:75,  text:'Learn what habeas corpus means and why it matters to individual rights.' },
    { cat:'Law',         icon:'⚖️', xp:80,  text:'Study what GDPR requires from companies and what rights it gives individuals.' },
    { cat:'Law',         icon:'⚖️', xp:75,  text:'Read about intellectual property — what\'s the difference between a patent, trademark, and copyright?' },
    { cat:'Law',         icon:'⚖️', xp:80,  text:'Explore what "innocent until proven guilty" means procedurally, not just philosophically.' },
  ];

  function getDailyQuests() {
    const today = new Date();
    const seed  = today.getFullYear()*10000 + (today.getMonth()+1)*100 + today.getDate();
    // @ts-ignore
    const rnd   = (s) => { let x = Math.sin(s)*10000; return x - Math.floor(x); };
    const cats  = [...new Set(QUEST_POOL.map(q=>q.cat))];
    const chosen = [];
    const rem = [...cats];
    for (let i=0;i<3;i++){
      const idx=Math.floor(rnd(seed+i*997)*rem.length);
      chosen.push(rem.splice(idx,1)[0]);
    }
    return chosen.map((cat,i)=>{
      const pool=QUEST_POOL.filter(q=>q.cat===cat);
      return pool[Math.floor(rnd(seed+i*1337+42)*pool.length)];
    });
  }

  let dailyQuests = getDailyQuests();
</script>

<aside class="sidebar">

  <div class="char-card">
    <canvas bind:this={canvas} class="sprite" width="48" height="48"></canvas>
    <div class="char-info">
      <div class="char-name">
        {#if isHacker}<span class="dim">user@</span>
        {:else if isRetro}<span class="dim">P1 · </span>
        {/if}{p.name}
      </div>
      <div class="char-class">{classTitle()}</div>
      <span class="level-badge">
        {#if isRetro}STAGE {p.level}{:else}LVL {p.level}{/if}
      </span>
    </div>
  </div>

  <div class="stat-block">
    <div class="bar-label">
      <span>{isRetro ? 'SCORE' : isHacker ? 'XP' : 'Experience'}</span>
      <span class="mono">{xpInLevel}<span class="dim">/500</span></span>
    </div>
    <div class="bar-track"><div class="bar-fill xp" style="width:{xpPct}%"></div></div>
  </div>

  <div class="bar-block">
    <div class="bar-label">
      <span>{isRetro ? 'POWER' : isHacker ? 'FOCUS' : 'Focus'}</span>
      <span class="mono">{p.attributes.focus}</span>
    </div>
    <div class="bar-track">
      <div class="bar-fill focus" style="width:{Math.min(100, p.attributes.focus)}%"></div>
    </div>
  </div>

  <div class="divider"></div>

  <div class="section-label">
    {isRetro ? '◄ TODAY ►' : isHacker ? '-- TODAY --' : 'Today'}
  </div>
  <div class="stat-rows">
    <div class="stat-row"><span>{isRetro?'EATEN':'Tasks done'}</span><span class="val accent">{todayDone}</span></div>
    <div class="stat-row"><span>{isRetro?'COMBO':'Streak'}</span><span class="val">×{p.streak}</span></div>
    <div class="stat-row"><span>{isRetro?'COINS':'Gold'}</span><span class="val gold">🪙{p.gold}</span></div>
    <div class="stat-row"><span>{isRetro?'BONUS':'To collect'}</span><span class="val accent2">{toCollect}</span></div>
  </div>

  <div class="divider"></div>

  <div class="section-label">
    {isRetro ? '◄ SIDE QUESTS ►' : isHacker ? '-- DAILY QUESTS --' : 'Daily Quests'}
  </div>
  <div class="quests-list">
    {#each dailyQuests as quest, i}
      <div class="quest-card">
        <div class="quest-top">
          <span class="quest-cat-icon">{quest.icon}</span>
          <span class="quest-cat">{isRetro ? `QUEST ${i+1}` : quest.cat.toUpperCase()}</span>
          <span class="quest-xp">+{quest.xp}</span>
        </div>
        <span class="quest-text">{quest.text}</span>
      </div>
    {/each}
  </div>

</aside>

<style>
.sidebar {
  width:var(--sidebar-w); min-width:var(--sidebar-w);
  background:var(--bg2); border-right:1px solid var(--border);
  padding:12px 11px; display:flex; flex-direction:column;
  gap:9px; overflow-y:auto; flex-shrink:0;
  transition:background .2s, border-color .2s;
}
:global([data-theme="retro"]) .sidebar { border-right:1px solid #3300aa; box-shadow:inset -4px 0 12px #3300aa22; }

.char-card {
  background:var(--surface); border:1px solid var(--border);
  border-radius:var(--radius-lg); padding:10px;
  display:flex; gap:9px; align-items:flex-start;
}
:global([data-theme="retro"]) .char-card { border-color:#3300aa; box-shadow:0 0 8px #3300aa44; }

.sprite { image-rendering:pixelated; flex-shrink:0; border:1px solid var(--border); border-radius:var(--radius); background:var(--bg3); }
:global([data-theme="retro"]) .sprite { border-color:#ffee0055; background:#0a0010; }

.char-info { flex:1; min-width:0; }
.char-name { font-size:13px; font-weight:600; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
:global([data-theme="hacker"]) .char-name { font-family:var(--font-mono); font-size:11px; color:var(--accent); }
:global([data-theme="retro"])  .char-name { font-family:var(--font-mono); font-size:11px; color:#ffee00; letter-spacing:1px; text-shadow:0 0 6px #ffee0066; }
.dim { color:var(--text3); }

.char-class { font-size:10px; color:var(--text3); font-family:var(--font-mono); margin:2px 0 5px; }
:global([data-theme="hacker"]) .char-class::before { content:'// '; }
:global([data-theme="retro"])  .char-class { color:#ff8800; letter-spacing:1px; }
:global([data-theme="retro"])  .char-class::before { content:'▶ '; color:#ff4400; }

.level-badge {
  display:inline-block; background:var(--accent2); color:var(--bg);
  font-size:9px; font-weight:700; padding:2px 6px;
  border-radius:var(--radius); font-family:var(--font-mono); letter-spacing:0.5px;
}
:global([data-theme="retro"]) .level-badge { background:#ff4400; color:#ffee00; box-shadow:0 0 6px #ff440088; letter-spacing:1.5px; }

.stat-block, .bar-block { display:flex; flex-direction:column; gap:3px; }
.bar-label { display:flex; justify-content:space-between; font-size:10px; color:var(--text3); font-family:var(--font-mono); }
:global([data-theme="retro"]) .bar-label { color:#ff8800; letter-spacing:1px; }
.mono { font-family:var(--font-mono); }

.bar-track { height:5px; background:var(--bg3); border-radius:3px; overflow:hidden; border:1px solid var(--border); }
:global([data-theme="retro"]) .bar-track { border-radius:0; border-color:#3300aa; height:7px; }
.bar-fill { height:100%; border-radius:3px; transition:width 0.5s ease; }
.bar-fill.xp    { background:var(--xp-color); }
.bar-fill.focus { background:var(--hp-color); }
:global([data-theme="retro"]) .bar-fill.xp    { background:#ffee00; box-shadow:0 0 4px #ffee0088; border-radius:0; }
:global([data-theme="retro"]) .bar-fill.focus { background:#00ccff; box-shadow:0 0 4px #00ccff88; border-radius:0; }

.divider { height:1px; background:var(--border); }
:global([data-theme="retro"]) .divider { background:#3300aa; box-shadow:0 0 4px #3300aa88; }

.section-label { font-size:10px; font-family:var(--font-mono); color:var(--text3); letter-spacing:0.5px; }
:global([data-theme="retro"]) .section-label { color:#ff4400; letter-spacing:2px; text-shadow:0 0 4px #ff440066; }

.stat-rows { display:flex; flex-direction:column; gap:4px; }
.stat-row { display:flex; justify-content:space-between; font-size:11px; color:var(--text2); }
:global([data-theme="hacker"]) .stat-row { font-family:var(--font-mono); font-size:10px; }
:global([data-theme="retro"])  .stat-row { font-family:var(--font-mono); font-size:10px; letter-spacing:1px; }
.val { font-family:var(--font-mono); font-weight:600; }
.val.accent  { color:var(--accent); }
.val.accent2 { color:var(--accent2); }
.val.gold    { color:var(--gold-color); }
:global([data-theme="retro"]) .val.accent  { color:#ffee00; text-shadow:0 0 4px #ffee0066; }
:global([data-theme="retro"]) .val.accent2 { color:#ff4400; text-shadow:0 0 4px #ff440066; }
:global([data-theme="retro"]) .val.gold    { color:#ffbb00; }

.quests-list { display:flex; flex-direction:column; gap:6px; }
.quest-card {
  background:var(--bg3); border:1px solid var(--border);
  border-radius:var(--radius); padding:7px 8px;
  font-size:10px; line-height:1.5; transition:border-color .15s;
}
:global([data-theme="retro"]) .quest-card { border-color:#3300aa; background:#0a0010; }
:global([data-theme="retro"]) .quest-card:hover { border-color:#ffee00; box-shadow:0 0 6px #ffee0033; }
.quest-top { display:flex; align-items:center; gap:4px; margin-bottom:3px; }
.quest-cat-icon { font-size:12px; }
.quest-cat { font-size:9px; font-family:var(--font-mono); color:var(--accent2); flex:1; letter-spacing:0.5px; }
:global([data-theme="retro"]) .quest-cat { color:#ff4400; letter-spacing:1px; }
.quest-xp  { font-size:9px; font-family:var(--font-mono); color:var(--accent); }
:global([data-theme="retro"]) .quest-xp  { color:#ffee00; text-shadow:0 0 3px #ffee0066; }
.quest-text { color:var(--text2); display:block; font-size:10px; line-height:1.5; }
:global([data-theme="retro"]) .quest-text { font-family:var(--font-mono); color:#aa5500; font-size:9px; }
</style>
