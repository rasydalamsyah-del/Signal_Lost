/* ============================================================
   apps/location.js
   Simple placeholder "map" screen. Swap the placeholder box for
   a real map image/canvas per location as the story progresses.
   ============================================================ */
(function () {
  function render(root) {
    root.innerHTML = `
      <div class="app-screen">
        <div class="app-header">
          <h1>Location</h1>
          <span class="app-header-sub">GPS aktif</span>
        </div>
        <div class="app-body">
          <div style="
            height:220px;border-radius:16px;border:1px solid var(--hairline);
            background:
              repeating-linear-gradient(0deg, var(--static) 0 1px, transparent 1px 22px),
              repeating-linear-gradient(90deg, var(--static) 0 1px, transparent 1px 22px),
              var(--void);
            display:flex;align-items:center;justify-content:center;
            color:var(--dim);font-family:var(--font-mono);font-size:12px;margin-bottom:16px;
          ">
            [ peta placeholder ]
          </div>
          <div class="list-item">
            <div class="avatar">◈</div>
            <div class="list-item-main">
              <div class="list-item-title">Lokasi saat ini</div>
              <div class="list-item-sub">Tidak diketahui</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  Router.register('location', render);
})();
