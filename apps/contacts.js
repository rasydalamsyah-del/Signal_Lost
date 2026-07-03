/* ============================================================
   apps/contacts.js
   Story hook: push a new entry into AppState contacts with
   isNew:true to badge the Home icon and this list — good for
   "unknown number just added themselves" beats.
   ============================================================ */
(function () {
  function render(root) {
    const s = AppState.get();

    root.innerHTML = `
      <div class="app-screen">
        <div class="app-header">
          <h1>Kontak</h1>
          <span class="app-header-sub">${s.contacts.length} tersimpan</span>
        </div>
        <div class="app-body" id="contact-list"></div>
      </div>
    `;

    const list = root.querySelector('#contact-list');
    if (s.contacts.length === 0) {
      list.innerHTML = `<div class="empty-state"><div class="empty-glyph">${ICONS.contacts}</div><p>Belum ada kontak.</p></div>`;
      return;
    }

    s.contacts.forEach(c => {
      const row = document.createElement('div');
      row.className = 'list-item';
      row.innerHTML = `
        <div class="avatar">${c.avatar || c.name[0]}</div>
        <div class="list-item-main">
          <div class="list-item-title">${c.name} ${c.isNew ? '<span style="color:var(--interference);font-size:10px">● baru</span>' : ''}</div>
          <div class="list-item-sub">${c.lastUpdate || ''}</div>
        </div>
      `;
      row.style.cursor = 'pointer';
      row.addEventListener('click', () => {
        c.isNew = false;
        if (s.chats[c.id]) Router.navigate('dashchat', { chatId: c.id });
      });
      list.appendChild(row);
    });
  }

  Router.register('contacts', render);
})();
