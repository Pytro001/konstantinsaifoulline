import createGlobe from 'https://esm.sh/cobe@0.6.3';

const canvas = document.getElementById('heroGlobe');
if (canvas) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let phi = 0;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(512, Math.floor(rect.width * dpr));
  const h = Math.max(512, Math.floor(rect.height * dpr));

  createGlobe(canvas, {
    devicePixelRatio: dpr,
    width: w,
    height: h,
    phi: 0,
    theta: 0.28,
    dark: 1,
    diffuse: 1.22,
    mapSamples: 22000,
    mapBrightness: 6,
    baseColor: [0.16, 0.16, 0.18],
    markerColor: [0.88, 0.88, 0.92],
    glowColor: [0.2, 0.2, 0.24],
    markers: [],
    scale: 1.14,
    offset: [0, 0],
    onRender: (state) => {
      state.phi = phi;
      if (!reduceMotion) phi += 0.002;
      state.width = canvas.width;
      state.height = canvas.height;
      return state;
    },
  });
}
