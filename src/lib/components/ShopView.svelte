<script>
  import { appState, buyItem, visitCraftsman, submitCustomItem, uploadItem, notify, NPC_CRAFTSMEN } from '$lib/stores/appState.svelte.js';

  let isHacker = $derived(appState.theme === 'hacker');

  // Browse filters
  let filterType   = $state('all');
  let filterRarity = $state('all');

  let filteredItems = $derived(appState.shopItems.filter(item => {
    const typeOk   = filterType   === 'all' || item.type   === filterType;
    const rarityOk = filterRarity === 'all' || item.rarity === filterRarity;
    return typeOk && rarityOk;
  }));

  // @ts-ignore
  function owned(item) {
    // @ts-ignore
    return appState.inventory.some(i => i.label === item.label);
  }

  // Layer type options used in both craft form and free upload
  const LAYER_TYPES = [
    { value: 'body',       label: '🧍 Body (character base)' },
    { value: 'hair',       label: '💇 Hair' },
    { value: 'outfit',     label: '👔 Outfit' },
    { value: 'expression', label: '😊 Expression / Face' },
    { value: 'bg',         label: '🖼 Background' },
    { value: 'accessory',  label: '💍 Accessory' },
    { value: 'weapon',     label: '⚔️ Weapon' },
    { value: 'clothing',   label: '🧥 Clothing item' },
  ];

  // Craft state (craftsman visit)
  let craftInput     = $state('');
  let craftDesc      = $state('');
  let craftLayerType = $state('');         // '' = use craftsman default
  let uploadedImg    = $state(null);       // { dataUrl, name }
  let submitted      = $state(false);
  let fileInput      = $state(null);

  // Free upload state (multi-file)
  let freeUploads   = $state([]);   // [{ dataUrl, label, desc, layerType }]
  let freeFileInput = $state(null);
  let uploadDone    = $state(false);
  let uploadedCount = $state(0);
  // @ts-ignore
  let conversation = $derived(appState.craftConversation);
  let activeCraft  = $derived(appState.activeCraftsman);

  // Gold is deducted only on commission, not on visit.
  // We track whether the current visit has already been charged.
  let visitCharged = $state(false);

  // @ts-ignore
  function doVisit(craftsmanId) {
    submitted    = false;
    craftInput   = '';
    craftDesc    = '';
    uploadedImg  = null;
    visitCharged = false;
    visitCraftsman(craftsmanId); // opens chat, does NOT deduct gold yet
  }

  function leaveCraftsman() {
    // If they leave without commissioning, refund is automatic
    // because we never charged — gold deduction moved to doSubmit.
    appState.activeCraftsman = null;
    appState.shopTab = 'browse';
    appState.craftConversation = [];
    visitCharged = false;
  }

  // Handle PNG upload
  // @ts-ignore
  function onFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      notify('Please upload an image file (PNG, JPG, etc.)', 'warn');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      // Resize to 48x48 via canvas before storing
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width  = 48;
        canvas.height = 48;
        const ctx = canvas.getContext('2d');
        // Draw with object-fit: cover style centering
        const scale = Math.max(48 / img.width, 48 / img.height);
        const sw    = img.width  * scale;
        const sh    = img.height * scale;
        const sx    = (48 - sw) / 2;
        const sy    = (48 - sh) / 2;
        // @ts-ignore
        ctx.drawImage(img, sx, sy, sw, sh);
        // @ts-ignore
        uploadedImg = {
          dataUrl: canvas.toDataURL('image/png'),
          name:    file.name.replace(/\.[^.]+$/, '')
        };
        // Pre-fill name from filename if empty
        if (!craftInput.trim()) {
          // @ts-ignore
          craftInput = uploadedImg.name
            .replace(/[-_]/g, ' ')
            // @ts-ignore
            .replace(/\b\w/g, c => c.toUpperCase());
        }
      };
      // @ts-ignore
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }

  function doSubmit() {
    if (!craftInput.trim()) return;
    if (!uploadedImg) {
      notify(isHacker ? '> ERROR: no image uploaded' : 'Please upload an image for your item first!', 'warn');
      return;
    }

    // Charge gold now — first commission in this visit
    if (!visitCharged) {
      const npc = appState.activeCraftsman;
      // @ts-ignore
      if (appState.player.gold < npc.cost) {
        notify(
          // @ts-ignore
          isHacker ? `> INSUFFICIENT FUNDS: commission costs ${npc.cost}G` : `Not enough gold! Need ${npc.cost} 💰`,
          'warn'
        );
        return;
      }
      // @ts-ignore
      appState.player.gold -= npc.cost;
      visitCharged = true;
    }

    // @ts-ignore
    appState.craftConversation.push({
      role: 'user',
      text: `I'd like to commission: "${craftInput}"`
    });

    // @ts-ignore
    submitCustomItem(craftInput.trim(), uploadedImg.dataUrl, craftDesc.trim(), craftLayerType || null);
    submitted      = true;
    craftInput     = '';
    craftDesc      = '';
    craftLayerType = '';
    uploadedImg    = null;
  }

  // @ts-ignore
  function onFreeFileChange(e) {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      // @ts-ignore
      if (!file.type.startsWith('image/')) continue;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 48; canvas.height = 48;
          const ctx = canvas.getContext('2d');
          // @ts-ignore
          const scale = Math.max(48 / img.width, 48 / img.height);
          // @ts-ignore
          const sw = img.width * scale, sh = img.height * scale;
          const sx = (48 - sw) / 2, sy = (48 - sh) / 2;
          // @ts-ignore
          ctx.drawImage(img, sx, sy, sw, sh);
          // @ts-ignore
          const auto = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          freeUploads = [...freeUploads, { dataUrl: canvas.toDataURL('image/png'), label: auto, desc: '', layerType: 'body' }];
        };
        // @ts-ignore
        img.src = ev.target.result;
      };
      // @ts-ignore
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  }

  function doFreeUpload() {
    const valid = freeUploads.filter(u => u.label.trim());
    if (!valid.length) return;
    for (const u of valid) {
      // @ts-ignore
      uploadItem(u.label.trim(), u.dataUrl, u.desc.trim(), u.layerType);
    }
    uploadedCount = valid.length;
    freeUploads = [];
    uploadDone = true;
  }

  // @ts-ignore
  function removeUpload(idx) {
    freeUploads = freeUploads.filter((_, i) => i !== idx);
  }

  const TYPE_LABELS = { all:'All', body:'Body', hair:'Hair', outfit:'Outfit', expression:'Face', bg:'BG', accessory:'Accessory', weapon:'Weapons', clothing:'Clothing' };
  const RARITY_COLS = { common:'var(--text3)', rare:'var(--accent3)', epic:'#aa44ff', legendary:'var(--gold-color)' };
