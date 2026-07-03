/* ============================================================
   apps/settings.js
   Toggles write straight into AppState.settings.
   ============================================================ */
(function () {
  function toggleRow(label, key) {
    const s = AppState.get();
    const on = s.settings[key];
    return `
      <div class="toggle-row">
        <span>${label}</span>
        <div class="toggle ${on ? 'on' : ''}" data-key="${key}">
          <div class="toggle-knob"></div>
        </div>
      </div>
    `;
  }

  function render(root) {
    root.innerHTML = `
      <div class="app-screen">
        <div class="app-header">
          <h1>Pengaturan</h1>
        </div>
        <div class="app-body">
          ${toggleRow('Suara', 'sound')}
          ${toggleRow('Getar', 'vibration')}
          <div style="margin-top:24px">
            <button class="btn btn-danger" id="btn-reset" style="width:100%">Hapus semua data</button>
          </div>
        </div>
      </div>
    `;

    root.querySelectorAll('.toggle').forEach(t => {
      t.addEventListener('click', () => {
        const key = t.dataset.key;
        AppState.set('settings.' + key, !AppState.get().settings[key]);
        render(root);
      });
    });

    root.querySelector('#btn-reset').addEventListener('click', () => {
      if (confirm('Hapus semua progres dan data tersimpan?')) {
        AppState.listSlots().forEach(s => AppState.deleteSlot(s.slot));
        AppState.reset();
        Router.navigate('start');
      }
    });
  }

  Router.register('settings', render);
})();
