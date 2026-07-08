/* ============================================================
   screens/sleepScreen.js
   Sleep/wake cutscene (RANCANGAN_MULTI_KARAKTER.md §11.5) — a
   deliberately DIFFERENT visual from screens/timeSkip.js: dark
   screen, moon icon, "..zzz.." text, instead of a big bright digital
   clock. Meant to feel like a calmer, different kind of moment
   (going to sleep) rather than an urgent story time-jump.

   Always fast-forwards to 07:00 the FOLLOWING day, no matter what
   time it is when triggered (napping at noon still wakes up 07:00
   the next day — sleep always resets you to "morning"). On waking:
   - `energi` restored to 100 (a full night's rest)
   - `kebersihan` drops a bit (expected to be restored by a morning
     routine — mandi/gosok gigi — which is §11.6, not yet built)

   Triggered by tapping the "Tidur" tile on the home screen (see
   screens/homeScreen.js) — no params needed, unlike timeSkip.js
   which is driven by story `gotoScreen` params.
   ============================================================ */
(function () {
  const WAKE_MINUTE = 7 * 60; // 07:00

  function pad(n) { return n.toString().padStart(2, '0'); }
  function fmt(mins) {
    const m = Math.round(((mins % 1440) + 1440) % 1440);
    return pad(Math.floor(m / 60)) + ':' + pad(m % 60);
  }

  function render(root) {
    const current = AppState.get().phone.time;
    const minutesToWake = (1440 - current) + WAKE_MINUTE; // always the NEXT day's 07:00

    root.innerHTML = `
      <div class="app-screen sleep-screen">
        <div class="sleep-icon">${ICONS.sleep}</div>
        <div class="sleep-zzz" id="sleep-zzz">.. zzz ..</div>
        <div class="sleep-clock" id="sleep-clock">${fmt(current)}</div>
        <div class="sleep-label">tidur nyenyak...</div>
      </div>
    `;

    const clockEl = root.querySelector('#sleep-clock');
    const zzzEl = root.querySelector('#sleep-zzz');
    const totalSteps = 40;
    const stepMinutes = minutesToWake / totalSteps;
    let step = 0;
    let tickedSoFar = 0; // same drift-free pattern as timeSkip.js
    const myGen = Router.generation();

    const tick = setInterval(() => {
      if (Router.generation() !== myGen) { clearInterval(tick); return; } // navigated away mid-animation

      step++;
      const isLast = step >= totalSteps;
      const targetCumulative = isLast ? minutesToWake : Math.round(stepMinutes * step);
      const delta = targetCumulative - tickedSoFar;
      if (delta > 0) {
        AppState.tick(delta); // canonical advance — updates phone.time, meta.day, AND runs
                              // any day-rollover job reconciliation (core/jobs.js)
        tickedSoFar += delta;
      }
      clockEl.textContent = fmt(AppState.get().phone.time);
      zzzEl.textContent = step % 2 === 0 ? '.. zzz ..' : '. zzZ .'; // gentle alternate, not jarring

      if (isLast) {
        clearInterval(tick);
        setTimeout(finish, 600); // brief pause before waking up
      }
    }, 70); // a bit slower/calmer pace than timeSkip.js's 55ms

    function finish() {
      if (Router.generation() !== myGen) return;
      const s = AppState.get();
      s.selfStats.energi = 100; // full night's rest
      s.selfStats.kebersihan = Math.max(0, s.selfStats.kebersihan - 15); // needs a morning wash
      AppState.touch();
      Router.replace('home');
    }
  }

  Router.register('sleep', render);
})();
