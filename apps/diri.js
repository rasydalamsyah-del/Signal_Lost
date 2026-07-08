/* ============================================================
   apps/diri.js
   "Diri" app — 2 tab: Status (bar stat: kesenangan/kesedihan/
   cemburu/keuangan milik user + love/trust tiap 10 karakter) dan
   Identitas (bio user yang keisi berangsur-angsur dari efek cerita,
   + lihat identitas 10 karakter lain — terkunci/blur sampai cukup
   dekat). Lihat RANCANGAN_MULTI_KARAKTER.md §6 buat rancangan
   lengkapnya.

   Data dibaca langsung dari AppState.selfStats / selfIdentity /
   characters (dibangun dari core/characters.js — lihat Langkah 1-3).
   Belum ada UI buat MENGISI data ini secara manual — semuanya
   berubah lewat efek cerita (adjustStat/revealIdentity, lihat
   core/story.js), app ini murni "read-only viewer".
   ============================================================ */
(function () {
  let activeTab = 'status';     // 'status' | 'identitas'
  let selectedCharId = null;    // saat lagi lihat detail 1 karakter di tab Identitas

  const SELF_STAT_ROWS = [
    { key: 'happiness', label: 'Kesenangan' },
    { key: 'sadness',   label: 'Kesedihan' },
    { key: 'jealousy',  label: 'Cemburu' }
  ];
  // ---- kebutuhan & pengembangan diri (RANCANGAN_MULTI_KARAKTER.md §11.2) ----
  const NEEDS_STAT_ROWS = [
    { key: 'energi',     label: 'Energi' },
    { key: 'lapar',      label: 'Lapar' },
    { key: 'kesehatan',  label: 'Kesehatan' },
    { key: 'kebersihan', label: 'Kebersihan' }
  ];
  const GROWTH_STAT_ROWS = [
    { key: 'kepintaran', label: 'Kepintaran' },
    { key: 'kekuatan',   label: 'Kekuatan' }
  ];
  const IDENTITY_FIELDS = [
    { key: 'pekerjaan', label: 'Pekerjaan' },
    { key: 'hobi',      label: 'Hobi' },
    { key: 'citaCita',  label: 'Cita-cita' }
  ];

  function clamp(n) { return Math.max(0, Math.min(100, n || 0)); }
  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, ch => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
  }
  function formatMoney(n) { return 'Rp' + (n || 0).toLocaleString('id-ID'); }

  function bar(pct, extraClass) {
    return `<div class="diri-bar"><div class="diri-bar-fill ${extraClass || ''}" style="width:${clamp(pct)}%"></div></div>`;
  }

  // ---- Tab 1: Status ----
  function renderStatusTab() {
    const s = AppState.get();
    const self = s.selfStats;

    const selfRows = SELF_STAT_ROWS.map(r => `
      <div class="diri-stat-row">
        <span class="diri-stat-label">${r.label}</span>
        ${bar(self[r.key], r.key === 'jealousy' ? 'diri-bar-warn' : '')}
        <span class="diri-stat-num">${clamp(self[r.key])}</span>
      </div>
    `).join('');

    // needs stats turn warning-red when running low (< 30) — a quiet
    // visual nudge that something needs attention (sleep/eat/etc),
    // without any pop-up/interruption.
    const needsRows = NEEDS_STAT_ROWS.map(r => {
      const v = clamp(self[r.key]);
      return `
        <div class="diri-stat-row">
          <span class="diri-stat-label">${r.label}</span>
          ${bar(v, v < 30 ? 'diri-bar-warn' : '')}
          <span class="diri-stat-num">${v}</span>
        </div>
      `;
    }).join('');

    const growthRows = GROWTH_STAT_ROWS.map(r => `
      <div class="diri-stat-row">
        <span class="diri-stat-label">${r.label}</span>
        ${bar(self[r.key])}
        <span class="diri-stat-num">${clamp(self[r.key])}</span>
      </div>
    `).join('');

    const charCards = allCharacterIds().map(id => {
      const c = s.characters[id];
      const def = CHARACTERS[id];
      const met = c.lastInteractedDay !== null;
      return `
        <div class="diri-char-card">
          <div class="diri-char-head">
            <span class="diri-char-avatar">${def.avatar}</span>
            <span class="diri-char-name">${met ? escapeHtml(def.name) : '???'}</span>
          </div>
          <div class="diri-stat-row">
            <span class="diri-stat-label">Love</span>
            ${bar(c.stats.love, 'diri-bar-love')}
            <span class="diri-stat-num">${c.stats.love}</span>
          </div>
          <div class="diri-stat-row">
            <span class="diri-stat-label">Trust</span>
            ${bar(c.stats.trust, 'diri-bar-trust')}
            <span class="diri-stat-num">${c.stats.trust}</span>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="diri-section-title">Kondisi Kamu</div>
      ${selfRows}
      <div class="diri-stat-row">
        <span class="diri-stat-label">Keuangan</span>
        <span class="diri-money">${formatMoney(self.money)}</span>
      </div>

      <div class="diri-section-title">Kebutuhan</div>
      ${needsRows}

      <div class="diri-section-title">Pengembangan Diri</div>
      ${growthRows}

      <div class="diri-section-title">Hubungan</div>
      <p class="diri-hint">Nama & angka baru kelihatan jelas setelah kamu mulai kenal orangnya.</p>
      <div class="diri-char-grid">${charCards}</div>
    `;
  }

  // ---- Tab 2: Identitas ----
  function fieldRow(label, value) {
    return `
      <div class="diri-id-row">
        <span class="diri-id-label">${label}</span>
        <span class="diri-id-value">${value ? escapeHtml(value) : '???'}</span>
      </div>
    `;
  }

  function renderIdentitasList() {
    const s = AppState.get();
    const self = s.selfIdentity;
    const partnerName = self.pasangan && CHARACTERS[self.pasangan] ? CHARACTERS[self.pasangan].name : null;

    const charButtons = allCharacterIds().map(id => {
      const c = s.characters[id];
      const def = CHARACTERS[id];
      const met = c.lastInteractedDay !== null;
      const unlockedN = c.identityUnlocked.length;
      return `
        <button class="diri-char-list-item" data-char="${id}" ${met ? '' : 'disabled'}>
          <span class="diri-char-avatar">${def.avatar}</span>
          <span class="diri-char-list-name">${met ? escapeHtml(def.name) : '???'}</span>
          <span class="diri-char-list-meta">${met ? unlockedN + '/' + IDENTITY_FIELDS.length + ' terbuka' : ICONS.lock}</span>
        </button>
      `;
    }).join('');

    return `
      <div class="diri-section-title">Identitas Kamu</div>
      ${fieldRow('Pekerjaan', self.pekerjaan)}
      ${fieldRow('Hobi', self.hobi)}
      ${fieldRow('Cita-cita', self.citaCita)}
      ${fieldRow('Pasangan', partnerName)}

      <div class="diri-section-title">Karakter Lain</div>
      <p class="diri-hint">Detailnya kebuka pelan-pelan sesuai seberapa dekat kamu sama orangnya.</p>
      <div class="diri-char-list">${charButtons}</div>
    `;
  }

  function renderCharacterDetail(charId) {
    const s = AppState.get();
    const c = s.characters[charId];
    const def = CHARACTERS[charId];
    if (!c || !def) return renderIdentitasList(); // guard against a stale/bad id

    const rows = IDENTITY_FIELDS.map(f => {
      const unlocked = c.identityUnlocked.includes(f.key);
      return `
        <div class="diri-id-row">
          <span class="diri-id-label">${f.label}</span>
          <span class="diri-id-value ${unlocked ? '' : 'diri-id-locked'}">
            ${unlocked ? escapeHtml(c.identity[f.key] || '???') : ICONS.lock + ' terkunci'}
          </span>
        </div>
      `;
    }).join('');

    return `
      <button class="diri-back-btn" id="diri-back">${ICONS.arrowBack} Kembali</button>
      <div class="diri-section-title">${escapeHtml(def.name)}</div>
      ${rows}
    `;
  }

  function renderIdentitasTab() {
    return selectedCharId ? renderCharacterDetail(selectedCharId) : renderIdentitasList();
  }

  // ---- shell ----
  function paint(root) {
    root.innerHTML = `
      <div class="app-screen diri-screen">
        <div class="app-header"><h1>Diri</h1></div>
        <div class="diri-tabs">
          <button class="diri-tab ${activeTab === 'status' ? 'active' : ''}" data-tab="status">Status</button>
          <button class="diri-tab ${activeTab === 'identitas' ? 'active' : ''}" data-tab="identitas">Identitas</button>
        </div>
        <div class="app-body">
          ${activeTab === 'status' ? renderStatusTab() : renderIdentitasTab()}
        </div>
      </div>
    `;
    wire(root);
  }

  function wire(root) {
    root.querySelectorAll('.diri-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        activeTab = btn.dataset.tab;
        selectedCharId = null; // switching tabs always drops back to the top-level view
        paint(root);
      });
    });
    const back = root.querySelector('#diri-back');
    if (back) back.addEventListener('click', () => { selectedCharId = null; paint(root); });
    root.querySelectorAll('.diri-char-list-item').forEach(btn => {
      if (btn.disabled) return;
      btn.addEventListener('click', () => { selectedCharId = btn.dataset.char; paint(root); });
    });
  }

  function mount(root) {
    selectedCharId = null; // opening the app fresh never lands mid-detail from a past visit
    paint(root);
  }

  Router.register('diri', mount);
})();
