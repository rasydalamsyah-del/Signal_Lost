/* ============================================================
   screens/bootAnimation.js
   Short "phone booting up" beat between Start and Home. Also
   chromeless. Auto-advances to home after the sequence finishes.
   ============================================================ */
(function () {
  const LINES = [
    'mencari sinyal...',
    'menghubungkan...',
    'memuat SignalOS...'
  ];

  function render(root) {
    root.innerHTML = `
      <div class="boot-screen">
        <div class="boot-logo">SL</div>
        <div class="boot-text" id="boot-text">${LINES[0]}</div>
        <div class="boot-bar"><div class="boot-bar-fill"></div></div>
      </div>
    `;

    const textEl = root.querySelector('#boot-text');
    let i = 0;
    const interval = setInterval(() => {
      i++;
      if (i < LINES.length) {
        textEl.textContent = LINES[i];
      }
    }, 500);

    setTimeout(() => {
      clearInterval(interval);
      if (Router.currentId() === 'boot') Router.replace('lock');
    }, 1700);
  }

  Router.register('boot', render);
})();