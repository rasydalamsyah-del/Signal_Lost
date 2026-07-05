/* ============================================================
   screens/statusBar.js
   Reflects AppState.phone (in-game clock / network / battery)
   into the status bar, using real SVG icons from assets/icons.js.
   Also drives the dynamic-island "live" pulse.

   The clock is FICTIONAL (AppState.phone.time, minutes since
   midnight) — not the real device clock. It only moves when a
   story beat explicitly advances it (e.g. screens/timeSkip.js),
   which is why this file just re-renders on every AppState change
   instead of polling a real timer.
   ============================================================ */
(function () {
  function pad(n) { return n.toString().padStart(2, '0'); }

  function renderClock() {
    const el = document.getElementById('status-clock');
    if (!el) return;
    const mins = ((AppState.get().phone.time % 1440) + 1440) % 1440; // wrap 0-1439
    el.textContent = pad(Math.floor(mins / 60)) + ':' + pad(mins % 60);
  }

  function signalBarsSvg(bars) {
    // 4 vertical bars, filled up to `bars`, drawn on a 24x24 grid
    const heights = [7, 11, 15, 19];
    const xs = [2, 8, 14, 20];
    const rects = heights.map((h, i) => {
      const filled = i < bars;
      const y = 21 - h;
      return `<rect x="${xs[i]}" y="${y}" width="3.6" height="${h}" rx="1" fill="currentColor" opacity="${filled ? 1 : 0.25}"/>`;
    }).join('');
    return `<svg viewBox="0 0 24 24">${rects}</svg>`;
  }

  function renderNetwork() {
    const el = document.getElementById('status-network');
    if (!el) return;
    const bars = AppState.get().phone.network;
    el.innerHTML = signalBarsSvg(bars);
    el.style.color = bars === 0 ? 'var(--interference)' : 'var(--ghost)';
  }

  function renderWifi() {
    const el = document.getElementById('status-wifi');
    if (!el) return;
    el.innerHTML = ICONS.wifi;
  }

  function renderBattery() {
    const fill = document.getElementById('status-battery-fill');
    if (!fill) return;
    const pct = AppState.get().phone.battery;
    fill.style.width = pct + '%';
    fill.style.background = pct <= 15 ? 'var(--interference)' : 'var(--signal)';
  }

  function renderIsland() {
    const el = document.getElementById('dynamic-island');
    if (!el) return;
    el.classList.toggle('pulse', AppState.get().phone.network > 0);
  }

  function renderAll() { renderClock(); renderNetwork(); renderWifi(); renderBattery(); renderIsland(); }

  document.addEventListener('DOMContentLoaded', () => {
    renderAll();
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