/* ============================================================
   screens/statusBar.js
   Keeps the clock ticking and reflects AppState.phone (network /
   battery) into the status bar. Also usable by the story to
   trigger "signal lost" moments (drop network to 0).
   ============================================================ */
(function () {
  function pad(n) { return n.toString().padStart(2, '0'); }

  function renderClock() {
    const el = document.getElementById('status-clock');
    if (!el) return;
    const now = new Date();
    el.textContent = pad(now.getHours()) + ':' + pad(now.getMinutes());
  }

  function renderNetwork() {
    const el = document.getElementById('status-network');
    if (!el) return;
    const bars = AppState.get().phone.network;
    const glyphs = ['✕', '▂', '▂▄', '▂▄▆', '▂▄▆█'];
    el.textContent = glyphs[Math.max(0, Math.min(4, bars))];
    el.style.color = bars === 0 ? 'var(--interference)' : 'var(--signal)';
  }

  function renderBattery() {
    const fill = document.getElementById('status-battery-fill');
    if (!fill) return;
    const pct = AppState.get().phone.battery;
    fill.style.width = pct + '%';
    fill.style.background = pct <= 15 ? 'var(--interference)' : 'var(--signal)';
  }

  function renderAll() { renderClock(); renderNetwork(); renderBattery(); }

  document.addEventListener('DOMContentLoaded', () => {
    renderAll();
    setInterval(renderClock, 1000 * 15);
    AppState.subscribe(renderAll);
  });

  // exposed so story scripts can do StatusBar.glitch() during a "lost signal" beat
  window.StatusBar = {
    glitch() {
      const flash = document.getElementById('glitch-flash');
      flash.classList.remove('active'); void flash.offsetWidth; flash.classList.add('active');
    }
  };
})();
