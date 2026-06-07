const TOUR_STORAGE_KEY = 'pytroTourDates';
const ADMIN_SESSION_KEY = 'pytroAdminUnlocked';
const ADMIN_PASSWORD = '0351ghhe';

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initSmoothAnchors();
  renderTourDates();
  initReactionVideos();
  initEmailReveal();
  initAdmin();

  window.addEventListener('storage', (event) => {
    if (event.key === TOUR_STORAGE_KEY) {
      renderTourDates();
      renderAdminDates();
    }
  });
});

function initNavigation() {
  const nav = document.querySelector('.site-header') || document.querySelector('.nav');
  const navToggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.site-nav') || document.querySelector('.nav-links');

  const handleScroll = () => {
    nav?.classList.toggle('scrolled', window.scrollY > 50);
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();

  if (!navToggle || !navLinks) return;

  const setMenuOpen = (isOpen) => {
    navToggle.classList.toggle('open', isOpen);
    navLinks.classList.toggle('open', isOpen);
    navToggle.setAttribute('aria-expanded', String(isOpen));
    document.body.style.overflow = isOpen ? 'hidden' : '';
  };

  navToggle.addEventListener('click', () => {
    setMenuOpen(!navLinks.classList.contains('open'));
  });

  navLinks.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => setMenuOpen(false));
  });
}

