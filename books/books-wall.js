// Library wall — a spatial gallery of every book cover with a pointer-driven
// fisheye focus and a slide-in detail card. Inspired by nothing-to-watch.

(function () {
  const books = (window.BOOKS || []).slice();
  const wall = document.getElementById('wall');
  if (!wall || !books.length) return;

  const N = books.length;

  // ---- Build the grid of tiles ----
  // Cells are sized by CSS grid (1fr) to fill the viewport exactly. We pick a
  // column count that keeps each cell close to a 2:3 book-cover ratio, then
  // fill any leftover cells by cycling covers so the wall reads edge-to-edge.
  let tiles = [];
  let cols = 1;
  let rows = 1;

  const coverSrc = (book) => `/assets/books/${book.id}.jpg`;

  function buildGrid() {
    const W = window.innerWidth || document.documentElement.clientWidth || 1280;
    const H = window.innerHeight || document.documentElement.clientHeight || 800;
    const ratio = 2 / 3; // desired tile width / height
    const guess = Math.round(Math.sqrt((N * W) / (ratio * H)));
    cols = Math.max(3, Number.isFinite(guess) && guess > 0 ? guess : 3);
    rows = Math.ceil(N / cols);
    const cells = cols * rows;

    wall.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    wall.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
    wall.textContent = '';
    tiles = [];

    for (let i = 0; i < cells; i++) {
      const book = books[i % N];
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'tile';
      el.setAttribute('aria-label', `${book.title} by ${book.author}`);

      const img = document.createElement('img');
      img.loading = 'lazy';
      img.decoding = 'async';
      img.alt = '';
      img.src = coverSrc(book);
      img.addEventListener('error', function handle() {
        img.removeEventListener('error', handle);
        img.src = `/assets/books/${book.id}.svg`;
      });
      el.appendChild(img);

      el.addEventListener('click', () => openDetail(book));
      wall.appendChild(el);
      tiles.push({ el, cx: 0, cy: 0 });
    }
    measure();
  }

  // Cache each tile's centre (grid cells don't move, so we only remeasure on
  // resize — no per-frame layout reads).
  function measure() {
    for (const t of tiles) {
      const r = t.el.getBoundingClientRect();
      t.cx = r.left + r.width / 2;
      t.cy = r.top + r.height / 2;
    }
  }

  // ---- Fisheye focus that follows the pointer ----
  const SIGMA = () => Math.min(window.innerWidth, window.innerHeight) * 0.22;
  const AMP = 1.7;   // max extra scale on the focused cover
  const PUSH = 46;   // radial displacement so the focus visibly bulges
  const BASE_B = 0.58;

  let mx = -1e5, my = -1e5;      // target pointer
  let px = -1e5, py = -1e5;      // smoothed pointer
  let strength = 0, strengthT = 0;
  let running = false;

  function ensureRunning() {
    if (!running) {
      running = true;
      requestAnimationFrame(frame);
    }
  }

  function frame() {
    px += (mx - px) * 0.28;
    py += (my - py) * 0.28;
    strength += (strengthT - strength) * 0.14;

    const sigma = SIGMA();
    const twoSigma2 = 2 * sigma * sigma;

    for (const t of tiles) {
      let s = 1, tx = 0, ty = 0, b = BASE_B;
      if (strength > 0.002) {
        const dx = t.cx - px;
        const dy = t.cy - py;
        const d2 = dx * dx + dy * dy;
        const g = Math.exp(-d2 / twoSigma2) * strength;
        s = 1 + AMP * g;
        if (s > 1.001) {
          const d = Math.sqrt(d2) || 1;
          const pd = (s - 1) * PUSH;
          tx = (dx / d) * pd;
          ty = (dy / d) * pd;
        }
        b = BASE_B + (1 - BASE_B) * g;
      }
      const st = t.el.style;
      st.transform = `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) scale(${s.toFixed(3)})`;
      st.filter = `brightness(${b.toFixed(3)})`;
      st.zIndex = ((s * 100) | 0).toString();
    }

    const settling =
      strength > 0.004 ||
      Math.abs(mx - px) > 0.4 ||
      Math.abs(my - py) > 0.4;
    if (settling) {
      requestAnimationFrame(frame);
    } else {
      running = false;
    }
  }

  function onPointerMove(e) {
    mx = e.clientX;
    my = e.clientY;
    if (px < -9e4) { px = mx; py = my; } // avoid a sweep on first move
    strengthT = 1;
    ensureRunning();
  }
  function onPointerLeave() {
    strengthT = 0;
    ensureRunning();
  }

  wall.addEventListener('pointermove', onPointerMove, { passive: true });
  wall.addEventListener('pointerleave', onPointerLeave, { passive: true });
  wall.addEventListener('pointerdown', onPointerMove, { passive: true });

  // ---- Detail card ----
  const detail = document.getElementById('detail');
  const dCover = document.getElementById('detailCover');
  const dTitle = document.getElementById('detailTitle');
  const dAuthor = document.getElementById('detailAuthor');
  const dTags = document.getElementById('detailTags');
  const dDesc = document.getElementById('detailDesc');
  const linkGoogle = document.getElementById('linkGoogle');
  const linkGoodreads = document.getElementById('linkGoodreads');
  const favBtn = document.getElementById('favBtn');
  const closeBtn = document.getElementById('detailClose');
  const closeX = document.getElementById('detailCloseX');

  const FAV_KEY = 'kslib-favorites';
  const getFavs = () => {
    try { return JSON.parse(localStorage.getItem(FAV_KEY) || '[]'); }
    catch { return []; }
  };
  const setFavs = (arr) => {
    try { localStorage.setItem(FAV_KEY, JSON.stringify(arr)); } catch {}
  };

  let current = null;

  function syncFav() {
    if (!current) return;
    const on = getFavs().includes(current.id);
    favBtn.classList.toggle('is-fav', on);
    favBtn.setAttribute('aria-label', on ? 'Remove from favorites' : 'Save to favorites');
  }

  function openDetail(book) {
    current = book;
    dCover.src = coverSrc(book);
    dCover.onerror = () => { dCover.onerror = null; dCover.src = `/assets/books/${book.id}.svg`; };
    dCover.alt = `${book.title} cover`;
    dTitle.textContent = book.title;
    dAuthor.textContent = `by ${book.author}`;

    dTags.textContent = '';
    if (book.author) {
      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.textContent = book.author;
      dTags.appendChild(tag);
    }

    const notes = (book.notes || '').trim();
    dDesc.textContent = notes ||
      `“${book.title}” by ${book.author} — from Konstantin's library.`;

    const q = encodeURIComponent(`${book.title} ${book.author}`);
    linkGoogle.href = `https://www.google.com/search?tbm=bks&q=${q}`;
    linkGoodreads.href = `https://www.goodreads.com/search?q=${q}`;

    syncFav();
    detail.classList.add('open');
    document.body.classList.add('has-detail');
  }

  function closeDetail() {
    detail.classList.remove('open');
    document.body.classList.remove('has-detail');
    current = null;
  }

  favBtn.addEventListener('click', () => {
    if (!current) return;
    const favs = getFavs();
    const i = favs.indexOf(current.id);
    if (i >= 0) favs.splice(i, 1); else favs.push(current.id);
    setFavs(favs);
    syncFav();
  });
  closeBtn.addEventListener('click', closeDetail);
  closeX.addEventListener('click', closeDetail);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (detail.classList.contains('open')) closeDetail();
      else hideAbout();
    }
  });

  // ---- About overlay ----
  const about = document.getElementById('about');
  const infoBtn = document.getElementById('infoBtn');
  const aboutClose = document.getElementById('aboutClose');
  const aboutBackdrop = document.getElementById('aboutBackdrop');
  const showAbout = () => { about.hidden = false; };
  const hideAbout = () => { about.hidden = true; };
  infoBtn.addEventListener('click', showAbout);
  aboutClose.addEventListener('click', hideAbout);
  aboutBackdrop.addEventListener('click', hideAbout);

  // ---- Resize (debounced rebuild) ----
  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(buildGrid, 160);
  });

  buildGrid();
})();
