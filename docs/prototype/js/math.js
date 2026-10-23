/* Photography math. Units: focal length and sensor in mm, distances in mm unless named *M (metres),
   shutter t in seconds, N is the f-number. */
(function (PT) {
  const FF_DIAG = 43.267;

  const diag = body => Math.hypot(body.sensorW, body.sensorH);
  const cropFactor = body => FF_DIAG / diag(body);
  const coc = body => diag(body) / 1500;                                   // circle of confusion, mm
  const pixelPitchUm = body => body.sensorW * 1000 / Math.sqrt(body.mp * 1e6 * body.sensorW / body.sensorH);
  const diffractionLimitN = body => 1.5 * pixelPitchUm(body);              // rough point where diffraction softening starts
  const eqFocal = (f, body) => f * cropFactor(body);
  const fovDeg = (f, dimMm) => 2 * Math.atan(dimMm / (2 * f)) * 180 / Math.PI;

  const hyperfocal = (f, N, c) => f * f / (N * c) + f;
  /* s in mm. Returns mm; far is Infinity past the hyperfocal distance. */
  function dof(f, N, c, s) {
    const H = hyperfocal(f, N, c);
    const near = s * (H - f) / (H + s - 2 * f);
    const far = s >= H ? Infinity : s * (H - f) / (H - s);
    return { H, near, far, total: far - near };
  }
  /* Blur disc diameter on the sensor (mm) for a background xd behind a subject at s. */
  function blurDisc(f, N, s, xd) {
    const m = f / (s - f);
    return (f * m / N) * (xd / (s + xd));
  }
  const blurPctOfWidth = (f, N, s, xd, body) => blurDisc(f, N, s, xd) / body.sensorW * 100;

  /* Exposure */
  const ev100 = (N, t) => Math.log2(N * N / t);
  const evAtIso = (N, t, iso) => ev100(N, t) - Math.log2(iso / 100);    // scene EV at ISO 100
  const shutterFor = (N, ev, iso) => N * N / Math.pow(2, ev + Math.log2(iso / 100));
  const ndShutter = (t, stops) => t * Math.pow(2, stops);
  const handheldMin = (f, crop, stabStops = 0) => 1 / (f * crop) * Math.pow(2, stabStops);
  const rule500 = (f, crop) => 500 / (f * crop);
  const npf = (N, pitchUm, f) => (35 * N + 30 * pitchUm) / f;
  const shadowLength = (heightM, elevDeg) => elevDeg <= 0 ? Infinity : heightM / Math.tan(elevDeg * Math.PI / 180);
  const flashDistance = (gn, N, iso = 100) => gn * Math.sqrt(iso / 100) / N;

  /* Standard scales (one-third stops). */
  const SHUTTERS = [1/8000, 1/6400, 1/5000, 1/4000, 1/3200, 1/2500, 1/2000, 1/1600, 1/1250, 1/1000, 1/800, 1/640, 1/500, 1/400, 1/320, 1/250, 1/200, 1/160, 1/125, 1/100, 1/80, 1/60, 1/50, 1/40, 1/30, 1/25, 1/20, 1/15, 1/13, 1/10, 1/8, 1/6, 1/5, 1/4, 0.3, 0.4, 0.5, 0.6, 0.8, 1, 1.3, 1.6, 2, 2.5, 3.2, 4, 5, 6, 8, 10, 13, 15, 20, 25, 30];
  const APERTURES = [1.2, 1.4, 1.6, 1.8, 2, 2.2, 2.5, 2.8, 3.2, 3.5, 4, 4.5, 5, 5.6, 6.3, 7.1, 8, 9, 10, 11, 13, 14, 16, 18, 20, 22, 32];
  const ISOS = [50, 64, 80, 100, 125, 160, 200, 250, 320, 400, 500, 640, 800, 1000, 1250, 1600, 2000, 2500, 3200, 4000, 5000, 6400, 8000, 10000, 12800, 25600];
  const ND_FILTERS = [
    { name: 'ND2', stops: 1 }, { name: 'ND4', stops: 2 }, { name: 'ND8', stops: 3 }, { name: 'ND16', stops: 4 },
    { name: 'ND64', stops: 6 }, { name: 'ND400', stops: 8.6 }, { name: 'ND1000', stops: 10 }, { name: 'ND32000', stops: 15 }
  ];
  const nearest = (arr, v) => arr.reduce((a, b) => Math.abs(Math.log(b / v)) < Math.abs(Math.log(a / v)) ? b : a);

  /* Formatting */
  function formatShutter(t) {
    if (!isFinite(t)) return '—';
    if (t >= 60) { const m = Math.floor(t / 60), s = Math.round(t % 60); return s ? `${m}m ${s}s` : `${m}m`; }
    if (t >= 0.3) return `${+t.toFixed(t < 10 ? 1 : 0)}s`;
    return `1/${Math.round(1 / t)}`;
  }
  const formatAperture = N => `f/${+N.toFixed(1)}`;
  function formatDistance(mm) {
    if (!isFinite(mm)) return '∞';
    if (mm < 10) return `${mm.toFixed(1)} mm`;
    if (mm < 1000) return `${Math.round(mm / 10)} cm`;
    return `${(mm / 1000).toFixed(mm < 10000 ? 2 : 1)} m`;
  }
  const formatEV = ev => `${ev > 0 ? '+' : ''}${(+ev.toFixed(1))} EV`;

  /* Active gear helpers. */
  function activeGear(state = PT.store.get()) {
    const g = state.gear;
    const body = g.bodies.find(b => b.id === g.activeBodyId) || g.bodies[0];
    const lens = g.lenses.find(l => l.id === g.activeLensId) || g.lenses[0];
    const f = Math.min(Math.max(g.focalMm, lens.minF), lens.maxF);
    return { body, lens, f };
  }

  PT.math = {
    FF_DIAG, diag, cropFactor, coc, pixelPitchUm, diffractionLimitN, eqFocal, fovDeg,
    hyperfocal, dof, blurDisc, blurPctOfWidth,
    ev100, evAtIso, shutterFor, ndShutter, handheldMin, rule500, npf, shadowLength, flashDistance,
    SHUTTERS, APERTURES, ISOS, ND_FILTERS, nearest,
    formatShutter, formatAperture, formatDistance, formatEV,
    activeGear
  };
})(window.PT);