function initSmoothAnchors() {
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (event) => {
      const href = anchor.getAttribute('href');
      if (!href || href === '#') return;

      const target = document.querySelector(href);
      if (!target) return;

      event.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function getStoredTourDates() {
  try {
    const parsed = JSON.parse(localStorage.getItem(TOUR_STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.sort(sortTourDates) : [];
  } catch {
    return [];
  }
}

function saveTourDates(dates) {
  localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify([...dates].sort(sortTourDates)));
}

function sortTourDates(a, b) {
  const dateA = a.date || '';
  const dateB = b.date || '';
  if (dateA !== dateB) return dateA.localeCompare(dateB);
  return (a.city || '').localeCompare(b.city || '');
}

function formatDate(dateValue) {
  if (!dateValue) return 'TBA';
  const date = new Date(`${dateValue}T12:00:00`);
  if (Number.isNaN(date.getTime())) return dateValue;
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(date);
}

function parseTourDateParts(dateValue) {
  if (!dateValue) return { day: '—', month: 'TBA' };
  const date = new Date(`${dateValue}T12:00:00`);
  if (Number.isNaN(date.getTime())) return { day: '—', month: dateValue };
  const day = String(date.getDate()).padStart(2, '0');
  const month = date.toLocaleString('en-US', { month: 'short' }).toUpperCase();
  const year = String(date.getFullYear()).slice(-2);
  return { day, month: `${month} '${year}` };
}

function renderTourDates() {
  const tourList = document.getElementById('tourList');
  if (!tourList) return;

  const dates = getStoredTourDates();
  tourList.replaceChildren();

  if (!dates.length) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = 'No upcoming dates announced yet.';
    tourList.appendChild(empty);
    return;
  }

  dates.forEach((show) => {
    const row = document.createElement('article');
    row.className = 'tour-date';

    const { day, month } = parseTourDateParts(show.date);
    const when = document.createElement('div');
    when.className = 'tour-date-when';
    const dayEl = document.createElement('span');
    dayEl.className = 'tour-day';
    dayEl.textContent = day;
    const monthEl = document.createElement('span');
    monthEl.className = 'tour-month';
    monthEl.textContent = month;
    when.append(dayEl, monthEl);

    const details = document.createElement('div');
    details.className = 'tour-date-info';
    const title = document.createElement('h3');
    title.textContent = [show.city, show.country].filter(Boolean).join(', ').toUpperCase();
    const venue = document.createElement('p');
    venue.textContent = show.venue || '';
    details.append(title, venue);

    const action = show.ticketUrl ? document.createElement('a') : document.createElement('span');
    action.className = show.ticketUrl ? 'btn tour-tickets' : 'muted';
    action.textContent = show.ticketUrl ? 'Tickets ↗' : 'Info soon';
    if (show.ticketUrl) {
      action.href = show.ticketUrl;
      action.target = '_blank';
      action.rel = 'noopener noreferrer';
    }

    row.append(when, details, action);
    tourList.appendChild(row);
  });
}

function initReactionVideos() {
  const scroll = document.querySelector('.reaction-scroll');
  if (!scroll) return;

  const originals = [...scroll.querySelectorAll('.reaction-item')];
  if (!originals.length) return;

  // Append one clone set so the loop looks seamless
  originals.forEach((item) => {
    const clone = item.cloneNode(true);
    clone.dataset.clone = '1';
    scroll.appendChild(clone);
  });

  const allVideos = () => [...scroll.querySelectorAll('video')];

  allVideos().forEach((v) => {
    v.muted = true;
    v.loop = true;
    v.play().catch(() => {});
  });

  const muteAll = () => {
    allVideos().forEach((v) => {
      v.muted = true;
      v.classList.remove('is-unmuted');
    });
  };

  // Width of one set — measured from where the clones begin
  let setWidth = 0;
  const measureSet = () => {
    const firstClone = scroll.querySelector('[data-clone]');
    setWidth = firstClone ? firstClone.offsetLeft : scroll.scrollWidth / 2;
  };
  requestAnimationFrame(() => requestAnimationFrame(measureSet));
  window.addEventListener('resize', measureSet);

  // Seamless jump when the clone set is reached
  scroll.addEventListener('scroll', () => {
    if (!setWidth) return;
    if (scroll.scrollLeft >= setWidth) scroll.scrollLeft -= setWidth;
  }, { passive: true });

  // Vertical trackpad/wheel → horizontal scroll
  scroll.addEventListener('wheel', (event) => {
    const vertical = Math.abs(event.deltaY) >= Math.abs(event.deltaX);
    if (vertical && event.deltaY !== 0) {
      event.preventDefault();
      scroll.scrollLeft += event.deltaY;
    }
  }, { passive: false });

  // Drag-to-scroll (document-level so clicks on child videos are preserved)
  let startX = 0, startScroll = 0, active = false, dragMoved = 0;

  scroll.addEventListener('mousedown', (e) => {
    active = true;
    dragMoved = 0;
    startX = e.clientX;
    startScroll = scroll.scrollLeft;
  });

  document.addEventListener('mousemove', (e) => {
    if (!active) return;
    const dx = e.clientX - startX;
    dragMoved = Math.abs(dx);
    if (dragMoved > 4) scroll.classList.add('is-dragging');
    scroll.scrollLeft = startScroll - dx;
  });

  document.addEventListener('mouseup', () => {
    if (!active) return;
    active = false;
    scroll.classList.remove('is-dragging');
  });

  scroll.addEventListener('touchstart', (e) => {
    dragMoved = 0;
    startX = e.touches[0].clientX;
    startScroll = scroll.scrollLeft;
  }, { passive: true });

  scroll.addEventListener('touchmove', (e) => {
    const dx = e.touches[0].clientX - startX;
    dragMoved = Math.abs(dx);
    scroll.scrollLeft = startScroll - dx;
  }, { passive: true });

  // Click-to-toggle sound — event delegation works on originals and clones
  scroll.addEventListener('click', (e) => {
    if (dragMoved > 8) return;
    const item = e.target.closest('.reaction-item');
    if (!item) return;
    const video = item.querySelector('video');
    if (!video) return;
    const wasMuted = video.muted;
    muteAll();
    if (wasMuted) {
      video.muted = false;
      video.classList.add('is-unmuted');
    }
  });
}

function initEmailReveal() {
  const btn = document.getElementById('emailRevealBtn');
  const reveal = document.getElementById('emailReveal');
  if (!btn || !reveal) return;

  btn.addEventListener('click', () => {
    const isHidden = reveal.hidden;
    reveal.hidden = !isHidden;
    btn.textContent = isHidden ? 'Hide Email' : 'Email';
  });
}

const LOCK_KEY = 'pk_g';
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

function getLockState() {
  try { return JSON.parse(localStorage.getItem(LOCK_KEY) || '{}'); } catch { return {}; }
}

function setLockState(state) {
  try { localStorage.setItem(LOCK_KEY, JSON.stringify(state)); } catch {}
}

function isLockedOut() {
  const s = getLockState();
  return s.until && Date.now() < s.until;
}

function lockoutMinutesLeft() {
  const s = getLockState();
  return s.until ? Math.ceil((s.until - Date.now()) / 60000) : 0;
}

function recordFailedAttempt() {
  const s = getLockState();
  if (s.until && Date.now() >= s.until) {
    setLockState({});
    return MAX_ATTEMPTS - 1;
  }
  const attempts = (s.attempts || 0) + 1;
  if (attempts >= MAX_ATTEMPTS) {
    setLockState({ attempts, until: Date.now() + LOCKOUT_MS });
    return 0;
  }
  setLockState({ attempts });
  return MAX_ATTEMPTS - attempts;
}

function clearLockState() {
  try { localStorage.removeItem(LOCK_KEY); } catch {}
}

function initAdmin() {
  const loginForm = document.getElementById('adminLoginForm');
  const passwordInput = document.getElementById('adminPassword');
  const loginCard = document.getElementById('adminLoginCard');
  const adminPanel = document.getElementById('adminPanel');
  const loginMessage = document.getElementById('adminMessage');
  const panelMessage = document.getElementById('adminPanelMessage');
  const dateForm = document.getElementById('tourDateForm');
  const logoutButton = document.getElementById('adminLogout');

  if (!loginForm || !passwordInput || !loginCard || !adminPanel) return;

  const showPanel = () => {
    loginCard.hidden = true;
    adminPanel.hidden = false;
    renderAdminDates();
  };

  const showLogin = (msg = '') => {
    loginCard.hidden = false;
    adminPanel.hidden = true;
    if (loginMessage && msg) loginMessage.textContent = msg;
  };

  const showLockout = () => {
    const mins = lockoutMinutesLeft();
    if (loginMessage) loginMessage.textContent = `Too many failed attempts. Try again in ${mins} minute${mins !== 1 ? 's' : ''}.`;
    if (passwordInput) passwordInput.disabled = true;
    const btn = loginForm.querySelector('button[type="submit"]');
    if (btn) btn.disabled = true;
  };

  if (sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true') {
    showPanel();
  } else {
    showLogin();
    if (isLockedOut()) showLockout();
  }

  loginForm.addEventListener('submit', (event) => {
    event.preventDefault();
    if (isLockedOut()) { showLockout(); return; }

    if (passwordInput.value === ADMIN_PASSWORD) {
      clearLockState();
      sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
      passwordInput.value = '';
      if (loginMessage) loginMessage.textContent = '';
      if (panelMessage) panelMessage.textContent = '';
      showPanel();
      return;
    }

    const remaining = recordFailedAttempt();
    if (remaining <= 0) {
      showLockout();
    } else {
      if (loginMessage) loginMessage.textContent = `Wrong password. ${remaining} attempt${remaining !== 1 ? 's' : ''} left.`;
    }
    passwordInput.value = '';
  });

  logoutButton?.addEventListener('click', () => {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    showLogin();
    if (passwordInput) passwordInput.disabled = false;
    const btn = loginForm.querySelector('button[type="submit"]');
    if (btn) btn.disabled = false;
  });

  dateForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(dateForm);
    const show = {
      id: window.crypto?.randomUUID?.() || String(Date.now()),
      date: String(formData.get('date') || '').trim(),
      city: String(formData.get('city') || '').trim(),
      venue: String(formData.get('venue') || '').trim(),
      country: String(formData.get('country') || '').trim(),
      ticketUrl: String(formData.get('ticketUrl') || '').trim(),
      note: String(formData.get('note') || '').trim(),
    };

    if (!show.date || !show.city || !show.venue) {
      if (panelMessage) panelMessage.textContent = 'Date, city, and venue are required.';
      return;
    }

    saveTourDates([...getStoredTourDates(), show]);
    dateForm.reset();
    if (panelMessage) panelMessage.textContent = 'Tour date saved.';
    renderTourDates();
    renderAdminDates();
  });

  document.getElementById('adminDateList')?.addEventListener('click', (event) => {
    const deleteButton = event.target.closest('[data-delete-id]');
    if (!deleteButton) return;

    const id = deleteButton.getAttribute('data-delete-id');
    saveTourDates(getStoredTourDates().filter((show) => show.id !== id));
    if (panelMessage) panelMessage.textContent = 'Tour date deleted.';
    renderTourDates();
    renderAdminDates();
  });
}

function renderAdminDates() {
  const list = document.getElementById('adminDateList');
  if (!list) return;

  const dates = getStoredTourDates();
  list.replaceChildren();

  if (!dates.length) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = 'No upcoming dates saved yet.';
    list.appendChild(empty);
    return;
  }

  dates.forEach((show) => {
    const row = document.createElement('article');
    row.className = 'admin-date-row';

    const details = document.createElement('div');
    const title = document.createElement('h3');
    title.textContent = `${formatDate(show.date)} · ${[show.city, show.country].filter(Boolean).join(', ')}`;
    const venue = document.createElement('p');
    venue.className = 'muted';
    venue.textContent = [show.venue, show.note].filter(Boolean).join(' · ');
    details.append(title, venue);

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'button button-danger';
    deleteButton.dataset.deleteId = show.id;
    deleteButton.textContent = 'Delete';

    row.append(details, deleteButton);
    list.appendChild(row);
  });
}
