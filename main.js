/* ============================================================
   main.js
   Entry point. Everything else has already registered its views
   with Router by the time this runs (script order in index.html).
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  Router.navigate('start');
});
