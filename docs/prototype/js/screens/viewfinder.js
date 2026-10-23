/* Viewfinder screen: phone preview with overlays, analysis tools, manual exposure HUD and capture. */
(function (PT) {
  const { h } = PT;

  /* ---------- shared webcam state (used by mount and the side panel) ---------- */
  let camVideo = null, camStream = null, camError = '';
  const camListeners = new Set();
  const camNotify = () => camListeners.forEach(fn => fn());
  const camActive = () => !!(camStream && camVideo);

  function stopWebcam() {
    if (camStream) camStream.getTracks().forEach(t => t.stop());
    if (camVideo) { try { camVideo.pause(); } catch (e) { /* ignore */ } camVideo.srcObject = null; }
    camStream = null; camVideo = null;
    camNotify();
  }
  function camMessage(err) {
    const n = err && err.name;
    if (n === 'NotAllowedError' || n === 'SecurityError') return 'Camera access was blocked. Allow it in the browser site settings and try again.';
    if (n === 'NotFoundError' || n === 'OverconstrainedError') return 'No camera was found on this device.';
    if (n === 'NotReadableError') return 'The camera is in use by another app.';
    return `The camera could not start${err && err.message ? ` (${err.message})` : ''}.`;
  }
  async function startWebcam() {
    camError = '';
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      camError = 'This browser cannot open a camera from this page. The sample scene stays on.';
      camNotify(); return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stopWebcam();
      const v = document.createElement('video');
      v.muted = true; v.playsInline = true; v.srcObject = stream;
      camStream = stream; camVideo = v;
      try { await v.play(); } catch (e) { /* autoplay may need a gesture; the click counts as one */ }
    } catch (err) {
      camError = camMessage(err);
    }
    camNotify();
  }

  /* ---------- small helpers ---------- */
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const wrap180 = d => ((d + 540) % 360) - 180;
  const rad = d => d * Math.PI / 180;
  const MINUS = '−';
  function hexRgb(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
    const n = m ? parseInt(m[1], 16) : 0xef4444;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const signed = (v, d = 0) => { const s = Math.abs(v).toFixed(d); return (v < 0 && +s !== 0 ? MINUS : '') + s; };
  const fmtEv = ev => (ev > 0 ? '+' : ev < 0 ? MINUS : '') + Math.abs(ev).toFixed(1);
  const fmtFocus = m => m >= 500 ? '∞' : `${+m.toFixed(m < 1 ? 2 : 1)} m`;
  const GRID_LIST = () => PT.grids.list;
  const gridName = id => id === 'none' ? 'None' : ((GRID_LIST().find(g => g.id === id) || {}).name || id);
  const ASPECT_KEYS = ['full', '1:1', '4:5', '3:2', '4:3', '16:9', '9:16', '2.39:1'];
  const aspectName = k => k === 'full' ? 'Full' : k;
  const COLORS = [['#ffffff', 'White'], ['#facc15', 'Yellow'], ['#22d3ee', 'Cyan'], ['#ef4444', 'Red']];

  const TOOL_DEFS = [
    { key: 'level', label: 'Level', hint: 'Horizon line and pitch', tier: 'v1' },
    { key: 'angleLabel', label: 'Camera angle label', hint: 'Eye level, high angle, low angle', tier: 'v2' },
    { key: 'histogram', label: 'Histogram', hint: 'Brightness spread of the scene', tier: 'v1' },
    { key: 'clipping', label: 'Clipping warnings', hint: 'Red blinks for blown highlights, blue for crushed shadows', tier: 'v1' },
    { key: 'peaking', label: 'Focus peaking', hint: 'Outlines the sharpest edges', tier: 'v1' },
    { key: 'zebras', label: 'Zebras', hint: 'Stripes over bright areas', tier: 'v2' },
    { key: 'falseColor', label: 'False colour', hint: 'Maps brightness to a colour key', tier: 'v2' },
    { key: 'waveform', label: 'Waveform', hint: 'Brightness by column', tier: 'v2' },
    { key: 'lensFrame', label: 'Lens frame', hint: 'Shows what your camera and lens would see', tier: 'v2' },
    { key: 'sunAR', label: 'Sun path', hint: 'Today’s sun arc over the live view', tier: 'v2' },
    { key: 'groundGrid', label: '3D ground grid', hint: 'Perspective floor grid for camera height and angle', tier: 'v2' },
    { key: 'steadyShot', label: 'Steady shot', hint: 'Waits until the phone is still before firing', tier: 'v2' }
  ];

  /* Last capture survives leaving and re-entering the screen. */
  let lastThumbURL = null, shotCount = 0;

  /* ======================================================================= */
  function mount(el) {
    const S = () => PT.store.get().viewfinder;
    const SIM = () => PT.store.get().sim;
    const timers = new Set();
    const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); return id; };
    const clearLater = id => { clearTimeout(id); timers.delete(id); };

    /* ----- DOM ----- */
    const srcCanvas = h('canvas', { class: 'vf-source', 'aria-hidden': 'true' });
    const ovCanvas = h('canvas', { class: 'vf-overlay', 'aria-hidden': 'true' });
    const chips = h('div', { class: 'vf-chips', 'aria-live': 'polite' });
    const countdown = h('div', { class: 'vf-countdown', hidden: true, 'aria-hidden': 'true' });
    const flash = h('div', { class: 'vf-flash', 'aria-hidden': 'true' });
    const preview = h('div', { class: 'vf-preview', role: 'img', 'aria-label': 'Camera preview' }, srcCanvas, ovCanvas, chips, countdown, flash);
    const sheetHost = h('div', { class: 'vf-sheet-host' });

    /* tool row */
    const toolBtn = (name, label, onclick) => h('button', {
      type: 'button', class: 'btn btn-ghost btn-sm btn-icon', 'aria-label': label, title: label, 'aria-pressed': 'false', onclick
    }, name);
    const zebraIcon = (() => {
      const s = h('span', { class: 'icon', style: { display: 'inline-flex' } });
      s.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 3 3 8M14 3 3 14M20 4 4 20M21 10 10 21M21 16l-5 5"/></svg>';
      return s;
    })();
    const tb = {
      grid: toolBtn(PT.icon('grid', 18), 'Grid', () => openGridSheet()),
      level: toolBtn(PT.icon('level', 18), 'Level', () => PT.store.set({ viewfinder: { level: !S().level } })),
      histogram: toolBtn(PT.icon('histogram', 18), 'Histogram', () => PT.store.set({ viewfinder: { histogram: !S().histogram } })),
      peaking: toolBtn(PT.icon('focus', 18), 'Focus peaking', () => PT.store.set({ viewfinder: { peaking: !S().peaking } })),
      zebras: toolBtn(zebraIcon, 'Zebras', () => PT.store.set({ viewfinder: { zebras: !S().zebras } }))
    };
    const toolsBtn = h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onclick: () => openToolsSheet() }, PT.icon('settings', 16), 'Tools');
    const toolRow = h('div', { class: 'vf-tools', role: 'toolbar', 'aria-label': 'Viewfinder tools' },
      tb.grid, tb.level, tb.histogram, tb.peaking, tb.zebras, h('span', { class: 'vf-spacer' }), toolsBtn);

    /* HUD */
    const hudCell = (key, label, onclick) => {
      const k = h('span', { class: 'vf-hud-k' }, label), v = h('span', { class: 'vf-hud-v' });
      const cell = h(onclick ? 'button' : 'div', { class: 'vf-hud-cell', type: onclick ? 'button' : null, onclick: onclick || null, 'aria-label': onclick ? `Set ${label}` : null }, k, v);
      return { cell, v };
    };
    const hud = {
      iso: hudCell('iso', 'ISO', () => openValueSheet('iso')),
      shutter: hudCell('shutter', 'Shutter', () => openValueSheet('shutter')),
      ap: hudCell('ap', 'Aperture'),
      lens: hudCell('lens', 'Lens'),
      wb: hudCell('wb', 'WB', () => openValueSheet('wb')),
      ev: hudCell('ev', 'EV', () => openValueSheet('ev')),
      focus: hudCell('focus', 'Focus', () => openValueSheet('focus'))
    };
    const hudRow = h('div', { class: 'vf-hud', role: 'group', 'aria-label': 'Shooting info' }, Object.values(hud).map(x => x.cell));

    /* capture row */
    const thumbBtn = h('button', { type: 'button', class: 'vf-thumb', 'aria-label': 'Last capture', onclick: () => PT.toast(shotCount ? `${shotCount} saved this session` : 'No captures yet') });
    const shutterBtn = h('button', { type: 'button', class: 'vf-shutter', 'aria-label': 'Take photo', onclick: () => shoot() });
    const timerBtn = h('button', { type: 'button', class: 'btn btn-outline btn-sm', 'aria-pressed': 'false', 'aria-label': 'Self-timer', onclick: () => {
      const cur = S().timer || 0;
      PT.store.set({ viewfinder: { timer: cur === 0 ? 2 : cur === 2 ? 10 : 0 } });
    } });
    const captureRow = h('div', { class: 'vf-capture' }, thumbBtn, shutterBtn, h('div', { class: 'vf-timer' }, timerBtn));

    const root = h('div', { class: 'vf-root' }, toolRow, preview, hudRow, captureRow, sheetHost);
    el.append(root);

    const successColor = (getComputedStyle(root).getPropertyValue('--success') || '').trim() || '#22c55e';

    /* ----- orientation (device sensors or simulated) ----- */
    let dev = null, lastMotion = performance.now();
    function onOrient(e) {
      if (e.beta == null || e.gamma == null) return;
      const roll = e.gamma, pitch = e.beta - 90;
      const hd = e.webkitCompassHeading != null ? e.webkitCompassHeading : (e.alpha != null ? (360 - e.alpha) % 360 : null);
      if (!dev) { dev = { roll, pitch, heading: hd }; return; }
      const a = 0.2;
      const moved = Math.abs(roll - dev.roll) + Math.abs(pitch - dev.pitch);
      if (moved > 0.4) lastMotion = performance.now();
      dev.roll += (roll - dev.roll) * a;
      dev.pitch += (pitch - dev.pitch) * a;
      if (hd != null) dev.heading = hd;
    }
    window.addEventListener('deviceorientation', onOrient);
    function orient() {
      const s = SIM();
      if (dev) return { roll: dev.roll, pitch: dev.pitch, heading: dev.heading != null ? dev.heading : s.heading, real: true };
      return { roll: s.roll, pitch: s.pitch, heading: s.heading, real: false };
    }

    /* ----- sizing ----- */
    let pw = 0, ph = 0, dpr = 1;
    const sctx = srcCanvas.getContext('2d');
    const octx = ovCanvas.getContext('2d');
    let srcDirty = true, ovDirty = true, anStale = true, srcKey = '';
    function resize() {
      const r = preview.getBoundingClientRect();
      pw = Math.round(r.width); ph = Math.round(r.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (!pw || !ph) return;
      [srcCanvas, ovCanvas].forEach(c => { c.width = Math.round(pw * dpr); c.height = Math.round(ph * dpr); });
      an.w = 180; an.h = Math.max(8, Math.round(180 * ph / pw));
      [an.cv, an.peak, an.zMask, an.clip, an.fc, an.wf].forEach(c => { c.width = an.w; c.height = an.h; });
      an.wf.height = 64;
      an.zLayer.width = pw; an.zLayer.height = ph;
      srcDirty = ovDirty = anStale = true;
    }

    /* ----- source drawing ----- */
    /* Meter like a real camera: the scene is EV 12 at f/1.7. Auto values are solved so the frame
       exposes at the EV-compensated target; only a fully manual exposure can be off. */
    function meter(ex) {
      const M = PT.math, N2 = 1.7 * 1.7, ev = ex.ev || 0, target = 12 - ev;
      const settingEV = (iso, t) => Math.log2(N2 / t) - Math.log2(iso / 100);
      let iso = ex.iso, t = ex.shutter;
      if (ex.isoAuto && ex.shutterAuto) {
        iso = 100;
        t = M.nearest(M.SHUTTERS, clamp(N2 / Math.pow(2, target), 1 / 8000, 30));
        if (settingEV(iso, t) < target - 0.5) iso = 50;
      } else if (ex.isoAuto) {
        iso = M.nearest(M.ISOS, clamp(100 * Math.pow(2, Math.log2(N2 / t) - target), 50, 25600));
      } else if (ex.shutterAuto) {
        t = M.nearest(M.SHUTTERS, clamp(N2 / Math.pow(2, target + Math.log2(iso / 100)), 1 / 8000, 30));
      }
      const manual = !ex.isoAuto && !ex.shutterAuto;
      const off = 12 - settingEV(iso, t) + (manual ? ev : 0);
      return { iso, shutter: t, off };
    }
    function exposureBrightness(ex) {
      return clamp(Math.pow(2, meter(ex).off), 0.05, 8);
    }
    const liveVideo = () => (camVideo && camStream && camVideo.readyState >= 2 && camVideo.videoWidth) ? camVideo : null;

    function drawSource() {
      const ex = S().exposure, W = srcCanvas.width, H = srcCanvas.height;
      if (!W || !H) return;
      sctx.setTransform(1, 0, 0, 1, 0, 0);
      sctx.globalCompositeOperation = 'source-over';
      sctx.filter = 'none';
      sctx.clearRect(0, 0, W, H);
      const blur = ex.focusAuto ? 0 : clamp(Math.abs(1 / Math.max(ex.focusM, 0.05) - 1 / 8) * 6, 0, 6) * dpr;
      sctx.filter = `blur(${blur.toFixed(2)}px) brightness(${exposureBrightness(ex).toFixed(3)})`;
      const vid = liveVideo();
      if (vid) {
        const vw = vid.videoWidth, vh = vid.videoHeight, s = Math.max(W / vw, H / vh);
        const dw = vw * s, dh = vh * s;
        sctx.drawImage(vid, (W - dw) / 2, (H - dh) / 2, dw, dh);
      } else {
        sctx.drawImage(PT.scene.get(W, H), 0, 0);
      }
      sctx.filter = 'none';
      if (!ex.wbAuto) {
        const k = ex.wbK, t = k < 5500 ? (k - 5500) / 3500 : (k - 5500) / 4500;   // -1 cool .. +1 warm
        if (Math.abs(t) > 0.01) {
          sctx.globalCompositeOperation = 'soft-light';
          sctx.globalAlpha = clamp(Math.abs(t), 0, 1) * 0.7;
          sctx.fillStyle = t > 0 ? 'rgb(255,150,50)' : 'rgb(50,130,255)';
          sctx.fillRect(0, 0, W, H);
        }
        if (ex.tint) {
          sctx.globalCompositeOperation = 'soft-light';
          sctx.globalAlpha = Math.abs(ex.tint) / 50 * 0.35;
          sctx.fillStyle = ex.tint > 0 ? 'rgb(255,40,200)' : 'rgb(40,220,80)';
          sctx.fillRect(0, 0, W, H);
        }
        sctx.globalAlpha = 1; sctx.globalCompositeOperation = 'source-over';
      }
    }

    /* ----- analysis (downsampled) ----- */
    const mk = () => document.createElement('canvas');
    const an = { w: 180, h: 240, cv: mk(), peak: mk(), zMask: mk(), clip: mk(), fc: mk(), wf: mk(), zLayer: mk(), hist: new Uint32Array(64), stripe: null };
    an.ctx = an.cv.getContext('2d', { willReadFrequently: true });
    an.stripe = (() => {
      const c = mk(); c.width = 8; c.height = 8;
      const g = c.getContext('2d'); g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 2.4;
      [[-2, 10, 10, -2], [-2, 2, 2, -2], [6, 10, 10, 6]].forEach(([a, b, c2, d]) => { g.beginPath(); g.moveTo(a, b); g.lineTo(c2, d); g.stroke(); });
      return c;
    })();
    const analysisOn = () => { const v = S(); return v.histogram || v.clipping || v.peaking || v.zebras || v.falseColor || v.waveform; };
    const FC = [[3, [124, 58, 237]], [10, [37, 99, 235]], [20, [13, 148, 136]], [40, null], [48, [22, 163, 74]], [52, null], [58, [244, 114, 182]], [90, null], [97, [250, 204, 21]], [101, [239, 68, 68]]];
    function falseColour(pct, l) {
      for (let i = 0; i < FC.length; i++) if (pct < FC[i][0]) return FC[i][1] || [l * 0.8, l * 0.8, l * 0.8];
      return [239, 68, 68];
    }

    function runAnalysis() {
      const v = S(), aw = an.w, ah = an.h;
      if (!pw || !ph || !srcCanvas.width) return;
      an.ctx.drawImage(srcCanvas, 0, 0, aw, ah);
      const px = an.ctx.getImageData(0, 0, aw, ah).data;
      const n = aw * ah, L = new Float32Array(n);
      an.hist.fill(0);
      for (let i = 0, p = 0; i < n; i++, p += 4) {
        const l = 0.299 * px[p] + 0.587 * px[p + 1] + 0.114 * px[p + 2];
        L[i] = l; an.hist[Math.min(63, l >> 2)]++;
      }
      if (v.peaking) {
        const [r, g, b] = hexRgb(v.peakingColor), thr = { low: 360, med: 240, high: 140 }[v.peakingSens || 'med'] || 140;
        const img = new ImageData(aw, ah), d = img.data;
        for (let y = 1; y < ah - 1; y++) for (let x = 1; x < aw - 1; x++) {
          const i = y * aw + x;
          const gx = -L[i - aw - 1] - 2 * L[i - 1] - L[i + aw - 1] + L[i - aw + 1] + 2 * L[i + 1] + L[i + aw + 1];
          const gy = -L[i - aw - 1] - 2 * L[i - aw] - L[i - aw + 1] + L[i + aw - 1] + 2 * L[i + aw] + L[i + aw + 1];
          if (Math.abs(gx) + Math.abs(gy) > thr) { const q = i * 4; d[q] = r; d[q + 1] = g; d[q + 2] = b; d[q + 3] = 235; }
        }
        an.peak.getContext('2d').putImageData(img, 0, 0);
      }
      if (v.zebras) {
        const lvl = (v.zebraLevel || 95) / 100 * 255, img = new ImageData(aw, ah), d = img.data;
        for (let i = 0; i < n; i++) if (L[i] >= lvl) d[i * 4 + 3] = 255;
        an.zMask.getContext('2d').putImageData(img, 0, 0);
        const z = an.zLayer.getContext('2d');
        z.clearRect(0, 0, pw, ph);
        z.globalCompositeOperation = 'source-over';
        z.imageSmoothingEnabled = false;
        z.drawImage(an.zMask, 0, 0, pw, ph);
        z.globalCompositeOperation = 'source-in';
        z.fillStyle = z.createPattern(an.stripe, 'repeat');
        z.fillRect(0, 0, pw, ph);
        z.globalCompositeOperation = 'source-over';
      }
      if (v.clipping) {
        const img = new ImageData(aw, ah), d = img.data;
        for (let i = 0; i < n; i++) {
          const q = i * 4;
          if (L[i] > 250) { d[q] = 239; d[q + 1] = 68; d[q + 2] = 68; d[q + 3] = 210; }
          else if (L[i] < 5) { d[q] = 59; d[q + 1] = 130; d[q + 2] = 246; d[q + 3] = 210; }
        }
        an.clip.getContext('2d').putImageData(img, 0, 0);
      }
      if (v.falseColor) {
        const img = new ImageData(aw, ah), d = img.data;
        for (let i = 0; i < n; i++) {
          const c = falseColour(L[i] / 255 * 100, L[i]), q = i * 4;
          d[q] = c[0]; d[q + 1] = c[1]; d[q + 2] = c[2]; d[q + 3] = 255;
        }
        an.fc.getContext('2d').putImageData(img, 0, 0);
      }
      if (v.waveform) {
        const rows = 64, acc = new Uint16Array(aw * rows);
        for (let y = 0; y < ah; y++) for (let x = 0; x < aw; x++) {
          const row = rows - 1 - Math.min(rows - 1, Math.floor(L[y * aw + x] / 256 * rows));
          acc[row * aw + x]++;
        }
        const img = new ImageData(aw, rows), d = img.data;
        for (let i = 0; i < acc.length; i++) if (acc[i]) { const q = i * 4; d[q] = 134; d[q + 1] = 239; d[q + 2] = 172; d[q + 3] = Math.min(255, 60 + acc[i] * 40); }
        an.wf.getContext('2d').putImageData(img, 0, 0);
      }
    }

    /* ----- overlay drawing ----- */
    let blinkOn = true, lastBlink = 0, sunPathCache = null;

    function pill(ctx, x, y, w, hh, fill) {
      ctx.fillStyle = fill; ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, w, hh, 6); else ctx.rect(x, y, w, hh);
      ctx.fill();
    }
    const FONT = '500 11px Geist, ui-sans-serif, system-ui, sans-serif';

    function drawHistogram(ctx) {
      const x = 8, y = 8, w = 96, hh = 48;
      pill(ctx, x, y, w, hh, 'rgba(9,9,11,0.55)');
      let max = 0; for (let i = 0; i < 64; i++) max = Math.max(max, an.hist[i]);
      if (!max) return;
      const bw = (w - 8) / 64;
      ctx.fillStyle = 'rgba(250,250,250,0.85)';
      for (let i = 0; i < 64; i++) {
        const bh = Math.sqrt(an.hist[i] / max) * (hh - 8);
        ctx.fillRect(x + 4 + i * bw, y + hh - 4 - bh, Math.max(1, bw - 0.4), bh);
      }
    }
    function drawWaveform(ctx) {
      const w = 120, hh = 64, x = 8, y = ph - hh - 8;
      pill(ctx, x, y, w, hh, 'rgba(9,9,11,0.6)');
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(an.wf, x, y, w, hh);
      ctx.imageSmoothingEnabled = true;
    }
    function drawLegend(ctx) {
      const items = [['>97%', [239, 68, 68]], ['90–97%', [250, 204, 21]], ['Skin 52–58%', [244, 114, 182]], ['Mid 40–48%', [22, 163, 74]], ['10–20%', [13, 148, 136]], ['3–10%', [37, 99, 235]], ['<3%', [124, 58, 237]]];
      const w = 84, rowH = 14, hh = items.length * rowH + 8, x = pw - w - 8, y = ph - hh - 8;
      pill(ctx, x, y, w, hh, 'rgba(9,9,11,0.7)');
      ctx.font = '500 10px Geist, ui-sans-serif, system-ui, sans-serif'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
      items.forEach(([t, c], i) => {
        const yy = y + 4 + i * rowH + rowH / 2;
        ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`; ctx.fillRect(x + 6, yy - 4, 8, 8);
        ctx.fillStyle = '#fafafa'; ctx.fillText(t, x + 19, yy);
      });
    }

    function drawLevel(ctx, frame, o) {
      const cx = frame.x + frame.w / 2, cy = frame.y + frame.h / 2;
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 3;
      ctx.lineCap = 'round';
      if (Math.abs(o.pitch) > 70) {
        const R = Math.min(frame.w, frame.h) * 0.2, r = R * 0.45, k = R / 20;
        const offP = o.pitch < 0 ? o.pitch + 90 : o.pitch - 90;
        const bx = clamp(o.roll * k, -R * 1.2, R * 1.2), by = clamp(-offP * k, -R * 1.2, R * 1.2);
        const ok = Math.hypot(o.roll, offP) < 1;
        ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx - r - 8, cy); ctx.lineTo(cx + r + 8, cy); ctx.moveTo(cx, cy - r - 8); ctx.lineTo(cx, cy + r + 8); ctx.stroke();
        ctx.setLineDash([3, 4]); ctx.globalAlpha = 0.4;
        ctx.beginPath(); ctx.arc(cx, cy, R * 1.2, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]); ctx.globalAlpha = 1;
        ctx.strokeStyle = ok ? successColor : '#fff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(cx + bx, cy + by, r, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + bx - r - 8, cy + by); ctx.lineTo(cx + bx + r + 8, cy + by); ctx.moveTo(cx + bx, cy + by - r - 8); ctx.lineTo(cx + bx, cy + by + r + 8); ctx.stroke();
        ctx.restore();
        return;
      }
      const L = Math.min(frame.w * 0.3, 110), ok = Math.abs(o.roll) < 0.5, col = ok ? successColor : '#fff';
      // fixed reference ticks
      ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx - L - 26, cy); ctx.lineTo(cx - L - 10, cy); ctx.moveTo(cx + L + 10, cy); ctx.lineTo(cx + L + 26, cy);
      ctx.stroke();
      // horizon
      ctx.translate(cx, cy); ctx.rotate(-rad(o.roll));
      ctx.strokeStyle = col; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-L, 0); ctx.lineTo(-12, 0); ctx.moveTo(12, 0); ctx.lineTo(L, 0); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 2, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill();
      ctx.restore();
      // pitch indicator on the right
      ctx.save();
      const px = frame.x + frame.w - 16, span = 48;
      ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 3;
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(px, cy - span); ctx.lineTo(px, cy + span); ctx.moveTo(px - 6, cy); ctx.lineTo(px + 6, cy); ctx.stroke();
      const my = cy - clamp(o.pitch, -30, 30) / 30 * span;
      ctx.fillStyle = Math.abs(o.pitch) < 1 ? successColor : '#fff';
      ctx.beginPath(); ctx.arc(px, my, 4, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    function drawLensFrame(ctx, frame) {
      const g = PT.math.activeGear(), eq = g.f * PT.math.cropFactor(g.body);
      if (eq < 24) return null;
      const fw = frame.w * 24 / eq, fh = fw * 1.5;
      const cx = frame.x + frame.w / 2, cy = frame.y + frame.h / 2;
      const r = { x: cx - fw / 2, y: cy - fh / 2, w: fw, h: fh };
      const inner = { x: Math.max(r.x, frame.x), y: Math.max(r.y, frame.y), w: 0, h: 0 };
      inner.w = Math.min(r.x + r.w, frame.x + frame.w) - inner.x;
      inner.h = Math.min(r.y + r.h, frame.y + frame.h) - inner.y;
      PT.grids.drawMask(ctx, frame, inner, 0.4);
      ctx.save();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.setLineDash([6, 4]);
      ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 2;
      ctx.strokeRect(r.x, r.y, r.w, r.h);
      ctx.setLineDash([]);
      const label = `${g.body.name} · ${+g.f.toFixed(0)} mm (${Math.round(eq)} mm eq)`;
      ctx.font = FONT; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
      const tw = ctx.measureText(label).width + 12, lx = clamp(cx - tw / 2, frame.x + 4, frame.x + frame.w - tw - 4);
      const ly = Math.max(r.y + 6, frame.y + 6);
      pill(ctx, lx, ly, tw, 20, 'rgba(9,9,11,0.7)');
      ctx.shadowBlur = 0; ctx.fillStyle = '#fafafa'; ctx.fillText(label, lx + 6, ly + 10);
      ctx.restore();
      return r;
    }

    function drawGroundGrid(ctx, frame, o) {
      const Wf = frame.w, f = Wf / (2 * Math.tan(rad(25)));
      const cx = frame.x + frame.w / 2, cy = frame.y + frame.h / 2;
      const sp = Math.sin(rad(o.pitch)), cp = Math.cos(rad(o.pitch)), th = -rad(o.roll), cr = Math.cos(th), sr = Math.sin(th);
      const camY = -1.5;
      const proj = (x, z) => {
        const y2 = camY * cp - z * sp, z2 = z * cp + camY * sp;
        if (z2 < 0.1) return null;
        const dx = f * x / z2, dy = -f * y2 / z2;
        return [cx + dx * cr - dy * sr, cy + dx * sr + dy * cr];
      };
      ctx.save();
      ctx.beginPath(); ctx.rect(frame.x, frame.y, frame.w, frame.h); ctx.clip();
      ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      const seg = (pts) => {
        ctx.beginPath(); let pen = false;
        pts.forEach(p => { if (!p) { pen = false; return; } if (pen) ctx.lineTo(p[0], p[1]); else { ctx.moveTo(p[0], p[1]); pen = true; } });
        ctx.stroke();
      };
      for (let x = -10; x <= 10; x += 2) {
        const pts = []; for (let z = 1; z <= 40; z += 1) pts.push(proj(x, z));
        ctx.strokeStyle = x === 0 ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.4)'; seg(pts);
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      for (let z = 1; z <= 39; z += 2) {
        const pts = []; for (let x = -10; x <= 10; x += 2) pts.push(proj(x, z));
        seg(pts);
      }
      ctx.restore();
    }

    function sunPath(lat, lon) {
      const key = `${new Date().toDateString()}|${lat}|${lon}`;
      if (!sunPathCache || sunPathCache.key !== key) {
        let pts = [];
        try { pts = PT.sun.path(new Date(), lat, lon, 30) || []; } catch (e) { pts = []; }
        sunPathCache = { key, pts };
      }
      return sunPathCache.pts;
    }
    function drawSun(ctx, o) {
      const loc = PT.store.get().location;
      let pos;
      try { pos = PT.sun.position(new Date(), loc.lat, loc.lon); } catch (e) { return; }
      if (!pos) return;
      const W = pw, H = ph, cx = W / 2, cy = H / 2, th = -rad(o.roll), cr = Math.cos(th), sr = Math.sin(th);
      const proj = (az, alt) => {
        const dx = wrap180(az - o.heading) / 50 * W, dy = -(alt - o.pitch) / 66 * H;
        return [cx + dx * cr - dy * sr, cy + dx * sr + dy * cr, dx];
      };
      ctx.save();
      ctx.strokeStyle = 'rgba(250,204,21,0.9)'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 5]);
      ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 2;
      const pts = sunPath(loc.lat, loc.lon).filter(p => p.altitude >= 0).map(p => ({ p, q: proj(p.azimuth, p.altitude) }));
      ctx.beginPath(); let pen = false, prevDx = 0;
      pts.forEach(({ q }) => {
        if (pen && Math.abs(q[2] - prevDx) > W * 2) pen = false;
        if (pen) ctx.lineTo(q[0], q[1]); else { ctx.moveTo(q[0], q[1]); pen = true; }
        prevDx = q[2];
      });
      ctx.stroke(); ctx.setLineDash([]);
      ctx.font = '500 10px Geist, ui-sans-serif, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      const hm = new Intl.DateTimeFormat('en-GB', { timeZone: loc.tz || undefined, hour: 'numeric', minute: '2-digit', hourCycle: 'h23' });
      pts.forEach(({ p, q }) => {
        const d = new Date(p.time);
        if (isNaN(d)) return;
        const [hr, mn] = hm.format(d).split(':').map(Number);
        if (mn !== 0) return;
        if (q[0] < 6 || q[0] > W - 6 || q[1] < 6 || q[1] > H - 6) return;
        ctx.fillStyle = 'rgba(250,204,21,0.95)';
        ctx.beginPath(); ctx.arc(q[0], q[1], 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 3; ctx.fillStyle = '#fff'; ctx.fillText(String(hr), q[0], q[1] - 5); ctx.shadowBlur = 2;
      });
      const s = proj(pos.azimuth, pos.altitude), dim = pos.altitude < 0;
      ctx.globalAlpha = dim ? 0.55 : 1;
      if (s[0] < 12 || s[0] > W - 12 || s[1] < 12 || s[1] > H - 12) {
        const ang = Math.atan2(s[1] - cy, s[0] - cx);
        const dxn = Math.cos(ang), dyn = Math.sin(ang);
        const t = Math.min(Math.abs(dxn) > 1e-6 ? (W / 2 - 14) / Math.abs(dxn) : Infinity, Math.abs(dyn) > 1e-6 ? (H / 2 - 14) / Math.abs(dyn) : Infinity);
        const px = cx + dxn * t, py = cy + dyn * t;
        ctx.translate(px, py); ctx.rotate(ang);
        ctx.fillStyle = '#facc15'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-6, -7); ctx.lineTo(-6, 7); ctx.closePath(); ctx.fill(); ctx.stroke();
      } else {
        ctx.fillStyle = '#facc15'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(s[0], s[1], 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
      ctx.restore();
    }

    function angleName(p) {
      if (p < -70) return 'Overhead';
      if (p < -10) return 'High angle';
      if (p > 60) return 'Worm’s-eye';
      if (p > 10) return 'Low angle';
      return 'Eye level';
    }

    let chipKey = '';
    function setChips(list) {
      const key = list.map(c => c.text + '|' + (c.cls || '')).join('\n');
      if (key === chipKey) return;
      chipKey = key;
      chips.replaceChildren(...list.map(c => h('span', { class: 'vf-chip ' + (c.cls || '') }, c.text)));
    }

    let holding = false, countNum = 0;

    function drawOverlay() {
      const v = S(), o = orient();
      octx.setTransform(dpr, 0, 0, dpr, 0, 0);
      octx.clearRect(0, 0, pw, ph);
      octx.imageSmoothingEnabled = true;
      const full = { x: 0, y: 0, w: pw, h: ph };
      const frame = PT.grids.fitAspect(full, PT.grids.portraitRatio(v.aspect));
      const list = [];

      if (v.falseColor) octx.drawImage(an.fc, 0, 0, pw, ph);
      if (v.peaking) { octx.imageSmoothingEnabled = false; octx.drawImage(an.peak, 0, 0, pw, ph); octx.imageSmoothingEnabled = true; }
      if (v.zebras) octx.drawImage(an.zLayer, 0, 0, pw, ph);
      if (v.clipping && blinkOn) { octx.imageSmoothingEnabled = false; octx.drawImage(an.clip, 0, 0, pw, ph); octx.imageSmoothingEnabled = true; }

      if (v.aspect && v.aspect !== 'full') PT.grids.drawMask(octx, full, frame);

      const gopts = { color: v.gridColor, opacity: v.gridOpacity, lineWidth: 1, orient: v.gridOrient || 0 };
      if (v.grid && v.grid !== 'none') PT.grids.draw(octx, frame, v.grid, gopts);
      if (v.grid2 && v.grid2 !== 'none') PT.grids.draw(octx, frame, v.grid2, { ...gopts, opacity: gopts.opacity * 0.8 });

      if (v.groundGrid) drawGroundGrid(octx, frame, o);
      if (v.lensFrame) {
        if (!drawLensFrame(octx, frame)) list.push({ text: 'Wider than this camera. Switch to the 0.5× lens.', cls: 'is-warn' });
      }
      if (v.sunAR) {
        if (PT.sun && PT.sun.position && PT.sun.path) drawSun(octx, o);
        else list.push({ text: 'Sun data unavailable', cls: 'is-warn' });
      }
      if (v.level) {
        drawLevel(octx, frame, o);
        list.push({ text: `Roll ${signed(o.roll, 1)}° · Pitch ${signed(o.pitch, 0)}°`, cls: Math.abs(o.roll) < 0.5 ? 'is-ok' : '' });
      }
      if (v.angleLabel) {
        list.push({ text: angleName(o.pitch) });
        if (Math.abs(o.roll) > 8) list.push({ text: 'Dutch tilt' });
      }
      if (holding) list.push({ text: 'Hold steady…' });
      const ex = S().exposure;
      if (ex.isoAuto || ex.shutterAuto) {
        /* Auto ran out of range: the fixed f/1.7 can't absorb it, like a real camera blinking its readout. */
        const miss = meter(ex).off;
        if (miss > 0.7) list.push({ text: `Over by ${miss.toFixed(1)} stops. Use a faster shutter or an ND filter.`, cls: 'is-warn' });
        else if (miss < -0.7) list.push({ text: `Under by ${(-miss).toFixed(1)} stops. Use a slower shutter or a tripod.`, cls: 'is-warn' });
      }

      if (v.histogram) drawHistogram(octx);
      if (v.waveform) drawWaveform(octx);
      if (v.falseColor) drawLegend(octx);
      setChips(list);
    }

    /* ----- UI sync ----- */
    function syncTools() {
      const v = S();
      tb.grid.setAttribute('aria-pressed', String(v.grid !== 'none' || v.grid2 !== 'none'));
      tb.level.setAttribute('aria-pressed', String(!!v.level));
      tb.histogram.setAttribute('aria-pressed', String(!!v.histogram));
      tb.peaking.setAttribute('aria-pressed', String(!!v.peaking));
      tb.zebras.setAttribute('aria-pressed', String(!!v.zebras));
      const t = v.timer || 0;
      timerBtn.setAttribute('aria-pressed', String(t > 0));
      timerBtn.replaceChildren(PT.icon('timer', 16), t ? `${t} s` : 'Off');
    }
    function syncHud() {
      const ex = S().exposure, g = PT.math.activeGear(), setV = (c, text, auto) => {
        c.v.textContent = text; c.cell.classList.toggle('is-auto', !!auto);
      };
      const m = meter(ex);
      setV(hud.iso, `${m.iso}${ex.isoAuto ? 'A' : ''}`, ex.isoAuto);
      setV(hud.shutter, `${PT.math.formatShutter(m.shutter)}${ex.shutterAuto ? 'A' : ''}`, ex.shutterAuto);
      setV(hud.ap, 'f/1.7');
      setV(hud.lens, '24 mm');
      setV(hud.wb, ex.wbAuto ? 'AWB' : `${ex.wbK}K`, ex.wbAuto);
      setV(hud.ev, fmtEv(ex.ev || 0));
      setV(hud.focus, ex.focusAuto ? 'AF' : fmtFocus(ex.focusM), ex.focusAuto);
      void g;
    }
    function syncThumb() {
      thumbBtn.replaceChildren(lastThumbURL ? h('img', { src: lastThumbURL, alt: '' }) : PT.icon('image', 20));
    }

    function exposureKey() {
      const ex = S().exposure;
      return [ex.iso, ex.isoAuto, ex.shutter, ex.shutterAuto, ex.ev, ex.wbK, ex.wbAuto, ex.tint, ex.focusM, ex.focusAuto, camActive()].join('|');
    }
    const unsub = PT.store.subscribe(() => {
      const k = exposureKey();
      if (k !== srcKey) { srcKey = k; srcDirty = true; }
      ovDirty = anStale = true;
      syncTools(); syncHud();
    });
    const onCam = () => { srcDirty = true; };
    camListeners.add(onCam);

    /* ----- main loop (<= 30 fps) ----- */
    let raf = 0, lastFrame = 0, lastAn = 0, lastKey = '';
    function loop(ts) {
      raf = requestAnimationFrame(loop);
      if (ts - lastFrame < 33 || !pw || !ph) return;
      lastFrame = ts;
      const vid = !!liveVideo();
      let redraw = ovDirty;
      if (srcDirty || vid) { drawSource(); srcDirty = false; anStale = true; redraw = true; }
      const v = S();
      if (analysisOn() && anStale && ts - lastAn >= 125) { runAnalysis(); lastAn = ts; anStale = false; redraw = true; }
      if (v.clipping && ts - lastBlink >= 500) { blinkOn = !blinkOn; lastBlink = ts; redraw = true; }
      if (v.level || v.angleLabel || v.sunAR || v.groundGrid) {
        const o = orient(), k = `${o.roll.toFixed(1)}|${o.pitch.toFixed(1)}|${Math.round(o.heading)}`;
        if (k !== lastKey) { lastKey = k; redraw = true; }
      }
      if (redraw) { ovDirty = false; drawOverlay(); }
    }

    /* ----- capture ----- */
    let pendingCapture = false;
    function setBusy(b) { pendingCapture = b; shutterBtn.dataset.busy = String(b); shutterBtn.setAttribute('aria-label', b ? 'Cancel' : 'Take photo'); }
    function fire() {
      holding = false; ovDirty = true;
      flash.classList.add('is-on');
      later(() => flash.classList.remove('is-on'), 100);
      try {
        const t = document.createElement('canvas'); t.width = t.height = 96;
        const W = srcCanvas.width, H = srcCanvas.height, s = Math.min(W, H);
        t.getContext('2d').drawImage(srcCanvas, (W - s) / 2, (H - s) / 2, s, s, 0, 0, 96, 96);
        lastThumbURL = t.toDataURL('image/jpeg', 0.7);
      } catch (e) { /* canvas read blocked */ }
      shotCount++;
      syncThumb();
      setBusy(false);
      PT.toast('Saved to this session');
    }
    function afterTimer() {
      if (!S().steadyShot) { fire(); return; }
      holding = true; ovDirty = true;
      if (!orient().real) { later(() => { if (pendingCapture) fire(); }, 600); return; }
      lastMotion = performance.now();
      const poll = () => {
        if (!pendingCapture) return;
        if (performance.now() - lastMotion >= 300) fire(); else later(poll, 60);
      };
      later(poll, 60);
    }
    function shoot() {
      if (pendingCapture) {   // tap again to cancel
        timers.forEach(clearTimeout); timers.clear();
        holding = false; countdown.hidden = true; setBusy(false); ovDirty = true; flash.classList.remove('is-on');
        return;
      }
      setBusy(true);
      const t = S().timer || 0;
      if (!t) { afterTimer(); return; }
      countNum = t;
      const tick = () => {
        if (countNum <= 0) { countdown.hidden = true; afterTimer(); return; }
        countdown.hidden = false; countdown.textContent = String(countNum);
        countNum--; later(tick, 1000);
      };
      tick();
    }

    /* ----- sheets ----- */
    let sheet = null;
    function openSheet(title, content) {
      closeSheet(true);
      const backdrop = h('div', { class: 'vf-backdrop', onclick: () => closeSheet() });
      const closeBtn = h('button', { type: 'button', class: 'btn btn-ghost btn-sm btn-icon', 'aria-label': 'Close', onclick: () => closeSheet() }, PT.icon('x', 16));
      const panel = h('div', { class: 'vf-sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
        h('div', { class: 'vf-sheet-handle' }),
        h('div', { class: 'vf-sheet-head' }, h('span', { class: 'vf-sheet-title' }, title), closeBtn),
        h('div', { class: 'vf-sheet-body' }, content));
      sheetHost.append(backdrop, panel);
      sheetHost.style.pointerEvents = 'auto';
      void panel.offsetWidth;
      backdrop.classList.add('is-open'); panel.classList.add('is-open');
      sheet = { backdrop, panel };
      closeBtn.focus({ preventScroll: true });
    }
    function closeSheet(instant) {
      if (!sheet) return;
      const s = sheet; sheet = null;
      s.backdrop.classList.remove('is-open'); s.panel.classList.remove('is-open');
      const done = () => { s.backdrop.remove(); s.panel.remove(); if (!sheet) sheetHost.style.pointerEvents = ''; };
      if (instant) done(); else later(done, 170);
    }
    function onKey(e) { if (e.key === 'Escape' && sheet) closeSheet(); }
    window.addEventListener('keydown', onKey);

    const set = patch => PT.store.set({ viewfinder: patch });

    function swatches(colors, current, onPick, label) {
      const wrap = h('div', { class: 'vf-swatches', role: 'group', 'aria-label': label });
      colors.forEach(([hex, name]) => {
        const b = h('button', { type: 'button', class: 'vf-swatch', style: { background: hex }, 'aria-label': name, 'aria-pressed': String(hex === current) });
        b.addEventListener('click', () => {
          wrap.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', 'false'));
          b.setAttribute('aria-pressed', 'true'); onPick(hex);
        });
        wrap.append(b);
      });
      return wrap;
    }

    function openGridSheet() {
      const v = S(), items = [{ id: 'none', name: 'None' }, ...GRID_LIST()];
      const asym = id => { const g = GRID_LIST().find(x => x.id === id); return !!(g && g.asymmetric); };
      const flipWrap = h('div', { class: 'vf-sheet-section' },
        h('span', { class: 'vf-sheet-label' }, 'Flip'),
        PT.ui.segmented([{ value: 0, label: 'Normal' }, { value: 1, label: 'Flip H' }, { value: 2, label: 'Flip V' }, { value: 3, label: 'Both' }], v.gridOrient || 0, val => set({ gridOrient: val }), 'Grid flip'));
      const syncFlip = () => { const s = S(); flipWrap.hidden = !(asym(s.grid) || asym(s.grid2)); };

      /* Tiles are filtered by grid family; the current grid's family opens first. */
      let groupF = (GRID_LIST().find(g => g.id === v.grid) || {}).group || PT.grids.groups[0].id;
      const fills = [];
      const tileRow = (key, label) => {
        const row = h('div', { class: 'vf-tiles', role: 'group', 'aria-label': label });
        const fill = () => {
          row.replaceChildren();
          items.filter(it => it.id === 'none' || it.group === groupF).forEach(it => {
            const cv = h('canvas', { width: 128, height: 168 });
            const g = cv.getContext('2d');
            g.drawImage(PT.scene.get(128, 168), 0, 0);
            if (it.id === 'none') { g.fillStyle = 'rgba(9,9,11,0.55)'; g.fillRect(0, 0, 128, 168); }
            else PT.grids.draw(g, { x: 0, y: 0, w: 128, h: 168 }, it.id, { color: '#ffffff', opacity: 0.95, lineWidth: 2, orient: 0 });
            const b = h('button', { type: 'button', class: 'vf-tile', 'aria-pressed': String(S()[key] === it.id) }, cv, h('span', null, it.name));
            b.addEventListener('click', () => {
              row.querySelectorAll('.vf-tile').forEach(x => x.setAttribute('aria-pressed', 'false'));
              b.setAttribute('aria-pressed', 'true');
              set({ [key]: it.id }); syncFlip();
            });
            row.append(b);
          });
          row.scrollLeft = 0;
        };
        fills.push(fill);
        fill();
        return row;
      };
      const groupSeg = PT.ui.segmented(PT.grids.groups.map(g => ({ value: g.id, label: g.name })), groupF,
        val => { groupF = val; fills.forEach(f => f()); }, 'Grid family');

      const content = [
        h('div', { class: 'vf-sheet-section' }, h('span', { class: 'vf-sheet-label' }, 'Family'), groupSeg),
        h('div', { class: 'vf-sheet-section' }, h('span', { class: 'vf-sheet-label' }, 'Grid'), tileRow('grid', 'Grid')),
        h('div', { class: 'vf-sheet-section' }, h('span', { class: 'vf-sheet-label' }, 'Second overlay'), tileRow('grid2', 'Second overlay')),
        flipWrap,
        PT.ui.slider({ label: 'Opacity', min: 0.1, max: 1, step: 0.05, value: v.gridOpacity, format: x => `${Math.round(x * 100)}%`, onInput: x => set({ gridOpacity: x }) }),
        h('div', { class: 'vf-sheet-section' }, h('span', { class: 'vf-sheet-label' }, 'Colour'), swatches(COLORS, v.gridColor, hex => set({ gridColor: hex }), 'Grid colour')),
        h('div', { class: 'vf-sheet-section' }, h('span', { class: 'vf-sheet-label' }, 'Aspect ratio'),
          (() => {
            const row = h('div', { class: 'vf-chiprow', role: 'group', 'aria-label': 'Aspect ratio' });
            ASPECT_KEYS.forEach(k => {
              const b = h('button', { type: 'button', class: 'btn btn-outline btn-sm', 'aria-pressed': String(v.aspect === k) }, aspectName(k));
              b.addEventListener('click', () => {
                row.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', 'false'));
                b.setAttribute('aria-pressed', 'true'); set({ aspect: k });
              });
              row.append(b);
            });
            return row;
          })())
      ];
      openSheet('Grid and framing', content);
      syncFlip();
    }

    function openToolsSheet() {
      const v = S(), rows = [];
      TOOL_DEFS.forEach(t => {
        const row = PT.ui.switchRow(t.label, !!v[t.key], on => set({ [t.key]: on }), t.hint);
        if (t.tier === 'v2') row.querySelector('.label').append(PT.ui.tierBadge('v2'));
        rows.push(row);
        if (t.key === 'peaking') {
          rows.push(h('div', { class: 'vf-sub' },
            h('div', { class: 'vf-sub-row' }, h('span', { class: 'small' }, 'Colour'), swatches([['#ef4444', 'Red'], ['#facc15', 'Yellow'], ['#22d3ee', 'Cyan'], ['#ffffff', 'White']], v.peakingColor, hex => set({ peakingColor: hex }), 'Peaking colour')),
            h('div', { class: 'vf-sub-row' }, h('span', { class: 'small' }, 'Sensitivity'),
              PT.ui.segmented([{ value: 'low', label: 'Low' }, { value: 'med', label: 'Medium' }, { value: 'high', label: 'High' }], v.peakingSens || 'med', val => set({ peakingSens: val }), 'Peaking sensitivity'))));
        }
        if (t.key === 'zebras') {
          rows.push(h('div', { class: 'vf-sub' },
            h('div', { class: 'vf-sub-row' }, h('span', { class: 'small' }, 'Level'),
              PT.ui.segmented([{ value: 70, label: '70%' }, { value: 95, label: '95%' }, { value: 100, label: '100%' }], v.zebraLevel || 95, val => set({ zebraLevel: val }), 'Zebra level'))));
        }
      });
      openSheet('Tools', rows);
    }

    function openValueSheet(kind) {
      const ex = () => S().exposure, setEx = patch => set({ exposure: patch });
      const M = PT.math;
      const autoRow = (key, label) => PT.ui.switchRow(label || 'Auto', ex()[key], on => { setEx({ [key]: on }); syncDisabled(); }, 'The phone picks the value');
      const sliders = [];
      const syncDisabled = () => sliders.forEach(([input, key]) => { input.disabled = !!ex()[key]; });
      const track = (node, key) => { sliders.push([node.querySelector('input'), key]); return node; };
      let title, content;
      if (kind === 'iso' || kind === 'shutter') {
        const scale = kind === 'iso' ? M.ISOS : M.SHUTTERS, key = kind, autoKey = kind === 'iso' ? 'isoAuto' : 'shutterAuto';
        const fmt = i => kind === 'iso' ? String(scale[i]) : M.formatShutter(scale[i]);
        const idx = scale.indexOf(M.nearest(scale, ex()[key]));
        title = kind === 'iso' ? 'ISO' : 'Shutter speed';
        content = [autoRow(autoKey), track(PT.ui.slider({ label: title, min: 0, max: scale.length - 1, step: 1, value: idx, format: fmt, onInput: i => setEx({ [key]: scale[i] }) }), autoKey)];
      } else if (kind === 'wb') {
        title = 'White balance';
        content = [autoRow('wbAuto'),
          track(PT.ui.slider({ label: 'Temperature', min: 2000, max: 10000, step: 100, value: ex().wbK, format: x => `${x} K`, onInput: x => setEx({ wbK: x }) }), 'wbAuto'),
          track(PT.ui.slider({ label: 'Tint (green to magenta)', min: -50, max: 50, step: 1, value: ex().tint, format: x => (x > 0 ? '+' : x < 0 ? MINUS : '') + Math.abs(x), onInput: x => setEx({ tint: x }) }), 'wbAuto')];
      } else if (kind === 'ev') {
        title = 'Exposure compensation';
        content = [PT.ui.slider({ label: 'EV', min: -9, max: 9, step: 1, value: Math.round((ex().ev || 0) * 3), format: i => fmtEv(i / 3), onInput: i => setEx({ ev: i / 3 }) }),
          h('button', { type: 'button', class: 'btn btn-outline btn-sm', style: { alignSelf: 'flex-start' }, onclick: () => { setEx({ ev: 0 }); openValueSheet('ev'); } }, 'Reset to 0')];
      } else {
        title = 'Focus distance';
        const toPos = m => clamp(Math.round(Math.log10(Math.max(m, 0.1) / 0.1) / 4 * 100), 0, 100);
        const fromPos = p => p >= 100 ? 1000 : +(0.1 * Math.pow(10, p / 100 * 4)).toPrecision(2);
        content = [autoRow('focusAuto', 'Autofocus'),
          track(PT.ui.slider({ label: 'Distance', min: 0, max: 100, step: 1, value: toPos(ex().focusM), format: p => fmtFocus(fromPos(p)), onInput: p => setEx({ focusM: fromPos(p) }), hint: 'The subject in the sample scene is about 8 m away.' }), 'focusAuto')];
      }
      openSheet(title, content);
      syncDisabled();
    }

    /* ----- start ----- */
    const ro = new ResizeObserver(() => resize());
    ro.observe(preview);
    resize();
    srcKey = exposureKey();
    syncTools(); syncHud(); syncThumb();
    raf = requestAnimationFrame(loop);

    return function cleanup() {
      cancelAnimationFrame(raf); raf = 0;
      ro.disconnect();
      unsub();
      camListeners.delete(onCam);
      window.removeEventListener('deviceorientation', onOrient);
      window.removeEventListener('keydown', onKey);
      timers.forEach(clearTimeout); timers.clear();
      stopWebcam();
      sheet = null;
    };
  }

  /* ======================================================================= */
  function panelExtras(el) {
    const st = () => PT.store.get();

    /* 1. Simulated orientation */
    const sim = st().sim;
    const simCard = PT.ui.card({
      title: 'Simulate tilt and heading',
      description: 'Drives the level, angle label, sun path and ground grid when no motion sensor is present.',
      content: h('div', { class: 'stack' },
        PT.ui.slider({ label: 'Roll', min: -45, max: 45, step: 0.5, value: sim.roll, format: v => `${signed(v, 1)}°`, onInput: v => PT.store.set({ sim: { roll: v } }) }),
        PT.ui.slider({ label: 'Pitch', min: -90, max: 90, step: 1, value: sim.pitch, format: v => `${signed(v)}°`, onInput: v => PT.store.set({ sim: { pitch: v } }) }),
        PT.ui.slider({ label: 'Heading', min: 0, max: 359, step: 1, value: sim.heading, format: v => `${v}°`, onInput: v => PT.store.set({ sim: { heading: v } }) }),
        h('p', { class: 'hint' }, 'On a real phone these values come from the accelerometer, gyroscope and compass. Open this page on a phone to try them.'))
    });

    /* 2. Camera feed */
    const status = h('p', { class: 'vf-panel-status', role: 'status' });
    const useCam = h('button', { type: 'button', class: 'btn btn-sm', onclick: () => { status.textContent = 'Asking for camera access…'; status.classList.remove('is-error'); startWebcam(); } }, 'Use webcam');
    const useScene = h('button', { type: 'button', class: 'btn btn-outline btn-sm', onclick: () => { camError = ''; stopWebcam(); } }, 'Use sample scene');
    const syncCam = () => {
      status.classList.toggle('is-error', !!camError);
      status.textContent = camError || (camActive() ? 'The preview is showing your webcam.' : 'The preview is showing the sample scene.');
      useCam.disabled = camActive(); useScene.disabled = !camActive();
    };
    camListeners.add(syncCam);
    const camCard = PT.ui.card({
      title: 'Camera feed',
      description: 'Try the overlays on a live image from this computer.',
      content: h('div', { class: 'stack' }, h('div', { class: 'row wrap' }, useCam, useScene), status)
    });

    /* 3. Current settings */
    const kvHost = h('div');
    const renderKv = () => {
      const v = st().viewfinder, ex = v.exposure;
      const on = TOOL_DEFS.filter(t => v[t.key]).map(t => t.label.toLowerCase());
      const exTxt = [ex.isoAuto ? 'ISO auto' : `ISO ${ex.iso}`, ex.shutterAuto ? 'shutter auto' : `${PT.math.formatShutter(ex.shutter)} s`].join(', ');
      kvHost.replaceChildren(PT.ui.kv([
        ['Grid', gridName(v.grid)],
        ['Second overlay', gridName(v.grid2)],
        ['Aspect', aspectName(v.aspect)],
        ['Exposure', exTxt],
        ['Tools on', on.length ? on.join(', ') : 'None'],
        ['Source', camActive() ? 'Webcam' : 'Sample scene']
      ]));
    };
    camListeners.add(renderKv);
    const unsub = PT.store.subscribe(renderKv);
    const kvCard = PT.ui.card({ title: 'Current settings', description: 'Updates live as you change the phone screen.', content: kvHost });

    el.append(simCard, camCard, kvCard);
    syncCam(); renderKv();
    return function cleanup() { unsub(); camListeners.delete(syncCam); camListeners.delete(renderKv); };
  }

  /* ======================================================================= */
  PT.registerScreen({
    id: 'viewfinder',
    title: 'Viewfinder',
    icon: 'camera',
    mount,
    panelExtras,
    panel: {
      summary: 'Compose and expose on the phone camera, and scout the framing your real camera and lenses would give you. Overlays, a level and live exposure tools sit on the preview.',
      features: [
        { name: 'Composition grids', tier: 'v1', note: `${PT.grids.list.length} overlays in six families: classic (thirds, rabatment), golden ratio (phi, spirals, rectangles), triangles (golden, double, pyramid, triangle grid), diagonals (Westhoff, dynamic symmetry, armature), perspective and 3D (one-, two- and three-point, isometric) and safe areas. Combine two, set colour and opacity, and flip asymmetric grids.` },
        { name: 'Aspect-ratio guides', tier: 'v1', note: 'Frame guides for 1:1, 4:5, 3:2, 4:3, 16:9, 9:16 and 2.39:1 that dim everything outside the crop.' },
        { name: 'Horizon level and pitch', tier: 'v1', note: 'Roll line that turns green when level, a pitch marker, a degree readout and a top-down bubble when you point the phone at the floor.' },
        { name: 'Histogram and clipping warnings', tier: 'v1', note: 'Live luma histogram plus blinking red highlights and blue shadows.' },
        { name: 'Focus peaking', tier: 'v1', note: 'Edge detection drawn in your choice of colour, with three sensitivities.' },
        { name: 'Manual controls', tier: 'v1', note: 'ISO, shutter, white balance with tint, exposure compensation and focus distance, each with an Auto switch.' },
        { name: 'Shooting-info bar', tier: 'v1', note: 'ISO, shutter, aperture, focal length, white balance and EV at a glance. Auto values are dimmed.' },
        { name: 'Self-timer and capture', tier: 'v1', note: 'Off, 2 s and 10 s timers with a last-capture thumbnail.' },
        { name: 'Camera angle label', tier: 'v2', note: 'Names the angle from pitch (eye level, high, low, overhead, worm’s-eye) and flags a Dutch tilt.' },
        { name: 'Virtual lens frame', tier: 'v2', note: 'Shows what your active body and lens would capture inside the phone view.' },
        { name: 'Sun path in AR', tier: 'v2', note: 'Today’s sun arc with hour ticks, and an edge arrow when the sun is out of view.' },
        { name: 'Zebras and false colour', tier: 'v2', note: 'Stripes over bright areas at 70, 95 or 100 percent, and a colour key by brightness.' },
        { name: 'Waveform', tier: 'v2', note: 'Brightness distribution by image column.' },
        { name: '3D ground grid', tier: 'v2', note: 'A perspective floor grid at 1.5 m camera height that follows pitch and roll.' },
        { name: 'Steady shot', tier: 'v2', note: 'Holds the shutter until the phone has been still for 300 ms.' }
      ]
    }
  });
})(window.PT);
