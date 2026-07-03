/* ============================================================
   screens/homeScreen.js
   The hub screen. Add/remove entries in APPS to add/remove
   "apps" from the home grid — each id must match a Router
   registration made in apps/*.js.
   ============================================================ */
(function () {
  const APPS = [
    { id: 'dashchat', label: 'DashChat', glyph: '◐', cls: 'icon-dashchat', badgeKey: 'unreadChats' },
    { id: 'contacts', label: 'Kontak', glyph: '☰', cls: 'icon-contacts', badgeKey: 'newContacts' },
    { id: 'snaply', label: 'Snaply', glyph: '◎', cls: 'icon-snaply' },
    { id: 'stremly', label: 'Stremly', glyph: '▶', cls: 'icon-stremly' },
    { id: 'gallery', label: 'Gallery', glyph: '▧', cls: 'icon-gallery' },
    { id: 'storage', label: 'Storage', glyph: '⇊', cls: 'icon-storage' },
    { id: 'myshop', label: 'MyShop', glyph: '$', cls: 'icon-myshop' },
    { id: 'location', label: 'Location', glyph: '◈', cls: 'icon-location' },
    { id: 'calendar', label: 'Kalender', glyph: '▦', cls: 'icon-calendar' },
    { id: 'settings', label: 'Pengaturan', glyph: '⚙', cls: 'icon-settings' }
  ];

  const DAY_NAMES = ['Minggu','Senin','Selasa','Rabu','Kamis',"Jum'at",'Sabtu'];
  const MONTH_NAMES = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

  function badgeFor(app) {
    const s = AppState.get();
    if (app.id === 'contacts') {
      const n = s.contacts.filter(c => c.isNew).length;
      return n > 0 ? n : null;
    }
    if (app.id === 'dashchat') {
      // naive "unread" heuristic: last message is from "them"
      let n = 0;
      Object.values(s.chats).forEach(c => {
        const last = c.messages[c.messages.length - 1];
        if (last && last.from === 'them') n++;
      });
      return n > 0 ? n : null;
    }
    return null;
  }

  function render(root) {
    const now = new Date();
    const dateStr = `${DAY_NAMES[now.getDay()]}, ${now.getDate()} ${MONTH_NAMES[now.getMonth()]}`;

    root.innerHTML = `
      <div class="home-screen">
        <div class="home-time">
          <div class="h-clock">${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}</div>
          <div class="h-date">${dateStr}</div>
        </div>
        <div class="app-grid">
          ${APPS.map(app => {
            const badge = badgeFor(app);
            return `
            <button class="app-icon" data-app="${app.id}">
              <span class="app-icon-glyph ${app.cls}">
                ${app.glyph}
                ${badge ? `<span class="app-icon-badge">${badge}</span>` : ''}
              </span>
              <span class="app-icon-label">${app.label}</span>
            </button>`;
          }).join('')}
        </div>
      </div>
    `;

    root.querySelectorAll('.app-icon').forEach(btn => {
      btn.addEventListener('click', () => Router.navigate(btn.dataset.app));
    });
  }

  Router.register('home', render);
})();
