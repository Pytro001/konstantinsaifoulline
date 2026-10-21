(function () {
  var AIRSUP = 'https://fyxqdwhqposxitexydby.supabase.co';
  var ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJmeXhxZHdocXBvc3hpdGV4eWRieSIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzc2MTc5OTA4LCJleHAiOjIwOTE3NTU5MDh9.cvpnWJvVsQx_qEk4hNDAtJZ_M8qNv4RNnhRJBRgulg8';

  var CATALOG = [
    { id: 'lLPcLsDUNlE', label: 'Ben Holfeld', topic: 'Robotics, AI and space', title: 'The Age of Robotics Is Coming: AI, Automation & Space | Ben Holfeld', note: 'Ben Holfeld on physical AI, automation, distribution and building habitats in space.', motif: 'humanoids', published: '2026-10-14T16:00:05Z', date: '14 Oct' },
    { id: '7pODLCXi1vM', label: 'Nat Bullard', topic: 'Power for AI', title: "AI's Biggest Bottleneck Isn't Chips, It's Power | Nat Bullard", note: 'Nat Bullard of Halcyon, formerly BloombergNEF, on why electricity, not chips, limits how fast AI can scale.', motif: 'industry', published: '2026-10-11T16:00:34Z', date: '11 Oct' },
    { id: 'CGkC8ukXnfw', label: 'Nick Vasilescu', topic: 'Computers for AI workers', title: '10 Billion AI Workers Will Need Their Own Computers | Nick Vasilescu, Orgo', note: 'Nick Vasilescu of Orgo on why billions of AI workers will each need their own computer.', motif: 'machines', published: '2026-10-07T18:00:27Z', date: '07 Oct' },
    { id: 'sKq1D59-qHQ', label: 'Tony Conrad', topic: 'Slack, Polsia, Blue Bottle', title: 'What The Slack, Polsia And Blue Bottle Founders Got Right', note: 'Tony Conrad on what the founders of Slack, Polsia, and Blue Bottle got right.', motif: 'ventures', published: '2026-10-04T16:00:20Z', date: '04 Oct' },
    { id: 'Qfiz43bfZ6M', label: 'Generathon', topic: 'AI video and Hollywood', title: 'Inside Generathon: The Future of AI Video, Hollywood & Creative Work', note: 'Where AI video is now, and what it means for Hollywood and creative work.', motif: 'video', published: '2026-10-02T17:50:18Z', date: '02 Oct' },
    { id: 'vM_-p1_n9uU', label: 'Casey Handmer', topic: 'Fuel from sunlight and air', title: 'The Man Making Oil From Sunlight and Air', note: 'Casey Handmer is building machines that turn sunlight and air into fuel.', motif: 'fuel', published: '2026-10-01T18:00:31Z', date: '01 Oct' },
    { id: 'uepgLvy9kQk', label: 'Rolf Schrömgens', topic: 'Building trivago', title: 'He Built a $4 Billion Company in Europe', note: 'How the trivago founder built a multi-billion-dollar company, and what he learned doing it.', motif: 'founders', published: '2026-09-27T17:00:31Z', date: '27 Sep' },
    { id: 'KfHJtQuMrN0', label: 'Airsup', topic: 'An AI that debugs a factory', title: 'We Built An AI That Can Debug A Factory', note: 'An AI that can see what is happening inside a factory, and help fix it.', motif: 'machines', published: '2026-09-25T18:00:06Z', date: '25 Sep' },
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

  var section = document.getElementById('episodes');
  var latestEl = document.getElementById('epsLatest');
  var gridEl = document.getElementById('epsGrid');
  if (!section || !latestEl || !gridEl) return;

  var episodes = CATALOG.map(clone);
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

  var COVERS = {
    '5lroz9Wg5QI': true,
    '6V_ACIA47-k': true,
    'CFpKRfGyZWQ': true,
    'D45UtYEQxS0': true,
    'GvvK0E_yO6Y': true,
    'JU3owSfVe5E': true,
    'MO8nQZfo2TM': true,
    'QDgwstGHhZo': true,
    'bnI0JL5Pfw0': true
  };

  function thumb(id, quality) {
    return 'https://i.ytimg.com/vi/' + id + '/' + (quality || 'maxresdefault') + '.jpg';
  }

  function coverOf(id) {
    return COVERS[id] ? '/assets/covers/' + id + '.jpg' : thumb(id);
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
        known.thumb = thumb(id);
        known.thumbHq = thumb(id, 'hqdefault');
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
        thumb: thumb(id),
        thumbHq: thumb(id, 'hqdefault'),
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

  function image(episode, eager) {
    return '<span class="ep-frame"><img alt="" ' + (eager ? 'fetchpriority="high" ' : 'loading="lazy" ') +
      'src="' + escapeHtml(coverOf(episode.id)) + '" data-hq="' + escapeHtml(thumb(episode.id)) + '"></span>';
  }

  function card(episode, latest) {
    var link = document.createElement('a');
    link.className = latest ? 'ep ep-latest' : 'ep';
    link.href = watchUrl(episode);
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.setAttribute('aria-label', episode.label + '. ' + episode.title);
    var meta = [latest ? 'Latest' : '', episode.date || formatDate(episode.published), episode.topic]
      .filter(Boolean).map(escapeHtml).join(' &middot; ');
    var text =
      '<span class="ep-meta">' + meta + '</span>' +
      '<span class="ep-guest">' + escapeHtml(episode.label) + '</span>' +
      '<span class="ep-note">' + escapeHtml(episode.note || episode.title) + '</span>';
    link.innerHTML = latest
      ? image(episode, true) + '<span class="ep-text">' + text + '<span class="ep-watch">Watch episode <span aria-hidden="true">↗</span></span></span>'
      : image(episode, false) + text;
    var img = link.querySelector('img');
    img.addEventListener('error', function () {
      var nextSrc = img.getAttribute('data-hq');
      if (nextSrc && img.src !== nextSrc) img.src = nextSrc;
    });
    return link;
  }

  function render() {
    latestEl.innerHTML = '';
    gridEl.innerHTML = '';
    if (!episodes.length) return;
    latestEl.appendChild(card(episodes[0], true));
    episodes.slice(1).forEach(function (episode) {
      gridEl.appendChild(card(episode, false));
    });
    var count = document.getElementById('epsCount');
    if (count) count.textContent = episodes.length + ' episodes';
    var announcement = document.getElementById('announcementLink');
    var announcementTitle = document.getElementById('announcementTitle');
    if (announcement) announcement.href = watchUrl(episodes[0]);
    if (announcementTitle) announcementTitle.textContent = episodes[0].label;
  }

  function placeHero() {
    var hero = document.querySelector('.hero');
    if (!hero) return;
    var fade = clamp(window.scrollY / Math.max(1, section.offsetTop * 0.8), 0, 1);
    hero.style.visibility = fade >= 1 ? 'hidden' : 'visible';
    hero.style.opacity = String(1 - fade);
  }

  function requestPlace() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      placeHero();
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
        render();
      })
      .catch(function () {});
  }

  render();
  loadFeed();
  placeHero();
  window.addEventListener('scroll', requestPlace, { passive: true });
  window.addEventListener('resize', requestPlace);
})();
