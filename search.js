// search-filter.js
(function () {
  let isReady = false;
  let searchTimeout = null;

  function init() {
    const searchBox = document.getElementById('search-box');
    if (!searchBox) return;

    searchBox.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        const query = e.target.value.trim().toLowerCase();
        if (window.MirdhunaShop && typeof window.MirdhunaShop.setFilter === 'function') {
          window.MirdhunaShop.setFilter(query);
        }
      }, 150); // debounce
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