</script>

<div class="shop-view">

  <!-- Header -->
  <div class="shop-header">
    <div>
      <div class="view-title">{isHacker ? '> SHOP_TERMINAL.exe' : '🏪 The Shop'}</div>
      <div class="view-sub">
        {isHacker ? `BALANCE: ${appState.player.gold}G` : `Your gold: 💰 ${appState.player.gold}`}
      </div>
    </div>
    <div class="shop-tabs">
      <button class="stab" class:active={appState.shopTab==='browse' && !appState.activeCraftsman}
        onclick={() => { appState.shopTab='browse'; leaveCraftsman(); }}>
        {isHacker ? 'BROWSE' : '🛍 Browse'}
      </button>
      <button class="stab" class:active={appState.shopTab==='craft' || !!appState.activeCraftsman}
        onclick={() => { appState.shopTab='craft'; appState.activeCraftsman=null; }}>
        {isHacker ? 'CRAFTSMEN' : '⚒ Craftsmen'}
      </button>
      <button class="stab" class:active={appState.shopTab==='upload'}
        onclick={() => { appState.shopTab='upload'; appState.activeCraftsman=null; uploadDone=false; }}>
        {isHacker ? 'UPLOAD' : '📁 Upload'}
      </button>
    </div>
  </div>

  {#if appState.shopTab === 'browse' && !appState.activeCraftsman}
    <!-- ══════ BROWSE ══════ -->
    <div class="filter-row">
      {#each Object.entries(TYPE_LABELS) as [k,v]}
        <button class="filter-btn" class:active={filterType===k} onclick={() => filterType=k}>{v}</button>
      {/each}
      <div class="filter-sep"></div>
      {#each ['all','common','rare','epic','legendary'] as r}
        <button class="filter-btn" class:active={filterRarity===r}
          style="color:{r==='all'?'var(--text3)':RARITY_COLS[r]}"
          onclick={() => filterRarity=r}>
          {r==='all' ? 'All rarities' : r}
        </button>
      {/each}
    </div>

    <div class="items-grid">
      {#each filteredItems as item (item.id)}
        {@const isOwned  = owned(item)}
        {@const canAfford = appState.player.gold >= item.price}
        <div class="item-card rarity-{item.rarity}" class:owned={isOwned}>
          <div class="item-icon">{item.icon}</div>
          <div class="item-name">{item.label}</div>
          <div class="item-desc">{item.desc}</div>
          <div class="item-footer">
            <span class="item-rarity" style="color:{RARITY_COLS[item.rarity]}">{item.rarity}</span>
            {#if isOwned}
              <span class="owned-badge">{isHacker ? 'OWNED' : '✓ owned'}</span>
            {:else}
              <button class="buy-btn" class:cant={!canAfford}
                onclick={() => buyItem(item.id)} disabled={!canAfford}>
                {isHacker ? `BUY ${item.price}G` : `💰 ${item.price}`}
              </button>
            {/if}
          </div>
        </div>
      {/each}
    </div>

  {:else if appState.shopTab === 'craft' && !appState.activeCraftsman}
    <!-- ══════ CRAFTSMEN LIST ══════ -->
    <div class="craft-intro">
      {#if isHacker}
        // visit a craftsman · upload your own PNG · charged only on commission
      {:else}
        Visit a craftsman, upload your own image, and commission a one-of-a-kind item 🌿<br>
        <span class="free-note">You're only charged when you commission something — browsing is free.</span>
      {/if}
    </div>
    <div class="craftsmen-grid">
      {#each NPC_CRAFTSMEN as npc}
        <div class="npc-card">
          <div class="npc-icon">{npc.icon}</div>
          <div class="npc-body">
            <div class="npc-name">{npc.name}</div>
            <div class="npc-title">{isHacker ? npc.title.toUpperCase().replace(/ /g,'_') : npc.title}</div>
            <div class="npc-desc">{npc.desc}</div>
            <div class="npc-personality">{isHacker ? `// ${npc.personality}` : npc.personality}</div>
          </div>
          <div class="npc-cost-note">
            {isHacker ? `// commission costs ${npc.cost}G` : `💰 ${npc.cost} gold per commission`}
          </div>
          <button class="btn primary visit-btn" onclick={() => doVisit(npc.id)}>
            {isHacker ? `VISIT ${npc.name.toUpperCase()}` : `Visit ${npc.name} →`}
          </button>
        </div>
      {/each}
    </div>

  {:else if appState.shopTab === 'upload' && !appState.activeCraftsman}
    <!-- ══════ FREE UPLOAD ══════ -->
    <div class="upload-panel">
      <div class="upload-panel-intro">
        {#if isHacker}
          // draw it yourself · upload PNG · pick layer · free · select multiple files at once
        {:else}
          Draw your own character parts and upload them directly — no gold needed 🌿<br>
          <span style="color:var(--accent); font-size:10px;">You can select as many files as you like at once.</span>
        {/if}
      </div>

      {#if !uploadDone}
        <!-- Drop zone — always visible, opens multi-file picker -->
        <div class="upload-zone"
          onclick={() => freeFileInput?.click()}
          onkeydown={e => e.key === 'Enter' && freeFileInput?.click()}
          role="button" tabindex="0">
          <span class="upload-icon">🎨</span>
          <span class="upload-hint">
            {#if isHacker}// click to select images · multiple files allowed
            {:else}Click to select your drawings · pick as many as you want
            {/if}
          </span>
          {#if freeUploads.length > 0}
            <span class="upload-count-badge">{freeUploads.length} queued</span>
          {/if}
        </div>
        <input bind:this={freeFileInput} type="file" accept="image/*" multiple style="display:none" onchange={onFreeFileChange} />

        {#if freeUploads.length > 0}
          <!-- Per-item edit cards -->
          <div class="queue-grid">
            {#each freeUploads as u, i}
              <div class="queue-card">
                <button class="queue-remove" onclick={() => removeUpload(i)} title="Remove">×</button>
                <img src={u.dataUrl} alt="preview" class="queue-preview" />
                <input class="cf-input queue-name" type="text" bind:value={u.label}
                  placeholder={isHacker ? 'name...' : 'Item name...'} />
                <select class="cf-input cf-select queue-select" bind:value={u.layerType}>
                  {#each LAYER_TYPES as lt}
                    <option value={lt.value}>{lt.label}</option>
                  {/each}
                </select>
                <input class="cf-input queue-desc" type="text" bind:value={u.desc}
                  placeholder={isHacker ? 'desc...' : 'Description (optional)'} />
              </div>
            {/each}
          </div>

          <button class="btn primary" onclick={doFreeUpload}
            disabled={!freeUploads.some(u => u.label.trim())}>
            {#if isHacker}UPLOAD ALL ({freeUploads.length})
            {:else}📁 Add all {freeUploads.length} item{freeUploads.length > 1 ? 's' : ''} to inventory (free)
            {/if}
          </button>
        {/if}

      {:else}
        <div class="craft-done">
          <span class="done-icon">✨</span>
          <div>
            <div>{isHacker ? `// ${uploadedCount} item(s) uploaded` : `${uploadedCount} item${uploadedCount > 1 ? 's' : ''} added to your inventory!`}</div>
            <div class="done-sub">{isHacker ? '// equip from profile page' : 'Equip them from your profile page 🌿'}</div>
          </div>
          <button class="btn" onclick={() => { uploadDone = false; }}>
            {isHacker ? 'UPLOAD MORE' : '+ Upload more'}
          </button>
        </div>
      {/if}
    </div>

  {:else if appState.activeCraftsman}
    <!-- ══════ CRAFTSMAN CHAT ══════ -->
    <div class="chat-view">
      <div class="chat-header">
        <span class="npc-icon-sm">{activeCraft.icon}</span>
        <div>
          <div class="chat-name">{activeCraft.name}</div>
          <div class="chat-title">{isHacker ? activeCraft.title.toUpperCase().replace(/ /g,'_') : activeCraft.title}</div>
        </div>
        <div class="header-right">
          <span class="cost-badge">{isHacker ? `${activeCraft.cost}G/commission` : `💰${activeCraft.cost} per item`}</span>
          <button class="btn leave-btn" onclick={leaveCraftsman}>{isHacker ? 'EXIT (free)' : '← Leave (free)'}</button>
        </div>
      </div>

      <div class="chat-log">
        {#each conversation as msg}
          <div class="chat-msg {msg.role}">
            {#if msg.role === 'npc'}
              <span class="msg-name">{activeCraft.name}:</span>
            {:else}
              <span class="msg-name msg-you">{isHacker ? 'you:' : 'You:'}</span>
            {/if}
            <span class="msg-text">{msg.text}</span>
          </div>
        {/each}
      </div>

      {#if !submitted}
        <div class="craft-form">
          <div class="cf-label">
            {isHacker ? '// upload a PNG and name your commission' : 'Upload an image and name your item'}
          </div>

          <!-- Image upload zone -->
          <div class="upload-zone" class:has-image={!!uploadedImg}
            onclick={() => fileInput?.click()}
            onkeydown={e => e.key === 'Enter' && fileInput?.click()}
            role="button" tabindex="0">
            {#if uploadedImg}
              <img src={uploadedImg.dataUrl} alt="preview" class="upload-preview" />
              <span class="upload-replace">{isHacker ? '// click to replace' : 'Click to replace'}</span>
            {:else}
              <span class="upload-icon">📁</span>
              <span class="upload-hint">{isHacker ? '// click to upload PNG' : 'Click to upload your image (PNG, JPG)'}</span>
            {/if}
          </div>
          <input
            bind:this={fileInput}
            type="file"
            accept="image/*"
            style="display:none"
            onchange={onFileChange}
          />

          <input
            class="cf-input"
            type="text"
            bind:value={craftInput}
            placeholder={isHacker ? 'item name...' : 'Item name...'}
            onkeydown={e => e.key === 'Enter' && doSubmit()}
          />
          <input
            class="cf-input"
            type="text"
            bind:value={craftDesc}
            placeholder={isHacker ? 'description (optional)...' : 'Short description (optional)'}
          />

          <select class="cf-input cf-select" bind:value={craftLayerType}>
            <option value="">{isHacker ? '// layer: use craftsman default' : 'Layer: use craftsman default'}</option>
            {#each LAYER_TYPES as lt}
              <option value={lt.value}>{lt.label}</option>
            {/each}
          </select>

          <button class="btn primary" onclick={doSubmit} disabled={!craftInput.trim() || !uploadedImg}>
            {isHacker
              ? `COMMISSION (-${activeCraft.cost}G)`
              : `Commission this · 💰${activeCraft.cost} gold`}
          </button>
          <div class="cf-note">
            {isHacker
              ? '// gold deducted on commission · leaving is free'
              : 'You\'re only charged when you hit commission — leaving is always free 🌿'}
          </div>
        </div>
      {:else}
        <div class="craft-done">
          <span class="done-icon">✨</span>
          <div>
            <div>{isHacker ? '// item added to inventory' : 'Added to your inventory!'}</div>
            <div class="done-sub">{isHacker ? '// equip it from the profile page' : 'Equip it from your profile page'}</div>
          </div>
          <button class="btn" onclick={leaveCraftsman}>{isHacker ? 'EXIT' : '← Back to shop'}</button>
        </div>
      {/if}
    </div>
  {/if}

</div>

<style>
.shop-view { flex:1; overflow-y:auto; padding:16px; display:flex; flex-direction:column; gap:12px; }

.shop-header { display:flex; justify-content:space-between; align-items:flex-start; }
.view-title { font-size:16px; font-weight:600; color:var(--text); }
:global([data-theme="hacker"]) .view-title { font-family:var(--font-mono); color:var(--accent); font-size:13px; letter-spacing:1px; }
.view-sub { font-size:11px; color:var(--gold-color); font-family:var(--font-mono); margin-top:2px; }

.shop-tabs { display:flex; gap:4px; }
.stab {
  padding:5px 14px; font-size:12px; font-family:var(--font-ui);
  background:var(--bg3); border:1px solid var(--border);
  border-radius:var(--radius); color:var(--text3); cursor:pointer; transition:all .15s;
}
.stab:hover { color:var(--text2); }
.stab.active { background:var(--surface); border-color:var(--accent); color:var(--accent); }
:global([data-theme="hacker"]) .stab { font-family:var(--font-mono); font-size:10px; letter-spacing:.5px; }

/* Filters */
.filter-row { display:flex; gap:5px; flex-wrap:wrap; align-items:center; }
.filter-btn {
  padding:3px 9px; font-size:10px; font-family:var(--font-mono);
  background:var(--bg3); border:1px solid var(--border);
  border-radius:var(--radius); color:var(--text3); cursor:pointer; transition:all .12s;
}
.filter-btn:hover { border-color:var(--border2); }
.filter-btn.active { background:var(--bg2); border-color:var(--accent); color:var(--text); }
.filter-sep { width:1px; height:18px; background:var(--border); margin:0 3px; }

/* Items grid */
.items-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); gap:10px; }
.item-card {
  background:var(--surface); border:1px solid var(--border);
  border-radius:var(--radius-lg); padding:12px;
  display:flex; flex-direction:column; gap:5px; transition:all .15s;
}
.item-card:hover { border-color:var(--border2); box-shadow:var(--shadow); }
.item-card.owned { opacity:.55; }
.item-card.rarity-rare      { border-color:color-mix(in srgb,var(--accent3) 35%,var(--border)); }
.item-card.rarity-epic      { border-color:color-mix(in srgb,#aa44ff 35%,var(--border)); }
.item-card.rarity-legendary { border-color:color-mix(in srgb,var(--gold-color) 50%,var(--border)); box-shadow:0 0 8px color-mix(in srgb,var(--gold-color) 15%,transparent); }
.item-icon  { font-size:26px; text-align:center; }
.item-name  { font-size:12px; font-weight:600; color:var(--text); text-align:center; }
:global([data-theme="hacker"]) .item-name { font-family:var(--font-mono); font-size:10px; }
.item-desc  { font-size:10px; color:var(--text3); line-height:1.4; flex:1; }
:global([data-theme="hacker"]) .item-desc { font-family:var(--font-mono); }
.item-footer { display:flex; justify-content:space-between; align-items:center; margin-top:3px; }
.item-rarity { font-size:9px; font-family:var(--font-mono); }
.owned-badge { font-size:10px; color:var(--xp-color); font-family:var(--font-mono); }
.buy-btn {
  padding:3px 9px; font-size:10px; font-family:var(--font-mono);
  background:var(--accent); border:none; border-radius:var(--radius);
  color:var(--bg); cursor:pointer; font-weight:600; transition:opacity .15s;
}
.buy-btn:hover { opacity:.85; }
.buy-btn.cant { background:var(--bg3); color:var(--text3); border:1px solid var(--border); cursor:not-allowed; }

/* Craftsmen list */
.craft-intro { font-size:11px; color:var(--text3); font-family:var(--font-mono); line-height:1.6; }
.free-note   { color:var(--accent); font-size:10px; }
.craftsmen-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:10px; }
.npc-card {
  background:var(--surface); border:1px solid var(--border);
  border-radius:var(--radius-lg); padding:14px;
  display:flex; flex-direction:column; gap:7px; align-items:center; text-align:center;
  transition:border-color .15s;
}
.npc-card:hover { border-color:var(--border2); }
.npc-icon { font-size:32px; }
.npc-body { display:flex; flex-direction:column; gap:3px; }
.npc-name  { font-size:14px; font-weight:600; color:var(--text); }
:global([data-theme="hacker"]) .npc-name { font-family:var(--font-mono); color:var(--accent); font-size:12px; }
.npc-title { font-size:11px; color:var(--accent2); font-family:var(--font-mono); }
.npc-desc  { font-size:11px; color:var(--text2); }
:global([data-theme="hacker"]) .npc-desc { font-family:var(--font-mono); font-size:10px; }
.npc-personality { font-size:10px; color:var(--text3); font-family:var(--font-mono); font-style:italic; }
.npc-cost-note   { font-size:10px; color:var(--gold-color); font-family:var(--font-mono); }
.visit-btn { width:100%; justify-content:center; }

/* Chat */
.chat-view { display:flex; flex-direction:column; gap:10px; }
.chat-header {
  display:flex; align-items:center; gap:10px;
  padding:10px 14px; background:var(--bg2);
  border:1px solid var(--border); border-radius:var(--radius-lg);
}
.npc-icon-sm { font-size:22px; flex-shrink:0; }
.header-right { margin-left:auto; display:flex; align-items:center; gap:8px; }
.cost-badge { font-size:10px; font-family:var(--font-mono); color:var(--gold-color); }
.chat-name  { font-size:13px; font-weight:600; color:var(--text); }
:global([data-theme="hacker"]) .chat-name { font-family:var(--font-mono); color:var(--accent); font-size:11px; }
.chat-title { font-size:10px; color:var(--text3); font-family:var(--font-mono); }
.leave-btn  { flex-shrink:0; }

.chat-log {
  background:var(--surface); border:1px solid var(--border);
  border-radius:var(--radius-lg); padding:14px;
  display:flex; flex-direction:column; gap:10px; min-height:80px;
}
.chat-msg { display:flex; gap:7px; align-items:flex-start; }
.chat-msg.user { flex-direction:row-reverse; }
.msg-name { font-size:10px; font-family:var(--font-mono); color:var(--text3); flex-shrink:0; margin-top:3px; }
.msg-name.msg-you { color:var(--accent2); }
.msg-text {
  font-size:13px; color:var(--text); line-height:1.5;
  background:var(--bg3); border:1px solid var(--border);
  border-radius:var(--radius-lg); padding:8px 12px; max-width:85%;
}
:global([data-theme="hacker"]) .msg-text { font-family:var(--font-mono); font-size:11px; }
.chat-msg.user .msg-text { background:var(--bg2); border-color:var(--accent2); }
.chat-msg.npc  .msg-text { border-color:var(--border2); }

/* Commission form */
.craft-form {
  background:var(--surface); border:1px solid var(--border);
  border-radius:var(--radius-lg); padding:14px;
  display:flex; flex-direction:column; gap:9px;
}
.cf-label { font-size:11px; color:var(--text3); font-family:var(--font-mono); }

/* Upload zone */
.upload-zone {
  border:2px dashed var(--border); border-radius:var(--radius-lg);
  padding:16px; display:flex; flex-direction:column;
  align-items:center; gap:6px; cursor:pointer;
  transition:border-color .15s, background .15s;
  min-height:80px; justify-content:center;
  background:var(--bg3);
}
.upload-zone:hover { border-color:var(--accent); background:var(--bg2); }
.upload-zone.has-image { border-style:solid; border-color:var(--accent); padding:10px; }
.upload-icon  { font-size:24px; }
.upload-hint  { font-size:11px; color:var(--text3); font-family:var(--font-mono); text-align:center; }
.upload-preview { width:48px; height:48px; image-rendering:pixelated; border-radius:var(--radius); border:1px solid var(--border); }
.upload-replace { font-size:10px; color:var(--text3); font-family:var(--font-mono); }

.cf-input {
  background:var(--bg); border:1px solid var(--border); border-radius:var(--radius);
  color:var(--text); font-family:var(--font-ui); font-size:13px;
  padding:8px 10px; outline:none; transition:border-color .15s; width:100%;
}
.cf-input:focus { border-color:var(--accent); }
:global([data-theme="hacker"]) .cf-input { font-family:var(--font-mono); font-size:11px; }
.cf-note { font-size:10px; color:var(--text3); font-family:var(--font-mono); }

.craft-done {
  display:flex; align-items:center; gap:10px; padding:12px;
  background:var(--bg2); border:1px solid var(--accent);
  border-radius:var(--radius-lg); font-size:12px; color:var(--accent);
  font-family:var(--font-mono);
}
.done-icon { font-size:20px; }
.done-sub  { font-size:10px; color:var(--text3); margin-top:2px; }

.cf-select {
  appearance:none; -webkit-appearance:none;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23888'/%3E%3C/svg%3E");
  background-repeat:no-repeat; background-position:right 10px center;
  padding-right:28px; cursor:pointer;
}

.upload-panel { display:flex; flex-direction:column; gap:12px; }
.upload-panel-intro { font-size:11px; color:var(--text3); font-family:var(--font-mono); line-height:1.6; }

.upload-count-badge {
  font-size:10px; font-family:var(--font-mono); color:var(--accent);
  background:var(--bg2); border:1px solid var(--accent);
  border-radius:var(--radius); padding:2px 8px; margin-top:4px;
}

.queue-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(155px, 1fr)); gap:10px; }
.queue-card {
  background:var(--surface); border:1px solid var(--border);
  border-radius:var(--radius-lg); padding:10px 10px 9px;
  display:flex; flex-direction:column; gap:6px; position:relative;
  transition:border-color .15s;
}
.queue-card:hover { border-color:var(--border2); }
.queue-remove {
  position:absolute; top:5px; right:5px;
  background:none; border:none; color:var(--text3);
  font-size:15px; line-height:1; cursor:pointer;
  padding:1px 5px; border-radius:var(--radius);
}
.queue-remove:hover { color:var(--hp-color); background:var(--bg3); }
.queue-preview {
  width:48px; height:48px; image-rendering:pixelated;
  border-radius:var(--radius); border:1px solid var(--border);
  align-self:center; margin-bottom:2px;
}
.queue-name   { font-size:12px !important; padding:5px 8px !important; }
.queue-select { font-size:11px !important; padding:4px 26px 4px 8px !important; }
.queue-desc   { font-size:11px !important; padding:4px 8px !important; }
</style>