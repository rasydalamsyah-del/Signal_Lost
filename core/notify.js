/* ============================================================
   core/notify.js
   Global top-of-screen notification banner ("pesan baru masuk...")
   that slides in over whatever screen is currently open, sits for
   a few seconds, then slides back out on its own. Independent of
   the router so it can fire from Home, from inside an app, anywhere.
   Requires #toast-banner + children in index.html.
   ============================================================ */

const Notify = (function () {
  let hideTimer = null;

  function els() {
    return {
      banner: document.getElementById('toast-banner'),
      icon: document.getElementById('toast-icon'),
      title: document.getElementById('toast-title'),
      sub: document.getElementById('toast-sub')
    };
  }

  function show({ title = '', body = '', icon = null, durationMs = 3800 } = {}) {
    const { banner, icon: iconEl, title: titleEl, sub: subEl } = els();
    if (!banner) return;

    titleEl.textContent = title;
    subEl.textContent = body;
    iconEl.innerHTML = icon || (window.ICONS ? ICONS.dashchat : '');

    clearTimeout(hideTimer);
    banner.classList.remove('hidden');
    // rAF so the "hidden -> visible" transition actually animates
    // instead of snapping in when toggled on the same frame.
    requestAnimationFrame(() => banner.classList.add('show'));

    hideTimer = setTimeout(() => {
      banner.classList.remove('show');
      setTimeout(() => banner.classList.add('hidden'), 380);
    }, durationMs);
  }

  return { show };
})();
