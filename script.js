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

  const words = [...document.querySelectorAll('.history-word')];
  const readingLine = () => window.innerHeight * 0.58;

  const updateWords = () => {
    const line = readingLine();
    let lastLitIndex = -1;

    words.forEach((word, index) => {
      const rect = word.getBoundingClientRect();
      if (rect.top < line && rect.bottom > 0) {
        lastLitIndex = index;
      }
    });

    words.forEach((word, index) => {
      word.classList.toggle('is-lit', index <= lastLitIndex);
    });
  };

  window.addEventListener('scroll', updateWords, { passive: true });
  window.addEventListener('resize', updateWords);
  requestAnimationFrame(updateWords);
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
  const SWIPE_THRESHOLD = 16;
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

  const getActiveBookIndex = () => {
    const viewportRect = carouselViewport.getBoundingClientRect();
    const viewportCenterX = viewportRect.left + viewportRect.width / 2;
    const cards = carousel.querySelectorAll('.book-card');
    let activeIndex = 0;
    let minDistance = Infinity;

    cards.forEach((card, index) => {
      const rect = card.getBoundingClientRect();
      const cardCenterX = rect.left + rect.width / 2;
      const distance = Math.abs(cardCenterX - viewportCenterX);
      if (distance < minDistance) {
        minDistance = distance;
        activeIndex = index;
      }
    });

    return activeIndex;
  };

  const getRightmostVisibleBookIndex = () => {
    const viewportRect = carouselViewport.getBoundingClientRect();
    const cards = carousel.querySelectorAll('.book-card');
    let rightmost = 0;

    cards.forEach((card, index) => {
      const rect = card.getBoundingClientRect();
      if (rect.left < viewportRect.right && rect.right > viewportRect.left) {
        rightmost = index;
      }
    });

    return rightmost;
  };

  const updateCounter = () => {
    const centered = getActiveBookIndex();
    const rightmost = getRightmostVisibleBookIndex();
    const value = rightmost === books.length - 1
      ? books.length
      : Math.max(centered + 1, currentIndex + 1);
    counter.textContent = `${value} / ${books.length}`;
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
    } else {
      carousel.addEventListener('transitionend', updateCounter, { once: true });
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
