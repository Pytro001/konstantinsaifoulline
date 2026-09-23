(function () {
  var AIRSUP = 'https://fyxqdwhqposxitexydby.supabase.co';
  var ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJmeXhxZHdocXBvc3hpdGV4eWRieSIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzc2MTc5OTA4LCJleHAiOjIwOTE3NTU5MDh9.cvpnWJvVsQx_qEk4hNDAtJZ_M8qNv4RNnhRJBRgulg8';

  var WORLD_W = 2200;
  var FIRST_Y = 1900;
  var STEP = 820;
  var PATH_MARGIN = 420;

  var CATALOG = [
    { id: 'yCQUzzXxVoM', label: 'Alvy Ray Smith', topic: 'Pixar, Jobs, Disney', title: 'Pixar Founder: Steve Jobs, Disney and the Fight to Stay Alive', note: 'Pixar’s founder on Steve Jobs, Disney, and keeping the studio alive.', motif: 'pixar', published: '2026-09-23T17:00:00Z', date: '23 Sep' },
    { id: '4BjWNPH37vo', label: 'Randall Briggs', topic: 'Who controls the robots', title: 'Who Will Control The Humanoid Robots?', note: 'The fight over who owns the humanoid robots is already underway.', motif: 'humanoids', published: '2026-09-20T17:00:00Z', date: '20 Sep' },
    { id: 'XXf6eMv4rvw', label: 'Scott Walter', topic: 'Figure, 1X, Optimus', title: 'Figure vs 1X vs Tesla Optimus — Who Actually Wins?', note: 'Figure, 1X, and Tesla Optimus. Who is actually ahead.', motif: 'humanoids', published: '2026-09-16T17:00:00Z', date: '16 Sep' },
    { id: '-X2jOjXc6Qc', label: '250 Years', topic: 'Manufacturing led to this', title: '250 Years of Manufacturing Led to This.', note: 'Two and a half centuries of manufacturing, and what they made possible.', motif: 'industry', published: '2026-09-14T17:00:00Z', date: '14 Sep' },
    { id: '-TmKc2T6ia8', label: 'Ronald Wayne', topic: 'Co-founded Apple', title: 'He Co-Founded Apple with Steve Jobs — Then Weeks Later He Left', note: 'Apple’s third founder, and why he left Steve Jobs after a few weeks.', motif: 'origins', published: '2026-09-13T14:41:59Z', date: '13 Sep' },
    { id: '5lroz9Wg5QI', label: 'GPT-6 Astra', topic: 'AI crossed a line', title: 'AI Just Crossed a Line in Hardware (GPT-6 Astra)', note: 'AI stopped being only software. It started designing hardware.', motif: 'machines', published: '2026-09-10T17:00:00Z', date: '10 Sep' },
    { id: '6V_ACIA47-k', label: 'Casey Handmer', topic: 'A Mars city', title: 'How to Build a Mars City That Doesn’t Need Earth', note: 'A Mars city that can live without supply ships from Earth.', motif: 'mars', published: '2026-09-09T16:19:10Z', date: '09 Sep' },
    { id: 'bnI0JL5Pfw0', label: 'Robert Scoble', topic: 'AI, robots, SpaceX', title: 'The Next Decade of AI, Robots & SpaceX', note: 'What the next ten years of AI, robots, and SpaceX actually look like.', motif: 'horizon', published: '2026-09-03T22:12:17Z', date: '03 Sep' },
    { id: 'MO8nQZfo2TM', label: 'Gordon Bruce', topic: 'Samsung design', title: 'How Samsung Became a Design Powerhouse', note: 'How Samsung learned to design, and why that changed the company.', motif: 'design', published: '2026-08-30T16:22:38Z', date: '30 Aug' },
    { id: 'GvvK0E_yO6Y', label: 'Scott Walter', topic: 'Best humanoid, 2026', title: 'We Built the Best Humanoid Robot Possible in 2026', note: 'What the best humanoid you can actually build in 2026 is.', motif: 'humanoids', published: '2026-08-30T15:03:27Z', date: '30 Aug' },
    { id: 'QDgwstGHhZo', label: 'Hans Koenigsmann', topic: 'Starship to Mars', title: 'SpaceX’s 4th Engineer: Will Starship Actually Get Us to Mars?', note: 'SpaceX’s fourth engineer on whether Starship really reaches Mars.', motif: 'flight', published: '2026-08-21T17:00:00Z', date: '21 Aug' },
    { id: 'D45UtYEQxS0', label: 'Jonathan McDowell', topic: '100,000 satellites', title: 'Will 100,000 Satellites Make Space Unusable?', note: 'A sky full of satellites, and the point where orbit stops working.', motif: 'flight', published: '2026-08-14T17:00:00Z', date: '14 Aug' },
    { id: 'JU3owSfVe5E', label: 'Robert Gutierrez', topic: 'Followers into a company', title: 'How He Turned 100k Followers Into a Company', note: 'How an audience of 100,000 became a real company.', motif: 'people', published: '2026-08-07T08:00:00Z', date: '07 Aug' },
    { id: 'CFpKRfGyZWQ', label: 'Aaron Ong', topic: 'Why some move faster', title: 'Why Some People Progress Faster Than Everyone Else', note: 'Why a few people pull ahead while everyone else stays still.', motif: 'people', published: '2026-07-29T22:21:55Z', date: '29 Jul' }
  ];

  var runway = document.getElementById('episodes');
  var stage = document.getElementById('mapStage');
  var viewport = document.getElementById('mapViewport');
  var world = document.getElementById('mapWorld');
  if (!runway || !stage || !viewport || !world) return;

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var episodes = CATALOG.map(clone);
  var layout = null;
  var currentIndex = -1;
  var ticking = false;

  function $(id) { return document.getElementById(id); }

  function clone(episode, index) {
    var copy = {};
    for (var key in episode) copy[key] = episode[key];
    copy.order = index;
    return copy;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function pad(index) {
    return index < 9 ? '0' + (index + 1) : String(index + 1);
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"]/g, function (character) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[character];
    });
  }

  function videoIdOf(episode) {
    var url = episode.youtube_url || episode.url || '';
    var match = String(url).match(/[?&]v=([^&]+)/) || String(url).match(/youtu\.be\/([^?&]+)/);
    if (match) return match[1];
    if (episode.id && String(episode.id).length === 11) return episode.id;
    return '';
  }

  function guestFromTitle(title) {
    var parts = String(title || '').split('|');
    return (parts.length > 1 ? parts[parts.length - 1] : title).trim();
  }

  function classify(title) {
    var text = String(title || '').toLowerCase();
    if (/satellite|mars|starship|orbit/.test(text)) return 'space';
    if (/samsung|design|manufactur|hardware|gpt/.test(text)) return 'making';
    if (/apple|steve jobs|founder|followers|company|progress/.test(text)) return 'founders';
    if (/robot|humanoid|optimus|figure|1x/.test(text)) return 'robots';
    if (/spacex|\bspace\b/.test(text)) return 'space';
    if (/\bai\b/.test(text)) return 'making';
    return 'founders';
  }

  function formatDate(value) {
    var date = new Date(value);
    if (isNaN(date.getTime())) return '';
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return String(date.getUTCDate()).padStart(2, '0') + ' ' + months[date.getUTCMonth()];
  }

  function watchUrl(episode) {
    return 'https://www.youtube.com/watch?v=' + encodeURIComponent(episode.id);
  }

  function thumb(id, quality) {
    return 'https://i.ytimg.com/vi/' + id + '/' + (quality || 'maxresdefault') + '.jpg';
  }

  function sortEpisodes(list) {
    return list.slice().sort(function (a, b) {
      var byDate = String(b.published || '').localeCompare(String(a.published || ''));
      if (byDate) return byDate;
      return (a.order || 0) - (b.order || 0);
    });
  }

  function mergeFeed(feedEpisodes) {
    var byId = new Map();
    CATALOG.forEach(function (episode, index) {
      byId.set(episode.id, clone(episode, index));
    });
    feedEpisodes.forEach(function (episode, index) {
      var id = videoIdOf(episode);
      if (!id) return;
      var known = byId.get(id);
      if (known) {
        if (episode.title) known.title = episode.title;
        if (episode.published) known.published = episode.published;
        known.thumb = episode.thumbnail || known.thumb;
        known.thumbHq = episode.thumbnail_hq || known.thumbHq;
        return;
      }
      var title = episode.title || 'Episode';
      byId.set(id, {
        id: id,
        label: guestFromTitle(title),
        topic: '',
        title: title,
        motif: classify(title),
        published: episode.published || ('2099-01-' + String(31 - index).padStart(2, '0')),
        date: formatDate(episode.published),
        thumb: episode.thumbnail,
        thumbHq: episode.thumbnail_hq,
        order: -1 - index
      });
    });
    return sortEpisodes(Array.from(byId.values()));
  }

  function sameLineup(next) {
    if (next.length !== episodes.length) return false;
    for (var i = 0; i < next.length; i++) {
      if (next[i].id !== episodes[i].id || next[i].title !== episodes[i].title) return false;
    }
    return true;
  }

  function routePath(points) {
    if (!points.length) return '';
    var d = 'M ' + points[0].x + ' ' + points[0].y;
    for (var i = 1; i < points.length; i++) {
      var a = points[i - 1];
      var b = points[i];
      if (Math.abs(a.x - b.x) < 1) {
        d += ' L ' + b.x + ' ' + b.y;
        continue;
      }
      var mid = (a.y + b.y) / 2;
      var dir = b.x > a.x ? 1 : -1;
      var radius = Math.min(120, Math.abs(b.x - a.x) / 2, Math.max(12, (b.y - a.y) / 2 - 8));
      d += ' L ' + a.x + ' ' + (mid - radius);
      d += ' Q ' + a.x + ' ' + mid + ', ' + (a.x + dir * radius) + ' ' + mid;
      d += ' L ' + (b.x - dir * radius) + ' ' + mid;
      d += ' Q ' + b.x + ' ' + mid + ', ' + b.x + ' ' + (mid + radius);
      d += ' L ' + b.x + ' ' + b.y;
    }
    return d;
  }

  function tracePath(list) {
    var x = WORLD_W / 2;
    var heading = 1;
    var y = FIRST_Y;
    var previous = null;
    return list.map(function (episode, index) {
      var motif = episode.motif || episode.direction || 'episode';
      var same = previous === motif;
      if (index > 0 && !same) heading *= -1;
      if (index > 0) {
        var step = same ? 70 : 220;
        var nextX = x + heading * step;
        if (nextX < PATH_MARGIN || nextX > WORLD_W - PATH_MARGIN) {
          heading *= -1;
          nextX = clamp(x + heading * step, PATH_MARGIN, WORLD_W - PATH_MARGIN);
        }
        x = nextX;
      }
      previous = motif;
      var point = { x: x, y: y, episode: episode, index: index };
      y += STEP;
      return point;
    });
  }

  function build() {
    var points = tracePath(episodes);
    var worldH = (points.length ? points[points.length - 1].y : FIRST_Y) + 760;
    var routePoints = points.map(function (point) { return { x: point.x, y: point.y }; });
    if (routePoints.length) {
      routePoints[0].y -= 190;
      routePoints[routePoints.length - 1].y -= 190;
    }
    var route = routePath(routePoints);

    world.style.width = WORLD_W + 'px';
    world.style.height = worldH + 'px';
    world.innerHTML = '';

    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'map-svg');
    svg.setAttribute('viewBox', '0 0 ' + WORLD_W + ' ' + worldH);
    svg.innerHTML =
      '<path class="route-all" d="' + route + '" />' +
      '<path class="route-walk" id="mapRouteWalk" d="' + route + '" />' +
      '<g id="mapTraveler"><circle r="18" fill="#fff"></circle><circle r="7" fill="#111"></circle></g>';
    world.appendChild(svg);

    points.forEach(function (point) {
      var episode = point.episode;
      var link = document.createElement('a');
      link.className = 'pin is-ahead';
      link.id = 'ep-' + episode.id;
      link.href = watchUrl(episode);
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.style.left = point.x + 'px';
      link.style.top = point.y + 'px';
      link.setAttribute('aria-label', episode.label + '. ' + episode.title);
      var image = thumb(episode.id);
      var fallback = episode.thumbHq || thumb(episode.id, 'hqdefault');
      link.innerHTML =
        '<span class="pin-card">' +
          '<img alt="" ' + (point.index < 2 ? 'fetchpriority="high" ' : 'loading="lazy" ') +
            'src="' + escapeHtml(episode.thumb || image) + '" data-hq="' + escapeHtml(fallback) + '">' +
        '</span>' +
        '<span class="pin-node"></span>';
      var img = link.querySelector('img');
      img.addEventListener('error', function () {
        var nextSrc = img.getAttribute('data-hq');
        if (nextSrc && img.src !== nextSrc) img.src = nextSrc;
      });
      if (point.index === 0 || point.index === points.length - 1) link.classList.add('is-terminal');
      world.appendChild(link);
      point.node = link;
    });

    var routeEl = svg.querySelector('#mapRouteWalk');
    var traveler = svg.querySelector('#mapTraveler');
    var total = routeEl.getTotalLength();
    var stops = routePoints.map(function (point) { return lengthNear(routeEl, point, total); });
    for (var s = 1; s < stops.length; s++) {
      if (stops[s] < stops[s - 1]) stops[s] = stops[s - 1];
    }

    layout = { points: points, routeEl: routeEl, traveler: traveler, total: total, stops: stops, worldH: worldH };
    measure();
    apply();
  }

  function lengthNear(path, point, total) {
    var best = 0;
    var bestDistance = Infinity;
    var steps = 480;
    for (var i = 0; i <= steps; i++) {
      var length = total * i / steps;
      var spot = path.getPointAtLength(length);
      var distance = (spot.x - point.x) * (spot.x - point.x) + (spot.y - point.y) * (spot.y - point.y);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = length;
      }
    }
    return best;
  }

  function headerHeight() {
    var header = document.querySelector('.header');
    return header ? Math.round(header.getBoundingClientRect().height) : 62;
  }

  function measure() {
    if (!layout) return;
    var headerH = headerHeight();
    if (reduce) {
      runway.classList.add('is-static');
      var scale = runway.clientWidth / WORLD_W;
      world.style.transform = 'scale(' + scale + ')';
      stage.style.height = Math.ceil(layout.worldH * scale) + 'px';
      layout.scale = scale;
      layout.viewW = WORLD_W;
      layout.viewH = layout.worldH;
      layout.travel = 1;
      layout.stickStart = 0;
      return;
    }
    runway.classList.remove('is-static');
    stage.style.top = headerH + 'px';
    var stageH = Math.max(420, window.innerHeight - headerH);
    stage.style.height = stageH + 'px';
    var scale = stage.clientWidth < 760
      ? stage.clientWidth / 520
      : Math.min(1.45, stage.clientWidth / 1320);
    var viewW = stage.clientWidth / scale;
    var viewH = stageH / scale;
    var steps = Math.max(episodes.length - 1, 1);
    layout.lead = Math.round(window.innerHeight * 0.34);
    layout.journey = steps * Math.max(stageH * 0.78, 540);
    runway.style.height = (stageH + layout.lead + layout.journey) + 'px';
    layout.scale = scale;
    layout.viewW = viewW;
    layout.viewH = viewH;
    layout.stickStart = runway.offsetTop - headerH;
    layout.travel = Math.max(1, runway.offsetHeight - stageH);
  }

  function progress() {
    if (reduce || !layout) return 0;
    return clamp((window.scrollY - layout.stickStart) / layout.travel, 0, 1);
  }

  function scrollToIndex(index, behavior) {
    if (reduce) {
      var pin = document.getElementById('ep-' + episodes[index].id);
      if (pin) pin.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    measure();
    var t = episodes.length <= 1 ? 0 : index / (episodes.length - 1);
    var top = layout.stickStart + (layout.lead || 0) + t * (layout.journey || layout.travel);
    window.scrollTo({ top: top, behavior: behavior || 'smooth' });
  }

  function openLatest(behavior) {
    scrollToIndex(0, behavior);
  }

  function placeHero() {
    var hero = document.querySelector('.hero');
    if (!hero) return;
    var headerH = headerHeight();
    hero.style.top = headerH + 'px';
    hero.style.height = Math.max(320, window.innerHeight - headerH) + 'px';
    var lead = (layout && layout.lead) || window.innerHeight * 0.34;
    var blend = clamp((window.scrollY - ((layout && layout.stickStart) || 0)) / lead, 0, 1);
    if (blend >= 1) {
      hero.style.visibility = 'hidden';
      return;
    }
    hero.style.visibility = 'visible';
    hero.style.opacity = String(1 - blend);
    hero.style.transform = 'none';
  }

  function apply() {
    if (!layout) return;
    placeHero();
    var span = Math.max(episodes.length - 1, 1);
    var scrolled = window.scrollY - layout.stickStart;
    var blend = clamp(scrolled / (layout.lead || 1), 0, 1);
    var reveal = clamp((blend - 0.74) / 0.26, 0, 1);
    reveal = reveal * reveal * (3 - 2 * reveal);
    var journey = clamp((scrolled - (layout.lead || 0)) / (layout.journey || layout.travel), 0, 1);
    var t = journey * span;
    var index = clamp(Math.round(t), 0, episodes.length - 1);
    var segment = clamp(Math.floor(t), 0, Math.max(episodes.length - 2, 0));
    var local = episodes.length <= 1 ? 0 : t - segment;
    var length = layout.stops.length
      ? layout.stops[segment] + (layout.stops[Math.min(segment + 1, layout.stops.length - 1)] - layout.stops[segment]) * local
      : 0;
    if (layout.total) {
      layout.routeEl.style.strokeDasharray = layout.total;
      layout.routeEl.style.strokeDashoffset = String(layout.total - length);
      var spot = layout.routeEl.getPointAtLength(clamp(length, 0, layout.total));
      layout.traveler.setAttribute('transform', 'translate(' + spot.x + ' ' + spot.y + ')');
    }

    var fromPoint = layout.points[segment];
    var toPoint = layout.points[Math.min(segment + 1, layout.points.length - 1)];
    var focusX = fromPoint.x + (toPoint.x - fromPoint.x) * local;
    var focusY = fromPoint.y + (toPoint.y - fromPoint.y) * local;
    var maxX = Math.max(0, WORLD_W - layout.viewW);
    var maxY = Math.max(0, layout.worldH - layout.viewH);
    var centerShift = Math.max(0, (stage.clientWidth - WORLD_W * layout.scale) / 2);
    var noteWidth = Math.min(240, Math.max(160, stage.clientWidth * 0.16));
    var noteLeft = Math.max(16, stage.clientWidth - 72 - noteWidth);
    var pinHalf = 310 * layout.scale * 1.06;
    var desiredCenter = noteLeft - 36 - pinHalf;
    desiredCenter = clamp(desiredCenter, Math.min(stage.clientWidth * 0.34, pinHalf), stage.clientWidth * 0.56);
    function camFor(worldX) {
      return clamp(worldX - (desiredCenter - centerShift) / layout.scale, 0, maxX);
    }
    var holdA = camFor(fromPoint.x);
    var holdB = camFor(toPoint.x);
    var camX = holdA;
    if (!reduce) {
      if (local >= 0.58) camX = holdB;
      else if (local > 0.42) camX = holdA + (holdB - holdA) * ((local - 0.42) / 0.16);
    } else {
      camX = clamp(focusX - layout.viewW * 0.5, 0, maxX);
    }
    var restY = Math.max(0, focusY - 200 - layout.viewH * 0.5);
    var camY = reduce ? restY : restY * reveal;
    if (!reduce) {
      world.style.transform = 'translate3d(' + (centerShift - camX * layout.scale) + 'px,' + (-camY * layout.scale) + 'px,0) scale(' + layout.scale + ')';
    }

    layout.points.forEach(function (point) {
      point.node.classList.remove('is-here', 'is-next', 'is-past', 'is-ahead');
      if (point.index === index) point.node.classList.add('is-here');
      else if (point.index === index + 1) point.node.classList.add('is-next');
      else if (point.index < index) point.node.classList.add('is-past');
      else point.node.classList.add('is-ahead');
    });

    var episode = episodes[index];
    var guest = $('mapGuest');
    if (guest) guest.textContent = episode.label;
    var note = $('episodeNote');
    if (note) {
      var distance = Math.abs(t - index);
      var closeness = distance < 0.42 ? 1 : clamp(1 - (distance - 0.42) / 0.28, 0, 1);
      note.textContent = episode.note || episode.title;
      note.style.opacity = String(closeness * reveal);
      var pinBox = layout.points[index].node.getBoundingClientRect();
      var stageBox = stage.getBoundingClientRect();
      var left = noteLeft;
      if (reduce) {
        left = pinBox.right - stageBox.left + 40;
        var maxLeft = stageBox.width - noteWidth - 68;
        if (left > maxLeft) left = maxLeft;
        if (left < 16) left = 16;
      }
      note.style.width = noteWidth + 'px';
      note.style.left = left + 'px';
      note.style.top = (pinBox.top - stageBox.top + Math.max(28, pinBox.height * 0.28)) + 'px';
    }

    var announcement = $('announcementLink');
    var announcementTitle = $('announcementTitle');
    if (announcement && episodes[0]) {
      announcement.href = watchUrl(episodes[0]);
      if (announcementTitle) announcementTitle.textContent = episodes[0].label;
    }

    if (index !== currentIndex) {
      currentIndex = index;
      var live = $('mapLive');
      if (live) live.textContent = episode.label + '. ' + (episode.note || episode.title);
    }
  }

  function requestApply() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      apply();
    });
  }

  function loadFeed() {
    var signal = typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(8000) : undefined;
    fetch(AIRSUP + '/functions/v1/podcast-feed', { headers: { apikey: ANON }, cache: 'no-store', signal: signal })
      .then(function (response) {
        if (!response.ok) throw new Error('Feed request failed');
        return response.json();
      })
      .then(function (data) {
        var incoming = data && data.episodes;
        if (!incoming || !incoming.length) return;
        var next = mergeFeed(incoming);
        if (sameLineup(next)) return;
        episodes = next;
        currentIndex = -1;
        build();
      })
      .catch(function () {});
  }

  build();
  loadFeed();

  var podcastLink = document.querySelector('.nav a[href="#episodes"]');
  if (podcastLink) {
    podcastLink.addEventListener('click', function (event) {
      event.preventDefault();
      if (location.hash !== '#episodes') history.pushState(null, '', '#episodes');
      openLatest('smooth');
    });
  }
  if (location.hash === '#episodes') openLatest('auto');
  window.addEventListener('scroll', requestApply, { passive: true });
  window.addEventListener('resize', function () {
    measure();
    apply();
  });
})();
