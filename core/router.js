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

  // views without status bar / nav bar chrome (start screen, boot animation)
  const CHROMELESS = new Set(['start', 'boot']);

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
  }

  function renderCurrent() {
    const top = history[history.length - 1];
    if (!top) return;
    applyChrome(top.id);
    root().innerHTML = '';
    registry[top.id](root(), top.params || {});
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

  function currentId() {
    return history.length ? history[history.length - 1].id : null;
  }

  return { register, navigate, replace, back, home, getRecentApps, currentId };
})();
