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

  let currentIndex = 0;
  let wheelCooldown = false;
  let touchStartY = 0;
  let touchStartX = 0;
  let touchAccumY = 0;
  let touchAccumX = 0;
  let swipeAxis = null; // 'v' vertical | 'h' horizontal — locked after first 6px

  // Track recent touch points for velocity calculation
  let recentTouchY = [];
  let recentTouchT = [];

  const SWIPE_THRESHOLD = 16;
  const AXIS_LOCK_PX = 6;
  const WHEEL_COOLDOWN_MS = 110;

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

  const syncCarouselPadding = () => {
    const card = carousel.querySelector('.book-card');
    if (!card) return;
    const half = card.offsetWidth / 2;
    carousel.style.paddingLeft = '0';
    carousel.style.paddingRight = `calc(50% - ${half}px)`;
  };

  const getMaxTranslate = () => {
    const cards = carousel.querySelectorAll('.book-card');
    if (!cards.length || !carouselViewport) return 0;
    const lastCard = cards[cards.length - 1];
    const viewportWidth = carouselViewport.offsetWidth;
    const lastCenter = lastCard.offsetLeft + lastCard.offsetWidth / 2;
    return Math.max(0, lastCenter - viewportWidth / 2);
  };

  const getTranslateForIndex = (index) => {
    if (index === 0) return 0;
    const cards = carousel.querySelectorAll('.book-card');
    const card = cards[index];
    if (!card || !carouselViewport) return 0;
    const viewportWidth = carouselViewport.offsetWidth;
    const cardCenter = card.offsetLeft + card.offsetWidth / 2;
    const target = cardCenter - viewportWidth / 2;
    return Math.min(Math.max(0, target), getMaxTranslate());
  };

  // Counter always reflects the current index position (1-based)
  const updateCounter = () => {
    counter.textContent = `${currentIndex + 1} / ${books.length}`;
  };

  const updateCarousel = (animate = true) => {
    currentIndex = Math.max(0, Math.min(currentIndex, books.length - 1));
    carousel.classList.toggle('no-transition', !animate);
    carousel.style.transform = `translateX(-${getTranslateForIndex(currentIndex)}px)`;
    carousel.querySelectorAll('.book-card').forEach((card, index) => {
      card.classList.toggle('is-active', index === currentIndex && currentIndex > 0);
    });
    updateCounter();
    if (!animate) {
      requestAnimationFrame(() => carousel.classList.remove('no-transition'));
    }
  };

  const stepCarousel = (direction) => {
    currentIndex += direction;
    updateCarousel(true);
  };

  // Fire multiple steps with deceleration for momentum scrolling
  const launchMomentum = (direction, velocityAbs) => {
    // Number of extra steps scales with velocity (max 12)
    const numSteps = Math.min(Math.max(1, Math.round(velocityAbs * 9)), 12);
    // Start fast, decelerate — interval grows each step
    const baseInterval = Math.max(90, 210 - velocityAbs * 55);
    let delay = 0;
    for (let i = 0; i < numSteps; i++) {
      setTimeout(() => stepCarousel(direction), delay);
      delay += baseInterval + i * 38;
    }
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

  const handleSwipe = (forward, velocityAbs) => {
    if (!modal.hidden) return;
    launchMomentum(forward ? 1 : -1, velocityAbs);
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
    touchAccumX = 0;
    swipeAxis = null;
    recentTouchY = [e.touches[0].clientY];
    recentTouchT = [Date.now()];
    carouselViewport.classList.add('is-dragging');
  }, { passive: true });

  carouselViewport?.addEventListener('touchmove', (e) => {
    if (!modal.hidden) return;
    const dy = e.touches[0].clientY - touchStartY;
    const dx = e.touches[0].clientX - touchStartX;

    // Lock swipe axis after the first AXIS_LOCK_PX of movement
    if (!swipeAxis && (Math.abs(dx) > AXIS_LOCK_PX || Math.abs(dy) > AXIS_LOCK_PX)) {
      swipeAxis = Math.abs(dx) >= Math.abs(dy) ? 'h' : 'v';
    }

    if (swipeAxis) {
      e.preventDefault();
      touchAccumY = dy;
      touchAccumX = dx;
      recentTouchY.push(e.touches[0].clientY);
      recentTouchT.push(Date.now());
      if (recentTouchY.length > 5) {
        recentTouchY.shift();
        recentTouchT.shift();
      }
    }
  }, { passive: false });

  carouselViewport?.addEventListener('touchend', () => {
    carouselViewport.classList.remove('is-dragging');
    // Calculate velocity from recent touch history (px/ms)
    let velocityAbs = 0;
    if (recentTouchT.length >= 2) {
      const dt = recentTouchT[recentTouchT.length - 1] - recentTouchT[0];
      const dp = Math.abs(recentTouchY[recentTouchY.length - 1] - recentTouchY[0]);
      velocityAbs = dt > 0 ? dp / dt : 0;
    }
    if (swipeAxis === 'h' && Math.abs(touchAccumX) > SWIPE_THRESHOLD) {
      // Swipe left = forward, swipe right = backward
      handleSwipe(touchAccumX < 0, velocityAbs);
    } else if (swipeAxis === 'v' && Math.abs(touchAccumY) > SWIPE_THRESHOLD) {
      // Swipe down = forward, swipe up = backward
      handleSwipe(touchAccumY > 0, velocityAbs);
    }
    touchAccumY = 0;
    touchAccumX = 0;
    swipeAxis = null;
    recentTouchY = [];
    recentTouchT = [];
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
    if (Math.abs(deltaY) > SWIPE_THRESHOLD) handleSwipe(deltaY > 0, 0.3);
  });

  syncCarouselPadding();
  updateCarousel(false);
}
