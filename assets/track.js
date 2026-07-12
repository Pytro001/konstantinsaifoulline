// Lightweight, privacy-respecting analytics.
// Records page views, clicks (position + what was clicked) and time on page,
// and posts them to the site's own Supabase (via the SECURITY DEFINER
// log_event RPC). No third parties, no cookies, no personal data.
//
// Add to a page with:
//   <script src="/assets/track.js" data-site="konstantinsaifoulline" defer></script>
(function () {
  var SUPABASE_URL = 'https://pjhprqoozwvftzuhgtdr.supabase.co';
  var ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqaHBycW9vend2ZnR6dWhndGRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzOTY4NTgsImV4cCI6MjA4ODk3Mjg1OH0.jmB5UQNyShOGZVm4Za9FH4lyoPFgdITtjyJ-11iO3co';

  try {
    var self = document.currentScript;
    var SITE = (self && self.dataset && self.dataset.site) ||
      location.hostname.replace(/^www\./, '') || 'unknown';

    // Respect Do Not Track.
    if (navigator.doNotTrack === '1' || window.doNotTrack === '1') return;

    // Per-tab session id.
    var SID;
    try {
      SID = sessionStorage.getItem('_ks_sid');
      if (!SID) {
        SID = (Date.now().toString(36) + Math.random().toString(36).slice(2, 10));
        sessionStorage.setItem('_ks_sid', SID);
      }
    } catch (e) {
      SID = 'nostore';
    }

    var RPC = SUPABASE_URL + '/rest/v1/rpc/log_event';
    var HEADERS = {
      'Content-Type': 'application/json',
      'apikey': ANON,
      'Authorization': 'Bearer ' + ANON
    };

    function post(events, keepalive) {
      if (!events.length) return;
      try {
        fetch(RPC, {
          method: 'POST',
          headers: HEADERS,
          body: JSON.stringify({ events: events }),
          keepalive: !!keepalive,
          mode: 'cors',
          credentials: 'omit'
        }).catch(function () {});
      } catch (e) {}
    }

    var base = function () {
      return {
        site: SITE,
        session_id: SID,
        path: location.pathname + location.search,
        referrer: document.referrer || ''
      };
    };

    // ---- page view -------------------------------------------------------
    var pv = base();
    pv.type = 'pageview';
    pv.ua = (navigator.userAgent || '').slice(0, 300);
    pv.screen_w = screen.width; pv.screen_h = screen.height;
    pv.vp_w = window.innerWidth; pv.vp_h = window.innerHeight;
    post([pv]);

    // ---- clicks ----------------------------------------------------------
    var queue = [];

    function describe(el) {
      if (!el || el === document) return '(page)';
      var t = el.tagName ? el.tagName.toLowerCase() : '?';
      var s = t;
      if (el.id) s += '#' + el.id;
      else if (el.className && typeof el.className === 'string') {
        var c = el.className.trim().split(/\s+/).slice(0, 2).join('.');
        if (c) s += '.' + c;
      }
      var label = '';
      var a = el.closest ? el.closest('a,button') : null;
      if (a) {
        label = (a.getAttribute('aria-label') || a.textContent || a.getAttribute('href') || '').trim();
      } else {
        label = (el.textContent || '').trim();
      }
      label = label.replace(/\s+/g, ' ').slice(0, 60);
      return (label ? s + ' "' + label + '"' : s).slice(0, 200);
    }

    document.addEventListener('click', function (e) {
      var vw = window.innerWidth || 1;
      var docH = Math.max(document.documentElement.scrollHeight, window.innerHeight) || 1;
      var ev = base();
      ev.type = 'click';
      ev.x = Math.round((e.clientX / vw) * 1000) / 1000;
      ev.y = Math.round(((e.pageY || (e.clientY + (window.scrollY || 0))) / docH) * 1000) / 1000;
      ev.target = describe(e.target);
      queue.push(ev);
      if (queue.length >= 10) flush(false);
    }, true);

    function flush(keepalive) {
      if (!queue.length) return;
      var batch = queue.splice(0, queue.length);
      post(batch, keepalive);
    }
    var flushTimer = setInterval(function () { flush(false); }, 12000);

    // ---- time on page ----------------------------------------------------
    var start = Date.now();
    var active = 0;
    var lastResume = Date.now();
    var sent = false;

    function pause() { if (lastResume) { active += Date.now() - lastResume; lastResume = 0; } }
    function resume() { if (!lastResume) lastResume = Date.now(); }

    function finish() {
      if (sent) return;
      sent = true;
      clearInterval(flushTimer);
      pause();
      var s = base();
      s.type = 'session';
      s.duration_ms = Math.min(active || (Date.now() - start), 1000 * 60 * 60 * 6);
      queue.push(s);
      flush(true);
    }

    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') { pause(); flush(true); }
      else resume();
    });
    window.addEventListener('pagehide', finish);
    window.addEventListener('beforeunload', finish);
  } catch (e) {
    /* never let analytics break the page */
  }
})();
