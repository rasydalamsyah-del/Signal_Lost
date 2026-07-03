/* ============================================================
   apps/stremly.js
   Streaming app. Each stream in AppState.stremlyStreams can be
   "live" or not — good for scheduled story beats.
   ============================================================ */
(function () {
  function render(root) {
    const s = AppState.get();

    root.innerHTML = `
      <div class="app-screen">
        <div class="app-header">
          <h1>Stremly</h1>
          <span class="app-header-sub">${s.stremlyStreams.filter(x=>x.live).length} live</span>
        </div>
        <div class="app-body" id="streams"></div>
      </div>
    `;

    const list = root.querySelector('#streams');
    if (s.stremlyStreams.length === 0) {
      list.innerHTML = `<div class="empty-state"><div class="empty-glyph">▶</div><p>Tidak ada siaran.</p></div>`;
      return;
    }

    s.stremlyStreams.forEach(st => {
      const row = document.createElement('div');
      row.className = 'list-item';
      row.innerHTML = `
        <div class="avatar" style="background:${st.live ? 'var(--interference)' : 'var(--static-2)'}">▶</div>
        <div class="list-item-main">
          <div class="list-item-title">${st.title}</div>
          <div class="list-item-sub">${st.live ? st.viewers + ' menonton' : 'offline'}</div>
        </div>
      `;
      list.appendChild(row);
    });
  }

  Router.register('stremly', render);
})();
