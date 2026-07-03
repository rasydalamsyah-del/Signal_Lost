/* ============================================================
   apps/storage.js
   Save/load system. Reuses AppState.save()/load()/listSlots().
   ============================================================ */
(function () {
  function render(root) {
    root.innerHTML = `
      <div class="app-screen">
        <div class="app-header">
          <h1>Storage</h1>
          <span class="app-header-sub">save / load</span>
        </div>
        <div class="app-body">
          <button class="btn btn-primary" id="btn-save" style="width:100%;margin-bottom:16px">Simpan permainan sekarang</button>
          <div id="slots"></div>
        </div>
      </div>
    `;

    function paintSlots() {
      const slotsEl = root.querySelector('#slots');
      const slots = AppState.listSlots();
      if (slots.length === 0) {
        slotsEl.innerHTML = `<div class="empty-state"><div class="empty-glyph">${ICONS.storage}</div><p>Belum ada data tersimpan.</p></div>`;
        return;
      }
      slotsEl.innerHTML = '';
      slots.forEach(s => {
        const date = new Date(s.savedAt);
        const div = document.createElement('div');
        div.className = 'save-slot';
        div.innerHTML = `
          <div class="save-slot-info">
            <div class="save-slot-title">${s.slot}</div>
            <div class="save-slot-time">${date.toLocaleString('id-ID')}</div>
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn" data-act="load">Muat</button>
            <button class="btn btn-danger" data-act="del">Hapus</button>
          </div>
        `;
        div.querySelector('[data-act="load"]').addEventListener('click', () => {
          AppState.load(s.slot);
          Router.home();
        });
        div.querySelector('[data-act="del"]').addEventListener('click', () => {
          AppState.deleteSlot(s.slot);
          paintSlots();
        });
        slotsEl.appendChild(div);
      });
    }

    root.querySelector('#btn-save').addEventListener('click', () => {
      AppState.save('autosave');
      paintSlots();
    });

    paintSlots();
  }

  Router.register('storage', render);
})();
