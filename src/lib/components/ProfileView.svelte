<script>
  import { appState, toggleEquip, saveEquipTransform } from '$lib/stores/appState.svelte.js';
  import { onMount } from 'svelte';

  let isHacker    = $derived(appState.theme === 'hacker');
  let p           = $derived(appState.player);
  let profileTab  = $state('overview'); // 'overview' | 'history'

  // ── Radar chart ──
  // @ts-ignore
  let radarCanvas;
  const ATTRS      = ['Focus','Creative','Consist','Learning','Endurance'];
  const ATTR_KEYS  = ['focus','creativity','consistency','learning','endurance'];

  function drawRadar() {
    // @ts-ignore
    const c = radarCanvas;
    if (!c) return;
    const ctx = c.getContext('2d');
    const W=200,H=180,cx=100,cy=90,maxR=62;
    ctx.clearRect(0,0,W,H);
    const isH = appState.theme==='hacker';
    const accentCol   = isH ? '#00ff41' : '#7a9e5e';
    const fillCol     = isH ? '#00ff4120' : '#7a9e5e20';
    const gridCol     = isH ? '#1a3a1a'   : '#c9b99a50';
    const labelCol    = isH ? '#4aaa4a'   : '#7a6248';
    const overflowCol = isH ? '#00ffff'   : '#c07030';
    const N = 5;
    [.25,.5,.75,1].forEach(frac => {
      ctx.beginPath();
      for(let i=0;i<N;i++){
        const a=(i/N)*Math.PI*2-Math.PI/2;
        const x=cx+Math.cos(a)*maxR*frac, y=cy+Math.sin(a)*maxR*frac;
        i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
      } ctx.closePath(); ctx.strokeStyle=gridCol; ctx.lineWidth=0.5; ctx.stroke();
    });
    for(let i=0;i<N;i++){
      const a=(i/N)*Math.PI*2-Math.PI/2;
      ctx.beginPath(); ctx.moveTo(cx,cy);
      ctx.lineTo(cx+Math.cos(a)*maxR*1.2,cy+Math.sin(a)*maxR*1.2);
      ctx.strokeStyle=gridCol; ctx.lineWidth=0.5; ctx.stroke();
    }
    const vals = ATTR_KEYS.map(k=>(p.attributes[k]||0)/100);
    ctx.beginPath();
    vals.forEach((v,i)=>{
      const a=(i/N)*Math.PI*2-Math.PI/2;
      const r=maxR*Math.min(v,1.6);
      const x=cx+Math.cos(a)*r, y=cy+Math.sin(a)*r;
      i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
    }); ctx.closePath();
    ctx.fillStyle=fillCol; ctx.fill();
    ctx.strokeStyle=accentCol; ctx.lineWidth=1.5; ctx.stroke();
    vals.forEach((v,i)=>{
      const a=(i/N)*Math.PI*2-Math.PI/2;
      const r=maxR*Math.min(v,1.6);
      ctx.beginPath();
      ctx.arc(cx+Math.cos(a)*r, cy+Math.sin(a)*r, v>1?4:2.5, 0, Math.PI*2);
      ctx.fillStyle=v>1?overflowCol:accentCol; ctx.fill();
    });
    ctx.fillStyle=labelCol;
    ctx.font=`9px ${isH?'Share Tech Mono,monospace':'Lora,serif'}`;
    ATTRS.forEach((label,i)=>{
      const a=(i/N)*Math.PI*2-Math.PI/2;
      const x=cx+Math.cos(a)*(maxR+16), y=cy+Math.sin(a)*(maxR+16);
      ctx.textAlign=Math.abs(Math.cos(a))<.15?'center':Math.cos(a)>0?'left':'right';
      ctx.fillText(label,x,y+4);
    });
  }

  onMount(()=>drawRadar());
  $effect(()=>{ appState.theme; p.attributes.focus; drawRadar(); });

  // ── Character customizer ──
  // @ts-ignore
  let charCanvas;
  // @ts-ignore
  let dragItem   = $state(null);  // item being dragged
  let selectedEq = $state(null);  // selected equipped item for controls

  // Draw the base pixel character + all equipped items
  function drawChar() {
    // @ts-ignore
    const c = charCanvas;
    if (!c) return;
    const ctx = c.getContext('2d');
    const W=160,H=160;
    ctx.clearRect(0,0,W,H);
    ctx.imageSmoothingEnabled = false;

    const isH = appState.theme==='hacker';
    // Draw grid bg
    ctx.fillStyle = isH ? '#0c110c' : '#f0ebe0';
    ctx.fillRect(0,0,W,H);
    // Grid lines
    ctx.strokeStyle = isH ? '#1a3a1a' : '#c9b99a30';
    ctx.lineWidth=0.5;
    for(let x=0;x<W;x+=16){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
    for(let y=0;y<H;y+=16){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}

    // Draw base sprite (5x scale from 16x16)
    const S=5;
    const ox=56,oy=16; // center offset
    const pal = isH
      ? {skin:'#00ff41',hair:'#003300',shirt:'#003300',pants:'#001400',eyes:'#00ffff'}
      : {skin:'#f5c89a',hair:'#7a4020',shirt:'#5b7fa6',pants:'#3d2f1e',eyes:'#3d2f1e'};
    // @ts-ignore
    const px=(x,y,col)=>{ctx.fillStyle=pal[col]||col;ctx.fillRect(ox+x*S,oy+y*S,S,S);};
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
    ].forEach(([x,y,c])=>px(x,y,c));

    // Draw equipped items
    // @ts-ignore
    const equipped = appState.inventory.filter(i=>i.equipped);
    // @ts-ignore
    equipped.forEach(item=>{
      const t = item.equip || {x:80,y:80,scale:1,rotation:0};
      ctx.save();
      ctx.translate(t.x,t.y);
      ctx.rotate((t.rotation||0)*Math.PI/180);
      ctx.scale(t.scale||1,t.scale||1);
      ctx.font=`${Math.round(24*(t.scale||1))}px serif`;
      ctx.textAlign='center';
      ctx.textBaseline='middle';
      ctx.fillText(item.icon,0,0);
      // Selection ring
      // @ts-ignore
      if(selectedEq?.id===item.id){
        ctx.strokeStyle=isH?'#00ff41':'#7a9e5e';
        ctx.lineWidth=1.5/( t.scale||1);
        ctx.strokeRect(-14,-14,28,28);
      }
      ctx.restore();
    });
  }

  onMount(()=>drawChar());
  $effect(()=>{ appState.theme; appState.inventory; selectedEq; drawChar(); });

  // Click on canvas to select equipped item
  // @ts-ignore
  function onCanvasClick(e) {
    // @ts-ignore
    const rect = charCanvas.getBoundingClientRect();
    // @ts-ignore
    const scaleX = charCanvas.width / rect.width;
    // @ts-ignore
    const scaleY = charCanvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top)  * scaleY;

    // @ts-ignore
    const equipped = appState.inventory.filter(i=>i.equipped);
    let hit = null;
    for(const item of equipped){
      const t = item.equip||{x:80,y:80,scale:1,rotation:0};
      const dx = mx-t.x, dy = my-t.y;
      if(Math.abs(dx)<20&&Math.abs(dy)<20){ hit=item; break; }
    }
    selectedEq = hit;
  }

  // Drag to move equipped item
  let isDragging = $state(false);
  let dragStart  = $state(null);

  // @ts-ignore
  function onCanvasMouseDown(e) {
    if(!selectedEq) return;
    isDragging = true;
    // @ts-ignore
    const rect = charCanvas.getBoundingClientRect();
    // @ts-ignore
    const scaleX = charCanvas.width/rect.width;
    // @ts-ignore
    const scaleY = charCanvas.height/rect.height;
    // @ts-ignore
    dragStart = {
      mx:(e.clientX-rect.left)*scaleX,
      my:(e.clientY-rect.top)*scaleY,
      // @ts-ignore
      ox:selectedEq.equip?.x??80,
      // @ts-ignore
      oy:selectedEq.equip?.y??80,
    };
  }

  // @ts-ignore
  function onCanvasMouseMove(e) {
    if(!isDragging||!selectedEq||!dragStart) return;
    // @ts-ignore
    const rect = charCanvas.getBoundingClientRect();
    // @ts-ignore
    const scaleX = charCanvas.width/rect.width;
    // @ts-ignore
    const scaleY = charCanvas.height/rect.height;
    const mx=(e.clientX-rect.left)*scaleX;
    const my=(e.clientY-rect.top)*scaleY;
    // @ts-ignore
    const cur = selectedEq.equip||{x:80,y:80,scale:1,rotation:0};
    // @ts-ignore
    const newT = {...cur, x:dragStart.ox+(mx-dragStart.mx), y:dragStart.oy+(my-dragStart.my)};
    // @ts-ignore
    saveEquipTransform(selectedEq.id, newT);
    drawChar();
  }

  function onCanvasMouseUp() { isDragging=false; dragStart=null; }

  // @ts-ignore
  function adjustSelected(prop,delta) {
    if(!selectedEq) return;
    // @ts-ignore
    const cur = selectedEq.equip||{x:80,y:80,scale:1,rotation:0};
    const newT = {...cur, [prop]: Math.max(prop==='scale'?.2:prop==='rotation'?-360:0, cur[prop]+delta)};
    if(prop==='scale') newT.scale=Math.min(3,newT.scale);
    // @ts-ignore
    saveEquipTransform(selectedEq.id, newT);
    // @ts-ignore
    selectedEq = appState.inventory.find(i=>i.id===selectedEq.id);
    drawChar();
  }

  // ── History search (Fuse.js) ──
  let historyQuery = $state('');
  let fuseInstance = $state(null);
  // @ts-ignore
  let searchResults = $state([]);

  onMount(async()=>{
    // @ts-ignore
    const Fuse = (await import('https://cdn.jsdelivr.net/npm/fuse.js@7.0.0/dist/fuse.esm.js')).default;
    fuseInstance = new Fuse(appState.taskHistory,{
      keys:['title','difficulty','tags'],
      threshold:0.35,
      includeScore:true,
    });
  });

  $effect(()=>{
    if(!historyQuery.trim()){
      searchResults = appState.taskHistory.slice(0,50);
      return;
    }
    if(fuseInstance){
      // Rebuild on history change
      // @ts-ignore
      const Fuse_class = fuseInstance.constructor;
      const fresh = new Fuse_class(appState.taskHistory,{keys:['title','difficulty','tags'],threshold:.35});
      // @ts-ignore
      searchResults = fresh.search(historyQuery).map(r=>r.item).slice(0,50);
    }
  });

  $effect(()=>{
    appState.taskHistory.length; // track additions
    if(!historyQuery.trim()) searchResults = appState.taskHistory.slice(0,50);
  });

  // @ts-ignore
  function fmtDate(ts){
    if(!ts) return '—';
    return new Date(ts).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
  }
