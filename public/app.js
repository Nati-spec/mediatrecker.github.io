const HIGANBANA_SVG = `
<svg viewBox="0 0 300 360" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;">
  <path d="M160 355 C155 290 175 230 215 170" stroke="#7D0B28" stroke-width="4.5" stroke-linecap="round"/>
  <path d="M215 170 C190 110 120 70 45 95" stroke="#8B1131" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M215 170 C175 95 110 40 30 50" stroke="#8B1131" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M215 170 C195 90 155 25 95 15" stroke="#8B1131" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M215 170 C220 90 210 25 165 10" stroke="#8B1131" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M215 170 C245 100 265 40 245 12" stroke="#8B1131" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M215 170 C260 120 290 75 288 35" stroke="#8B1131" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M215 170 C265 150 295 130 295 95" stroke="#8B1131" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M215 170 C150 140 80 145 25 185" stroke="#8B1131" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M215 170 C160 165 95 190 55 240" stroke="#8B1131" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M215 170 C180 135 145 115 115 125 C145 145 180 155 215 170 Z" fill="#7D0B28"/>
  <path d="M215 170 C185 120 165 85 135 80 C155 115 185 145 215 170 Z" fill="#7D0B28"/>
  <path d="M215 170 C215 125 205 80 185 65 C190 105 205 140 215 170 Z" fill="#7D0B28"/>
  <path d="M215 170 C240 130 255 95 245 70 C230 105 225 140 215 170 Z" fill="#7D0B28"/>
  <path d="M215 170 C255 155 280 135 280 110 C255 130 235 150 215 170 Z" fill="#7D0B28"/>
  <path d="M215 170 C250 185 275 190 285 170 C260 170 235 170 215 170 Z" fill="#7D0B28"/>
  <path d="M215 170 C175 165 130 175 105 200 C145 195 185 180 215 170 Z" fill="#7D0B28"/>
  <path d="M215 170 C195 195 175 225 175 250 C195 225 205 195 215 170 Z" fill="#7D0B28"/>
</svg>
`;

