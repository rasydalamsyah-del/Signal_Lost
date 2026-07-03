/* ============================================================
   apps/calendar.js
   Simple upcoming-events list. Push into AppState.calendar as
   { date:'YYYY-MM-DD', title } to schedule story beats/deadlines.
   ============================================================ */
(function () {
  function render(root) {
    const s = AppState.get();
    const sorted = [...s.calendar].sort((a, b) => a.date.localeCompare(b.date));

    root.innerHTML = `
      <div class="app-screen">
        <div class="app-header">
          <h1>Kalender</h1>
          <span class="app-header-sub">Hari ${s.meta.day}</span>
        </div>
        <div class="app-body" id="cal-list"></div>
      </div>
    `;

    const list = root.querySelector('#cal-list');
    if (sorted.length === 0) {
      list.innerHTML = `<div class="empty-state"><div class="empty-glyph">${ICONS.calendar}</div><p>Tidak ada jadwal.</p></div>`;
      return;
    }

    sorted.forEach(ev => {
      const row = document.createElement('div');
      row.className = 'cal-day';
      row.innerHTML = `
        <div class="cal-day-label">${ev.date}</div>
        <div class="cal-event">${ev.title}</div>
      `;
      list.appendChild(row);
    });
  }

  Router.register('calendar', render);
})();
