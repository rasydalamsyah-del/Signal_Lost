/* ============================================================
   screens/recentApps.js
   Shows apps opened recently, lets the player jump back into one
   (or notice one opened "by itself" — good horror/mystery hook).
   ============================================================ */
(function () {
  const NAMES = {
    dashchat: 'DashChat', contacts: 'Kontak', snaply: 'Snaply', stremly: 'Stremly',
    gallery: 'Gallery', storage: 'Storage', myshop: 'MyShop', location: 'Location',
    calendar: 'Kalender', settings: 'Pengaturan'
  };

  function timeAgo(date) {
    const s = Math.floor((Date.now() - date.getTime()) / 1000);
    if (s < 60) return 'baru saja';
    const m = Math.floor(s / 60);
    return m + ' menit lalu';
  }

  function render(root) {
    const recents = Router.getRecentApps();

    root.innerHTML = `
      <div class="recent-screen">
        <div class="recent-title">Aplikasi terbaru</div>
        <div id="recent-list"></div>
      </div>
    `;

    const list = root.querySelector('#recent-list');

    if (recents.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <div class="empty-glyph">∅</div>
          <p>Belum ada aplikasi yang dibuka.</p>
        </div>`;
      return;
    }

    recents.forEach(r => {
      const card = document.createElement('button');
      card.className = 'recent-card';
      card.style.width = '100%';
      card.style.textAlign = 'left';
      card.style.color = 'inherit';
      card.innerHTML = `
        <div>
          <div class="recent-card-name">${NAMES[r.id] || r.id}</div>
          <div class="recent-card-time">${timeAgo(r.time)}</div>
        </div>
        <span style="color:var(--dim)">→</span>
      `;
      card.addEventListener('click', () => Router.navigate(r.id, r.params));
      list.appendChild(card);
    });
  }

  Router.register('recent', render);
})();
