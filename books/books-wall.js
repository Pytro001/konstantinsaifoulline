// Library wall — a WebGL Voronoi surface of every book cover. Cells tessellate
// seamlessly, bevel up out of the dark with camera-lit edges (the "depth"),
// and magnify around the pointer like a lens. A faithful, self-contained
// recreation of the nothing-to-watch (gnovotny) voroforce look for books.

(function () {
  const books = (window.BOOKS || []).slice();
  const wall = document.getElementById('wall');
  if (!wall || !books.length) return;
  const N = books.length;

  const coverSrc = (b) => `/assets/books/${b.id}.jpg`;
  const svgSrc = (b) => `/assets/books/${b.id}.svg`;

  // ---------------------------------------------------------------------------
  // Shared cell math — MUST match the GLSL below so clicks hit the right cover.
  // ---------------------------------------------------------------------------
  const JIT = 0.35;      // cell-point jitter
  const CELLS_Y = 13;    // cells vertically at rest
  const MAG_A = 3.0;     // lens magnification amount
  const MAG_SIGMA = 0.52; // lens radius (aspect units)

  function uhash(x, y) {
    let h = (Math.imul(x >>> 0, 73856093) ^ Math.imul(y >>> 0, 19349663)) >>> 0;
    h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995) >>> 0; h ^= h >>> 15;
    return h >>> 0;
  }
  function cellPoint(ix, iy) {
    const h = uhash(ix, iy);
    const jx = (h & 0xffff) / 65535;
    const jy = ((h >>> 16) & 0xffff) / 65535;
    return [0.5 + (jx - 0.5) * JIT, 0.5 + (jy - 0.5) * JIT];
  }
  function coverIndex(ix, iy) {
    const h = uhash((ix + 9137) | 0, (iy + 4423) | 0);
    return h % N;
  }

  // Which book sits under a screen point (px,py from top-left)?
  function bookAt(px, py, W, H, pointer, strength) {
    const aspect = W / H;
    const ax = (px / W * 2 - 1) * aspect;
    const ay = -((py / H) * 2 - 1);
    const dvx = ax - pointer[0], dvy = ay - pointer[1];
    const d = Math.hypot(dvx, dvy);
    const mag = 1 / (1 + MAG_A * strength * Math.exp(-(d * d) / (2 * MAG_SIGMA * MAG_SIGMA)));
    const qx = pointer[0] + dvx * mag;
    const qy = pointer[1] + dvy * mag;
    const cellSize = 2 / CELLS_Y;
    const cx = qx / cellSize, cy = qy / cellSize;
    const bix = Math.floor(cx), biy = Math.floor(cy);
    const gvx = cx - bix, gvy = cy - biy;
    let f1 = 1e9, wix = bix, wiy = biy;
    for (let j = -1; j <= 1; j++) {
      for (let i = -1; i <= 1; i++) {
        const id0 = bix + i, id1 = biy + j;
        const p = cellPoint(id0, id1);
        const rx = i + p[0] - gvx, ry = j + p[1] - gvy;
        const dd = rx * rx + ry * ry;
        if (dd < f1) { f1 = dd; wix = id0; wiy = id1; }
      }
    }
    return books[coverIndex(wix, wiy)];
  }

  // ---------------------------------------------------------------------------
  // WebGL
  // ---------------------------------------------------------------------------
  const canvas = document.createElement('canvas');
  canvas.className = 'wall-canvas';
  wall.appendChild(canvas);
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false });

  if (!gl) { wall.classList.add('no-webgl'); return; }

  const VERT = `#version 300 es
  precision highp float;
  const vec2 verts[3] = vec2[3](vec2(-1.,-1.), vec2(3.,-1.), vec2(-1.,3.));
  void main(){ gl_Position = vec4(verts[gl_VertexID], 0., 1.); }`;

  const FRAG = `#version 300 es
  precision highp float;
  uniform vec2 uRes;
  uniform sampler2D uAtlas;
  uniform vec2 uAtlasDims;   // cols, rows
  uniform float uCount;
  uniform vec2 uPointer;     // aspect space
  uniform float uStrength;
  uniform float uCellsY;
  out vec4 frag;

  const float JIT = ${JIT.toFixed(3)};
  const float MAG_A = ${MAG_A.toFixed(3)};
  const float MAG_SIGMA = ${MAG_SIGMA.toFixed(3)};

  uint uhash(int x, int y){
    uint h = uint(x)*73856093u ^ uint(y)*19349663u;
    h ^= h >> 13; h *= 0x5bd1e995u; h ^= h >> 15;
    return h;
  }
  vec2 cellPoint(ivec2 id){
    uint h = uhash(id.x, id.y);
    float jx = float(h & 0xffffu)/65535.0;
    float jy = float((h>>16)&0xffffu)/65535.0;
    return vec2(0.5) + (vec2(jx,jy)-0.5)*JIT;
  }
  int coverIndex(ivec2 id){
    uint h = uhash(id.x+9137, id.y+4423);
    return int(h % uint(uCount));
  }

  void main(){
    float aspect = uRes.x/uRes.y;
    vec2 fuv = gl_FragCoord.xy/uRes;
    vec2 a = vec2((fuv.x*2.0-1.0)*aspect, fuv.y*2.0-1.0);

    // lens magnification around the pointer
    vec2 dv = a - uPointer;
    float d = length(dv);
    float mag = 1.0/(1.0 + MAG_A*uStrength*exp(-(d*d)/(2.0*MAG_SIGMA*MAG_SIGMA)));
    vec2 q = uPointer + dv*mag;

    float cellSize = 2.0/uCellsY;
    vec2 c = q/cellSize;
    ivec2 baseId = ivec2(floor(c));
    vec2 gv = c - vec2(baseId);

    // nearest cell (F1)
    float f1 = 1e9; ivec2 wid = baseId; vec2 wrel = vec2(0.0);
    for(int j=-1;j<=1;j++){
      for(int i=-1;i<=1;i++){
        ivec2 id = baseId+ivec2(i,j);
        vec2 pt = vec2(i,j)+cellPoint(id);
        vec2 rel = pt-gv;
        float dd = dot(rel,rel);
        if(dd<f1){ f1=dd; wid=id; wrel=rel; }
      }
    }
    // distance to nearest cell border (IQ voronoi metric)
    float md = 1e9;
    for(int j=-1;j<=1;j++){
      for(int i=-1;i<=1;i++){
        ivec2 id = baseId+ivec2(i,j);
        vec2 pt = vec2(i,j)+cellPoint(id);
        vec2 rel = pt-gv;
        vec2 diff = wrel-rel;
        if(dot(diff,diff)>1e-5){
          md = min(md, dot(0.5*(wrel+rel), normalize(rel-wrel)));
        }
      }
    }

    // bevel heightmap from border distance -> flat top, sunken edges
    float bw = 0.12;
    float h = smoothstep(0.0, bw, md);
    // camera-lit normal for depth
    vec3 nrm = normalize(vec3(-dFdx(h)*40.0, -dFdy(h)*40.0, 1.0));
    vec3 L = normalize(vec3(-0.35, 0.5, 0.9));
    float dif = clamp(dot(nrm, L), 0.0, 1.0);
    float rim = pow(1.0 - h, 2.0); // darker down in the grooves
    float light = 0.28 + 0.95*dif;
    light *= (1.0 - 0.75*rim);

    // cover sampled inside the winning cell
    vec2 luv = clamp((-wrel)/1.35 + 0.5, 0.0, 1.0);
    int idx = coverIndex(wid);
    float col = mod(float(idx), uAtlasDims.x);
    float row = floor(float(idx)/uAtlasDims.x);
    vec2 auv = (vec2(col,row)+luv)/uAtlasDims;
    vec3 cover = texture(uAtlas, vec2(auv.x, 1.0-auv.y)).rgb;

    // seam gap between cells
    float seam = smoothstep(0.0, 0.015, md);

    // focus: covers near the pointer are lit, far ones sink into the dark
    float fb = 0.16 + 0.84*exp(-(d*d)/(2.0*0.42*0.42));

    vec3 outc = cover * light * seam * fb;
    // subtle top glint
    outc += vec3(0.06) * pow(clamp(dif,0.0,1.0), 3.0) * seam * fb;

    frag = vec4(outc, 1.0);
  }`;

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error('shader error:', gl.getShaderInfoLog(s));
    }
    return s;
  }
  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  gl.useProgram(prog);

  const U = {
    res: gl.getUniformLocation(prog, 'uRes'),
    atlas: gl.getUniformLocation(prog, 'uAtlas'),
    atlasDims: gl.getUniformLocation(prog, 'uAtlasDims'),
    count: gl.getUniformLocation(prog, 'uCount'),
    pointer: gl.getUniformLocation(prog, 'uPointer'),
    strength: gl.getUniformLocation(prog, 'uStrength'),
    cellsY: gl.getUniformLocation(prog, 'uCellsY'),
  };

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  // ---- Cover atlas ----
  const ACOLS = Math.ceil(Math.sqrt(N));
  const AROWS = Math.ceil(N / ACOLS);
  const SLOT_W = 128, SLOT_H = 192;
  const atlasCanvas = document.createElement('canvas');
  atlasCanvas.width = ACOLS * SLOT_W;
  atlasCanvas.height = AROWS * SLOT_H;
  const actx = atlasCanvas.getContext('2d');
  actx.fillStyle = '#0b0b0e';
  actx.fillRect(0, 0, atlasCanvas.width, atlasCanvas.height);

  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

  function uploadAtlas() {
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlasCanvas);
  }
  uploadAtlas();

  let pendingUpload = false;
  function drawCover(i, img) {
    const col = i % ACOLS;
    const row = Math.floor(i / ACOLS);
    const x = col * SLOT_W, y = row * SLOT_H;
    // cover-fit into the slot
    const ir = img.width / img.height;
    const sr = SLOT_W / SLOT_H;
    let sw, sh, sx, sy;
    if (ir > sr) { sh = img.height; sw = sh * sr; sx = (img.width - sw) / 2; sy = 0; }
    else { sw = img.width; sh = sw / sr; sx = 0; sy = (img.height - sh) / 2; }
    actx.drawImage(img, sx, sy, sw, sh, x, y, SLOT_W, SLOT_H);
    if (!pendingUpload) {
      pendingUpload = true;
      requestAnimationFrame(() => { pendingUpload = false; uploadAtlas(); ensure(); });
    }
  }
  books.forEach((b, i) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => drawCover(i, img);
    img.onerror = () => {
      const alt = new Image();
      alt.onload = () => drawCover(i, alt);
      alt.src = svgSrc(b);
    };
    img.src = coverSrc(b);
  });

  // ---- Sizing ----
  let W = 0, H = 0, DPR = 1;
  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    DPR = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    gl.viewport(0, 0, canvas.width, canvas.height);
    ensure();
  }

  // ---- Animation ----
  let px = 0, py = 0, tpx = 0, tpy = 0;   // pointer, aspect space
  let strength = 0, strengthT = 0.6;
  let running = false, locked = false;
  const AMBIENT = 0.6;

  function toAspect(clientX, clientY) {
    const aspect = W / H;
    return [ (clientX / W * 2 - 1) * aspect, -((clientY / H) * 2 - 1) ];
  }

  function ensure() { if (!running) { running = true; requestAnimationFrame(frame); } }

  function frame() {
    px += (tpx - px) * 0.16;
    py += (tpy - py) * 0.16;
    strength += (strengthT - strength) * 0.1;

    gl.useProgram(prog);
    gl.bindVertexArray(vao);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(U.atlas, 0);
    gl.uniform2f(U.res, canvas.width, canvas.height);
    gl.uniform2f(U.atlasDims, ACOLS, AROWS);
    gl.uniform1f(U.count, N);
    gl.uniform2f(U.pointer, px, py);
    gl.uniform1f(U.strength, strength);
    gl.uniform1f(U.cellsY, CELLS_Y);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    const moving =
      Math.abs(tpx - px) > 0.0008 ||
      Math.abs(tpy - py) > 0.0008 ||
      Math.abs(strengthT - strength) > 0.003;
    if (moving) requestAnimationFrame(frame);
    else running = false;
  }

  // ---- Pointer ----
  let lastClientX = W / 2, lastClientY = H / 2;
  canvas.addEventListener('pointermove', (e) => {
    lastClientX = e.clientX; lastClientY = e.clientY;
    if (locked) return;
    const a = toAspect(e.clientX, e.clientY);
    tpx = a[0]; tpy = a[1];
    strengthT = 1;
    ensure();
  }, { passive: true });
  canvas.addEventListener('pointerdown', (e) => {
    lastClientX = e.clientX; lastClientY = e.clientY;
    if (locked) return;
    const a = toAspect(e.clientX, e.clientY);
    tpx = a[0]; tpy = a[1];
    ensure();
  }, { passive: true });
  canvas.addEventListener('pointerleave', () => {
    if (locked) return;
    strengthT = AMBIENT;
    ensure();
  }, { passive: true });
  canvas.addEventListener('click', (e) => {
    const book = bookAt(e.clientX, e.clientY, W, H, [px, py], strength);
    if (book) {
      locked = true;
      const a = toAspect(e.clientX, e.clientY);
      tpx = a[0]; tpy = a[1];
      strengthT = 1;
      ensure();
      openDetail(book);
    }
  });

  // ---------------------------------------------------------------------------
  // Detail card
  // ---------------------------------------------------------------------------
  const detail = document.getElementById('detail');
  const dCover = document.getElementById('detailCover');
  const dTitle = document.getElementById('detailTitle');
  const dAuthor = document.getElementById('detailAuthor');
  const dTags = document.getElementById('detailTags');
  const dDesc = document.getElementById('detailDesc');
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

  window.addEventListener('resize', resize);
  resize();
  tpx = px = 0; tpy = py = 0; // start focused at centre
  strengthT = AMBIENT;
  ensure();
})();
