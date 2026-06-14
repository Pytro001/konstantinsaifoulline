// Konstantin Saifoulline - Website Interactions

document.addEventListener('DOMContentLoaded', () => {
  const nav = document.querySelector('.nav');
  const handleScroll = () => {
    if (window.scrollY > 50) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  };
  window.addEventListener('scroll', handleScroll);
  handleScroll();

  const navToggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      navToggle.classList.toggle('open');
      navLinks.classList.toggle('open');
      document.body.style.overflow = navLinks.classList.contains('open') ? 'hidden' : '';
    });
    navLinks.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        navToggle.classList.remove('open');
        navLinks.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  initBookshelf();

  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (href === '#' || href.length < 2) return;
      if (href.includes('://')) return;
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
});

function initBookshelf() {
  const carouselViewport = document.getElementById('booksCarouselViewport');
  const carousel = document.getElementById('booksCarousel');
  const counter = document.getElementById('booksCarouselCounter');
  const modal = document.getElementById('bookModal');
  const modalBackdrop = document.getElementById('bookModalBackdrop');
  const modalClose = document.getElementById('bookModalClose');
  const modalCover = document.getElementById('bookModalCover');
  const modalTitle = document.getElementById('bookModalTitle');
  const modalAuthor = document.getElementById('bookModalAuthor');
  const modalNotes = document.getElementById('bookModalNotes');

  const books = window.BOOKS;
  if (!carousel || !counter || !books?.length) {
    return;
  }

  const coverUrl = (book, ext = 'jpg') => `assets/books/${book.id}.${ext}`;

  const setCoverImage = (img, book) => {
    img.alt = `${book.title} cover`;
    img.src = coverUrl(book, 'jpg');
    img.onerror = () => {
      img.onerror = null;
      img.src = coverUrl(book, 'svg');
    };
  };

  const openBookModal = (book) => {
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    modalTitle.textContent = book.title;
    modalAuthor.textContent = `by ${book.author}`;
    const notes = book.notes?.trim() || '';
    modalNotes.textContent = notes;
    modalNotes.hidden = !notes;
    setCoverImage(modalCover, book);
  };

  // Expose so other features can reuse the same modal
  window.openBookModalGlobal = openBookModal;

  const closeBookModal = () => {
    modal.hidden = true;
    if (!document.querySelector('.nav-links.open')) {
      document.body.style.overflow = '';
    }
  };

  // Drag tracking so a click-drag scroll doesn't also open a book.
  let pointerMoved = false;

  books.forEach((book) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'book-card';
    card.setAttribute('aria-label', `${book.title} by ${book.author}`);

    const coverWrap = document.createElement('div');
    coverWrap.className = 'book-cover-wrap';

    const img = document.createElement('img');
    img.loading = 'lazy';
    setCoverImage(img, book);

    const title = document.createElement('span');
    title.className = 'book-card-title';
    title.textContent = book.title;

    coverWrap.appendChild(img);
    card.appendChild(coverWrap);
    card.appendChild(title);
    card.addEventListener('click', () => {
      if (pointerMoved) return; // it was a drag, not a tap
      openBookModal(book);
    });
    carousel.appendChild(card);
  });

  // Highlight the left-most cover + update the counter from the live scroll
  // position. Books run flush from the left edge to the right edge.
  let activeRaf = 0;
  const updateActive = () => {
    activeRaf = 0;
    const all = carousel.querySelectorAll('.book-card');
    if (!all.length) return;
    const left = carouselViewport.scrollLeft;
    let best = 0;
    let bestDist = Infinity;
    all.forEach((card, i) => {
      const d = Math.abs(card.offsetLeft - left);
      if (d < bestDist) { bestDist = d; best = i; }
    });
    all.forEach((card, i) => card.classList.toggle('is-active', i === best));
    counter.textContent = `${best + 1} / ${books.length}`;
  };
  const queueUpdate = () => {
    if (!activeRaf) activeRaf = requestAnimationFrame(updateActive);
  };

  // Native horizontal scrolling stays buttery; the OS handles momentum.
  carouselViewport.addEventListener('scroll', queueUpdate, { passive: true });

  // Map vertical wheel / trackpad onto horizontal scroll so you can browse
  // without holding shift — continuous, never stepped.
  carouselViewport.addEventListener('wheel', (e) => {
    if (!modal.hidden) return;
    const delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    if (!delta) return;
    e.preventDefault();
    carouselViewport.scrollLeft += delta;
  }, { passive: false });

  // Click-and-drag to scroll on desktop (touch uses native momentum scroll).
  let dragging = false;
  let dragStartX = 0;
  let dragStartScroll = 0;
  carouselViewport.addEventListener('pointerdown', (e) => {
    pointerMoved = false;
    if (e.pointerType === 'touch') return;
    dragging = true;
    dragStartX = e.clientX;
    dragStartScroll = carouselViewport.scrollLeft;
    carouselViewport.classList.add('is-dragging');
  });
  carouselViewport.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - dragStartX;
    if (Math.abs(dx) > 4) pointerMoved = true;
    carouselViewport.scrollLeft = dragStartScroll - dx;
  });
  const endDrag = () => {
    if (!dragging) return;
    dragging = false;
    carouselViewport.classList.remove('is-dragging');
  };
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);

  modalClose?.addEventListener('click', closeBookModal);
  modalBackdrop?.addEventListener('click', closeBookModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hidden) closeBookModal();
  });

  window.addEventListener('resize', queueUpdate);

  updateActive();
}
