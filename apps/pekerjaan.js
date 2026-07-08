/* ============================================================
   apps/pekerjaan.js
   "Pekerjaan" app — persistent job postings unlocked via dialogue
   (see core/story.js's `unlockJobPosting` effect), shown here with
   their weekly day+hour schedule. See core/jobs.js for the actual
   schedule-matching / work / miss-tracking / firing logic, and
   RANCANGAN_MULTI_KARAKTER.md §10.3 for the full design.

   This app is a thin view over core/jobs.js — it doesn't own any
   logic itself beyond rendering and wiring the "Kerjakan" button.
   ============================================================ */
(function () {
  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, ch => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
  }
  function formatMoney(n) { return 'Rp' + (n || 0).toLocaleString('id-ID'); }

  function statusOf(posting) {
    if (posting.firedForever) return { label: 'Dipecat', cls: 'job-status-fired' };
    if (posting.type === 'onceForever' && posting.completedOnce) return { label: 'Selesai', cls: 'job-status-done' };
    if (Jobs.isActiveNow(posting)) {
      return Jobs.alreadyWorkedToday(posting)
        ? { label: 'Udah dikerjain hari ini', cls: 'job-status-worked' }
        : { label: 'Aktif sekarang', cls: 'job-status-active' };
    }
    return { label: 'Nunggu jadwal', cls: 'job-status-waiting' };
  }

  function card(posting) {
    const def = CHARACTERS[posting.charId];
    const status = statusOf(posting);
    const active = Jobs.isActiveNow(posting) && !Jobs.alreadyWorkedToday(posting) && !posting.firedForever;
    return `
      <div class="job-card ${active ? 'job-card-active' : ''}">
        <div class="job-card-head">
          <span class="job-title">${escapeHtml(posting.title)}</span>
          <span class="job-status ${status.cls}">${status.label}</span>
        </div>
        <div class="job-meta">dari ${def ? escapeHtml(def.name) : '???'} · ${formatMoney(posting.salary)}</div>
        <div class="job-schedule">${escapeHtml(Jobs.scheduleText(posting))}</div>
        ${posting.type === 'onceForever' ? '<div class="job-meta job-meta-tag">Sekali seumur hidup</div>' : ''}
        <button class="job-work-btn" data-id="${posting.id}" ${active ? '' : 'disabled'}>
          ${active ? 'Kerjakan' : status.label}
        </button>
      </div>
    `;
  }

  function paint(root) {
    Jobs.reconcileAll(); // catch up on any missed schedule windows since last opened
    const postings = Jobs.list();

    root.innerHTML = `
      <div class="app-screen pekerjaan-screen">
        <div class="app-header"><h1>Pekerjaan</h1></div>
        <div class="app-body">
          ${postings.length === 0 ? `
            <p class="job-empty">Belum ada lowongan kerja. Deketin salah satu karakter dulu — kalau kepercayaannya udah cukup, biasanya mereka nawarin kerjaan.</p>
          ` : postings.map(card).join('')}
        </div>
      </div>
    `;

    root.querySelectorAll('.job-work-btn').forEach(btn => {
      if (btn.disabled) return;
      btn.addEventListener('click', () => {
        const result = Jobs.work(btn.dataset.id);
        if (result.ok) paint(root); // refresh to show updated status/money
      });
    });
  }

  Router.register('pekerjaan', paint);
})();
