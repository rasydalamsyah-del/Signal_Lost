/* ============================================================
   apps/myshop.js
   Simple shop grid. Extend AppState.shopItems and the "buy"
   handler to spend an in-story currency, unlock chat skins, etc.
   ============================================================ */
(function () {
  function render(root) {
    const s = AppState.get();

    root.innerHTML = `
      <div class="app-screen">
        <div class="app-header">
          <h1>MyShop</h1>
          <span class="app-header-sub">${s.shopItems.length} item</span>
        </div>
        <div class="app-body">
          <div class="shop-grid" id="shop-grid"></div>
        </div>
      </div>
    `;

    const grid = root.querySelector('#shop-grid');
    s.shopItems.forEach(item => {
      const card = document.createElement('div');
      card.className = 'shop-card';
      card.innerHTML = `
        <div class="shop-card-icon">${item.icon}</div>
        <div class="shop-card-name">${item.name}</div>
        <div class="shop-card-price">${item.price === 0 ? 'gratis' : 'Rp ' + item.price}</div>
        <button class="btn ${item.owned ? '' : 'btn-primary'}" style="width:100%" ${item.owned ? 'disabled style="opacity:.5"' : ''}>
          ${item.owned ? 'Dimiliki' : 'Beli'}
        </button>
      `;
      card.querySelector('button').addEventListener('click', () => {
        item.owned = true;
        render(root);
      });
      grid.appendChild(card);
    });
  }

  Router.register('myshop', render);
})();
