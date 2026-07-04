/* ============================================================
   screens/homeScreen.js
   The hub screen. Add/remove entries in APPS to add/remove
   "apps" from the home grid — each id must match a Router
   registration made in apps/*.js, an ICONS[id] SVG, and an
   ICON_BG[id] gradient pair in assets/icons.js.
   ============================================================ */
(function () {
  const APPS = [
    { id: 'dashchat', label: 'DashChat' },
    { id: 'contacts', label: 'Kontak' },
    { id: 'snaply', label: 'Snaply' },
    { id: 'stremly', label: 'Stremly' },
    { id: 'gallery', label: 'Gallery' },
    { id: 'storage', label: 'Storage' },
    { id: 'myshop', label: 'MyShop' },
    { id: 'location', label: 'Location' },
    { id: 'calendar', label: 'Kalender' },
    { id: 'settings', label: 'Pengaturan' }
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
      let n = 0;
      Object.keys(s.chats).forEach(id => {
        const chat = s.chats[id];
        const contact = s.contacts.find(c => c.id === id);
        const last = chat.messages[chat.messages.length - 1];
        const unread = (contact && contact.isNew) || (last && last.from === 'them');
        if (unread) n++;
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
            const [from, to] = ICON_BG[app.id];
            return `
            <button class="app-icon" data-app="${app.id}">
              <span class="app-icon-glyph" style="background:linear-gradient(155deg, ${from}, ${to})">
                ${ICONS[app.id]}
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

    // first time ever reaching Home: fire the "pesan baru" banner for the
    // Asisten thread. Gated by a flag so it only ever happens once.
    if (!AppState.get().flags.assistantNotifShown) {
      setTimeout(() => {
        if (Router.currentId() !== 'home') return;
        Notify.show({ title: 'Asisten', body: 'Pesan baru masuk...' });
        AppState.set('flags.assistantNotifShown', true);
      }, 900);
    }
  }

  Router.register('home', render);
})();