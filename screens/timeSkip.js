/* ============================================================
   screens/timeSkip.js
   A scripted cutscene: black screen, big digital clock centered,
   ticks forward fast for a few seconds, then hands control back.

   Triggered by a story node's `gotoScreen` (see apps/dashchat.js),
   e.g.: gotoScreen: { id: 'timeSkip', params: { minutes: 60,
   thenThreadId: 'partner', thenNode: 'p_closing', afterId: 'home' } }

   params:
     minutes       — how many in-game minutes to fast-forward
     thenThreadId  — (optional) a story thread to silently advance
                     past this beat, so re-opening it later doesn't
                     replay the same lines
     thenNode      — the node id to leave thenThreadId parked on
     afterId       — screen to land on once the cutscene ends
                     (default: 'home')
     afterParams   — params for that screen
   ============================================================ */
(function () {
  function pad(n) { return n.toString().padStart(2, '0'); }
  function fmt(mins) {
    const m = ((mins % 1440) + 1440) % 1440;
    return pad(Math.floor(m / 60)) + ':' + pad(m % 60);
  }

  function render(root, params) {
    const minutes = (params && params.minutes) || 60;
    const startTime = AppState.get().phone.time;
    const endTime = startTime + minutes;

    root.innerHTML = `
      <div class="app-screen timeskip-screen">
        <div class="timeskip-clock" id="timeskip-clock">${fmt(startTime)}</div>
        <div class="timeskip-label">waktu berlalu...</div>
      </div>
    `;

    const clockEl = root.querySelector('#timeskip-clock');
    const totalSteps = 48; // more, smaller steps = smoother-looking progression
    const stepMinutes = minutes / totalSteps;
    let step = 0;
    const myGen = Router.generation();

    const tick = setInterval(() => {
      if (Router.generation() !== myGen) { clearInterval(tick); return; } // navigated away mid-animation

      step++;
      const current = Math.min(startTime + stepMinutes * step, endTime);
      AppState.set('phone.time', Math.round(current));
      clockEl.textContent = fmt(current);

      if (step >= totalSteps) {
        clearInterval(tick);
        AppState.set('phone.time', endTime); // land exactly on the target, no rounding drift
        setTimeout(finish, 500); // brief pause on the final time before cutting away
      }
    }, 55);

    function finish() {
      if (Router.generation() !== myGen) return;
      if (params && params.thenThreadId && params.thenNode) {
        Story.setNode(params.thenThreadId, params.thenNode);
      }
      if (params && params.onComplete && params.onComplete.length) {
        Story.runEffects(null, params.onComplete);
        AppState.touch();
      }
      Router.replace(params && params.afterId ? params.afterId : 'home', (params && params.afterParams) || {});
    }
  }

  Router.register('timeSkip', render);
})();
