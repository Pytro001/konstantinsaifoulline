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

  initHistoryText();
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

function initHistoryText() {
  const paragraphs = document.querySelectorAll('.history-text p');
  if (!paragraphs.length) return;

  paragraphs.forEach((paragraph) => {
    const words = paragraph.textContent.trim().split(/\s+/);
    paragraph.textContent = '';
    words.forEach((word, index) => {
      const span = document.createElement('span');
      span.className = 'history-word';
      span.textContent = word;
      paragraph.appendChild(span);
      if (index < words.length - 1) {
        paragraph.appendChild(document.createTextNode(' '));
      }
    });
  });

  const words = document.querySelectorAll('.history-word');
  const updateWords = () => {
    const triggerY = window.innerHeight * 0.72;
    words.forEach((word) => {
      const rect = word.getBoundingClientRect();
      const isLit = rect.top < triggerY && rect.bottom > window.innerHeight * 0.12;
      word.classList.toggle('is-lit', isLit);
    });
  };

  window.addEventListener('scroll', updateWords, { passive: true });
  window.addEventListener('resize', updateWords);
  updateWords();
}

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

  let currentIndex = 0;
  let wheelCooldown = false;
  let touchStartY = 0;
  let touchStartX = 0;
  let touchAccumY = 0;
  const SWIPE_THRESHOLD = 24;
  const WHEEL_COOLDOWN_MS = 450;

  const coverUrl = (book, ext = 'jpg') => `assets/books/${book.id}.${ext}`;

  const setCoverImage = (img, book) => {
    img.alt = `${book.title} cover`;
    img.src = coverUrl(book, 'jpg');
    img.onerror = () => {
      img.onerror = null;
      img.src = coverUrl(book, 'svg');
    };
  };

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
    card.addEventListener('click', () => openBookModal(book));
    carousel.appendChild(card);
  });

  const getCardStep = () => {
    const card = carousel.querySelector('.book-card');
    if (!card) return 0;
    const gap = parseFloat(getComputedStyle(carousel).gap) || 20;
    return card.offsetWidth + gap;
  };

  const syncCarouselPadding = () => {
    const card = carousel.querySelector('.book-card');
    if (!card) return;
    const half = card.offsetWidth / 2;
    carousel.style.paddingLeft = `calc(50% - ${half}px)`;
    carousel.style.paddingRight = `calc(50% - ${half}px)`;
  };

  const updateCarousel = (animate = true) => {
    currentIndex = Math.max(0, Math.min(currentIndex, books.length - 1));
    carousel.classList.toggle('no-transition', !animate);
    carousel.style.transform = `translateX(-${currentIndex * getCardStep()}px)`;
    counter.textContent = `${currentIndex + 1} / ${books.length}`;
    if (!animate) {
      requestAnimationFrame(() => carousel.classList.remove('no-transition'));
    }
  };

  const stepCarousel = (direction) => {
    currentIndex += direction;
    updateCarousel(true);
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

  const closeBookModal = () => {
    modal.hidden = true;
    if (!document.querySelector('.nav-links.open')) {
      document.body.style.overflow = '';
    }
  };

  modalClose?.addEventListener('click', closeBookModal);
  modalBackdrop?.addEventListener('click', closeBookModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hidden) closeBookModal();
  });

  window.addEventListener('resize', () => {
    syncCarouselPadding();
    updateCarousel(false);
  });

  const handleVerticalSwipe = (deltaY) => {
    if (!modal.hidden) return;
    if (deltaY > SWIPE_THRESHOLD) stepCarousel(1);
    else if (deltaY < -SWIPE_THRESHOLD) stepCarousel(-1);
  };

  carouselViewport?.addEventListener('wheel', (e) => {
    if (!modal.hidden) return;
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
    e.preventDefault();
    if (wheelCooldown) return;
    wheelCooldown = true;
    stepCarousel(e.deltaY > 0 ? 1 : -1);
    setTimeout(() => {
      wheelCooldown = false;
    }, WHEEL_COOLDOWN_MS);
  }, { passive: false });

  carouselViewport?.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
    touchStartX = e.touches[0].clientX;
    touchAccumY = 0;
    carouselViewport.classList.add('is-dragging');
  }, { passive: true });

  carouselViewport?.addEventListener('touchmove', (e) => {
    if (!modal.hidden) return;
    const dy = e.touches[0].clientY - touchStartY;
    const dx = e.touches[0].clientX - touchStartX;
    if (Math.abs(dy) > Math.abs(dx)) {
      e.preventDefault();
      touchAccumY = dy;
    }
  }, { passive: false });

  carouselViewport?.addEventListener('touchend', () => {
    carouselViewport.classList.remove('is-dragging');
    handleVerticalSwipe(touchAccumY);
    touchAccumY = 0;
  });

  let dragStartY = 0;
  carouselViewport?.addEventListener('mousedown', (e) => {
    dragStartY = e.clientY;
    carouselViewport.classList.add('is-dragging');
  });

  window.addEventListener('mouseup', (e) => {
    if (!carouselViewport.classList.contains('is-dragging')) return;
    carouselViewport.classList.remove('is-dragging');
    const deltaY = e.clientY - dragStartY;
    handleVerticalSwipe(deltaY);
  });

  syncCarouselPadding();
  updateCarousel(false);
}
