/* ============================================================
   core/jobs.js
   Persistent job postings system (RANCANGAN_MULTI_KARAKTER.md §10.3).
   Separate from the one-shot completeMiniJob favors in core/story.js
   (Langkah 7) — these are recurring (or once-forever) job listings
   with a weekly day+hour schedule, shown in the "Pekerjaan" app. A
   character "opens" one via a dialogue effect (`unlockJobPosting`,
   handled in core/story.js's runEffects) once trust is high enough;
   from then on it lives in AppState.jobPostings and is managed here.

   Posting shape (see core/story.js's unlockJobPosting effect for how
   one gets created):
   {
     id, title, charId, salary,
     type: 'recurring' | 'onceForever',
     schedule: { days: ['Senin','Jumat','Minggu'], startMinute, endMinute },
     missThreshold, missBoundaryDays,   // only meaningful for 'recurring'
     missLog: [{day}], lastWorkedDay, lastEvaluatedDay,
     firedForever, completedOnce
   }
   ============================================================ */
const Jobs = (function () {

  function isScheduledToday(posting) {
    const day = AppState.get().meta.day;
    return posting.schedule.days.includes(dayOfWeek(day));
  }

  // Is this posting workable RIGHT NOW (correct weekday AND inside the
  // hour window AND not fired/completed)? This is what the Pekerjaan
  // app uses to decide what to show as "active".
  function isActiveNow(posting) {
    if (posting.firedForever) return false;
    if (posting.type === 'onceForever' && posting.completedOnce) return false;
    if (!isScheduledToday(posting)) return false;
    const t = AppState.get().phone.time;
    return t >= posting.schedule.startMinute && t < posting.schedule.endMinute;
  }

  function alreadyWorkedToday(posting) {
    return posting.lastWorkedDay === AppState.get().meta.day;
  }

  // Scan every FULLY PASSED day since this posting was last checked
  // and count a "miss" for each scheduled day that wasn't worked that
  // day. Deliberately LAZY (evaluated on-demand — when the Pekerjaan
  // app opens, or right before working a posting — rather than a live
  // background scheduler), since this whole game is click/action-driven
  // rather than running on a real clock. See RANCANGAN_MULTI_KARAKTER.md
  // §10.3 (this was an open question, resolved this way).
  function reconcile(posting) {
    const today = AppState.get().meta.day;
    let day = posting.lastEvaluatedDay + 1;
    while (day < today) { // only days that have fully passed, not today (still in progress)
      if (posting.schedule.days.includes(dayOfWeek(day)) && posting.lastWorkedDay !== day) {
        posting.missLog.push({ day });
      }
      day++;
    }
    if (today - 1 > posting.lastEvaluatedDay) posting.lastEvaluatedDay = today - 1;

    if (posting.type === 'recurring' && posting.missThreshold) {
      const cutoff = today - posting.missBoundaryDays;
      posting.missLog = posting.missLog.filter(m => m.day > cutoff);
      if (posting.missLog.length >= posting.missThreshold) {
        posting.firedForever = true; // "dipecat" — gone for good, see §10.3
      }
    }
  }

  function reconcileAll() {
    Object.values(AppState.get().jobPostings).forEach(reconcile);
  }

  // Player taps an active posting to work it. Pays salary into
  // selfStats.money, marks today as worked (so it can't be double-
  // worked the same day even if the window is still open), and for
  // 'onceForever' jobs marks it complete (so isActiveNow never returns
  // true again).
  function work(postingId) {
    const s = AppState.get();
    const posting = s.jobPostings[postingId];
    if (!posting) return { ok: false, reason: 'not-found' };
    reconcile(posting);
    if (!isActiveNow(posting)) return { ok: false, reason: 'not-active' };
    if (alreadyWorkedToday(posting)) return { ok: false, reason: 'already-worked-today' };

    s.selfStats.money += posting.salary;
    posting.lastWorkedDay = s.meta.day;
    if (posting.type === 'onceForever') posting.completedOnce = true;
    AppState.touch();
    return { ok: true };
  }

  function list() {
    return Object.values(AppState.get().jobPostings);
  }

  function scheduleText(posting) {
    const fmt = m => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
    return posting.schedule.days.join('/') + ' ' + fmt(posting.schedule.startMinute) + '-' + fmt(posting.schedule.endMinute);
  }

  return { isScheduledToday, isActiveNow, alreadyWorkedToday, reconcile, reconcileAll, work, list, scheduleText };
})();
