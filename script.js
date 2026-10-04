(() => {
  const grid = document.getElementById('articleGrid');
  if (!grid) return;

  const cards = Array.from(grid.querySelectorAll('.guide-card'));
  const search = document.getElementById('articleSearch');
  const filterButtons = Array.from(document.querySelectorAll('.filter-btn'));
  const categoryCards = Array.from(document.querySelectorAll('.category-filter'));
  const count = document.getElementById('resultCount');
  const empty = document.getElementById('emptyState');
  const reset = document.getElementById('resetFilters');

  let activeFilter = 'all';

  const normalize = value => (value || '')
    .toLocaleLowerCase('it')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  function applyFilters() {
    const query = normalize(search.value.trim());
    let visible = 0;

    cards.forEach(card => {
      const category = card.dataset.category || '';
      const text = normalize(card.textContent);
      const categoryMatch = activeFilter === 'all' || category === activeFilter;
      const searchMatch = !query || text.includes(query);
      const show = categoryMatch && searchMatch;
      card.hidden = !show;
      if (show) visible += 1;
    });

    count.textContent = visible === 1 ? '1 contenuto disponibile' : visible + ' contenuti disponibili';
    empty.hidden = visible !== 0;

    filterButtons.forEach(button => {
      const active = button.dataset.filter === activeFilter;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function selectFilter(filter, scrollToArticles = false) {
    activeFilter = filter;
    applyFilters();
    if (scrollToArticles) {
      document.getElementById('articoli').scrollIntoView({behavior:'smooth', block:'start'});
    }
  }

  filterButtons.forEach(button => {
    button.addEventListener('click', () => selectFilter(button.dataset.filter));
  });

  categoryCards.forEach(button => {
    button.addEventListener('click', () => selectFilter(button.dataset.filter, true));
  });

  search.addEventListener('input', applyFilters);

  reset.addEventListener('click', () => {
    search.value = '';
    selectFilter('all');
    search.focus();
  });

  applyFilters();
})();