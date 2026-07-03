/* ============================================================
   screens/startScreen.js
   First thing the player sees. No status bar / nav bar (chromeless).
   ============================================================ */
(function () {
  function render(root) {
    const hasSave = AppState.listSlots().length > 0;

    root.innerHTML = `
      <div class="start-screen">
        <div class="start-static"></div>
        <div>
          <div class="start-title">SIGNAL<br><span>LOST</span></div>
          <div class="start-tagline">// koneksi terakhir: tidak diketahui</div>
        </div>
        <div class="start-actions">
          <button class="btn btn-primary" id="btn-start">Mulai</button>
          <button class="btn" id="btn-continue" ${hasSave ? '' : 'disabled style="opacity:.4"'}>Lanjutkan</button>
          <button class="btn" id="btn-settings">Pengaturan</button>
        </div>
      </div>
    `;

    root.querySelector('#btn-start').addEventListener('click', () => {
      AppState.reset();
      Router.navigate('boot');
    });

    if (hasSave) {
      root.querySelector('#btn-continue').addEventListener('click', () => {
        AppState.load('autosave');
        Router.navigate('boot');
      });
    }

    root.querySelector('#btn-settings').addEventListener('click', () => {
      // settings from the start screen: jump straight into the app,
      // but keep the start screen underneath in history
      Router.navigate('settings');
    });
  }

  Router.register('start', render);
})();
