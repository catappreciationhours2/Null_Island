<script>
  import { appState, buyItem, visitCraftsman, submitCustomItem, notify, NPC_CRAFTSMEN } from '$lib/stores/appState.svelte.js';

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

  // Craft state
  let craftInput   = $state('');
  let craftDesc    = $state('');
  let uploadedImg  = $state(null);   // { dataUrl, name }
  let submitted    = $state(false);
  let fileInput    = $state(null);
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
    submitCustomItem(craftInput.trim(), uploadedImg.dataUrl, craftDesc.trim());
    submitted   = true;
    craftInput  = '';
    craftDesc   = '';
    uploadedImg = null;
  }

  const TYPE_LABELS = { all:'All', weapon:'Weapons', clothing:'Clothing', accessory:'Accessories' };
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
</style>