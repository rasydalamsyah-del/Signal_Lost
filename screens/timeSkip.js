/* ============================================================
   screens/timeSkip.js
   A scripted cutscene: black screen, big digital clock centered,
   ticks forward fast for a few seconds, then hands control back.

   Triggered by a story node's `gotoScreen` (see apps/dashchat.js),
   e.g.: gotoScreen: { id: 'timeSkip', params: { minutes: 60,
   thenThreadId: 'partner', thenNode: 'p_closing',
   afterId: 'dashchat', afterParams: { chatId: 'partner' } } }
   — afterId defaults to 'home' only if the caller omits it; usually
   you want to land back on whichever chat was open, not Home.

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
    const m = Math.round(((mins % 1440) + 1440) % 1440); // round first — mins can be
                                                           // fractional mid-animation,
                                                           // otherwise minutes render
                                                           // as e.g. "34.45" instead of "34"
    return pad(Math.floor(m / 60)) + ':' + pad(m % 60);
  }

  function render(root, params) {
    const minutes = (params && params.minutes) || 60;
    const startTime = AppState.get().phone.time;

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
    let tickedSoFar = 0; // tracks cumulative minutes already sent to AppState.tick(),
                          // so per-step rounding never drifts from the exact total
    const myGen = Router.generation();

    const tick = setInterval(() => {
      if (Router.generation() !== myGen) { clearInterval(tick); return; } // navigated away mid-animation

      step++;
      const isLast = step >= totalSteps;
      const targetCumulative = isLast ? minutes : Math.round(stepMinutes * step);
      const delta = targetCumulative - tickedSoFar;
      if (delta > 0) {
        AppState.tick(delta); // canonical advance — updates phone.time AND meta.day together
        tickedSoFar += delta;
      }
      clockEl.textContent = fmt(AppState.get().phone.time);

      if (isLast) {
        clearInterval(tick);
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
