/* ============================================================
   apps/settings.js
   Toggles write straight into AppState.settings. The "Profil
   Cerita" section writes into AppState.profile — every field
   here is a {{token}} the story (core/story.js) can print.
   ============================================================ */
(function () {
  function getByPath(obj, path) {
    return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
  }

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, ch => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
  }

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

  function textRow(label, path, placeholder) {
    const value = getByPath(AppState.get(), path) || '';
    return `
      <div class="settings-field">
        <label class="settings-field-label">${label}</label>
        <input class="settings-field-input" type="text" data-path="${path}"
               value="${escapeHtml(value)}" placeholder="${placeholder || ''}">
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

          <div class="settings-section-title">Umum</div>
          ${toggleRow('Suara', 'sound')}
          ${toggleRow('Getar', 'vibration')}
          ${toggleRow('Lanjut Otomatis', 'autoAdvance')}
          <p class="settings-hint">Kalau dinyalakan, obrolan yang cuma punya satu pilihan jawaban akan lanjut sendiri tanpa perlu diketuk.</p>

          <div class="settings-section-title">Profil Cerita</div>
          <p class="settings-hint">Cuma identitas kamu sendiri yang diisi manual — nama-nama lain di cerita sudah ditentukan (lihat 10 karakter di kontak).</p>
          ${textRow('Nama kamu', 'profile.user.name', 'Nama kamu')}
          ${textRow('Ibu kamu', 'profile.userMom.name', 'Nama ibu kamu')}
          ${textRow('Ayah kamu', 'profile.userDad.name', 'Nama ayah kamu')}

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

    root.querySelectorAll('.settings-field-input').forEach(input => {
      input.addEventListener('change', () => {
        AppState.set(input.dataset.path, input.value.trim());
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
