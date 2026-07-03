/* ============================================================
   apps/snaply.js
   A social-feed app. Push entries into AppState.snaplyPosts to
   drip story clues, rumors, or reactions from other characters.
   ============================================================ */
(function () {
  function render(root) {
    const s = AppState.get();

    root.innerHTML = `
      <div class="app-screen">
        <div class="app-header">
          <h1>Snaply</h1>
          <span class="app-header-sub">${s.snaplyPosts.length} unggahan</span>
        </div>
        <div class="app-body" id="feed"></div>
      </div>
    `;

    const feed = root.querySelector('#feed');
    if (s.snaplyPosts.length === 0) {
      feed.innerHTML = `<div class="empty-state"><div class="empty-glyph">${ICONS.snaply}</div><p>Feed masih sepi.</p></div>`;
      return;
    }

    s.snaplyPosts.forEach(p => {
      const card = document.createElement('div');
      card.className = 'list-item';
      card.innerHTML = `
        <div class="avatar">${p.author[0]}</div>
        <div class="list-item-main">
          <div class="list-item-title">${p.author}</div>
          <div class="list-item-sub" style="white-space:normal">${p.caption}</div>
        </div>
        <div class="list-item-meta">${p.time}</div>
      `;
      feed.appendChild(card);
    });
  }

  Router.register('snaply', render);
})();
