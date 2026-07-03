/* ============================================================
   apps/gallery.js
   Grid of saved images/screenshots. Push into AppState.gallery
   as { id, caption, time } when the story wants to "save" a moment.
   ============================================================ */
(function () {
  function render(root) {
    const s = AppState.get();

    root.innerHTML = `
      <div class="app-screen">
        <div class="app-header">
          <h1>Gallery</h1>
          <span class="app-header-sub">${s.gallery.length} item</span>
        </div>
        <div class="app-body" id="grid"></div>
      </div>
    `;

    const grid = root.querySelector('#grid');
    if (s.gallery.length === 0) {
      grid.innerHTML = `<div class="empty-state"><div class="empty-glyph">${ICONS.gallery}</div><p>Belum ada foto tersimpan.</p></div>`;
      return;
    }

    grid.classList.add('gallery-grid');
    s.gallery.forEach(g => {
      const cell = document.createElement('div');
      cell.className = 'gallery-cell';
      cell.textContent = g.caption || '···';
      grid.appendChild(cell);
    });
  }

  Router.register('gallery', render);
})();
