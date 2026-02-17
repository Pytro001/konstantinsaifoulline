// Konstantin Saifoulline - Website Interactions

document.addEventListener('DOMContentLoaded', () => {
  // Nav scroll effect
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

  // Mobile nav toggle
  const navToggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      navToggle.classList.toggle('open');
      navLinks.classList.toggle('open');
      document.body.style.overflow = navLinks.classList.contains('open') ? 'hidden' : '';
    });
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navToggle.classList.remove('open');
        navLinks.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  // Book shelf toggle
  const bookshelfToggle = document.getElementById('bookshelfToggle');
  const bookshelfContent = document.getElementById('bookshelfContent');
  if (bookshelfToggle && bookshelfContent) {
    bookshelfToggle.addEventListener('click', () => {
      const isOpen = bookshelfContent.classList.toggle('open');
      bookshelfToggle.classList.toggle('open', isOpen);
      bookshelfToggle.querySelector('.toggle-text').textContent = isOpen ? 'Hide Books' : 'View Books';
    });
  }

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (href === '#') return;
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // Intersection Observer for fade-in animations
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, observerOptions);

  document.querySelectorAll('.timeline-item, .book-item').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    observer.observe(el);
  });

  // Add visible class styles
  const style = document.createElement('style');
  style.textContent = `
    .timeline-item.visible,
    .book-item.visible {
      opacity: 1 !important;
      transform: translateY(0) !important;
    }
    .timeline-item:nth-child(1) { transition-delay: 0s; }
    .timeline-item:nth-child(2) { transition-delay: 0.05s; }
    .timeline-item:nth-child(3) { transition-delay: 0.1s; }
    .timeline-item:nth-child(4) { transition-delay: 0.15s; }
    .timeline-item:nth-child(5) { transition-delay: 0.2s; }
    .timeline-item:nth-child(6) { transition-delay: 0.25s; }
    .timeline-item:nth-child(7) { transition-delay: 0.3s; }
    .timeline-item:nth-child(8) { transition-delay: 0.35s; }
  `;
  document.head.appendChild(style);
});