function generatePosterDataURI(title, origTitle, year, typeLabel) {
  const safeTitle = (title || 'MediaTracker').replace(/[<>&"']/g, '');
  const safeOrig = (origTitle || '').replace(/[<>&"']/g, '');
  const words = safeTitle.split(' ');
  let line1 = safeTitle;
  let line2 = '';
  if (words.length > 2 || safeTitle.length > 18) {
    const mid = Math.ceil(words.length / 2);
    line1 = words.slice(0, mid).join(' ');
    line2 = words.slice(mid).join(' ');
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#1F0A14"/>
        <stop offset="55%" stop-color="#0C101B"/>
        <stop offset="100%" stop-color="#2D0C1B"/>
      </linearGradient>
    </defs>
    <rect width="400" height="600" fill="url(#bg)"/>
    <rect x="16" y="16" width="368" height="568" rx="12" fill="none" stroke="#4D192D" stroke-width="2"/>
    <circle cx="200" cy="215" r="76" fill="none" stroke="#7D0B28" stroke-width="2" stroke-dasharray="6 4"/>
    <text x="200" y="232" text-anchor="middle" fill="#C8234E" font-family="Arial, sans-serif" font-weight="bold" font-size="52">M</text>
    <text x="200" y="355" text-anchor="middle" fill="#FFFFFF" font-family="Arial, sans-serif" font-weight="bold" font-size="24">${line1}</text>
    <text x="200" y="388" text-anchor="middle" fill="#FFFFFF" font-family="Arial, sans-serif" font-weight="bold" font-size="24">${line2}</text>
    <text x="200" y="430" text-anchor="middle" fill="#8E96A8" font-family="Arial, sans-serif" font-size="15">${safeOrig}</text>
    <rect x="125" y="475" width="150" height="32" rx="6" fill="#7D0B28"/>
    <text x="200" y="496" text-anchor="middle" fill="#FFFFFF" font-family="Arial, sans-serif" font-weight="bold" font-size="13">${typeLabel} • ${year}</text>
  </svg>`;
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
}

function resolvePosterSrc(posterUrl, fallbackSrc) {
  if (!posterUrl || !posterUrl.startsWith('http')) return fallbackSrc;
  return `/api/poster-proxy?url=${encodeURIComponent(posterUrl)}`;
}

const api = {
  token: localStorage.getItem('mt_jwt_token') || null,

  setToken(token) {
    this.token = token;
    if (token) localStorage.setItem('mt_jwt_token', token);
    else localStorage.removeItem('mt_jwt_token');
  },

  async request(url, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    const res = await fetch(url, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Ошибка запроса к серверу');
    }
    return data;
  }
};

const store = {
  currentUser: null,
  media: [],
  userLists: [],
  reviews: [],
  complaints: [],
  adminsList: []
};

const app = {
  currentScreen: 'catalog',
  activeMediaId: 1,
  editingMediaId: null,
  filterType: 'all',
  filterGenres: [],
  filterYearFrom: 1970,
  filterYearTo: 2026,
  filterMinRating: 0.0,
  searchQuery: '',
  sortOrder: 'rating_desc',
  pickedReviewScore: 10,
  activeProfileTab: 'watching',
  currentPage: 1,
  itemsPerPage: 20,
  expandedComplaints: {},
  lastCreatedAdminCreds: null,
  lastHandoverCreds: null,

  async init() {
    try {
      const [mediaList, reviewsList] = await Promise.all([
        api.request('/api/media'),
        api.request('/api/reviews')
      ]);
      store.media = mediaList;
      store.reviews = reviewsList;

      if (api.token) {
        try {
          const meData = await api.request('/api/auth/me');
          store.currentUser = meData.user;
          await this.syncUserData();
        } catch (e) {
          api.setToken(null);
          store.currentUser = null;
        }
      }
    } catch (err) {
      console.error('Ошибка загрузки данных:', err);
      this.toast('Не удалось подключиться к серверу. Проверьте запуск node server.js');
    }

    if (store.currentUser && store.currentUser.mustChangePassword) {
      this.navigate('setup-account');
    } else {
      this.navigate('catalog');
    }
  },

  async syncUserData() {
    if (!store.currentUser) {
      store.userLists = [];
      store.complaints = [];
      store.adminsList = [];
      return;
    }
    if (store.currentUser.role === 'admin') {
      store.userLists = [];
      const [comps, adms] = await Promise.all([
        api.request('/api/admin/complaints'),
        api.request('/api/admin/admins')
      ]);
      store.complaints = comps;
      store.adminsList = adms;
    } else {
      store.userLists = await api.request('/api/lists');
    }
  },

  toast(msg) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => el.classList.add('hidden'), 3600);
  },

  renderBackgroundDecor() {
    const bg = document.getElementById('bg-decor-layer');
    if (!bg) return;
    if (['login', 'register', 'setup-account'].includes(this.currentScreen)) {
      bg.innerHTML = `
        <div class="higanbana-bg-item higanbana-side-left">${HIGANBANA_SVG}</div>
        <div class="higanbana-bg-item higanbana-side-right">${HIGANBANA_SVG}</div>
      `;
    } else {
      bg.innerHTML = `<div class="higanbana-bg-item higanbana-corner-br">${HIGANBANA_SVG}</div>`;
    }
  },

  renderHeader() {
    const header = document.getElementById('main-header');
    if (!header) return;

    if (this.currentScreen === 'setup-account') {
      header.innerHTML = `
        <div class="header-left">
          <div class="brand-logo">
            <div class="logo-box">M</div>
            <span class="brand-title">MediaTracker</span>
          </div>
        </div>
        <div class="header-right">
          <button class="btn-logout-small" onclick="app.logout()">Выйти</button>
        </div>
      `;
      return;
    }

    if (this.currentScreen === 'login' || this.currentScreen === 'register') {
      header.innerHTML = `
        <div class="header-left">
          <div class="brand-logo" onclick="app.navigate('catalog')">
            <div class="logo-box">M</div>
            <span class="brand-title">MediaTracker</span>
          </div>
        </div>
        <div class="header-right">
          <button class="btn-back-catalog" onclick="app.navigate('catalog')">← Вернуться в каталог</button>
        </div>
      `;
      return;
    }

    const isAdmin = store.currentUser && store.currentUser.role === 'admin';

    header.innerHTML = `
      <div class="header-left">
        <div class="brand-logo" onclick="app.navigate('catalog')">
          <div class="logo-box">M</div>
          <span class="brand-title">MediaTracker</span>
        </div>
        <nav class="header-nav">
          <button class="header-nav-item ${this.currentScreen === 'catalog' ? 'active' : ''}" onclick="app.navigate('catalog')">Каталог</button>
          ${!isAdmin ? `
            <button class="header-nav-item ${this.currentScreen === 'profile' ? 'active' : ''}" onclick="app.navigate('profile')">Мои списки</button>
          ` : ''}
          <button class="header-nav-item ${this.currentScreen === 'detail' ? 'active' : ''}" onclick="app.navigate('detail', 1)">Рецензии сообщества</button>
          ${isAdmin ? `
            <button class="header-nav-item admin-nav-tab ${this.currentScreen === 'admin' ? 'active' : ''}" onclick="app.navigate('admin')">⚙ Админ-панель</button>
            <button class="header-nav-item ${this.currentScreen === 'admin-account' ? 'active' : ''}" onclick="app.navigate('admin-account')">👤 Аккаунт</button>
          ` : ''}
        </nav>
      </div>

      <div class="header-search-wrap">
        <input
          type="text"
          class="header-search-input"
          placeholder="Поиск среди ${store.media.length} фильмов и сериалов..."
          value="${this.searchQuery}"
          oninput="app.onSearchInput(this.value)"
        />
      </div>

      <div class="header-right">
        ${store.currentUser ? `
          <div class="header-user-pill" onclick="app.navigate('${isAdmin ? 'admin-account' : 'profile'}')">
            <div class="header-avatar ${isAdmin ? 'admin-badge' : ''}">${store.currentUser.username[0].toUpperCase()}</div>
            <span class="header-username">${store.currentUser.username}</span>
            ${isAdmin ? '<span class="role-chip">Admin</span>' : ''}
          </div>
          <button class="btn-logout-small" onclick="app.logout()">Выйти</button>
        ` : `
          <button class="btn-back-catalog" onclick="app.navigate('login')">Войти в систему</button>
        `}
      </div>
    `;
  },

  navigate(screen, mediaId = null) {
    // Force password & username setup if user logged in with a temporary password
    if (store.currentUser && store.currentUser.mustChangePassword && screen !== 'setup-account') {
      this.currentScreen = 'setup-account';
      this.renderBackgroundDecor();
      this.renderHeader();
      document.getElementById('app-view').innerHTML = this.buildSetupAccountView();
      return;
    }

    if ((screen === 'login' || screen === 'register') && store.currentUser) {
      this.toast('Вы уже авторизованы! Нажмите «Выйти», чтобы сменить аккаунт.');
      return;
    }

    if (['profile', 'admin', 'admin-account'].includes(screen) && !store.currentUser) {
      this.toast('Пожалуйста, авторизуйтесь для входа в личный кабинет');
      this.currentScreen = 'login';
      this.renderBackgroundDecor();
      this.renderHeader();
      document.getElementById('app-view').innerHTML = this.buildLoginView();
      return;
    }

    const isAdmin = store.currentUser && store.currentUser.role === 'admin';
    if (isAdmin && screen === 'profile') {
      screen = 'admin-account';
    }
    if (!isAdmin && ['admin', 'admin-account'].includes(screen)) {
      this.toast('Доступ запрещен: раздел доступен только администратору!');
      return;
    }

    this.currentScreen = screen;
    if (mediaId !== null) this.activeMediaId = mediaId;

    this.renderBackgroundDecor();
    this.renderHeader();
    const view = document.getElementById('app-view');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (screen === 'catalog') view.innerHTML = this.buildCatalogView();
    else if (screen === 'detail') view.innerHTML = this.buildDetailView(this.activeMediaId);
    else if (screen === 'profile') view.innerHTML = this.buildProfileView();
    else if (screen === 'admin') view.innerHTML = this.buildAdminPanelView();
    else if (screen === 'admin-account') view.innerHTML = this.buildAdminAccountView();
    else if (screen === 'setup-account') view.innerHTML = this.buildSetupAccountView();
    else if (screen === 'login') view.innerHTML = this.buildLoginView();
    else if (screen === 'register') view.innerHTML = this.buildRegisterView();
  },

  logout() {
    api.setToken(null);
    store.currentUser = null;
    store.userLists = [];
    store.complaints = [];
    this.lastCreatedAdminCreds = null;
    this.lastHandoverCreds = null;
    this.toast('Вы вышли из учетной записи');
    this.navigate('login');
  },

  // ==========================================================================
  // КАТАЛОГ (160 КАРТОЧЕК С ПОСТЕРАМИ + РЕДАКТИРОВАНИЕ ДЛЯ АДМИНА)
  // ==========================================================================
  getFilteredCatalog() {
    let list = store.media.filter(item => {
      if (this.filterType !== 'all' && item.type !== this.filterType) return false;
      if (item.releaseYear < this.filterYearFrom || item.releaseYear > this.filterYearTo) return false;
      if (item.rating < this.filterMinRating) return false;
      if (this.filterGenres.length > 0) {
        const matchGenre = this.filterGenres.some(g => item.genres.includes(g));
        if (!matchGenre) return false;
      }
      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase();
        if (!item.title.toLowerCase().includes(q) && !item.originalTitle.toLowerCase().includes(q)) return false;
      }
      return true;
    });

    if (this.sortOrder === 'rating_desc') list.sort((a, b) => b.rating - a.rating);
    else if (this.sortOrder === 'year_desc') list.sort((a, b) => b.releaseYear - a.releaseYear);
    else if (this.sortOrder === 'title_asc') list.sort((a, b) => a.title.localeCompare(b.title));

    return list;
  },

  buildCatalogView() {
    const allFiltered = this.getFilteredCatalog();
    const totalPages = Math.max(1, Math.ceil(allFiltered.length / this.itemsPerPage));
    if (this.currentPage > totalPages) this.currentPage = 1;

    const startIdx = (this.currentPage - 1) * this.itemsPerPage;
    const pageItems = allFiltered.slice(startIdx, startIdx + this.itemsPerPage);
    const allGenres = ['Фантастика', 'Драма', 'Триллер', 'Детектив', 'Аниме'];

    return `
      <div class="catalog-grid-layout">
        <aside class="filters-panel">
          <div class="filters-title">Фильтры</div>

          <div class="filter-block">
            <div class="filter-section-head">ТИП КОНТЕНТА</div>
            <button class="btn-type-full ${this.filterType === 'all' ? 'active' : ''}" onclick="app.setTypeFilter('all')">Все тайтлы (${store.media.length})</button>
            <div class="type-split-row">
              <button class="btn-type-half ${this.filterType === 'movie' ? 'active' : ''}" onclick="app.setTypeFilter('movie')">Фильмы</button>
              <button class="btn-type-half ${this.filterType === 'series' ? 'active' : ''}" onclick="app.setTypeFilter('series')">Сериалы</button>
            </div>
          </div>

          <div class="filter-block">
            <div class="filter-section-head">ЖАНРЫ</div>
            <div class="genres-list">
              ${allGenres.map(g => `
                <label class="genre-check-row">
                  <input type="checkbox" ${this.filterGenres.includes(g) ? 'checked' : ''} onchange="app.toggleGenreFilter('${g}')" />
                  <span class="custom-chk"></span>
                  <span>${g}</span>
                </label>
              `).join('')}
            </div>
          </div>

          <div class="filter-block">
            <div class="filter-section-head">ГОД ВЫПУСКА</div>
            <div class="year-inputs-row">
              <input type="number" class="year-box" placeholder="От 1970" value="${this.filterYearFrom}" onchange="app.setYearFrom(this.value)" />
              <input type="number" class="year-box" placeholder="До 2026" value="${this.filterYearTo}" onchange="app.setYearTo(this.value)" />
            </div>
          </div>

          <div class="filter-block">
            <div class="filter-section-head">МИНИМАЛЬНЫЙ РЕЙТИНГ</div>
            <div class="rating-slider-wrap">
              <input type="range" class="ruby-range" min="0" max="9.5" step="0.5" value="${this.filterMinRating}" oninput="app.setRatingSlider(this.value)" />
              <div class="rating-sub-caption">От ${this.filterMinRating.toFixed(1)} баллов и выше</div>
            </div>
          </div>

          <button class="btn-reset-all" onclick="app.resetAllFilters()">Сбросить всё</button>
        </aside>

        <section class="catalog-main-area">
          <div class="catalog-top-bar">
            <div class="catalog-heading">
              <h1>Популярное в каталоге</h1>
              <p>Найдено ${allFiltered.length} произведений (страница ${this.currentPage} из ${totalPages})</p>
            </div>

            <select class="sort-select" onchange="app.setSortOrder(this.value)">
              <option value="rating_desc" ${this.sortOrder === 'rating_desc' ? 'selected' : ''}>По рейтингу (убывание) ▼</option>
              <option value="year_desc" ${this.sortOrder === 'year_desc' ? 'selected' : ''}>По новизне (год выхода) ▼</option>
              <option value="title_asc" ${this.sortOrder === 'title_asc' ? 'selected' : ''}>По алфавиту (А–Я) ▼</option>
            </select>
          </div>

          <div class="cards-grid">
            ${pageItems.map(m => this.buildMediaCardHTML(m)).join('')}
          </div>

          ${this.buildPaginationHTML(totalPages)}
        </section>
      </div>
    `;
  },

  buildPaginationHTML(totalPages) {
    if (totalPages <= 1) return '';
    let buttons = `<button class="page-btn" ${this.currentPage === 1 ? 'disabled' : ''} onclick="app.goToPage(${this.currentPage - 1})">← Назад</button>`;
    for (let p = 1; p <= totalPages; p++) {
      buttons += `<button class="page-btn ${p === this.currentPage ? 'active' : ''}" onclick="app.goToPage(${p})">${p}</button>`;
    }
    buttons += `<button class="page-btn" ${this.currentPage === totalPages ? 'disabled' : ''} onclick="app.goToPage(${this.currentPage + 1})">Вперед →</button>`;
    return `<div class="pagination-bar">${buttons}</div>`;
  },

  goToPage(page) {
    this.currentPage = page;
    this.navigate('catalog');
  },

  buildMediaCardHTML(m) {
    const isAdmin = store.currentUser && store.currentUser.role === 'admin';
    const userItem = (!isAdmin && store.currentUser)
      ? store.userLists.find(u => u.mediaId === m.id)
      : null;

    let progressCaption = 'Не добавлено в ваш список';
    let captionClass = 'card-progress-caption';
    let barFillClass = 'progress-fill-ruby';
    let barWidth = '0%';
    let btnClass = 'btn-card-status state-empty';
    let btnLabel = '+ Добавить в список';
    let btnAction = `app.quickAddMedia(${m.id})`;

    if (isAdmin) {
      btnClass = 'btn-card-status state-admin-edit';
      btnLabel = '✎ Редактировать карточку';
      btnAction = `app.openEditMedia(${m.id})`;
    } else if (userItem) {
      if (userItem.status === 'watching') {
        progressCaption = `Ваш прогресс: ${userItem.episodesWatched} из ${m.totalEpisodes} серий`;
        barWidth = `${Math.min(100, Math.round((userItem.episodesWatched / m.totalEpisodes) * 100))}%`;
        btnClass = 'btn-card-status state-watching';
        btnLabel = `Смотрю (${userItem.episodesWatched}/${m.totalEpisodes})`;
        btnAction = `app.navigate('detail', ${m.id})`;
      } else if (userItem.status === 'completed') {
        progressCaption = `Просмотрено ${userItem.completedAt || ''} • Оценка: ${userItem.userScore || '—'}/10`;
        captionClass = 'card-progress-caption completed-text';
        barFillClass = 'progress-fill-green';
        barWidth = '100%';
        btnClass = 'btn-card-status state-completed';
        btnLabel = '✓ Просмотрено';
        btnAction = `app.navigate('detail', ${m.id})`;
      } else if (userItem.status === 'plan') {
        progressCaption = 'Добавлено в список «В планах»';
        barWidth = '0%';
        btnClass = 'btn-card-status state-empty';
        btnLabel = 'В планах';
        btnAction = `app.navigate('detail', ${m.id})`;
      } else if (userItem.status === 'dropped') {
        progressCaption = 'Просмотр брошен';
        barWidth = '15%';
        btnClass = 'btn-card-status state-empty';
        btnLabel = 'Брошено';
        btnAction = `app.navigate('detail', ${m.id})`;
      }
    }

    const typeLabel = m.type === 'series' ? 'Сериал' : 'Фильм';
    const metaSpec = m.type === 'series' ? `Сериал • ${m.releaseYear} • ${m.totalEpisodes} эп.` : `Фильм • ${m.releaseYear} • ${m.duration} мин.`;
    const fallbackSrc = generatePosterDataURI(m.title, m.originalTitle, m.releaseYear, typeLabel);
    const initialSrc = resolvePosterSrc(m.poster, fallbackSrc);

    return `
      <article class="media-card">
        <div class="poster-frame" onclick="app.navigate('detail', ${m.id})">
          <span class="card-rating-badge">★ ${m.rating.toFixed(1)}</span>
          <span class="card-age-badge">${m.ageRating}</span>
          <img
            class="poster-img"
            src="${initialSrc}"
            alt="${m.title}"
            loading="lazy"
            onerror="this.onerror=null; this.src='${fallbackSrc}';"
          />
        </div>

        <h3 class="card-title-ru" onclick="app.navigate('detail', ${m.id})" title="${m.title}">${m.title}</h3>
        <div class="card-subtitle-meta">${m.originalTitle} • ${metaSpec}</div>

        <div class="card-genres-row">
          ${m.genres.map(g => `<span class="genre-tag">${g}</span>`).join('')}
        </div>

        ${!isAdmin ? `
          <div class="${captionClass}">${progressCaption}</div>
          <div class="progress-track">
            <div class="${barFillClass}" style="width: ${barWidth}"></div>
          </div>
        ` : `<div style="margin-top:auto;"></div>`}

        <button class="${btnClass}" onclick="${btnAction}">${btnLabel}</button>
      </article>
    `;
  },

  openEditMedia(mediaId) {
    this.editingMediaId = mediaId;
    this.navigate('admin');
  },

  onSearchInput(val) {
    this.searchQuery = val;
    this.currentPage = 1;
    if (this.currentScreen === 'catalog') document.getElementById('app-view').innerHTML = this.buildCatalogView();
  },
  setTypeFilter(type) { this.filterType = type; this.currentPage = 1; this.navigate('catalog'); },
  toggleGenreFilter(genre) {
    if (this.filterGenres.includes(genre)) this.filterGenres = this.filterGenres.filter(g => g !== genre);
    else this.filterGenres.push(genre);
    this.currentPage = 1;
    document.getElementById('app-view').innerHTML = this.buildCatalogView();
  },
  setYearFrom(val) { const n = parseInt(val, 10); if (!isNaN(n)) this.filterYearFrom = n; this.currentPage = 1; document.getElementById('app-view').innerHTML = this.buildCatalogView(); },
  setYearTo(val) { const n = parseInt(val, 10); if (!isNaN(n)) this.filterYearTo = n; this.currentPage = 1; document.getElementById('app-view').innerHTML = this.buildCatalogView(); },
  setRatingSlider(val) { this.filterMinRating = parseFloat(val); this.currentPage = 1; document.getElementById('app-view').innerHTML = this.buildCatalogView(); },
  setSortOrder(val) { this.sortOrder = val; this.currentPage = 1; document.getElementById('app-view').innerHTML = this.buildCatalogView(); },
  resetAllFilters() {
    this.filterType = 'all'; this.filterGenres = []; this.filterYearFrom = 1970; this.filterYearTo = 2026;
    this.filterMinRating = 0.0; this.searchQuery = ''; this.currentPage = 1;
    this.navigate('catalog'); this.toast('Все фильтры сброшены');
  },

  async quickAddMedia(mediaId) {
    if (!store.currentUser) {
      this.toast('Войдите в аккаунт для добавления произведений в список');
      this.navigate('login');
      return;
    }
    if (store.currentUser.role === 'admin') {
      this.toast('Администратор не может добавлять тайтлы себе в списки');
      return;
    }
    try {
      await api.request('/api/lists', {
        method: 'POST',
        body: JSON.stringify({ mediaId, status: 'watching', episodesWatched: 1 })
      });
      await this.syncUserData();
      const media = store.media.find(m => m.id === mediaId);
      this.toast(`«${media.title}» сохранено в список «Смотрю»`);
      document.getElementById('app-view').innerHTML = this.buildCatalogView();
    } catch (err) {
      this.toast(err.message);
    }
  },

  // ==========================================================================
  // ДЕТАЛЬНАЯ КАРТОЧКА ПРОИЗВЕДЕНИЯ И РЕЦЕНЗИИ (С ОГРАНИЧЕНИЕМ ПО СТАТУСУ!)
  // ==========================================================================
  buildDetailView(mediaId) {
    const m = store.media.find(x => x.id === mediaId) || store.media[0];
    const isAdmin = store.currentUser && store.currentUser.role === 'admin';
    const userItem = (!isAdmin && store.currentUser)
      ? store.userLists.find(u => u.mediaId === m.id)
      : null;

    const currentStatus = userItem ? userItem.status : 'none';
    const currentEp = userItem ? userItem.episodesWatched : 0;
    const mediaReviews = store.reviews.filter(r => r.mediaId === m.id);
    const typeLabel = m.type === 'series' ? 'Сериал' : 'Фильм';
    const fallbackSrc = generatePosterDataURI(m.title, m.originalTitle, m.releaseYear, typeLabel);
    const initialSrc = resolvePosterSrc(m.poster, fallbackSrc);

    // Rule #2: User can write a review ONLY if this media is in their list with status !== 'plan'
    const canWriteReview = Boolean(
      store.currentUser &&
      !isAdmin &&
      userItem &&
      ['watching', 'completed', 'dropped'].includes(userItem.status)
    );

    let reviewBoxHTML = '';
    if (isAdmin) {
      reviewBoxHTML = `
        <div class="write-review-box">
          <h2>Режим администратора</h2>
          <div class="review-locked-banner">
            <p>Администратор не может выставлять зрительские оценки и добавлять тайтлы в личные списки, но может редактировать карточку произведения или модерировать отзывы.</p>
            <button class="btn-amber-action" style="max-width:260px;" onclick="app.openEditMedia(${m.id})">✎ Редактировать этот тайтл</button>
          </div>
        </div>
      `;
    } else if (!store.currentUser) {
      reviewBoxHTML = `
        <div class="write-review-box">
          <h2>Написать рецензию</h2>
          <div class="review-locked-banner">
            <p>Для публикации рецензии необходимо войти в учетную запись зрителя и отметить начало просмотра произведения.</p>
            <button class="btn-publish-review" onclick="app.navigate('login')">Войти в аккаунт</button>
          </div>
        </div>
      `;
    } else if (!canWriteReview) {
      const reasonText = !userItem
        ? 'Этого произведения еще нет в вашем списке. Чтобы написать рецензию, добавьте тайтл в статус «Смотрю», «Просмотрено» или «Брошено».'
        : 'Сейчас этот тайтл находится у вас в статусе «В планах». Написать рецензию можно только после начала просмотра (статус «Смотрю», «Просмотрено» или «Брошено»).';
      reviewBoxHTML = `
        <div class="write-review-box">
          <h2>Написать рецензию</h2>
          <div class="review-locked-banner">
            <p>🔒 <strong>Публикация рецензии недоступна</strong></p>
            <p>${reasonText}</p>
            <button class="btn-publish-review" onclick="app.updateMediaStatus(${m.id}, 'watching')">Перевести в «Смотрю»</button>
          </div>
        </div>
      `;
    } else {
      reviewBoxHTML = `
        <div class="write-review-box">
          <h2>Написать рецензию</h2>
          <div class="form-sub-label">Ваша оценка по 10-балльной шкале:</div>
          <div class="rating-bar-selector">
            <div class="stars-inline-list">
              ${[1,2,3,4,5,6,7,8,9,10].map(num => `
                <button type="button" class="star-pick-item ${this.pickedReviewScore === num ? 'picked' : ''}" onclick="app.selectReviewScore(${num})">★ ${num}</button>
              `).join('')}
            </div>
            <span class="star-active-badge" id="selected-score-pill">★ ${this.pickedReviewScore}/10</span>
          </div>

          <div class="form-sub-label">Заголовок отзыва:</div>
          <input type="text" id="rev-title-inp" class="dark-input" placeholder="Введите краткий заголовок вашей рецензии..." />

          <div class="form-sub-label">Текст рецензии (от 50 до 5000 символов):</div>
          <div class="dark-textarea-wrap">
            <textarea id="rev-body-inp" class="dark-textarea" placeholder="Поделитесь впечатлениями о сюжете, актерской игре и атмосфере произведения (минимум 50 символов)..." oninput="app.updateReviewCharCounter(this.value)"></textarea>
            <span class="char-count-bottom" id="rev-char-counter">0 / 5000 знаков</span>
          </div>

          <div class="review-bottom-actions">
            <label class="spoiler-chk-label">
              <input type="checkbox" id="rev-spoiler-chk" />
              <span>Осторожно: текст содержит спойлеры</span>
            </label>
            <button class="btn-publish-review" onclick="app.publishReview(${m.id})">Опубликовать отзыв</button>
          </div>
        </div>
      `;
    }

    return `
      <div class="detail-page-wrap">
        <section class="detail-hero-card">
          <div class="detail-poster-box">
            <img src="${initialSrc}" alt="${m.title}" onerror="this.onerror=null; this.src='${fallbackSrc}';" />
          </div>

          <div class="detail-info-col">
            <div class="detail-title-row">
              <h1>${m.title} (${m.originalTitle})</h1>
              <span class="detail-rating-pill">★ ${m.rating.toFixed(1)}</span>
            </div>

            <div class="detail-meta-str">
              Тип: ${typeLabel} • Год выхода: ${m.releaseYear} • Эпизодов: ${m.totalEpisodes} • Длительность: ${m.duration} мин. • Возраст: ${m.ageRating}
            </div>

            <p class="detail-synopsis">${m.description}</p>

            ${!isAdmin ? `
              <div class="detail-controls-strip">
                <div>
                  <div class="strip-col-label">СТАТУС В ВАШЕМ СПИСКЕ</div>
                  <div class="status-pills-row">
                    <button class="status-pill-btn ${currentStatus === 'watching' ? 'active' : ''}" onclick="app.updateMediaStatus(${m.id}, 'watching')">Смотрю</button>
                    <button class="status-pill-btn ${currentStatus === 'plan' ? 'active' : ''}" onclick="app.updateMediaStatus(${m.id}, 'plan')">В планах</button>
                    <button class="status-pill-btn ${currentStatus === 'completed' ? 'active' : ''}" onclick="app.updateMediaStatus(${m.id}, 'completed')">Просмотрено</button>
                    <button class="status-pill-btn ${currentStatus === 'dropped' ? 'active' : ''}" onclick="app.updateMediaStatus(${m.id}, 'dropped')">Брошено</button>
                  </div>
                </div>

                <div>
                  <div class="strip-col-label">УЧЕТ ПРОСМОТРЕННЫХ СЕРИЙ</div>
                  <div class="episode-stepper-row">
                    <button class="step-btn-minus" onclick="app.changeEpisodes(${m.id}, -1)">−</button>
                    <div class="step-counter-box">${currentEp} / ${m.totalEpisodes}</div>
                    <button class="step-btn-plus" onclick="app.changeEpisodes(${m.id}, 1)">+</button>
                  </div>
                </div>
              </div>
            ` : `
              <div class="detail-controls-strip">
                <div>
                  <div class="strip-col-label">СЛУЖЕБНЫЕ ДЕЙСТВИЯ АДМИНИСТРАТОРА</div>
                  <p style="font-size:12.5px;color:var(--text-muted);">Вы можете изменить метаданные или обложку этого произведения в каталоге.</p>
                </div>
                <button class="btn-amber-action" style="width:auto;padding:0 20px;" onclick="app.openEditMedia(${m.id})">✎ Изменить карточку в БД</button>
              </div>
            `}
          </div>
        </section>

        <section class="reviews-split-layout">
          ${reviewBoxHTML}

          <div class="community-reviews-col">
            <h2>Рецензии зрителей (${mediaReviews.length})</h2>
            ${mediaReviews.length === 0 ? `<div class="empty-list-placeholder">На это произведение пока нет рецензий. Будьте первым!</div>` : ''}

            ${mediaReviews.map(r => `
              <div class="review-card-box ${r.hasSpoilers ? 'spoiler-bordered' : ''}">
                <div class="rev-top-line">
                  <div class="rev-user-info">
                    <div class="rev-circle-avatar">${r.username[0].toUpperCase()}</div>
                    <div>
                      <div class="rev-author-name">${r.username}</div>
                      <div class="rev-date-sub">${r.date}</div>
                    </div>
                  </div>
                  <div class="rev-green-score">${r.score} / 10</div>
                </div>

                <div class="rev-Zero-title">${r.title}</div>

                ${r.hasSpoilers && !r.revealed ? `
                  <div class="spoiler-dashed-box" onclick="app.unmaskSpoiler(${r.id})">
                    <p>⚠️ Рецензия содержит сюжетные спойлеры (has_spoilers = true)</p>
                    <p>[Нажмите, чтобы показать скрытый текст]</p>
                  </div>
                ` : `
                  <div class="rev-text-content">${r.body}</div>
                  <div class="rev-votes-bar">
                    <button class="btn-helpful green-txt" onclick="app.voteReview(${r.id}, 'up')">👍 Полезно (${r.helpfulUp})</button>
                    <button class="btn-helpful" onclick="app.voteReview(${r.id}, 'down')">👎 Бесполезно (${r.helpfulDown})</button>
                    ${store.currentUser && !isAdmin ? `<button class="btn-helpful report-txt" onclick="app.reportReview(${r.id})">🚩 Пожаловаться</button>` : ''}
                  </div>
                `}
              </div>
            `).join('')}
          </div>
        </section>
      </div>
    `;
  },

  selectReviewScore(num) {
    this.pickedReviewScore = num;
    const badge = document.getElementById('selected-score-pill');
    if (badge) badge.textContent = `★ ${num}/10`;
  },

  updateReviewCharCounter(val) {
    const el = document.getElementById('rev-char-counter');
    if (el) el.textContent = `${val.length} / 5000 знаков`;
  },

  async updateMediaStatus(mediaId, newStatus) {
    if (!store.currentUser) {
      this.toast('Авторизуйтесь в системе для изменения статуса');
      this.navigate('login');
      return;
    }
    try {
      await api.request('/api/lists', {
        method: 'POST',
        body: JSON.stringify({ mediaId, status: newStatus })
      });
      await this.syncUserData();
      this.toast('Статус произведения сохранен в БД');
      this.navigate('detail', mediaId);
    } catch (err) {
      this.toast(err.message);
    }
  },

  async changeEpisodes(mediaId, delta) {
    if (!store.currentUser) {
      this.toast('Авторизуйтесь для сохранения прогресса серий');
      this.navigate('login');
      return;
    }
    const m = store.media.find(x => x.id === mediaId);
    const existing = store.userLists.find(u => u.mediaId === mediaId);
    const curEp = existing ? existing.episodesWatched : 0;
    const nextEp = Math.max(0, Math.min(m.totalEpisodes, curEp + delta));

    try {
      const res = await api.request('/api/lists', {
        method: 'POST',
        body: JSON.stringify({
          mediaId,
          status: nextEp >= m.totalEpisodes ? 'completed' : 'watching',
          episodesWatched: nextEp
        })
      });
      await this.syncUserData();
      if (res.status === 'completed') {
        this.toast('Поздравляем! Все серии просмотрены, статус обновлен на «Просмотрено»');
      }
      if (this.currentScreen === 'profile') this.navigate('profile');
      else this.navigate('detail', mediaId);
    } catch (err) {
      this.toast(err.message);
    }
  },

  async publishReview(mediaId) {
    const title = document.getElementById('rev-title-inp').value.trim();
    const body = document.getElementById('rev-body-inp').value.trim();
    const hasSpoilers = document.getElementById('rev-spoiler-chk').checked;

    if (!title) {
      this.toast('Пожалуйста, укажите заголовок отзыва');
      return;
    }
    if (body.length < 50) {
      this.toast(`Текст слишком короткий (${body.length} симв.). Минимум — 50 символов.`);
      return;
    }

    try {
      await api.request('/api/reviews', {
        method: 'POST',
        body: JSON.stringify({
          mediaId,
          score: this.pickedReviewScore,
          title,
          body,
          hasSpoilers
        })
      });
      store.reviews = await api.request('/api/reviews');
      await this.syncUserData();
      this.toast('Ваш отзыв успешно сохранен в базе данных!');
      this.navigate('detail', mediaId);
    } catch (err) {
      this.toast(err.message);
    }
  },

  unmaskSpoiler(revId) {
    const rev = store.reviews.find(r => r.id === revId);
    if (rev) {
      rev.revealed = true;
      this.navigate('detail', this.activeMediaId);
    }
  },

  async voteReview(revId, dir) {
    try {
      await api.request(`/api/reviews/${revId}/vote`, {
        method: 'POST',
        body: JSON.stringify({ dir })
      });
      store.reviews = await api.request('/api/reviews');
      this.toast('Спасибо! Ваша оценка учтена.');
      this.navigate('detail', this.activeMediaId);
    } catch (err) {
      this.toast(err.message);
    }
  },

  async reportReview(revId) {
    try {
      await api.request(`/api/reviews/${revId}/report`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Жалоба пользователя: текст содержит сюжетные спойлеры без метки или нарушает правила' })
      });
      this.toast('Жалоба передана администратору на рассмотрение');
    } catch (err) {
      this.toast(err.message);
    }
  },

  // ==========================================================================
  // ЛИЧНЫЙ КАБИНЕТ ОБЫЧНОГО ЗРИТЕЛЯ (БЕЗ АДМИНСКИХ ЭЛЕМЕНТОВ)
  // ==========================================================================
  buildProfileView() {
    const u = store.currentUser;
    const myItems = store.userLists;
    const listWatching = myItems.filter(x => x.status === 'watching');
    const listCompleted = myItems.filter(x => x.status === 'completed');
    const listPlan = myItems.filter(x => x.status === 'plan');
    const listDropped = myItems.filter(x => x.status === 'dropped');

    const totalCompletedCount = listCompleted.length;
    const totalEpisodesWatched = myItems.reduce((acc, item) => acc + (item.episodesWatched || 0), 0);

    const myReviews = store.reviews.filter(r => r.userId === u.id);
    const scoredItems = myItems.filter(x => x.userScore);
    let avgRating = '0.0';
    if (myReviews.length > 0) {
      const sum = myReviews.reduce((s, r) => s + r.score, 0);
      avgRating = (sum / myReviews.length).toFixed(1);
    } else if (scoredItems.length > 0) {
      const sum = scoredItems.reduce((s, x) => s + x.userScore, 0);
      avgRating = (sum / scoredItems.length).toFixed(1);
    }

    const currentTabItems = myItems.filter(x => x.status === this.activeProfileTab);

    return `
      <div class="profile-single-container">
        <section class="cabinet-panel">
          <div class="profile-top-row">
            <div class="avatar-circle-lg">${u.username[0].toUpperCase()}</div>
            <div class="profile-name-block">
              <h2>${u.username}</h2>
              <p>${u.email} • Личный профиль зрителя</p>
            </div>
          </div>

          <div class="kpi-cards-grid">
            <div class="kpi-stat-box">
              <div class="kpi-stat-label">ПРОСМОТРЕНО</div>
              <div class="kpi-stat-val val-green">${totalCompletedCount} тайтлов</div>
            </div>
            <div class="kpi-stat-box">
              <div class="kpi-stat-label">ЭПИЗОДОВ</div>
              <div class="kpi-stat-val val-ruby">${totalEpisodesWatched} серий</div>
            </div>
            <div class="kpi-stat-box">
              <div class="kpi-stat-label">СРЕДНИЙ БАЛЛ</div>
              <div class="kpi-stat-val val-amber">★ ${avgRating}</div>
            </div>
          </div>

          <div class="profile-tabs-strip">
            <button class="prof-tab-btn ${this.activeProfileTab === 'watching' ? 'active' : ''}" onclick="app.setProfileTab('watching')">Смотрю (${listWatching.length})</button>
            <button class="prof-tab-btn ${this.activeProfileTab === 'completed' ? 'active' : ''}" onclick="app.setProfileTab('completed')">Просмотрено (${listCompleted.length})</button>
            <button class="prof-tab-btn ${this.activeProfileTab === 'plan' ? 'active' : ''}" onclick="app.setProfileTab('plan')">В планах (${listPlan.length})</button>
            <button class="prof-tab-btn ${this.activeProfileTab === 'dropped' ? 'active' : ''}" onclick="app.setProfileTab('dropped')">Брошено (${listDropped.length})</button>
          </div>

          <div class="user-history-list">
            ${currentTabItems.length === 0 ? `
              <div class="empty-list-placeholder">
                В разделе «${this.getTabNameRu(this.activeProfileTab)}» пока нет произведений.<br/>
                Перейдите в <span style="color:var(--ruby-bright-link);cursor:pointer;font-weight:600" onclick="app.navigate('catalog')">Каталог</span>, чтобы добавить фильмы или сериалы!
              </div>
            ` : currentTabItems.map(entry => {
              const m = store.media.find(med => med.id === entry.mediaId);
              if (!m) return '';
              const isDone = entry.status === 'completed';
              return `
                <div class="history-item-box">
                  <div class="history-item-left">
                    <h4 style="cursor:pointer" onclick="app.navigate('detail', ${m.id})">${m.title} (${m.originalTitle})</h4>
                    ${isDone ? `
                      <p class="green-line">${m.type === 'movie' ? 'Фильм' : 'Сериал'} • Завершено: ${entry.completedAt || 'сегодня'} • Оценка: ★ ${entry.userScore || '—'}/10</p>
                    ` : `
                      <p>${m.type === 'movie' ? 'Фильм' : 'Сериал'} • Прогресс: ${entry.episodesWatched} из ${m.totalEpisodes} эп.</p>
                    `}
                  </div>
                  <div>
                    ${isDone ? `
                      <span class="badge-done-green">✓ Просмотрено</span>
                    ` : `
                      <button class="btn-plus-ep" onclick="app.changeEpisodes(${m.id}, 1)">+1 серия</button>
                    `}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </section>
      </div>
    `;
  },

  getTabNameRu(tab) {
    if (tab === 'watching') return 'Смотрю';
    if (tab === 'completed') return 'Просмотрено';
    if (tab === 'plan') return 'В планах';
    return 'Брошено';
  },

  setProfileTab(tab) {
    this.activeProfileTab = tab;
    this.navigate('profile');
  },

  // ==========================================================================
  // АДМИН-ПАНЕЛЬ (ДОБАВЛЕНИЕ / РЕДАКТИРОВАНИЕ ТАЙТЛОВ + РАСКРЫВАЮЩИЕСЯ ЖАЛОБЫ + ДОБАВЛЕНИЕ АДМИНОВ)
  // ==========================================================================
  buildAdminPanelView() {
    const editingItem = this.editingMediaId ? store.media.find(x => x.id === this.editingMediaId) : null;

    return `
      <div class="admin-grid-container">
        <!-- ЛЕВАЯ КОЛОНКА: КАТАЛОГ (ДОБАВЛЕНИЕ И РЕДАКТИРОВАНИЕ) + СОЗДАНИЕ НОВЫХ АДМИНОВ -->
        <div style="display:flex;flex-direction:column;gap:24px;">
          <section class="cabinet-panel admin-border">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <div class="admin-tag-pill">${editingItem ? 'РЕДАКТИРОВАНИЕ КАРТОЧКИ #' + editingItem.id : 'НОВАЯ МЕДИАЕДИНИЦА'}</div>
              ${editingItem ? `<button class="btn-logout-small" onclick="app.cancelEditMedia()">Отменить редактирование</button>` : ''}
            </div>
            <h2 class="admin-section-title">${editingItem ? `Изменить: ${editingItem.title}` : 'Добавление медиаединицы в каталог БД'}</h2>

            <div class="form-sub-label">Локализованное название и Оригинальное название:</div>
            <div class="admin-2col-inputs">
              <input type="text" id="adm-title" class="dark-input" placeholder="Например: Дюна: Часть третья" value="${editingItem ? editingItem.title : ''}" />
              <input type="text" id="adm-orig" class="dark-input" placeholder="Например: Dune: Messiah" value="${editingItem ? editingItem.originalTitle : ''}" />
            </div>

            <div class="form-sub-label">Тип, Год релиза, Мин/Серий и Возрастной ценз:</div>
            <div class="admin-4col-inputs">
              <select id="adm-type" class="dark-input">
                <option value="movie" ${editingItem && editingItem.type === 'movie' ? 'selected' : ''}>Фильм</option>
                <option value="series" ${editingItem && editingItem.type === 'series' ? 'selected' : ''}>Сериал</option>
              </select>
              <input type="number" id="adm-year" class="dark-input" placeholder="Год (2025)" value="${editingItem ? editingItem.releaseYear : ''}" />
              <input type="number" id="adm-dur" class="dark-input" placeholder="Мин / Серий" value="${editingItem ? (editingItem.type === 'series' ? editingItem.totalEpisodes : editingItem.duration) : ''}" />
              <select id="adm-age" class="dark-input">
                <option value="16+" ${editingItem && editingItem.ageRating === '16+' ? 'selected' : ''}>16+</option>
                <option value="18+" ${editingItem && editingItem.ageRating === '18+' ? 'selected' : ''}>18+</option>
                <option value="12+" ${editingItem && editingItem.ageRating === '12+' ? 'selected' : ''}>12+</option>
              </select>
            </div>

            <div class="form-sub-label">Ссылка на постер (URL обложки 2:3):</div>
            <input type="text" id="adm-poster" class="dark-input" placeholder="https://..." value="${editingItem ? editingItem.poster : ''}" />

            <div class="form-sub-label">Описание сюжета:</div>
            <textarea id="adm-desc" class="dark-textarea" style="height:80px;" placeholder="Краткое описание произведения...">${editingItem ? editingItem.description : ''}</textarea>

            ${editingItem ? `
              <button class="btn-amber-action" onclick="app.adminUpdateMedia(${editingItem.id})">✓ Сохранить изменения в БД</button>
            ` : `
              <button class="btn-save-db-green" onclick="app.adminSaveNewMedia()">+ Добавить карточку в каталог БД</button>
            `}
          </section>

          <!-- ДОБАВЛЕНИЕ НОВЫХ АДМИНИСТРАТОРОВ С АВТОГЕНЕРАЦИЕЙ ПАРОЛЯ -->
          <section class="cabinet-panel admin-border">
            <div class="admin-tag-pill">УПРАВЛЕНИЕ ДОСТУПОМ (RBAC)</div>
            <h2 class="admin-section-title">Добавить нового администратора</h2>
            <p class="form-sub-label">Система автоматически сгенерирует одноразовый временный пароль. При первом входе новый сотрудник обязан будет задать свое имя и постоянный пароль.</p>

            <div class="admin-2col-inputs">
              <input type="email" id="new-adm-email" class="dark-input" placeholder="Служебный Email (new_admin@tracker.ru)" />
              <input type="text" id="new-adm-login" class="dark-input" placeholder="Начальный логин (необязательно)" />
            </div>

            <button class="btn-save-db-green" onclick="app.adminCreateNewAdmin()">🔑 Создать админа и сгенерировать пароль</button>

            ${this.lastCreatedAdminCreds ? `
              <div class="generated-cred-box">
                <div style="color:#109659;font-weight:700;">✓ Учетная запись администратора создана! Передайте эти данные сотруднику:</div>
                <div>Логин / Email: <code>${this.lastCreatedAdminCreds.email}</code></div>
                <div>Временный пароль: <code>${this.lastCreatedAdminCreds.tempPassword}</code></div>
                <div style="font-size:11px;color:var(--text-muted);">При первом входе система потребует сменить имя пользователя и задать постоянный пароль.</div>
              </div>
            ` : ''}

            <div class="form-sub-label" style="margin-top:4px;">Действующие администраторы в базе (${store.adminsList.length}):</div>
            <div style="display:flex;flex-direction:column;gap:8px;">
              ${store.adminsList.map(a => `
                <div class="history-item-box" style="padding:10px 14px;">
                  <div>
                    <div style="font-size:13px;font-weight:700;">${a.username} <span style="color:var(--text-muted);font-weight:400;">(${a.email})</span></div>
                    <div style="font-size:11px;color:${a.must_change_password ? 'var(--amber-gold)' : '#109659'};">
                      ${a.must_change_password ? '⏳ Ожидает первого входа по временному паролю' : '✓ Активен'}
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          </section>
        </div>

        <!-- ПРАВАЯ КОЛОНКА: ДЕТАЛЬНЫЕ РАСКРЫВАЮЩИЕСЯ ЖАЛОБЫ -->
        <section class="cabinet-panel admin-border">
          <div class="admin-tag-pill">МОДЕРАЦИЯ КОНТЕНТА</div>
          <h2 class="admin-section-title">Входящие жалобы (${store.complaints.length})</h2>
          <p class="form-sub-label">Нажмите на жалобу, чтобы открыть полный текст комментария, место публикации и причину нарушения.</p>

          ${store.complaints.length === 0 ? `
            <div class="empty-list-placeholder">Активных жалоб от пользователей нет. Все обращения обработаны!</div>
          ` : ''}

          ${store.complaints.map(c => {
            const isOpen = Boolean(this.expandedComplaints[c.id]);
            return `
              <div class="complaint-red-box">
                <div class="complaint-header-row" onclick="app.toggleComplaintDetails(${c.id})">
                  <div>
                    <h4>🚩 Жалоба #${c.id} • Тайтл: ${c.media_title}</h4>
                    <div class="complaint-meta-line">Автор комментария: <strong>${c.author_name}</strong> • Дата: ${c.created_at}</div>
                  </div>
                  <span style="color:var(--amber-gold);font-size:12px;font-weight:700;">${isOpen ? '▲ Свернуть' : '▼ Открыть'}</span>
                </div>

                ${isOpen ? `
                  <div class="complaint-details-body">
                    <div><strong style="color:var(--amber-gold);">Где размещено:</strong> Карточка произведения «${c.media_title}» (раздел «Рецензии зрителей»)</div>
                    <div><strong style="color:#F87171;">Что нарушено:</strong> ${c.reason}</div>
                    <div><strong style="color:var(--text-muted);">Текст проблемного комментария:</strong></div>
                    <div class="complaint-excerpt-quote">${c.comment_excerpt}</div>

                    <div class="complaint-btns">
                      <button class="btn-flag-amber" onclick="app.adminResolveComplaint(${c.id}, 'spoiler')">⚠️ Скрыть под флаг спойлера</button>
                      <button class="btn-del-red" onclick="app.adminResolveComplaint(${c.id}, 'delete')">🗑 Удалить комментарий</button>
                      <button class="btn-helpful" onclick="app.navigate('detail', ${c.media_id})">Перейти к тайтлу →</button>
                    </div>
                  </div>
                ` : ''}
              </div>
            `;
          }).join('')}
        </section>
      </div>
    `;
  },

  toggleComplaintDetails(compId) {
    this.expandedComplaints[compId] = !this.expandedComplaints[compId];
    document.getElementById('app-view').innerHTML = this.buildAdminPanelView();
  },

  cancelEditMedia() {
    this.editingMediaId = null;
    this.navigate('admin');
  },

  async adminSaveNewMedia() {
    const title = document.getElementById('adm-title').value.trim();
    const orig = document.getElementById('adm-orig').value.trim();
    const type = document.getElementById('adm-type').value;
    const year = parseInt(document.getElementById('adm-year').value, 10) || 2025;
    const dur = parseInt(document.getElementById('adm-dur').value, 10) || 120;
    const age = document.getElementById('adm-age').value;
    const poster = document.getElementById('adm-poster').value.trim();
    const description = document.getElementById('adm-desc').value.trim();

    if (!title) {
      this.toast('Введите название произведения!');
      return;
    }

    try {
      await api.request('/api/media', {
        method: 'POST',
        body: JSON.stringify({
          title,
          originalTitle: orig || title,
          type,
          releaseYear: year,
          duration: dur,
          totalEpisodes: type === 'series' ? dur : 1,
          ageRating: age,
          genres: ['Фантастика', 'Драма'],
          poster,
          description
        })
      });
      store.media = await api.request('/api/media');
      this.toast(`Произведение «${title}» добавлено в каталог!`);
      this.navigate('catalog');
    } catch (err) {
      this.toast(err.message);
    }
  },

  async adminUpdateMedia(mediaId) {
    const title = document.getElementById('adm-title').value.trim();
    const orig = document.getElementById('adm-orig').value.trim();
    const type = document.getElementById('adm-type').value;
    const year = parseInt(document.getElementById('adm-year').value, 10) || 2025;
    const dur = parseInt(document.getElementById('adm-dur').value, 10) || 120;
    const age = document.getElementById('adm-age').value;
    const poster = document.getElementById('adm-poster').value.trim();
    const description = document.getElementById('adm-desc').value.trim();

    try {
      await api.request(`/api/media/${mediaId}`, {
        method: 'PUT',
        body: JSON.stringify({
          title,
          originalTitle: orig || title,
          type,
          releaseYear: year,
          duration: dur,
          totalEpisodes: type === 'series' ? dur : 1,
          ageRating: age,
          poster,
          description
        })
      });
      store.media = await api.request('/api/media');
      this.editingMediaId = null;
      this.toast(`Карточка «${title}» успешно обновлена!`);
      this.navigate('catalog');
    } catch (err) {
      this.toast(err.message);
    }
  },

  async adminCreateNewAdmin() {
    const email = document.getElementById('new-adm-email').value.trim();
    const initialUsername = document.getElementById('new-adm-login').value.trim();
    if (!email) {
      this.toast('Введите email нового администратора');
      return;
    }
    try {
      const res = await api.request('/api/admin/create-admin', {
        method: 'POST',
        body: JSON.stringify({ email, initialUsername })
      });
      this.lastCreatedAdminCreds = res;
      await this.syncUserData();
      this.toast('Новый администратор создан! Временный пароль сгенерирован.');
      this.navigate('admin');
    } catch (err) {
      this.toast(err.message);
    }
  },

  async adminResolveComplaint(compId, action) {
    try {
      await api.request(`/api/admin/complaints/${compId}/resolve`, {
        method: 'POST',
        body: JSON.stringify({ action })
      });
      await this.syncUserData();
      store.reviews = await api.request('/api/reviews');
      this.toast(action === 'spoiler' ? 'Метка спойлера установлена' : 'Комментарий удален модератором');
      this.navigate('admin');
    } catch (err) {
      this.toast(err.message);
    }
  },

  // ==========================================================================
  // АККАУНТ АДМИНИСТРАТОРА (БЕЗ СПИСКОВ + СБРОС ПАРОЛЯ И ПЕРЕДАЧА АККАУНТА ПРИ УВОЛЬНЕНИИ)
  // ==========================================================================
  buildAdminAccountView() {
    const u = store.currentUser;
    return `
      <div class="profile-single-container">
        <section class="cabinet-panel admin-border">
          <div class="profile-top-row">
            <div class="avatar-circle-lg" style="background-color:var(--amber-gold);color:#0B0D14;">${u.username[0].toUpperCase()}</div>
            <div class="profile-name-block">
              <h2>${u.username}</h2>
              <p>${u.email} • Служебный аккаунт администратора (без личных списков)</p>
            </div>
          </div>

          <hr class="admin-divider" />

          <h3 class="admin-section-title">Смена личного пароля</h3>
          <div class="admin-2col-inputs">
            <input type="password" id="adm-self-pass1" class="dark-input" placeholder="Новый постоянный пароль (мин. 8 симв.)" />
            <input type="password" id="adm-self-pass2" class="dark-input" placeholder="Повторите новый пароль" />
          </div>
          <button class="btn-save-db-green" onclick="app.adminChangeSelfPassword()">Сохранить новый пароль</button>

          <hr class="admin-divider" />

          <h3 class="admin-section-title">Передача аккаунта новому сотруднику (при увольнении / смене)</h3>
          <p class="form-sub-label">
            Если текущий администратор увольняется и аккаунт нужно передать другому человеку: нажмите кнопку ниже.
            Система <strong>сбросит текущий пароль</strong>, сгенерирует <strong>одноразовый временный пароль</strong> и при следующем входе потребует от нового сотрудника указать <strong>новое имя пользователя</strong> и установить свой постоянный пароль.
          </p>
          <button class="btn-amber-action" onclick="app.adminTriggerHandover()">🔄 Сбросить доступ и сгенерировать временный пароль для передачи</button>

          ${this.lastHandoverCreds ? `
            <div class="generated-cred-box">
              <div style="color:var(--amber-gold);font-weight:700;">⚠️ Доступ сброшен! Передайте эти данные новому администратору:</div>
              <div>Email для входа: <code>${this.lastHandoverCreds.email}</code></div>
              <div>Временный пароль: <code>${this.lastHandoverCreds.tempPassword}</code></div>
              <div style="font-size:11.5px;color:var(--text-light);">После входа по этому паролю откроется обязательная форма смены логина (имени) и установки постоянного пароля.</div>
            </div>
          ` : ''}
        </section>
      </div>
    `;
  },

  async adminChangeSelfPassword() {
    const p1 = document.getElementById('adm-self-pass1').value;
    const p2 = document.getElementById('adm-self-pass2').value;
    if (p1.length < 8) {
      this.toast('Пароль должен содержать минимум 8 символов');
      return;
    }
    if (p1 !== p2) {
      this.toast('Пароли не совпадают');
      return;
    }
    try {
      await api.request('/api/admin/change-password', {
        method: 'POST',
        body: JSON.stringify({ newPassword: p1 })
      });
      this.toast('Ваш пароль администратора успешно изменен!');
      document.getElementById('adm-self-pass1').value = '';
      document.getElementById('adm-self-pass2').value = '';
    } catch (err) {
      this.toast(err.message);
    }
  },

  async adminTriggerHandover() {
    try {
      const res = await api.request('/api/admin/handover-account', { method: 'POST' });
      this.lastHandoverCreds = res;
      this.toast('Временный пароль сгенерирован! Скопируйте его перед выходом.');
      this.navigate('admin-account');
    } catch (err) {
      this.toast(err.message);
    }
  },

  // ==========================================================================
  // ЭКРАН ПЕРВИЧНОЙ НАСТРОЙКИ АККАУНТА (ПРИ ВХОДЕ ПО ВРЕМЕННОМУ ПАРОЛЮ)
  // ==========================================================================
  buildSetupAccountView() {
    const u = store.currentUser;
    return `
      <div class="auth-screen-container">
        <div class="auth-modal-card" style="border-color:var(--amber-gold);">
          <div class="auth-card-head">
            <h1>Переоформление аккаунта</h1>
            <p>Вы вошли по временному паролю (<code>${u.email}</code>).<br/>Укажите ваше новое имя пользователя и задайте постоянный пароль для продолжения работы.</p>
          </div>

          <form onsubmit="event.preventDefault(); app.submitCompleteSetup();" style="display:flex;flex-direction:column;gap:15px;">
            <div class="auth-field-block">
              <div class="auth-label-line">
                <span>Новое имя пользователя (логин) *</span>
              </div>
              <input type="text" id="setup-username-inp" class="auth-input" placeholder="Введите ваше имя (например: admin_elena)" value="${u.username}" required />
              <span class="sub-hint-dynamic">Это имя будет отображаться в шапке и журнале модерации</span>
            </div>

            <div class="auth-field-block">
              <div class="auth-label-line">
                <span>Новый постоянный пароль (мин. 8 символов) *</span>
              </div>
              <div class="auth-input-wrap">
                <input type="password" id="setup-pass1-inp" class="auth-input" placeholder="Придумайте постоянный пароль..." required />
                <span class="eye-icon-btn" onclick="app.togglePasswordVisibility('setup-pass1-inp')">👁</span>
              </div>
            </div>

            <div class="auth-field-block">
              <div class="auth-label-line">
                <span>Подтверждение постоянного пароля *</span>
              </div>
              <input type="password" id="setup-pass2-inp" class="auth-input" placeholder="Повторите постоянный пароль..." required />
            </div>

            <button type="submit" class="btn-submit-green">Сохранить и войти в систему</button>
          </form>
        </div>
      </div>
    `;
  },

  async submitCompleteSetup() {
    const newUsername = document.getElementById('setup-username-inp').value.trim();
    const p1 = document.getElementById('setup-pass1-inp').value;
    const p2 = document.getElementById('setup-pass2-inp').value;

    if (newUsername.length < 3) {
      this.toast('Имя пользователя должно быть не короче 3 символов');
      return;
    }
    if (p1.length < 8) {
      this.toast('Пароль должен содержать минимум 8 символов');
      return;
    }
    if (p1 !== p2) {
      this.toast('Пароли не совпадают');
      return;
    }

    try {
      const data = await api.request('/api/auth/complete-setup', {
        method: 'POST',
        body: JSON.stringify({ newUsername, newPassword: p1 })
      });
      api.setToken(data.token);
      store.currentUser = data.user;
      await this.syncUserData();
      this.toast(`Учетная запись переоформлена на ${data.user.username}!`);
      this.navigate(data.user.role === 'admin' ? 'admin' : 'profile');
    } catch (err) {
      this.toast(err.message);
    }
  },

  // ==========================================================================
  // ВХОД И РЕГИСТРАЦИЯ
  // ==========================================================================
  buildLoginView() {
    return `
      <div class="auth-screen-container">
        <div class="auth-modal-card">
          <div class="auth-card-head">
            <h1>Вход в систему</h1>
            <p>Войдите в аккаунт для управления списками и отзывами</p>
          </div>

          <form onsubmit="event.preventDefault(); app.submitLogin();" style="display:flex;flex-direction:column;gap:16px;">
            <div class="auth-field-block">
              <div class="auth-label-line"><span>Электронная почта или логин</span></div>
              <input type="text" id="login-ident-inp" class="auth-input" placeholder="Введите ваш логин или email..." required />
            </div>

            <div class="auth-field-block">
              <div class="auth-label-line">
                <span>Пароль</span>
                <span class="forgot-link" onclick="app.toast('Обратитесь к администратору для генерации временного пароля')">Забыли пароль?</span>
              </div>
              <div class="auth-input-wrap">
                <input type="password" id="login-pass-inp" class="auth-input" placeholder="Введите пароль..." required />
                <span class="eye-icon-btn" onclick="app.togglePasswordVisibility('login-pass-inp')">👁</span>
              </div>
            </div>

            <label class="remember-row">
              <input type="checkbox" checked />
              <span>Запомнить меня на этом устройстве</span>
            </label>

            <button type="submit" class="btn-submit-ruby">Войти в систему</button>
          </form>

          <hr class="auth-hr" />
          <div class="auth-switch-line">
            Еще нет аккаунта? <span onclick="app.navigate('register')">Зарегистрироваться →</span>
          </div>
        </div>

        <div class="test-accounts-dashed">
          <div>Быстрый вход для проверки ролей:</div>
          <div class="quick-fill-row">
            <button type="button" class="btn-quick-role" onclick="app.fillDemoCredentials('user')">👤 Зритель (user)</button>
            <button type="button" class="btn-quick-role" onclick="app.fillDemoCredentials('admin')">🔑 Администратор (admin)</button>
          </div>
        </div>
      </div>
    `;
  },

  fillDemoCredentials(role) {
    const ident = document.getElementById('login-ident-inp');
    const pass = document.getElementById('login-pass-inp');
    if (!ident || !pass) return;
    if (role === 'admin') {
      ident.value = 'admin@tracker.ru';
      pass.value = 'adminpassword';
      this.toast('Данные администратора подставлены');
    } else {
      ident.value = 'alex@example.com';
      pass.value = 'password123';
      this.toast('Данные зрителя подставлены');
    }
  },

  async submitLogin() {
    const ident = document.getElementById('login-ident-inp').value.trim();
    const pass = document.getElementById('login-pass-inp').value.trim();

    if (!ident || !pass) {
      this.toast('Заполните логин и пароль');
      return;
    }

    try {
      const data = await api.request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier: ident, password: pass })
      });
      api.setToken(data.token);
      store.currentUser = data.user;

      if (data.user.mustChangePassword) {
        this.toast('Вход по временному паролю: задайте новое имя и постоянный пароль');
        this.navigate('setup-account');
        return;
      }

      await this.syncUserData();
      this.toast(`Добро пожаловать, ${data.user.username}!`);
      this.navigate(data.user.role === 'admin' ? 'admin' : 'profile');
    } catch (err) {
      this.toast(err.message);
    }
  },

  buildRegisterView() {
    return `
      <div class="auth-screen-container">
        <div class="auth-modal-card">
          <div class="auth-card-head">
            <h1>Создание аккаунта</h1>
            <p>Заполните форму, чтобы вести учет просмотренных тайтлов с нуля</p>
          </div>

          <form onsubmit="event.preventDefault(); app.submitRegister();" style="display:flex;flex-direction:column;gap:15px;">
            <div class="auth-field-block">
              <div class="auth-label-line"><span>Имя пользователя (username) *</span></div>
              <div class="auth-input-wrap">
                <input type="text" id="reg-user-inp" class="auth-input" placeholder="Придумайте логин (например: cinema_fan)" oninput="app.onRegUsernameInput(this.value)" required />
                <span class="valid-check-mark" id="reg-user-check" style="display:none">✓</span>
              </div>
              <span class="sub-hint-dynamic" id="reg-user-hint">Минимум 3 символа</span>
            </div>

            <div class="auth-field-block">
              <div class="auth-label-line"><span>Электронная почта (email) *</span></div>
              <input type="email" id="reg-email-inp" class="auth-input" placeholder="Введите ваш email (name@example.com)" required />
            </div>

            <div class="auth-field-block">
              <div class="auth-label-line"><span>Пароль (не менее 8 символов) *</span></div>
              <div class="auth-input-wrap">
                <input type="password" id="reg-pass-inp" class="auth-input" placeholder="Придумайте надежный пароль..." oninput="app.onRegPassInput(this.value)" required />
                <span class="eye-icon-btn" onclick="app.togglePasswordVisibility('reg-pass-inp')">👁</span>
              </div>
              <div class="strength-bars-grid">
                <div class="str-seg" id="str-seg-1"></div>
                <div class="str-seg" id="str-seg-2"></div>
                <div class="str-seg" id="str-seg-3"></div>
                <div class="str-seg" id="str-seg-4"></div>
              </div>
              <span class="str-caption" id="reg-pass-caption">Введите не менее 8 символов</span>
            </div>

            <div class="auth-field-block">
              <div class="auth-label-line"><span>Подтверждение пароля *</span></div>
              <input type="password" id="reg-pass2-inp" class="auth-input" placeholder="Повторите введенный пароль..." required />
            </div>

            <label class="remember-row">
              <input type="checkbox" id="reg-agree-chk" required />
              <span>Я принимаю правила публикации рецензий и политику ПДн</span>
            </label>

            <button type="submit" class="btn-submit-green">Зарегистрироваться</button>
          </form>

          <hr class="auth-hr" />
          <div class="auth-switch-line">
            Уже есть аккаунт? <span onclick="app.navigate('login')">Войти в систему →</span>
          </div>
        </div>
      </div>
    `;
  },

  onRegUsernameInput(val) {
    const v = val.trim();
    const inp = document.getElementById('reg-user-inp');
    const chk = document.getElementById('reg-user-check');
    const hint = document.getElementById('reg-user-hint');
    if (!v) {
      inp.classList.remove('green-outline'); chk.style.display = 'none';
      hint.className = 'sub-hint-dynamic'; hint.textContent = 'Минимум 3 символа';
      return;
    }
    if (v.length < 3) {
      inp.classList.remove('green-outline'); chk.style.display = 'none';
      hint.className = 'sub-hint-dynamic err'; hint.textContent = 'Логин должен быть не короче 3 символов';
    } else {
      inp.classList.add('green-outline'); chk.style.display = 'inline';
      hint.className = 'sub-hint-dynamic ok'; hint.textContent = 'Формат логина корректен';
    }
  },

  onRegPassInput(val) {
    const len = val.length;
    const s1 = document.getElementById('str-seg-1');
    const s2 = document.getElementById('str-seg-2');
    const s3 = document.getElementById('str-seg-3');
    const s4 = document.getElementById('str-seg-4');
    const cap = document.getElementById('reg-pass-caption');
    [s1, s2, s3, s4].forEach(el => el.className = 'str-seg');

    if (len === 0) cap.textContent = 'Введите не менее 8 символов';
    else if (len < 8) { s1.classList.add('active-amber'); cap.textContent = `Слишком короткий пароль (${len} из 8 символов)`; }
    else if (len < 11) { s1.classList.add('active-green'); s2.classList.add('active-green'); s3.classList.add('active-green'); cap.textContent = 'Надежность пароля: высокая'; }
    else { s1.classList.add('active-green'); s2.classList.add('active-green'); s3.classList.add('active-green'); s4.classList.add('active-green'); cap.textContent = 'Надежность пароля: максимальная'; }
  },

  async submitRegister() {
    const username = document.getElementById('reg-user-inp').value.trim();
    const email = document.getElementById('reg-email-inp').value.trim();
    const pass = document.getElementById('reg-pass-inp').value;
    const pass2 = document.getElementById('reg-pass2-inp').value;

    if (pass !== pass2) {
      this.toast('Ошибка: пароль и подтверждение не совпадают');
      return;
    }

    try {
      const data = await api.request('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, email, password: pass })
      });
      api.setToken(data.token);
      store.currentUser = data.user;
      await this.syncUserData();
      this.toast(`Аккаунт ${username} сохранен в базу данных!`);
      this.navigate('profile');
    } catch (err) {
      this.toast(err.message);
    }
  },

  togglePasswordVisibility(inputId) {
    const inp = document.getElementById(inputId);
    if (!inp) return;
    inp.type = inp.type === 'password' ? 'text' : 'password';
  }
};

window.addEventListener('DOMContentLoaded', () => app.init());
