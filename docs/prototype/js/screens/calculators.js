/* Calculators screen: eight photographer calculators driven by the gear on the Gear screen. */
(function (PT) {
  const { h } = PT;
  const M = PT.math;

  const TABS = [
    { value: 'dof', label: 'Depth of field' },
    { value: 'blur', label: 'Background blur' },
    { value: 'exposure', label: 'Exposure' },
    { value: 'nd', label: 'ND filter' },
    { value: 'shutter', label: 'Shutter speed' },
    { value: 'astro', label: 'Astro' },
    { value: 'fov', label: 'Field of view' },
    { value: 'flash', label: 'Flash' }
  ];

  const SCENES = [
    { id: 'sun', label: 'Full sun', ev: 15 },
    { id: 'light-overcast', label: 'Light overcast', ev: 13 },
    { id: 'overcast', label: 'Overcast', ev: 12 },
    { id: 'shade', label: 'Open shade', ev: 12 },
    { id: 'sunset', label: 'Sunset', ev: 12 },
    { id: 'interior', label: 'Bright interior', ev: 8 },
    { id: 'night', label: 'Night street', ev: 5 },
    { id: 'moon', label: 'Full-moon landscape', ev: -3 }
  ];

  const SUNNY16 = [
    { label: 'Full sun', N: 16 },
    { label: 'Light overcast', N: 11 },
    { label: 'Overcast', N: 8 },
    { label: 'Heavy overcast', N: 5.6 },
    { label: 'Open shade or sunset', N: 4 }
  ];

  const MOTION = [
    { label: 'Walking', t: 1 / 250 },
    { label: 'Kids and pets', t: 1 / 500 },
    { label: 'Sports', t: 1 / 1000 },
    { label: 'Birds in flight', t: 1 / 2000 },
    { label: 'Panning', t: 1 / 30 },
    { label: 'Silky water', t: 1 }
  ];

  const FORMATS = [
    { name: 'Full frame', crop: 1 },
    { name: 'APS-C', crop: 1.5 },
    { name: 'APS-C Canon', crop: 1.6 },
    { name: 'Micro Four Thirds', crop: 2 }
  ];

  const FORMULAS = {
    dof: [
      ['Circle of confusion', 'c = sensor diagonal / 1500'],
      ['Hyperfocal', 'H = f² / (N·c) + f'],
      ['Near limit', 's·(H − f) / (H + s − 2f)'],
      ['Far limit', 's·(H − f) / (H − s), or ∞ when s ≥ H']
    ],
    blur: [
      ['Magnification', 'm = f / (s − f)'],
      ['Blur disc', 'b = (f·m / N) · (x_d / (s + x_d))'],
      ['Shown as', 'b / sensor width, in % of frame width']
    ],
    exposure: [
      ['Exposure value', 'EV₁₀₀ = log₂(N² / t)'],
      ['At another ISO', 'EV = EV₁₀₀ − log₂(ISO / 100)'],
      ['Shutter for a scene', 't = N² / 2^(EV + log₂(ISO / 100))'],
      ['Sunny 16', 'f/16 at 1/ISO in full sun']
    ],
    nd: [
      ['New shutter', 't′ = t × 2^stops'],
      ['Common filters', 'ND8 = 3 stops, ND64 = 6, ND1000 = 10']
    ],
    shutter: [
      ['Reciprocal rule', 't = 1 / (f × crop)'],
      ['With stabilisation', 't × 2^stops']
    ],
    astro: [
      ['500 rule', 't = 500 / (f × crop)'],
      ['NPF rule', 't = (35·N + 30·p) / f'],
      ['Pixel pitch', 'p = sensor width × 1000 / √(MP × 10⁶ × W/H)']
    ],
    fov: [
      ['Angle of view', 'FOV = 2·atan(d / 2f)'],
      ['Crop factor', 'crop = 43.27 / sensor diagonal'],
      ['Equivalent focal', 'f_eq = f × crop']
    ],
    flash: [
      ['Guide number', 'GN = distance × f-number (ISO 100)'],
      ['Max distance', 'd = GN × √(ISO / 100) / N'],
      ['Inverse square', '2× distance = ¼ light = −2 stops']
    ]
  };

  /* State that survives leaving and re-entering the screen. */
  const S = {
    tab: 'dof',
    N: null,
    s: 3,
    bg: 5,
    exp: { preset: 'sun', custom: 12, solve: 'shutter', t: 1 / 250, iso: 100 },
    nd: { base: 1 / 125, filter: 'ND1000', custom: 6 },
    ibis: true,
    gn: 36,
    flashIso: 100
  };
  const tabListeners = new Set();
  let writing = false;

  /* ---------- helpers ---------- */
  const g = () => M.activeGear();
  const fmtM = m => M.formatDistance(m * 1000);
  const fmtF = f => `${+f.toFixed(1)} mm`;
  const fmtT = t => M.formatShutter(t);
  const snapShutter = t => M.nearest(M.SHUTTERS, t);
  const stat = (value, label) => h('div', { class: 'stat' }, h('span', { class: 'stat-value num' }, value), h('span', { class: 'stat-label' }, label));
  const stats = items => h('div', { class: 'stats' }, items.map(([v, l]) => stat(v, l)));
  const section = (title, ...kids) => h('div', { class: 'stack-sm' }, title ? h('div', { class: 'calc-section-title' }, title) : null, ...kids);
  const note = t => h('p', { class: 'calc-note' }, t);
  const svg = (w, hgt, inner, label) => h('div', { html: `<svg class="calc-svg" viewBox="0 0 ${w} ${hgt}" role="img" aria-label="${label}">${inner}</svg>` });
  const logPos = (v, min, max) => 1000 * Math.log(v / min) / Math.log(max / min);
  const logVal = (p, min, max) => min * Math.pow(max / min, p / 1000);
  const slug = n => n.toFixed(2);

  function apList(lens) {
    const lo = lens.maxAperture, hi = lens.minAperture || 22;
    const list = [lo];
    M.APERTURES.forEach(v => { if (v > lo + 0.01 && v <= hi + 0.01) list.push(v); });
    return list;
  }
  function curN() {
    const list = apList(g().lens);
    if (S.N == null) S.N = M.nearest(list, 2.8);
    S.N = M.nearest(list, S.N);
    return S.N;
  }

  function apertureInput(onChange) {
    const lens = g().lens;
    const opts = apList(lens).map(v => ({ value: v, label: M.formatAperture(v) }));
    return PT.ui.select({
      label: 'Aperture', options: opts, value: curN(),
      onChange: v => { S.N = parseFloat(v); onChange(); },
      hint: `Limited to your lens: ${M.formatAperture(lens.maxAperture)} to ${M.formatAperture(lens.minAperture || 22)}`
    });
  }

  function focalInput(onChange) {
    const { lens, f } = g();
    if (lens.minF === lens.maxF) {
      return h('div', { class: 'calc-fixed' }, h('span', { class: 'label' }, 'Focal length'), h('span', { class: 'v' }, `${fmtF(lens.minF)} (prime)`));
    }
    return PT.ui.slider({
      label: 'Focal length', min: lens.minF, max: lens.maxF, step: 1, value: Math.round(f), format: v => fmtF(v),
      onInput: v => {
        writing = true;
        try { PT.store.set({ gear: { focalMm: v } }); } finally { writing = false; }
        updateGearRow();
        onChange();
      }
    });
  }

  /* Log slider: returns the field node; `.querySelector('input')` is the range. */
  function logSlider(label, min, max, get, set, onChange) {
    return PT.ui.slider({
      label, min: 0, max: 1000, step: 1, value: Math.round(logPos(get(), min, max)),
      format: p => fmtM(logVal(p, min, max)),
      onInput: p => { set(+logVal(p, min, max).toFixed(2)); onChange(); }
    });
  }
  function setLogSlider(node, v, min, max) {
    const input = node.querySelector('input');
    input.value = Math.round(logPos(Math.min(max, Math.max(min, v)), min, max));
    input.dispatchEvent(new Event('input'));
  }

  function table(head, rows, opts = {}) {
    return h('table', { class: 'calc-table' },
      h('thead', null, h('tr', null, head.map(x => h('th', null, x)))),
      h('tbody', null, rows.map((r, i) => h('tr', { class: (opts.cls && opts.cls(i)) || null }, r.map(c => h('td', null, c))))));
  }

  function makeTab(inputsNodes, build, extraInputsAfter) {
    const out = h('div', { class: 'calc-body' });
    const update = () => { out.replaceChildren(...build()); };
    const root = h('div', { class: 'calc-body' },
      PT.ui.card({ content: inputsNodes(update) }),
      out);
    update();
    return root;
  }

  /* ---------- 1. Depth of field ---------- */
  function tabDof() {
    let distNode;
    const calc = () => {
      const { body, f } = g();
      const s = Math.max(S.s * 1000, f * 1.2);
      const r = M.dof(f, curN(), M.coc(body), s);
      /* The log slider rounds, so treat "at or just short of H" as infinity. */
      if (s >= r.H * 0.99) { r.far = Infinity; r.total = Infinity; }
      return { f, s, ...r };
    };
    return makeTab(update => {
      distNode = logSlider('Subject distance', 0.3, 100, () => S.s, v => { S.s = v; }, update);
      return [apertureInput(update), focalInput(update), distNode];
    }, () => {
      const r = calc();
      const hyperBtn = h('button', { type: 'button', class: 'btn btn-outline btn-sm', onclick: () => setLogSlider(distNode, r.H / 1000, 0.3, 100) }, 'Focus at hyperfocal');
      return [
        PT.ui.card({
          title: 'Sharp zone',
          content: [
            stats([[fmtM(r.near / 1000), 'Near limit'], [fmtM(r.far / 1000), 'Far limit'], [isFinite(r.total) ? fmtM(r.total / 1000) : '∞', 'Total depth of field'], [fmtM(r.H / 1000), 'Hyperfocal distance']]),
            dofDiagram(r, S.s),
            h('div', { class: 'calc-actions' }, hyperBtn),
            note(`Everything from H/2 to infinity is sharp. Here that is ${fmtM(r.H / 2000)} to infinity.`)
          ]
        })
      ];
    });
  }

  function dofDiagram(r, s) {
    const X0 = 16, X1 = 280, XI = 304, Y = 46;
    const x = d => X0 + (X1 - X0) * Math.min(1, Math.max(0, Math.log(d / 0.3) / Math.log(100 / 0.3)));
    const nearM = r.near / 1000, farM = r.far / 1000;
    const zx0 = x(nearM);
    const zx1 = !isFinite(farM) || farM > 100 ? XI : x(farM);
    const sx = x(Math.max(0.3, s));
    const ticks = [1, 3, 10, 30, 100].map(d => `<line class="mute" x1="${x(d)}" x2="${x(d)}" y1="${Y}" y2="${Y + 4}"/><text x="${x(d)}" y="${Y + 14}" text-anchor="middle">${d} m</text>`).join('');
    return svg(320, 78, `
      <rect class="zone" x="${zx0.toFixed(1)}" y="${Y - 16}" width="${Math.max(2, zx1 - zx0).toFixed(1)}" height="16" rx="2"/>
      <line class="ink" x1="${X0}" x2="${X1}" y1="${Y}" y2="${Y}"/>
      <line class="dash" x1="${X1}" x2="${XI}" y1="${Y}" y2="${Y}"/>
      ${ticks}
      <text x="${XI}" y="${Y + 14}" text-anchor="middle">∞</text>
      <path class="ink" d="M${X0 - 8} ${Y - 10} h8 v10 h-8 z"/>
      <text x="${X0 - 8}" y="${Y - 14}">Camera</text>
      <line class="ink" x1="${sx.toFixed(1)}" x2="${sx.toFixed(1)}" y1="${Y - 26}" y2="${Y}"/>
      <circle class="dot" cx="${sx.toFixed(1)}" cy="${Y - 28}" r="3"/>
      <text class="strong" x="${Math.min(sx + 6, 270).toFixed(1)}" y="${Y - 26}">Subject</text>`, 'Depth of field: the sharp zone along the distance from camera to infinity');
  }

  /* ---------- 2. Background blur ---------- */
  function blurVerdict(p) {
    if (p < 1) return { label: 'Barely blurred', text: 'The background stays detailed.' };
    if (p < 3) return { label: 'Soft', text: 'The background is clearly out of focus but still readable.' };
    if (p < 8) return { label: 'Creamy', text: 'Smooth separation, the classic portrait look.' };
    return { label: 'Very strong', text: 'The background melts into large soft discs.' };
  }
  const fmtPct = p => `${p < 1 ? p.toFixed(2) : p.toFixed(1)}%`;

  const BG_DOTS = [[.1, .15, 5], [.25, .3, 8], [.08, .55, 6], [.2, .8, 7], [.38, .12, 6], [.4, .88, 5], [.62, .1, 7], [.78, .22, 6], [.9, .4, 8], [.7, .85, 6], [.92, .75, 5], [.58, .62, 4], [.33, .62, 4], [.85, .08, 4]];

  function drawBlur(canvas, pct) {
    const W = 300, H = 200;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    const cs = getComputedStyle(canvas);
    const fg = cs.color, muted = cs.getPropertyValue('--muted-foreground').trim() || fg, bg = cs.backgroundColor;
    ctx.clearRect(0, 0, W, H);
    const disc = pct / 100 * W;
    const hasFilter = 'filter' in ctx;
    ctx.fillStyle = muted;
    BG_DOTS.forEach(([x, y, r]) => {
      if (hasFilter) {
        ctx.filter = `blur(${(disc * 0.35).toFixed(2)}px)`;
        ctx.globalAlpha = 0.9;
        ctx.beginPath(); ctx.arc(x * W, y * H, r, 0, Math.PI * 2); ctx.fill();
      } else {
        const rr = r + disc / 2;
        ctx.globalAlpha = 0.9 * Math.min(1, (r * r) / (rr * rr)) + 0.1;
        ctx.beginPath(); ctx.arc(x * W, y * H, rr, 0, Math.PI * 2); ctx.fill();
      }
    });
    if (hasFilter) ctx.filter = 'none';
    ctx.globalAlpha = 1;
    /* Sharp subject: head and shoulders. */
    ctx.fillStyle = fg; ctx.strokeStyle = bg; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(W / 2, H + 6, 70, 62, 0, Math.PI, 0); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(W / 2, H * 0.42, 28, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }

  function tabBlur() {
    let distNode, bgNode;
    const calcPct = N => {
      const { body, f } = g();
      return M.blurPctOfWidth(f, N, Math.max(S.s * 1000, f * 1.2), S.bg * 1000, body);
    };
    return makeTab(update => {
      distNode = logSlider('Subject distance', 0.3, 100, () => S.s, v => { S.s = v; }, update);
      bgNode = logSlider('Background behind the subject', 0.5, 50, () => S.bg, v => { S.bg = v; }, update);
      return [apertureInput(update), focalInput(update), distNode, bgNode];
    }, () => {
      const lens = g().lens;
      const N = curN();
      const N8 = Math.min(Math.max(8, lens.maxAperture), lens.minAperture || 22);
      const cols = [['This setting', N], [`At ${M.formatAperture(N8)}`, N8]].map(([label, n]) => {
        const p = calcPct(n), v = blurVerdict(p);
        const canvas = h('canvas', { class: 'calc-canvas', 'aria-label': `Preview of background blur at ${M.formatAperture(n)}` });
        requestAnimationFrame(() => drawBlur(canvas, p));
        return h('div', { class: 'calc-compare-col' },
          h('span', { class: 'calc-compare-label' }, label === 'This setting' ? `${label} (${M.formatAperture(n)})` : label),
          canvas,
          h('div', { class: 'stat' }, h('span', { class: 'stat-value num' }, fmtPct(p)), h('span', { class: 'stat-label' }, 'Blur disc, % of frame width')),
          h('span', { class: 'calc-verdict' }, h('span', { class: 'badge badge-secondary' }, v.label)));
      });
      const v = blurVerdict(calcPct(N));
      return [PT.ui.card({
        title: 'Background blur',
        description: `${v.label}. ${v.text}`,
        content: [
          h('div', { class: 'calc-compare' }, cols),
          note('Under 1% barely blurred, 1 to 3% soft, 3 to 8% creamy, over 8% very strong. The subject stays sharp in the preview.')
        ]
      })];
    });
  }

  /* ---------- 3. Exposure ---------- */
  function tabExposure() {
    const E = S.exp;
    let customNode, solveFields;
    const sceneEv = () => E.preset === 'custom' ? E.custom : SCENES.find(x => x.id === E.preset).ev;

    function solve() {
      const lens = g().lens, ev = sceneEv(), N = curN();
      const list = apList(lens);
      let t = E.t, iso = E.iso, n = N, exact;
      if (E.solve === 'shutter') { exact = M.shutterFor(N, ev, iso); t = snapShutter(exact); }
      else if (E.solve === 'aperture') { exact = Math.sqrt(E.t * Math.pow(2, ev + Math.log2(iso / 100))); n = M.nearest(list, exact); }
      else { exact = 100 * Math.pow(2, M.ev100(N, E.t) - ev); iso = M.nearest(M.ISOS, exact); }
      const diff = M.evAtIso(n, t, iso) - ev;   /* positive: settings expose a brighter scene, so the frame is under */
      return { ev, n, t, iso, exact, diff, list };
    }

    return makeTab(update => {
      const sceneSel = PT.ui.select({
        label: 'Scene brightness',
        options: [...SCENES.map(s => ({ value: s.id, label: `${s.label} (EV ${s.ev})` })), { value: 'custom', label: 'Custom EV' }],
        value: E.preset,
        onChange: v => { E.preset = v; customNode.hidden = v !== 'custom'; update(); }
      });
      customNode = PT.ui.slider({ label: 'Scene EV at ISO 100', min: -6, max: 20, step: 1, value: E.custom, format: v => `EV ${v}`, onInput: v => { E.custom = v; update(); } });
      customNode.hidden = E.preset !== 'custom';
      const solveSeg = h('div', { class: 'field' }, h('span', { class: 'label' }, 'Solve for'),
        PT.ui.segmented([{ value: 'shutter', label: 'Shutter' }, { value: 'aperture', label: 'Aperture' }, { value: 'iso', label: 'ISO' }], E.solve, v => { E.solve = v; renderSolveFields(); update(); }, 'Solve for'));
      solveFields = h('div', { class: 'stack' });
      function renderSolveFields() {
        const kids = [];
        if (E.solve !== 'aperture') kids.push(apertureInput(update));
        if (E.solve !== 'shutter') kids.push(PT.ui.select({ label: 'Shutter speed', options: M.SHUTTERS.map(t => ({ value: t, label: fmtT(t) })), value: snapShutter(E.t), onChange: v => { E.t = parseFloat(v); update(); } }));
        if (E.solve !== 'iso') kids.push(PT.ui.select({ label: 'ISO', options: M.ISOS.map(i => ({ value: i, label: String(i) })), value: M.nearest(M.ISOS, E.iso), onChange: v => { E.iso = parseFloat(v); update(); } }));
        solveFields.replaceChildren(...kids);
      }
      renderSolveFields();
      return [sceneSel, customNode, solveSeg, solveFields];
    }, () => {
      const r = solve();
      const label = { shutter: 'Shutter speed', aperture: 'Aperture', iso: 'ISO' }[E.solve];
      const value = { shutter: fmtT(r.t), aperture: M.formatAperture(r.n), iso: String(r.iso) }[E.solve];
      const verdict = Math.abs(r.diff) < 0.2 ? 'Matches the scene.' : `Snapped to a standard stop, ${Math.abs(r.diff).toFixed(1)} stops ${r.diff > 0 ? 'under' : 'over'} the scene.`;
      const rows = [-2, -1, 0, 1, 2].map(k => {
        const n = M.nearest(M.APERTURES, r.n * Math.pow(Math.SQRT2, k));
        return { k, n, t: snapShutter(r.t * Math.pow(2, k)), ok: n >= r.list[0] - 0.01 && n <= r.list[r.list.length - 1] + 0.01 };
      });
      const sunISO = E.iso;
      return [
        PT.ui.card({
          title: 'Result',
          description: `${M.formatEV(r.ev)} scene at ISO 100`,
          content: [
            stats([[value, `${label} to use`], [`${M.formatAperture(r.n)} · ${fmtT(r.t)} · ISO ${r.iso}`, 'Full exposure']]),
            note(verdict)
          ]
        }),
        PT.ui.card({
          title: 'Equivalent exposures',
          description: 'Same brightness, different look. Dimmed rows are outside your lens range.',
          content: table(['Aperture', 'Shutter', 'ISO'], rows.map(x => [M.formatAperture(x.n), fmtT(x.t), String(r.iso)]), { cls: i => rows[i].k === 0 ? 'is-base' : (rows[i].ok ? null : 'is-dim') })
        }),
        PT.ui.card({
          title: 'Sunny 16',
          description: `Shutter is 1/ISO, so ISO ${sunISO} gives ${fmtT(snapShutter(1 / sunISO))}.`,
          content: table(['Conditions', 'Aperture', 'Shutter'], SUNNY16.map(c => [c.label, M.formatAperture(c.N), fmtT(snapShutter(1 / sunISO))]))
        })
      ];
    });
  }

  /* ---------- 4. ND filter ---------- */
  const timer = { id: null, end: 0 };
  function stopTimer() { if (timer.id) { clearInterval(timer.id); timer.id = null; } }
  const mmss = sec => { sec = Math.max(0, Math.ceil(sec)); return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`; };

  function tabND() {
    const D = S.nd;
    let customNode;
    const stopsNow = () => D.filter === 'custom' ? D.custom : M.ND_FILTERS.find(f => f.name === D.filter).stops;
    const timeEl = h('div', { class: 'calc-timer-time' }, '00:00');
    const btn = h('button', { type: 'button', class: 'btn btn-sm' }, 'Start timer');
    const timerHint = h('span', { class: 'calc-note' });
    const total = () => M.ndShutter(D.base, stopsNow());

    function resetTimer() { stopTimer(); btn.textContent = 'Start timer'; timeEl.classList.remove('is-running'); timeEl.textContent = mmss(total()); }
    btn.addEventListener('click', () => {
      if (timer.id) { resetTimer(); return; }
      timer.end = Date.now() + total() * 1000;
      btn.textContent = 'Stop';
      timeEl.classList.add('is-running');
      timeEl.textContent = mmss(total());
      timer.id = setInterval(() => {
        const left = (timer.end - Date.now()) / 1000;
        if (left <= 0) { resetTimer(); PT.toast('Exposure finished'); } else timeEl.textContent = mmss(left);
      }, 200);
    });

    return makeTab(update => {
      const baseSel = PT.ui.select({ label: 'Shutter without the filter', options: M.SHUTTERS.map(t => ({ value: t, label: fmtT(t) })), value: snapShutter(D.base), onChange: v => { D.base = parseFloat(v); update(); } });
      const filterSel = PT.ui.select({
        label: 'Filter', options: [...M.ND_FILTERS.map(f => ({ value: f.name, label: `${f.name} (${f.stops} stops)` })), { value: 'custom', label: 'Custom stops' }], value: D.filter,
        onChange: v => { D.filter = v; customNode.hidden = v !== 'custom'; update(); }
      });
      customNode = PT.ui.slider({ label: 'Filter strength', min: 0, max: 20, step: 0.5, value: D.custom, format: v => `${v} stops`, onInput: v => { D.custom = v; update(); } });
      customNode.hidden = D.filter !== 'custom';
      return [baseSel, filterSel, customNode];
    }, () => {
      const t = total(), stops = stopsNow();
      resetTimer();
      btn.disabled = t < 1;
      timerHint.textContent = t < 1 ? 'The timer needs an exposure of 1 s or longer.' : '';
      return [
        PT.ui.card({
          title: 'New exposure',
          content: [
            stats([[fmtT(t), 'Shutter with the filter'], [`${+stops.toFixed(1)}`, 'Stops removed']]),
            h('div', { class: 'calc-timer' }, h('div', { class: 'stack-sm' }, h('span', { class: 'label' }, 'Exposure countdown'), timeEl), btn),
            timerHint
          ]
        }),
        PT.ui.card({
          title: 'Other filters at this shutter',
          content: table(['Filter', 'Stops', 'Shutter'], M.ND_FILTERS.map(f => [f.name, String(f.stops), fmtT(M.ndShutter(D.base, f.stops))]))
        })
      ];
    });
  }

  /* ---------- 5. Shutter speed ---------- */
  function tabShutter() {
    return makeTab(update => {
      const { body } = g();
      return [focalInput(update), PT.ui.switchRow(`Use IBIS (${body.ibisStops} stops)`, S.ibis, v => { S.ibis = v; update(); }, 'In-body stabilisation of your camera')];
    }, () => {
      const { body, f } = g();
      const crop = M.cropFactor(body), stab = S.ibis ? body.ibisStops : 0;
      const hm = snapShutter(M.handheldMin(f, crop, stab)), plain = snapShutter(M.handheldMin(f, crop, 0));
      return [
        PT.ui.card({
          title: 'Handheld minimum',
          description: `${fmtF(M.eqFocal(f, body))} equivalent, 1 / (focal × crop)`,
          content: [
            stats([[fmtT(hm), S.ibis ? 'With IBIS' : 'Without stabilisation'], [fmtT(plain), 'No stabilisation']]),
            note('A steady stance helps, but moving subjects need faster speeds than this.')
          ]
        }),
        PT.ui.card({
          title: 'Freeze or blur motion',
          content: table(['Subject', 'Shutter', ''], MOTION.map(m => [m.label, fmtT(m.t), m.t > hm * 1.01 ? h('span', { class: 'badge badge-outline' }, 'Tripod') : '']))
        })
      ];
    });
  }

  /* ---------- 6. Astro ---------- */
  function tabAstro() {
    return makeTab(update => [focalInput(update), apertureInput(update)], () => {
      const { body, f } = g(), N = curN();
      const crop = M.cropFactor(body), p = M.pixelPitchUm(body);
      const r500 = M.rule500(f, crop), npf = M.npf(N, p, f);
      const reason = npf < r500 * 0.9
        ? `Your ${+p.toFixed(1)} µm pixels show trailing sooner than the 500 rule predicts.`
        : 'It uses your pixel pitch and aperture, so it follows your sensor.';
      return [
        PT.ui.card({
          title: 'Longest exposure for round stars',
          content: [
            stats([[fmtT(npf), 'NPF rule (recommended)'], [fmtT(r500), '500 rule']]),
            note(`Use NPF. ${reason}`),
            h('div', { class: 'kv-row' }, h('span', { class: 'k' }, 'Pixel pitch'), h('span', { class: 'v' }, `${p.toFixed(1)} µm`))
          ]
        }),
        PT.ui.card({
          title: 'Tip',
          content: h('div', { class: 'stack-sm' },
            h('div', { class: 'row-between' }, h('span', { class: 'label' }, 'ISO'), h('span', { class: 'small muted' }, '1600 to 6400')),
            h('div', { class: 'row-between' }, h('span', { class: 'label' }, 'Focus'), h('span', { class: 'small muted' }, 'Manual, on a bright star')))
        })
      ];
    });
  }

  /* ---------- 7. Field of view ---------- */
  function tabFov() {
    return makeTab(update => [focalInput(update)], () => {
      const { body, f } = g();
      const hf = M.fovDeg(f, body.sensorW), vf = M.fovDeg(f, body.sensorH), df = M.fovDeg(f, M.diag(body));
      const eq = M.eqFocal(f, body);
      return [
        PT.ui.card({
          title: 'Angle of view',
          description: `${body.name} at ${fmtF(f)}`,
          content: [
            stats([[`${hf.toFixed(1)}°`, 'Horizontal'], [`${vf.toFixed(1)}°`, 'Vertical'], [`${df.toFixed(1)}°`, 'Diagonal'], [fmtF(eq), 'Full-frame equivalent']]),
            fovDiagram(hf)
          ]
        }),
        PT.ui.card({
          title: 'Same view on other formats',
          description: 'The focal length you would need to see what you see now.',
          content: table(['Format', 'Crop', 'Focal'], FORMATS.map(x => [x.name, `${x.crop}×`, fmtF(eq / x.crop)]))
        })
      ];
    });
  }

  function fovDiagram(hf) {
    const ax = 160, ay = 100, len = 84, half = Math.min(hf, 170) / 2 * Math.PI / 180;
    const dx = len * Math.sin(half), dy = len * Math.cos(half);
    const lx = ax - dx, rx = ax + dx, ty = ay - dy;
    return svg(320, 112, `
      <path class="wedge" d="M${ax} ${ay} L${lx.toFixed(1)} ${ty.toFixed(1)} A${len} ${len} 0 0 1 ${rx.toFixed(1)} ${ty.toFixed(1)} Z" fill-opacity=".6"/>
      <circle class="dot" cx="${ax}" cy="${ay}" r="3"/>
      <text class="strong" x="${ax}" y="${Math.min(ay - 8, ty + 18).toFixed(1)}" text-anchor="middle">${hf.toFixed(0)}°</text>
      <text x="${ax + 8}" y="${ay + 9}">Camera</text>`, `Horizontal angle of view, ${hf.toFixed(0)} degrees`);
  }

  /* ---------- 8. Flash ---------- */
  function tabFlash() {
    return makeTab(update => [
      PT.ui.slider({ label: 'Guide number (ISO 100, metres)', min: 10, max: 60, step: 1, value: S.gn, format: v => `GN ${v}`, onInput: v => { S.gn = v; update(); } }),
      PT.ui.select({ label: 'ISO', options: M.ISOS.filter(i => i <= 6400).map(i => ({ value: i, label: String(i) })), value: M.nearest(M.ISOS, S.flashIso), onChange: v => { S.flashIso = parseFloat(v); update(); } }),
      apertureInput(update)
    ], () => {
      const N = curN(), d = M.flashDistance(S.gn, N, S.flashIso);
      return [
        PT.ui.card({
          title: 'Reach at full power',
          content: [
            stats([[fmtM(d), 'Maximum distance'], [M.formatAperture(N), 'At this aperture']]),
            note('Sync speed is about 1/200 to 1/250 s. Faster needs high-speed sync.')
          ]
        }),
        PT.ui.card({
          title: 'Inverse square law',
          description: '2× distance = ¼ light = −2 stops',
          content: svg(320, 90, `
            <circle class="dot" cx="20" cy="45" r="4"/>
            <line class="mute" x1="20" y1="45" x2="200" y2="9"/><line class="mute" x1="20" y1="45" x2="200" y2="81"/>
            <line class="ink" x1="110" y1="27" x2="110" y2="63"/>
            <line class="ink" x1="200" y1="9" x2="200" y2="81"/>
            <text x="110" y="78" text-anchor="middle">d</text><text x="200" y="89" text-anchor="middle">2d</text>
            <text class="strong" x="118" y="40">full light</text><text class="strong" x="208" y="40">¼ light</text>`, 'Light from a flash spreads over four times the area at twice the distance')
        })
      ];
    });
  }

  const BUILDERS = { dof: tabDof, blur: tabBlur, exposure: tabExposure, nd: tabND, shutter: tabShutter, astro: tabAstro, fov: tabFov, flash: tabFlash };

  /* ---------- screen ---------- */
  let gearTextEl = null;
  function gearText() {
    const { body, lens, f } = g();
    return lens.minF === lens.maxF ? `${body.name} · ${lens.name}` : `${body.name} · ${lens.name} at ${fmtF(f)}`;
  }
  function updateGearRow() { if (gearTextEl) gearTextEl.textContent = gearText(); }

  function mount(el) {
    const bodyEl = h('div', { class: 'calc-body' });
    gearTextEl = h('div', { class: 'calc-gear-text' }, gearText());
    const seg = PT.ui.segmented(TABS, S.tab, v => { S.tab = v; renderTab(); tabListeners.forEach(fn => fn()); }, 'Calculators');
    const pad = h('div', { class: 'screen-pad stack' },
      h('h1', { class: 'screen-title' }, 'Calculators'),
      h('div', { class: 'calc-gear-row' }, gearTextEl, h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onclick: () => PT.nav('gear') }, 'Change')),
      h('div', { class: 'calc-tabs' }, seg),
      bodyEl);

    function renderTab() {
      stopTimer();
      bodyEl.replaceChildren(BUILDERS[S.tab]());
    }
    el.append(pad);
    renderTab();
    requestAnimationFrame(() => {
      const sel = seg.querySelector('[aria-selected="true"]');
      if (sel) seg.scrollLeft = Math.max(0, sel.offsetLeft - 16);
    });

    const unsub = PT.store.subscribe(() => {
      if (writing) return;
      updateGearRow();
      renderTab();
    });
    return () => { unsub(); stopTimer(); gearTextEl = null; };
  }

  function panelExtras(el) {
    const render = () => {
      const rows = FORMULAS[S.tab] || [];
      const label = TABS.find(t => t.value === S.tab).label;
      el.replaceChildren(PT.ui.card({
        title: 'Formulas',
        description: label,
        content: PT.ui.kv(rows.map(([k, v]) => [k, h('span', { class: 'num' }, v)]))
      }));
    };
    render();
    tabListeners.add(render);
    return () => tabListeners.delete(render);
  }

  PT.registerScreen({
    id: 'calculators',
    title: 'Calculators',
    icon: 'calculator',
    mount,
    panelExtras,
    panel: {
      summary: 'Every calculator uses the camera body and lens you picked on the Gear screen, so results use your real sensor size, crop factor and focal range.',
      features: [
        { name: 'Depth of field and hyperfocal', tier: 'v1', note: 'Near, far, total and hyperfocal distance, with a one-tap focus at hyperfocal.' },
        { name: 'Background blur', tier: 'v1', note: 'Blur disc as a percentage of frame width, with a plain verdict and a side-by-side preview at f/8.' },
        { name: 'Exposure solver', tier: 'v1', note: 'Pick a scene brightness, solve for shutter, aperture or ISO, and see five equivalent exposures.' },
        { name: 'Sunny 16', tier: 'v1', note: 'Conditions to f-number, with shutter set to 1/ISO.' },
        { name: 'ND filter time', tier: 'v1', note: 'New shutter speed from a filter or a custom number of stops.' },
        { name: 'ND countdown timer', tier: 'v2', note: 'Counts down the long exposure in mm:ss so you do not need a second device.' },
        { name: 'Shutter rules', tier: 'v1', note: 'Handheld minimum with IBIS stops, plus a motion-freeze table.' },
        { name: 'Astro: 500 and NPF rules', tier: 'v1', note: 'Uses the pixel pitch of your sensor and recommends NPF.' },
        { name: 'Field of view and crop converter', tier: 'v1', note: 'Horizontal, vertical and diagonal angles, and the equivalent focal on other formats.' },
        { name: 'Flash distance', tier: 'v2', note: 'Maximum reach from guide number, ISO and aperture, with an inverse square reminder.' }
      ]
    }
  });
})(window.PT);
