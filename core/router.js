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
  const NAV_HIDDEN = new Set(['timeSkip']); // status bar stays visible (clock needs to show), nav bar hides so the cutscene can't be backed out of
  const SYSTEM_SCREENS = new Set(['start', 'boot', 'lock', 'home', 'recent', 'timeSkip']);

  let history = [];      // stack of { id, render }
  let recentApps = [];   // for the "Recent Apps" screen: { id, name, time }
  let gen = 0;            // bumped every render; lets async code (typing timers,
                          // story reveals) know if the screen it was writing to
                          // has since been replaced by a different navigation

  const registry = {};   // id -> render function

  function register(id, renderFn) {
    registry[id] = renderFn;
  }

  function applyChrome(id) {
    const hideAll = CHROMELESS.has(id);
    statusBar().classList.toggle('hidden', hideAll);
    navBar().classList.toggle('hidden', hideAll || NAV_HIDDEN.has(id));
    island().classList.toggle('hidden', hideAll);
  }

  function renderCurrent() {
    gen++;
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

    // opening a new screen/app is itself an action that lets a little
    // ambient time pass — see AppState.tick() / RANCANGAN_MULTI_KARAKTER.md §2.
    // Skipped for system screens (boot/lock/start) so the intro sequence
    // doesn't burn in-game minutes before the player has even started.
    if (typeof AppState !== 'undefined' && !CHROMELESS.has(id)) AppState.tick(2);

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

  function generation() { return gen; }

  return { register, navigate, replace, back, home, getRecentApps, forgetRecent, currentId, generation };
})();