</script>

<div class="profile-view">

  <!-- Sub-nav -->
  <div class="profile-subnav">
    <button class="subnav-btn" class:active={profileTab==='overview'} onclick={()=>profileTab='overview'}>
      {isHacker?'OVERVIEW':'Overview'}
    </button>
    <button class="subnav-btn" class:active={profileTab==='history'} onclick={()=>profileTab='history'}>
      {isHacker?'HISTORY':'Task History'}
    </button>
  </div>

  {#if profileTab==='overview'}
    <!-- ══════ OVERVIEW GRID ══════ -->
    <div class="overview-grid">

      <!-- TOP LEFT: Character customiser -->
      <div class="card char-card">
        <div class="card-title">{isHacker?'// CHARACTER':'Character'}</div>
        <div class="char-area">
          <canvas
            bind:this={charCanvas}
            width="160" height="160"
            class="char-canvas"
            onclick={onCanvasClick}
            onmousedown={onCanvasMouseDown}
            onmousemove={onCanvasMouseMove}
            onmouseup={onCanvasMouseUp}
            onmouseleave={onCanvasMouseUp}
            style="cursor:{selectedEq?'grab':'default'}"
          ></canvas>
          {#if selectedEq}
            <div class="item-controls">
              <span class="ctrl-label">{selectedEq.icon} {selectedEq.label}</span>
              <div class="ctrl-row">
                <span class="ctrl-key">↔</span>
                <button class="ctrl-btn" onclick={()=>adjustSelected('x',-4)}>←</button>
                <button class="ctrl-btn" onclick={()=>adjustSelected('x',4)}>→</button>
                <button class="ctrl-btn" onclick={()=>adjustSelected('y',-4)}>↑</button>
                <button class="ctrl-btn" onclick={()=>adjustSelected('y',4)}>↓</button>
              </div>
              <div class="ctrl-row">
                <span class="ctrl-key">⊕</span>
                <button class="ctrl-btn" onclick={()=>adjustSelected('scale',.1)}>+</button>
                <button class="ctrl-btn" onclick={()=>adjustSelected('scale',-.1)}>−</button>
                <span class="ctrl-key">↻</span>
                <button class="ctrl-btn" onclick={()=>adjustSelected('rotation',-15)}>↺</button>
                <button class="ctrl-btn" onclick={()=>adjustSelected('rotation',15)}>↻</button>
              </div>
              <button class="ctrl-btn unequip" onclick={()=>{toggleEquip(selectedEq.id);selectedEq=null;}}>
                {isHacker?'UNEQUIP':'Unequip'}
              </button>
            </div>
          {:else}
            <div class="char-hint">{isHacker?'// click item to select':'Click an equipped item to adjust'}</div>
          {/if}
        </div>
      </div>

      <!-- TOP RIGHT: Radar -->
      <div class="card radar-card">
        <div class="card-title">{isHacker?'// ATTR_RADAR':'Attributes'}</div>
        <canvas bind:this={radarCanvas} width="200" height="180" class="radar-canvas"></canvas>
        <div class="radar-sub">{isHacker?'// overflow > 100 shows in cyan':'Surpass 100 to overflow the pentagon'}</div>
      </div>

      <!-- BOTTOM LEFT: Monthly card -->
      <div class="card monthly-card">
        <div class="card-title">{isHacker?'// MONTHLY_CARD :: MAY_2026':'May 2026 Card'}</div>
        <div class="month-status">
          <span class="status-badge in-progress">{isHacker?'MISSION_IN_PROGRESS':'Mission In Progress'}</span>
        </div>
        <div class="month-stats">
          <div class="month-row"><span>Tasks</span><span class="acc">{p.totalDone}</span></div>
          <div class="month-row"><span>Streak</span><span>{p.streak}d</span></div>
          <div class="month-row"><span>Level</span><span class="acc">{p.level}</span></div>
          <div class="month-row"><span>Gold</span><span class="gld">{p.gold}</span></div>
        </div>
        <div class="month-footer">{isHacker?'// locks at month end · never repeats':'Locks at month end and is yours forever 🌿'}</div>
      </div>

      <!-- BOTTOM RIGHT: Stats -->
      <div class="card stats-card">
        <div class="card-title">{isHacker?'// PLAYER_STATS':'Stats'}</div>
        <div class="stat-list">
          <div class="stat-row"><span class="stat-k">Total XP</span><span class="stat-v acc">{p.xp}</span></div>
          <div class="stat-row"><span class="stat-k">Level</span><span class="stat-v">{p.level}</span></div>
          <div class="stat-row"><span class="stat-k">Gold</span><span class="stat-v gld">{p.gold}</span></div>
          <div class="stat-row"><span class="stat-k">Streak</span><span class="stat-v">{p.streak}d</span></div>
          <div class="stat-row"><span class="stat-k">Completed</span><span class="stat-v acc">{p.totalDone}</span></div>
        </div>
        {#each ATTR_KEYS as key,i}
          {@const val=p.attributes[key]||0}
          <div class="attr-row">
            <span class="attr-k">{ATTRS[i]}</span>
            <div class="attr-track">
              <div class="attr-fill" style="width:{Math.min(100,val)}%"></div>
              {#if val>100}<div class="attr-over" style="width:{Math.min(val-100,50)}%"></div>{/if}
            </div>
            <span class="attr-v">{val}</span>
          </div>
        {/each}
      </div>

    </div>

    <!-- INVENTORY BAR -->
    <div class="card inv-bar">
      <div class="card-title" style="margin-bottom:8px">{isHacker?'// INVENTORY':'Inventory — click to equip/unequip'}</div>
      <div class="inv-grid">
        {#each appState.inventory as item (item.id)}
          <button
            class="inv-slot rarity-{item.rarity}"
            class:equipped={item.equipped}
            onclick={()=>toggleEquip(item.id)}
            title="{item.label} ({item.rarity}){item.equipped?' · equipped':''}"
          >
            <span class="inv-icon">{item.icon}</span>
            <span class="inv-label">{item.label}</span>
            {#if item.equipped}<span class="eq-badge">{isHacker?'EQ':'✓'}</span>{/if}
          </button>
        {/each}
        {#each Array(Math.max(0,8-appState.inventory.length)) as _}
          <div class="inv-slot empty"><span class="inv-empty">{isHacker?'[ ]':'·'}</span></div>
        {/each}
      </div>
    </div>

    <!-- Need motivation button -->
    <button class="motivate-btn" onclick={()=>notify(isHacker?'> GRIND MODE ACTIVATED — lock in.':'🌿 You\'re doing amazing. One chunk at a time.','success')}>
      {isHacker?'> need_motivation()':'🌿 Need motivation?'}
    </button>

  {:else}
    <!-- ══════ HISTORY TAB ══════ -->
    <div class="history-view">
      <div class="history-header">
        <div class="view-title">{isHacker?'// TASK_HISTORY':'Task History'}</div>
        <div class="view-sub">{appState.taskHistory.length} tasks completed · all time</div>
      </div>
      <div class="search-row">
        <input
          class="search-input"
          type="text"
          bind:value={historyQuery}
          placeholder={isHacker?'grep -i "query"...':'Search tasks...'}
        />
        {#if historyQuery}<button class="btn" onclick={()=>historyQuery=''}>✕</button>{/if}
      </div>
      {#if appState.taskHistory.length===0}
        <div class="empty-state">
          <div class="empty-icon">{isHacker?'//':'📭'}</div>
          <div>{isHacker?'// no history records found':'No completed tasks yet. Go get some done!'}</div>
        </div>
      {:else if searchResults.length===0}
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <div>No matches for "{historyQuery}"</div>
        </div>
      {:else}
        {#if historyQuery}
          <div class="results-label">{searchResults.length} result(s) for "{historyQuery}"</div>
        {/if}
        {#each searchResults as task (task.id)}
          <div class="history-item">
            <div class="hist-top">
              <span class="hist-title">{task.title}</span>
              <span class="tag {task.difficulty}">{task.difficulty}</span>
            </div>
            <div class="hist-meta">
              <span>{fmtDate(task.collectedAt)}</span>
              <span class="acc">+{task.rewardXP} XP</span>
              <span class="gld">+{task.rewardGold} G</span>
              <span>{task.chunks} chunks · {task.chunkMins ?? 17.5}min each</span>
            </div>
          </div>
        {/each}
      {/if}
    </div>
  {/if}

</div>

<style>
.profile-view { flex:1; overflow-y:auto; padding:16px; display:flex; flex-direction:column; gap:12px; }

/* Sub-nav */
.profile-subnav { display:flex; gap:4px; border-bottom:1px solid var(--border); padding-bottom:0; }
.subnav-btn {
  padding:6px 16px; font-size:12px; font-family:var(--font-ui);
  background:transparent; border:none; border-bottom:2px solid transparent;
  color:var(--text3); cursor:pointer; transition:all .15s;
  border-radius:var(--radius) var(--radius) 0 0;
}
.subnav-btn:hover { color:var(--text2); background:var(--bg3); }
.subnav-btn.active { color:var(--accent); border-bottom-color:var(--accent); background:var(--bg3); }
:global([data-theme="hacker"]) .subnav-btn { font-family:var(--font-mono); font-size:11px; letter-spacing:.8px; }

/* Overview grid */
.overview-grid {
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:10px;
}
.card {
  background:var(--surface); border:1px solid var(--border);
  border-radius:var(--radius-lg); padding:13px;
  display:flex; flex-direction:column; gap:8px;
}
.card-title {
  font-size:10px; font-family:var(--font-mono); color:var(--text3);
  letter-spacing:.8px; text-transform:uppercase;
  padding-bottom:6px; border-bottom:1px solid var(--border);
}

/* Character */
.char-card { }
.char-area { display:flex; gap:10px; align-items:flex-start; }
.char-canvas {
  image-rendering:pixelated; border:1px solid var(--border);
  border-radius:var(--radius); flex-shrink:0;
  width:160px; height:160px;
}
.item-controls { flex:1; display:flex; flex-direction:column; gap:5px; }
.ctrl-label { font-size:11px; color:var(--accent); font-family:var(--font-mono); }
.ctrl-row { display:flex; align-items:center; gap:3px; flex-wrap:wrap; }
.ctrl-key { font-size:10px; color:var(--text3); font-family:var(--font-mono); min-width:14px; }
.ctrl-btn {
  padding:2px 7px; font-size:11px; background:var(--bg3);
  border:1px solid var(--border); border-radius:var(--radius);
  color:var(--text2); cursor:pointer; font-family:var(--font-mono);
  transition:all .12s;
}
.ctrl-btn:hover { background:var(--border); color:var(--text); }
.ctrl-btn.unequip { color:var(--hp-color); border-color:var(--hp-color); margin-top:4px; }
.char-hint { font-size:10px; color:var(--text3); font-family:var(--font-mono); align-self:center; }

/* Radar */
.radar-card { align-items:center; }
.radar-canvas { display:block; }
.radar-sub { font-size:9px; font-family:var(--font-mono); color:var(--text3); text-align:center; }

/* Monthly */
.month-status { display:flex; }
.status-badge { font-size:10px; font-family:var(--font-mono); padding:2px 7px; border-radius:var(--radius); border:1px solid; }
.status-badge.in-progress { color:var(--accent2); border-color:var(--accent2); }
.month-stats { display:flex; flex-direction:column; gap:4px; }
.month-row { display:flex; justify-content:space-between; font-size:11px; color:var(--text2); }
:global([data-theme="hacker"]) .month-row { font-family:var(--font-mono); font-size:10px; }
.month-footer { font-size:10px; color:var(--text3); font-family:var(--font-mono); }

/* Stats */
.stat-list { display:flex; flex-direction:column; gap:5px; margin-bottom:4px; }
.stat-row { display:flex; justify-content:space-between; font-size:11px; color:var(--text2); }
:global([data-theme="hacker"]) .stat-row { font-family:var(--font-mono); font-size:10px; }
.stat-k { color:var(--text3); font-family:var(--font-mono); font-size:10px; }
.stat-v { font-family:var(--font-mono); font-weight:600; }
.attr-row { display:flex; align-items:center; gap:5px; }
.attr-k { font-size:9px; font-family:var(--font-mono); color:var(--text3); width:56px; flex-shrink:0; }
.attr-track { flex:1; height:4px; background:var(--bg3); border-radius:2px; overflow:hidden; border:1px solid var(--border); position:relative; }
.attr-fill { height:100%; background:var(--xp-color); border-radius:2px; transition:width .5s; }
.attr-over { position:absolute; right:0; top:0; height:100%; background:var(--accent2); opacity:.8; }
.attr-v { font-size:9px; font-family:var(--font-mono); color:var(--accent); width:22px; text-align:right; }

/* Inventory bar */
.inv-bar { grid-column:span 2; }
.inv-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(80px,1fr)); gap:7px; }
.inv-slot {
  background:var(--bg3); border:1px solid var(--border);
  border-radius:var(--radius); padding:7px 5px;
  display:flex; flex-direction:column; align-items:center; gap:3px;
  cursor:pointer; transition:all .15s; min-height:60px; justify-content:center;
  position:relative;
}
.inv-slot:hover:not(.empty) { border-color:var(--border2); box-shadow:var(--shadow); }
.inv-slot.equipped { border-color:var(--accent); background:var(--bg2); box-shadow:0 0 6px color-mix(in srgb,var(--accent) 20%,transparent); }
.inv-slot.rarity-rare      { box-shadow:0 0 5px color-mix(in srgb,var(--accent3) 15%,transparent); }
.inv-slot.rarity-epic      { border-color:#aa44ff44; }
.inv-slot.rarity-legendary { border-color:var(--gold-color); box-shadow:0 0 7px color-mix(in srgb,var(--gold-color) 25%,transparent); }
.inv-slot.empty { opacity:.3; cursor:default; }
.inv-icon  { font-size:20px; }
.inv-label { font-size:9px; font-family:var(--font-mono); color:var(--text3); text-align:center; line-height:1.3; }
.inv-empty { font-size:12px; color:var(--text3); font-family:var(--font-mono); }
.eq-badge {
  position:absolute; top:2px; right:3px;
  font-size:8px; color:var(--accent); font-family:var(--font-mono);
}

/* Motivation button */
.motivate-btn {
  padding:10px; background:var(--bg2);
  border:1px dashed var(--border); border-radius:var(--radius-lg);
  color:var(--text3); font-family:var(--font-ui); font-size:12px;
  cursor:pointer; transition:all .2s; text-align:center;
}
.motivate-btn:hover { border-color:var(--accent); color:var(--accent); background:var(--surface); }
:global([data-theme="hacker"]) .motivate-btn { font-family:var(--font-mono); font-size:11px; }

/* History */
.history-view { display:flex; flex-direction:column; gap:10px; }
.history-header { display:flex; flex-direction:column; gap:2px; }
.view-title { font-size:15px; font-weight:600; color:var(--text); }
:global([data-theme="hacker"]) .view-title { font-family:var(--font-mono); color:var(--accent); font-size:12px; }
.view-sub { font-size:11px; color:var(--text3); font-family:var(--font-mono); }
.search-row { display:flex; gap:6px; }
.search-input {
  flex:1; background:var(--surface); border:1px solid var(--border);
  border-radius:var(--radius); color:var(--text); font-family:var(--font-ui);
  font-size:13px; padding:7px 10px; outline:none; transition:border-color .15s;
}
.search-input:focus { border-color:var(--accent); }
:global([data-theme="hacker"]) .search-input { font-family:var(--font-mono); font-size:11px; }
.results-label { font-size:11px; color:var(--accent); font-family:var(--font-mono); }
.history-item {
  background:var(--surface); border:1px solid var(--border);
  border-radius:var(--radius-lg); padding:10px 13px;
  display:flex; flex-direction:column; gap:5px;
  transition:border-color .15s;
}
.history-item:hover { border-color:var(--border2); }
.hist-top { display:flex; justify-content:space-between; align-items:flex-start; gap:8px; }
.hist-title { font-size:13px; color:var(--text); flex:1; line-height:1.4; }
:global([data-theme="hacker"]) .hist-title { font-family:var(--font-mono); font-size:11px; }
.hist-meta { display:flex; gap:12px; font-size:10px; color:var(--text3); font-family:var(--font-mono); flex-wrap:wrap; }
.empty-state { display:flex; flex-direction:column; align-items:center; gap:10px; padding:30px 0; color:var(--text3); font-size:13px; }
.empty-icon { font-size:28px; }
.acc { color:var(--accent); font-family:var(--font-mono); font-weight:600; }
.gld { color:var(--gold-color); font-family:var(--font-mono); }
</style>