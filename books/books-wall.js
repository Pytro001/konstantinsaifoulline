// Library wall — a dense spatial field of every book cover with a radial
// fisheye warp that bulges the covers around the pointer into a curved,
// continuous surface, plus a slide-in detail card. Inspired by
// nothing-to-watch (gnovotny), rebuilt for book covers.

(function () {
  const books = (window.BOOKS || []).slice();
  const wall = document.getElementById('wall');
  const light = document.getElementById('focusLight');
  if (!wall || !books.length) return;
  const N = books.length;

  const coverSrc = (b) => `/assets/books/${b.id}.jpg`;
  const svgSrc = (b) => `/assets/books/${b.id}.svg`;

  // ---- Tunables ----
  const BASE_W = 64;     // base tile width (px) — smaller = denser wall
  const RATIO = 1.5;     // tile height / width (portrait covers)
  const OVER = 0.85;     // overscan beyond the viewport so edges stay covered
  const DIST = 2.7;      // fisheye strength (centre magnifies by DIST+1)
  const AMBIENT = 0.6;   // resting lens strength (the wall is never fully flat)

  let tiles = [];
  let W = 0, H = 0, R = 1;

  function build() {
    W = window.innerWidth || 1280;
    H = window.innerHeight || 800;
    R = Math.hypot(W, H) * 0.5; // radius over which the fisheye acts

    // Fewer, larger tiles on small/phone screens to keep it smooth.
    const small = Math.min(W, H) < 680;
    const tileW = small ? 78 : BASE_W;
    const over = small ? 0.5 : OVER;
    const tileH = Math.round(tileW * RATIO);
    const cols = Math.ceil((W * (1 + over)) / tileW);
    const rows = Math.ceil((H * (1 + over)) / tileH);
    const ox = (W - cols * tileW) / 2;
    const oy = (H - rows * tileH) / 2;

    wall.textContent = '';
    tiles = [];
    const frag = document.createDocumentFragment();
    let n = 0;
    for (let ri = 0; ri < rows; ri++) {
      for (let ci = 0; ci < cols; ci++) {
        const book = books[n % N];
        n++;
        const el = document.createElement('button');
        el.type = 'button';
        el.className = 'tile';
        el.style.left = (ox + ci * tileW) + 'px';
        el.style.top = (oy + ri * tileH) + 'px';
        el.style.width = tileW + 'px';
        el.style.height = tileH + 'px';
        el.setAttribute('aria-label', `${book.title} by ${book.author}`);

        const img = document.createElement('img');
        img.decoding = 'async';
        img.alt = '';
        img.src = coverSrc(book);
        img.addEventListener('error', function h() {
          img.removeEventListener('error', h);
          img.src = svgSrc(book);
        });
        el.appendChild(img);

        const t = {
          el,
          cx: ox + ci * tileW + tileW / 2,
          cy: oy + ri * tileH + tileH / 2,
          book,
        };
        el.addEventListener('click', () => selectTile(t));
        frag.appendChild(el);
        tiles.push(t);
      }
    }
    wall.appendChild(frag);

    const ls = Math.round(R * 1.7);
    light.style.width = ls + 'px';
    light.style.height = ls + 'px';
    light.style.marginLeft = -(ls / 2) + 'px';
    light.style.marginTop = -(ls / 2) + 'px';
  }

  // ---- Radial fisheye animation ----
  let fx = 0, fy = 0;         // smoothed focus
  let tfx = 0, tfy = 0;       // target focus
  let strength = 0, strengthT = AMBIENT;
  let running = false;
  let locked = false;

  function ensure() {
    if (!running) { running = true; requestAnimationFrame(frame); }
  }

  function frame() {
    fx += (tfx - fx) * 0.18;
    fy += (tfy - fy) * 0.18;
    strength += (strengthT - strength) * 0.12;

    const D = DIST;
    for (let i = 0; i < tiles.length; i++) {
      const t = tiles[i];
      const dx = t.cx - fx;
      const dy = t.cy - fy;
      const r = Math.hypot(dx, dy) || 0.0001;
      const rn = r / R;
      const rc = rn < 1 ? rn : 1;
      const denom = D * rc + 1;
      const rP = ((D + 1) * rc / denom) * R + (rn > 1 ? (r - R) : 0);
      const mag = (D + 1) / (denom * denom); // local magnification
      const s = 1 + (mag - 1) * strength;
      const ux = dx / r, uy = dy / r;
      const tx = (fx + ux * rP - t.cx) * strength;
      const ty = (fy + uy * rP - t.cy) * strength;
      const st = t.el.style;
      st.transform = `translate(${tx.toFixed(1)}px,${ty.toFixed(1)}px) scale(${s.toFixed(3)})`;
      st.zIndex = ((s * 100) | 0).toString();
    }

    light.style.transform = `translate(${fx.toFixed(1)}px, ${fy.toFixed(1)}px)`;
    light.style.opacity = (0.35 + 0.65 * strength).toFixed(3);

    const moving =
      Math.abs(tfx - fx) > 0.3 ||
      Math.abs(tfy - fy) > 0.3 ||
      Math.abs(strengthT - strength) > 0.004;
    if (moving) requestAnimationFrame(frame);
    else running = false;
  }

  function onMove(e) {
    if (locked) return;
    tfx = e.clientX;
    tfy = e.clientY;
    strengthT = 1;
    ensure();
  }
  function onLeave() {
    if (locked) return;
    strengthT = AMBIENT;
    ensure();
  }
  wall.addEventListener('pointermove', onMove, { passive: true });
  wall.addEventListener('pointerdown', onMove, { passive: true });
  wall.addEventListener('pointerleave', onLeave, { passive: true });

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
  const getFavs = () => { try { return JSON.parse(localStorage.getItem(FAV_KEY) || '[]'); } catch { return []; } };
  const setFavs = (a) => { try { localStorage.setItem(FAV_KEY, JSON.stringify(a)); } catch {} };

  let current = null;

  function syncFav() {
    if (!current) return;
    const on = getFavs().includes(current.id);
    favBtn.classList.toggle('is-fav', on);
    favBtn.setAttribute('aria-label', on ? 'Remove from favorites' : 'Save to favorites');
  }

  function selectTile(t) {
    // Lock the lens onto the chosen cover so it stays bulged behind the card.
    locked = true;
    tfx = t.cx;
    tfy = t.cy;
    strengthT = 1;
    ensure();
    openDetail(t.book);
  }

  function openDetail(book) {
    current = book;
    dCover.src = coverSrc(book);
    dCover.onerror = () => { dCover.onerror = null; dCover.src = svgSrc(book); };
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
    dDesc.textContent = notes || `“${book.title}” by ${book.author} — from Konstantin's library.`;

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
    locked = false;
    strengthT = AMBIENT;
    ensure();
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
    if (e.key === 'Escape' && detail.classList.contains('open')) closeDetail();
  });

  // ---- Resize (debounced rebuild) ----
  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      build();
      if (!locked) { tfx = fx = W / 2; tfy = fy = H / 2; }
      ensure();
    }, 160);
  });

  build();
  tfx = fx = W / 2;
  tfy = fy = H / 2;
  strengthT = AMBIENT;
  ensure();
})();
