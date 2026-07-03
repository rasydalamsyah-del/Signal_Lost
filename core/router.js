/* ============================================================
   core/router.js
   No page reloads. "Navigating" just means: render a new view
   into #screen-root and push it onto a history stack, so the
   nav-bar Back/Home/Recent buttons have something to work with.
   ============================================================ */

const Router = (function () {
  const root = () => document.getElementById('screen-root');
  const statusBar = () => document.getElementById('status-bar');
  const navBar = () => document.getElementById('nav-bar');
  const island = () => document.getElementById('dynamic-island');

  const CHROMELESS = new Set(['start', 'boot', 'lock']);
  const SYSTEM_SCREENS = new Set(['start', 'boot', 'lock', 'home', 'recent']);

  let history = [];      // stack of { id, render }
  let recentApps = [];   // for the "Recent Apps" screen: { id, name, time }

  const registry = {};   // id -> render function

  function register(id, renderFn) {
    registry[id] = renderFn;
  }

  function applyChrome(id) {
    const hide = CHROMELESS.has(id);
    statusBar().classList.toggle('hidden', hide);
    navBar().classList.toggle('hidden', hide);
    island().classList.toggle('hidden', hide);
  }

  function renderCurrent() {
    const top = history[history.length - 1];
    if (!top) return;
    applyChrome(top.id);
    root().innerHTML = '';
    registry[top.id](root(), top.params || {});
    const first = root().firstElementChild;
    if (first) first.classList.add(SYSTEM_SCREENS.has(top.id) ? 'screen-anim' : 'screen-anim-pop');
    root().scrollTop = 0;
  }

  function navigate(id, params = {}, opts = {}) {
    if (!registry[id]) {
      console.error('Router: no view registered for "' + id + '"');
      return;
    }
    history.push({ id, params });

    // track as a "recent app" (skip system screens)
    if (!CHROMELESS.has(id) && id !== 'home' && id !== 'recent') {
      recentApps = recentApps.filter(a => a.id !== id);
      recentApps.unshift({ id, params, time: new Date() });
      recentApps = recentApps.slice(0, 8);
    }
    renderCurrent();
  }

  function replace(id, params = {}) {
    history[history.length - 1] = { id, params };
    renderCurrent();
  }

  function back() {
    if (history.length > 1) {
      history.pop();
      renderCurrent();
    }
  }

  function home() {
    history = [{ id: 'home', params: {} }];
    renderCurrent();
  }

  function getRecentApps() { return recentApps; }
  function forgetRecent(id) { recentApps = recentApps.filter(a => a.id !== id); }

  function currentId() {
    return history.length ? history[history.length - 1].id : null;
  }

  return { register, navigate, replace, back, home, getRecentApps, forgetRecent, currentId };
})();