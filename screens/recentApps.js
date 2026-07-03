/* ============================================================
   screens/recentApps.js
   Shows apps opened recently with their real icon, lets the
   player jump back into one, or dismiss it from the stack —
   good horror/mystery hook if an app "reopens itself".
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
        <div class="recent-stack" id="recent-list"></div>
      </div>
    `;

    const list = root.querySelector('#recent-list');

    if (recents.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <div class="empty-glyph">${ICONS.recent}</div>
          <p>Belum ada aplikasi yang dibuka.</p>
        </div>`;
      return;
    }

    recents.forEach(r => {
      const [from, to] = ICON_BG[r.id] || ['#5DEFDF', '#2BB8AA'];
      const card = document.createElement('div');
      card.className = 'recent-card';
      card.innerHTML = `
        <div class="recent-card-icon" style="background:linear-gradient(155deg, ${from}, ${to})">${ICONS[r.id] || ''}</div>
        <div class="recent-card-body">
          <div class="recent-card-name">${NAMES[r.id] || r.id}</div>
          <div class="recent-card-time">${timeAgo(r.time)}</div>
        </div>
        <button class="recent-card-close" aria-label="Tutup">${ICONS.close}</button>
      `;
      card.querySelector('.recent-card-body').addEventListener('click', () => Router.navigate(r.id, r.params));
      card.querySelector('.recent-card-icon').addEventListener('click', () => Router.navigate(r.id, r.params));
      card.querySelector('.recent-card-close').addEventListener('click', (e) => {
        e.stopPropagation();
        card.remove();
        Router.forgetRecent(r.id);
      });
      list.appendChild(card);
    });
  }

  Router.register('recent', render);
})();