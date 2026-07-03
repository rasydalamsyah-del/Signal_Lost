/* ============================================================
   screens/navBar.js
   Back / Home / Recent buttons live in index.html permanently;
   this fills their icons and wires clicks to the router.
   ============================================================ */
(function () {
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('#nav-back .nav-btn-icon').innerHTML = ICONS.arrowBack;
    document.querySelector('#nav-home .nav-btn-icon').innerHTML = ICONS.home;
    document.querySelector('#nav-recent .nav-btn-icon').innerHTML = ICONS.recent;

    document.getElementById('nav-back').addEventListener('click', () => Router.back());
    document.getElementById('nav-home').addEventListener('click', () => Router.home());
    document.getElementById('nav-recent').addEventListener('click', () => Router.navigate('recent'));
  });
})();