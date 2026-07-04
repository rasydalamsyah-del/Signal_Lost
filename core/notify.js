/* ============================================================
   core/notify.js
   Global top-of-screen notification banner ("pesan baru masuk...")
   that slides in over whatever screen is currently open, sits for
   a few seconds, then slides back out on its own. Independent of
   the router so it can fire from Home, from inside an app, anywhere.

   Tappable: pass onClick to show() and tapping the banner runs it
   (typically Router.navigate('dashchat', {chatId}) — like tapping a
   real phone notification to jump straight into the conversation).
   Requires #toast-banner + children in index.html.
   ============================================================ */

const Notify = (function () {
  let hideTimer = null;
  let currentOnClick = null;
  let clickBound = false;

  function els() {
    return {
      banner: document.getElementById('toast-banner'),
      icon: document.getElementById('toast-icon'),
      title: document.getElementById('toast-title'),
      sub: document.getElementById('toast-sub')
    };
  }

  function hide() {
    const { banner } = els();
    if (!banner) return;
    clearTimeout(hideTimer);
    banner.classList.remove('show');
    setTimeout(() => banner.classList.add('hidden'), 380);
  }

  function bindClickOnce(banner) {
    if (clickBound) return;
    clickBound = true;
    banner.addEventListener('click', () => {
      if (!currentOnClick) return;
      const fn = currentOnClick;
      hide();
      fn();
    });
  }

  function show({ title = '', body = '', icon = null, durationMs = 3800, onClick = null } = {}) {
    const { banner, icon: iconEl, title: titleEl, sub: subEl } = els();
    if (!banner) return;
    bindClickOnce(banner);

    titleEl.textContent = title;
    subEl.textContent = body;
    iconEl.innerHTML = icon || (window.ICONS ? ICONS.dashchat : '');

    currentOnClick = onClick;
    banner.classList.toggle('toast-clickable', !!onClick);

    clearTimeout(hideTimer);
    banner.classList.remove('hidden');
    // rAF so the "hidden -> visible" transition actually animates
    // instead of snapping in when toggled on the same frame.
    requestAnimationFrame(() => banner.classList.add('show'));

    hideTimer = setTimeout(hide, durationMs);
  }

  return { show };
})();
