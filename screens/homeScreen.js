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
    { id: 'diri', label: 'Diri' },
    { id: 'pekerjaan', label: 'Pekerjaan' },
    { id: 'settings', label: 'Pengaturan' }
  ];

  // day/time text now comes from core/state.js's dayOfWeek() + AppState
  // (in-game clock), not a real-device Date() — see render() below.

  function badgeFor(app) {
    const s = AppState.get();
    if (app.id === 'contacts') {
      const n = s.contacts.filter(c => c.isNew).length;
      return n > 0 ? n : null;
    }
    if (app.id === 'dashchat') {
      // a chat is "unread" only if the player has never opened it yet —
      // NOT based on who sent the last message (a finished conversation
      // almost always ends with a line from the other person, so that
      // would keep the badge stuck on forever after the story is done).
      const n = s.contacts.filter(c => c.isNew && s.chats[c.id]).length;
      return n > 0 ? n : null;
    }
    return null;
  }

  function render(root) {
    // Home screen's big clock/date — this MUST use the in-game
    // fictional clock (phone.time / meta.day), same as statusBar.js,
    // dashchat.js message timestamps, and screens/timeSkip.js. Using
    // the real device Date() here (as this used to) is what caused a
    // real bug report: job schedules (core/jobs.js) are matched
    // against the in-game weekday, so showing the REAL weekday here
    // ("Kamis") while a job scheduled for "Senin/Jumat/Minggu" was
    // still workable looked exactly like a scheduling bug, when it
    // was actually just this display reading the wrong clock. See
    // RANCANGAN_MULTI_KARAKTER.md §10.3 bug notes.
    const s = AppState.get();
    const t = s.phone.time;
    const timeStr = String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0');
    const dateStr = `${dayOfWeek(s.meta.day)}, Hari ke-${s.meta.day}`;

    root.innerHTML = `
      <div class="home-screen">
        <div class="home-time">
          <div class="h-clock">${timeStr}</div>
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
        Notify.show({
          title: 'Asisten',
          body: 'Pesan baru masuk...',
          onClick: () => Router.navigate('dashchat', { chatId: 'assistant' })
        });
        AppState.set('flags.assistantNotifShown', true);
      }, 900);
    }
  }

  Router.register('home', render);
})();