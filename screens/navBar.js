/* ============================================================
   screens/navBar.js
   Back / Home / Recent buttons live in index.html permanently;
   this just wires their clicks to the router.
   ============================================================ */
(function () {
  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('nav-back').addEventListener('click', () => Router.back());
    document.getElementById('nav-home').addEventListener('click', () => Router.home());
    document.getElementById('nav-recent').addEventListener('click', () => Router.navigate('recent'));
  });
})();
