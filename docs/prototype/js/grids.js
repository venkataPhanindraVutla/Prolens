/* Composition overlays. Every grid draws in pixel space inside rect {x, y, w, h}
   so that 45° and 90° lines stay true on any aspect ratio. */
(function (PT) {
  const PHI = (1 + Math.sqrt(5)) / 2;

  function line(ctx, x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
  function dot(ctx, x, y, r = 3) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke(); }
  function poly(ctx, pts) { ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); }

  /* Parallel lines at `deg`, `spacing` apart, one of them through (ox, oy). The caller's clip trims them. */
  function family(ctx, W, H, deg, spacing, ox = W / 2, oy = H / 2) {
    const a = deg * Math.PI / 180, dx = Math.cos(a), dy = Math.sin(a), R = Math.hypot(W, H);
    const n = Math.ceil(R / spacing) + 1;
    for (let k = -n; k <= n; k++) {
      const px = ox - dy * k * spacing, py = oy + dx * k * spacing;
      line(ctx, px - dx * R, py - dy * R, px + dx * R, py + dy * R);
    }
  }
  /* Lines fanning from a vanishing point to evenly spaced targets. */
  function fan(ctx, [vx, vy], targets) { targets.forEach(([x, y]) => line(ctx, vx, vy, x, y)); }
  const range = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => a + (b - a) * i / n);
  function dashed(ctx, fn) { ctx.save(); ctx.setLineDash([5, 4]); ctx.globalAlpha *= 0.7; fn(); ctx.restore(); }

  /* Map golden-spiral unit space (PHI × 1) into the frame. Portrait frames turn the spiral upright. */
  function spiralMap(W, H, fit) {
    const portrait = H > W;
    if (!fit) return portrait ? ([x, y]) => [y * W, x * H / PHI] : ([x, y]) => [x * W / PHI, y * H];
    if (portrait) {
      const gh = Math.min(H, W * PHI), gw = gh / PHI, ox = (W - gw) / 2, oy = (H - gh) / 2;
      return ([x, y]) => [ox + y * gw, oy + x * gh / PHI];
    }
    const gw = Math.min(W, H * PHI), gh = gw / PHI, ox = (W - gw) / 2, oy = (H - gh) / 2;
    return ([x, y]) => [ox + x * gw / PHI, oy + y * gh];
  }
  function drawSpiral(ctx, W, H, { fit = false, arcs = true } = {}) {
    const map = spiralMap(W, H, fit);
    if (fit) { const a = map([0, 0]), b = map([PHI, 1]); ctx.save(); ctx.globalAlpha *= 0.45; ctx.strokeRect(Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])); ctx.restore(); }
    ctx.save();
    if (arcs) ctx.globalAlpha *= 0.45;
    SPIRAL.dividers.forEach(([p, q]) => { const a = map(p), b = map(q); line(ctx, a[0], a[1], b[0], b[1]); });
    ctx.restore();
    if (arcs) SPIRAL.arcs.forEach(arc => poly(ctx, arc.map(map)));
    const [ex, ey] = map(SPIRAL.eye);
    dot(ctx, ex, ey, 4);
  }

  /* Extend a ray from p along d to the edge of the W×H box. */
  function clipRay([px, py], [dx, dy], W, H) {
    let t = Infinity;
    if (dx > 1e-9) t = Math.min(t, (W - px) / dx);
    if (dx < -1e-9) t = Math.min(t, -px / dx);
    if (dy > 1e-9) t = Math.min(t, (H - py) / dy);
    if (dy < -1e-9) t = Math.min(t, -py / dy);
    return [px + dx * t, py + dy * t];
  }
  /* Foot of the perpendicular from p onto the line a→b. */
  function foot([px, py], [ax, ay], [bx, by]) {
    const dx = bx - ax, dy = by - ay;
    const t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy);
    return [ax + dx * t, ay + dy * t];
  }

  /* Golden spiral in unit space (PHI × 1), then stretched to W×H the way Lightroom's crop overlay does. */
  function spiralGeometry(steps = 9) {
    let x = 0, y = 0, w = PHI, h = 1;
    const arcs = [], dividers = [];
    for (let i = 0; i < steps; i++) {
      const dir = i % 4;
      let cx, cy, a0, s;
      if (dir === 0) { s = h; cx = x + s; cy = y + s; a0 = Math.PI; dividers.push([[x + s, y], [x + s, y + h]]); x += s; w -= s; }
      else if (dir === 1) { s = w; cx = x; cy = y + s; a0 = 1.5 * Math.PI; dividers.push([[x, y + s], [x + w, y + s]]); y += s; h -= s; }
      else if (dir === 2) { s = h; cx = x + w - s; cy = y; a0 = 0; dividers.push([[x + w - s, y], [x + w - s, y + h]]); w -= s; }
      else { s = w; cx = x + s; cy = y + h - s; a0 = 0.5 * Math.PI; dividers.push([[x, y + h - s], [x + w, y + h - s]]); h -= s; }
      const pts = [];
      for (let k = 0; k <= 24; k++) { const a = a0 + (k / 24) * Math.PI / 2; pts.push([cx + s * Math.cos(a), cy + s * Math.sin(a)]); }
      arcs.push(pts);
    }
    return { arcs, dividers, eye: [x + w / 2, y + h / 2] };
  }
  const SPIRAL = spiralGeometry();

  const GRIDS = {
    thirds(ctx, W, H) {
      [1 / 3, 2 / 3].forEach(f => { line(ctx, W * f, 0, W * f, H); line(ctx, 0, H * f, W, H * f); });
      [1 / 3, 2 / 3].forEach(fx => [1 / 3, 2 / 3].forEach(fy => dot(ctx, W * fx, H * fy)));
    },
    phi(ctx, W, H) {
      const a = 1 / PHI / PHI, b = 1 / PHI; // 0.382, 0.618
      [a, b].forEach(f => { line(ctx, W * f, 0, W * f, H); line(ctx, 0, H * f, W, H * f); });
      [a, b].forEach(fx => [a, b].forEach(fy => dot(ctx, W * fx, H * fy)));
    },
    spiral(ctx, W, H) { drawSpiral(ctx, W, H); },
    spiralTrue(ctx, W, H) { drawSpiral(ctx, W, H, { fit: true }); },
    goldenRects(ctx, W, H) { drawSpiral(ctx, W, H, { arcs: false }); },
    triangles(ctx, W, H) {
      const a = [0, H], b = [W, 0];
      line(ctx, a[0], a[1], b[0], b[1]);
      const f1 = foot([0, 0], a, b), f2 = foot([W, H], a, b);
      line(ctx, 0, 0, f1[0], f1[1]);
      line(ctx, W, H, f2[0], f2[1]);
    },
    diagonal(ctx, W, H) {
      const m = Math.min(W, H);
      line(ctx, 0, 0, m, m); line(ctx, W, 0, W - m, m);
      line(ctx, 0, H, m, H - m); line(ctx, W, H, W - m, H - m);
    },
    dynamic(ctx, W, H) {
      line(ctx, 0, 0, W, H); line(ctx, 0, H, W, 0);
      const recips = [
        [[W, 0], [-H, W]], [[0, H], [H, -W]],   // perpendicular to the ↘ diagonal
        [[0, 0], [H, W]], [[W, H], [-H, -W]]    // perpendicular to the ↗ diagonal
      ];
      recips.forEach(([p, d]) => { const e = clipRay(p, d, W, H); line(ctx, p[0], p[1], e[0], e[1]); });
    },
    armature(ctx, W, H) {
      line(ctx, 0, 0, W, H); line(ctx, 0, H, W, 0);
      const corners = [[0, 0], [W, 0], [W, H], [0, H]];
      const mids = { top: [W / 2, 0], right: [W, H / 2], bottom: [W / 2, H], left: [0, H / 2] };
      const far = [['right', 'bottom'], ['left', 'bottom'], ['left', 'top'], ['right', 'top']];
      corners.forEach((c, i) => far[i].forEach(side => line(ctx, c[0], c[1], mids[side][0], mids[side][1])));
      poly(ctx, [mids.top, mids.right, mids.bottom, mids.left, mids.top]);
    },
    center(ctx, W, H) {
      ctx.save(); ctx.globalAlpha *= 0.6;
      line(ctx, W / 2, 0, W / 2, H); line(ctx, 0, H / 2, W, H / 2);
      ctx.restore();
      const r = Math.min(W, H) * 0.06;
      ctx.beginPath(); ctx.arc(W / 2, H / 2, r, 0, Math.PI * 2); ctx.stroke();
    },
    fine(ctx, W, H) {
      const cell = Math.min(W, H) / 6;
      for (let x = W / 2 % cell; x < W; x += cell) line(ctx, x, 0, x, H);
      for (let y = H / 2 % cell; y < H; y += cell) line(ctx, 0, y, W, y);
    },
    thirdsDiag(ctx, W, H) {
      GRIDS.thirds(ctx, W, H);
      ctx.save(); ctx.globalAlpha *= 0.7; line(ctx, 0, 0, W, H); line(ctx, 0, H, W, 0); ctx.restore();
    },
    rabatment(ctx, W, H) {
      if (W >= H) {
        line(ctx, H, 0, H, H); line(ctx, W - H, 0, W - H, H);
        dashed(ctx, () => { line(ctx, 0, 0, H, H); line(ctx, 0, H, H, 0); line(ctx, W - H, 0, W, H); line(ctx, W - H, H, W, 0); });
      } else {
        line(ctx, 0, W, W, W); line(ctx, 0, H - W, W, H - W);
        dashed(ctx, () => { line(ctx, 0, 0, W, W); line(ctx, W, 0, 0, W); line(ctx, 0, H - W, W, H); line(ctx, W, H - W, 0, H); });
      }
    },
    trianglesDouble(ctx, W, H) {
      line(ctx, 0, 0, W, H); line(ctx, 0, H, W, 0);
      const d1 = [[0, 0], [W, H]], d2 = [[0, H], [W, 0]];
      [[[0, H], d1], [[W, 0], d1], [[0, 0], d2], [[W, H], d2]].forEach(([p, [a, b]]) => { const f = foot(p, a, b); line(ctx, p[0], p[1], f[0], f[1]); });
    },
    pyramid(ctx, W, H) {
      const apex = [W / 2, 0], l = [0, H], r = [W, H], ml = [W / 4, H / 2], mr = [W * 3 / 4, H / 2], mb = [W / 2, H];
      poly(ctx, [l, apex, r]);
      ctx.save(); ctx.globalAlpha *= 0.6; poly(ctx, [ml, mr, mb, ml]); ctx.restore();
    },
    triGrid(ctx, W, H) {
      const d = Math.min(W, H) / 5 * Math.sqrt(3) / 2;
      [0, 60, 120].forEach(deg => family(ctx, W, H, deg, d));
    },
    diagCross(ctx, W, H) {
      line(ctx, 0, 0, W, H); line(ctx, 0, H, W, 0);
      dot(ctx, W / 2, H / 2, 4);
    },
    diagLattice(ctx, W, H) {
      const s = Math.min(W, H) / 6;
      family(ctx, W, H, 45, s); family(ctx, W, H, 135, s);
    },
    onePoint(ctx, W, H) {
      const vp = [W / 2, H / 2];
      const edge = range(0, 1, 4);
      fan(ctx, vp, [].concat(edge.map(f => [W * f, 0]), edge.map(f => [W * f, H]), edge.slice(1, -1).map(f => [0, H * f]), edge.slice(1, -1).map(f => [W, H * f])));
      ctx.save(); ctx.globalAlpha *= 0.6;
      [0.25, 0.5, 0.75].forEach(k => ctx.strokeRect(vp[0] - W * k / 2, vp[1] - H * k / 2, W * k, H * k));
      ctx.restore();
      dashed(ctx, () => line(ctx, 0, vp[1], W, vp[1]));
      dot(ctx, vp[0], vp[1], 4);
    },
    twoPoint(ctx, W, H) {
      const hz = H * 0.5, v1 = [-W * 0.35, hz], v2 = [W * 1.35, hz], ys = range(-H, 2 * H, 12);
      fan(ctx, v1, ys.map(y => [W * 1.2, y])); fan(ctx, v2, ys.map(y => [-W * 0.2, y]));
      ctx.save(); ctx.globalAlpha *= 0.6; range(0.2, 0.8, 3).forEach(f => line(ctx, W * f, 0, W * f, H)); ctx.restore();
      dashed(ctx, () => line(ctx, 0, hz, W, hz));
    },
    threePoint(ctx, W, H) {
      const hz = H * 0.72, v1 = [-W * 0.4, hz], v2 = [W * 1.4, hz], v3 = [W / 2, -H * 1.1], ys = range(-H, 2 * H, 10);
      fan(ctx, v1, ys.map(y => [W * 1.2, y])); fan(ctx, v2, ys.map(y => [-W * 0.2, y]));
      ctx.save(); ctx.globalAlpha *= 0.75; fan(ctx, v3, range(-W * 0.6, W * 1.6, 11).map(x => [x, H * 1.2])); ctx.restore();
      dashed(ctx, () => line(ctx, 0, hz, W, hz));
    },
    isometric(ctx, W, H) {
      const d = Math.min(W, H) / 6;
      [30, 150].forEach(deg => family(ctx, W, H, deg, d));
      ctx.save(); ctx.globalAlpha *= 0.6; family(ctx, W, H, 90, d); ctx.restore();
    },
    safe(ctx, W, H) {
      const box = k => ctx.strokeRect(W * (1 - k) / 2, H * (1 - k) / 2, W * k, H * k);
      box(0.9); dashed(ctx, () => box(0.8));
      const c = Math.min(W, H) * 0.03;
      line(ctx, W / 2 - c, H / 2, W / 2 + c, H / 2); line(ctx, W / 2, H / 2 - c, W / 2, H / 2 + c);
    }
  };

  const GROUPS = [
    { id: 'classic', name: 'Classic' },
    { id: 'golden', name: 'Golden ratio' },
    { id: 'triangles', name: 'Triangles' },
    { id: 'diagonals', name: 'Diagonals' },
    { id: 'perspective', name: 'Perspective and 3D' },
    { id: 'guides', name: 'Guides' }
  ];

  const LIST = [
    { id: 'thirds', group: 'classic', name: 'Rule of thirds', asymmetric: false, tier: 'v1',
      desc: 'Two lines each way at 1/3 and 2/3. Put subjects on the lines or on the four crossings.',
      bestFor: 'Everything. The default for most photographers.' },
    { id: 'thirdsDiag', group: 'classic', name: 'Thirds and diagonals', asymmetric: false, tier: 'v1',
      desc: 'The thirds grid with both corner-to-corner diagonals on top.',
      bestFor: 'Leading lines that should pass through a power point.' },
    { id: 'center', group: 'classic', name: 'Centre cross', asymmetric: false, tier: 'v1',
      desc: 'Centre lines and a centre ring.',
      bestFor: 'Symmetry, architecture, reflections.' },
    { id: 'fine', group: 'classic', name: 'Square grid', asymmetric: false, tier: 'v1',
      desc: 'Square cells from the centre outwards.',
      bestFor: 'Products, flat lays, keeping things aligned.' },
    { id: 'rabatment', group: 'classic', name: 'Rabatment', asymmetric: false, tier: 'v1',
      desc: 'A painter’s device: fold each short side onto the long side to make two squares. Their inner edges are strong lines.',
      bestFor: 'Wide frames; placing a figure or a tree on the square’s edge.' },

    { id: 'phi', group: 'golden', name: 'Phi grid', asymmetric: false, tier: 'v1',
      desc: 'Like thirds, but the lines sit at 0.382 and 0.618, so the centre band is narrower.',
      bestFor: 'Calmer, more classical placement; portraits and still life.' },
    { id: 'spiral', group: 'golden', name: 'Golden spiral', asymmetric: true, tier: 'v1',
      desc: 'A Fibonacci spiral built from golden squares, stretched to fill the frame. The curve is a leading line into the eye point.',
      bestFor: 'Landscapes, curved subjects, waves, staircases.' },
    { id: 'spiralTrue', group: 'golden', name: 'Golden spiral, true ratio', asymmetric: true, tier: 'v1',
      desc: 'The same spiral kept at the real 1.618 ratio, so the curve isn’t squashed. The outline shows the golden rectangle.',
      bestFor: 'Checking a composition against the exact proportion.' },
    { id: 'goldenRects', group: 'golden', name: 'Golden rectangles', asymmetric: true, tier: 'v1',
      desc: 'The nested golden squares without the spiral. Each cut is a place to put an edge or horizon.',
      bestFor: 'Architecture and graphic frames with straight edges.' },

    { id: 'triangles', group: 'triangles', name: 'Golden triangles', asymmetric: true, tier: 'v1',
      desc: 'One diagonal plus a perpendicular from each of the other two corners.',
      bestFor: 'Diagonal energy, movement, triangular subjects.' },
    { id: 'trianglesDouble', group: 'triangles', name: 'Double golden triangles', asymmetric: false, tier: 'v1',
      desc: 'Both diagonals, each with perpendiculars from the opposite corners. Eight triangles and four extra crossing points.',
      bestFor: 'Busy scenes where lines run both ways.' },
    { id: 'pyramid', group: 'triangles', name: 'Pyramid', asymmetric: true, tier: 'v1',
      desc: 'A triangle with its point at the top centre, split into four. Flip it for an inverted V.',
      bestFor: 'Group portraits, mountains, a stable and solid feel.' },
    { id: 'triGrid', group: 'triangles', name: 'Triangle grid', asymmetric: false, tier: 'v1',
      desc: 'A lattice of equal triangles: horizontals plus lines at 60° and 120°.',
      bestFor: 'Patterns, roofs, tiled floors, and finding hidden triangles.' },

    { id: 'diagonal', group: 'diagonals', name: 'Diagonal method', asymmetric: false, tier: 'v1',
      desc: 'Edwin Westhoff’s 45° lines from each corner. Key details often sit on these lines.',
      bestFor: 'Placing eyes, hands and small details.' },
    { id: 'diagCross', group: 'diagonals', name: 'Diagonal cross', asymmetric: false, tier: 'v1',
      desc: 'The two main diagonals: the baroque (bottom-left to top-right) and the sinister (top-left to bottom-right).',
      bestFor: 'Roads, rivers and limbs running corner to corner.' },
    { id: 'diagLattice', group: 'diagonals', name: 'Diagonal grid', asymmetric: false, tier: 'v1',
      desc: 'A square grid turned 45°, so every line is a diagonal.',
      bestFor: 'Lining up repeating diagonals: stairs, fences, crops in fields.' },
    { id: 'dynamic', group: 'diagonals', name: 'Dynamic symmetry', asymmetric: false, tier: 'v1',
      desc: 'Jay Hambidge’s grid: both diagonals plus reciprocals that cross them at 90°.',
      bestFor: 'Street and documentary; layered, painterly frames.' },
    { id: 'armature', group: 'diagonals', name: 'Harmonic armature', asymmetric: false, tier: 'v2',
      desc: 'The 14-line armature: diagonals, corner-to-midpoint lines and the centre rhombus.',
      bestFor: 'Classic painting-style composition.' },

    { id: 'onePoint', group: 'perspective', name: 'One-point perspective', asymmetric: false, tier: 'v2',
      desc: 'Lines radiating from one vanishing point at the centre, with receding frames.',
      bestFor: 'Corridors, roads, rail tracks, symmetrical interiors.' },
    { id: 'twoPoint', group: 'perspective', name: 'Two-point perspective', asymmetric: false, tier: 'v2',
      desc: 'Two vanishing points on the horizon, outside the frame, with straight verticals.',
      bestFor: 'Buildings shot from a corner, street corners, products at an angle.' },
    { id: 'threePoint', group: 'perspective', name: 'Three-point perspective', asymmetric: true, tier: 'v2',
      desc: 'Two vanishing points on the horizon plus a third above the frame, so verticals converge. Flip it for looking down.',
      bestFor: 'Tall buildings from street level, worm’s-eye and bird’s-eye views.' },
    { id: 'isometric', group: 'perspective', name: 'Isometric 3D grid', asymmetric: false, tier: 'v2',
      desc: 'Lines at 30° and 150° plus verticals: the grid behind isometric 3D drawings.',
      bestFor: 'Boxes, buildings and products shown in 3D without vanishing points.' },

    { id: 'safe', group: 'guides', name: 'Safe areas', asymmetric: false, tier: 'v1',
      desc: 'Boxes at 90% and 80% of the frame, with a centre mark. Keep key content inside them.',
      bestFor: 'Social posts, video frames, anything that gets cropped or covered by app buttons.' }
  ];

  /* Aspect ratios as width / height (landscape). For a portrait phone, use portraitRatio(). */
  const ASPECTS = { full: null, '1:1': 1, '4:5': 4 / 5, '3:2': 3 / 2, '4:3': 4 / 3, '16:9': 16 / 9, '9:16': 9 / 16, '2.39:1': 2.39 };
  const portraitRatio = key => { const r = ASPECTS[key]; return r == null ? null : (r > 1 ? 1 / r : r); };

  /* Largest rect of ratio (w/h) centred inside outer. */
  function fitAspect(outer, ratio) {
    if (!ratio) return { ...outer };
    let w = outer.w, h = w / ratio;
    if (h > outer.h) { h = outer.h; w = h * ratio; }
    return { x: outer.x + (outer.w - w) / 2, y: outer.y + (outer.h - h) / 2, w, h };
  }

  /* Darken everything outside inner. */
  function drawMask(ctx, outer, inner, alpha = 0.55) {
    ctx.save();
    ctx.fillStyle = `rgba(0,0,0,${alpha})`;
    ctx.beginPath();
    ctx.rect(outer.x, outer.y, outer.w, outer.h);
    ctx.rect(inner.x, inner.y, inner.w, inner.h);
    ctx.fill('evenodd');
    ctx.restore();
  }

  /* draw(ctx, rect, id, {color, opacity, lineWidth, orient}). orient bit 1 flips X, bit 2 flips Y. */
  function draw(ctx, rect, id, opts = {}) {
    const fn = GRIDS[id];
    if (!fn) return;
    const { color = '#ffffff', opacity = 0.7, lineWidth = 1, orient = 0 } = opts;
    ctx.save();
    ctx.beginPath(); ctx.rect(rect.x, rect.y, rect.w, rect.h); ctx.clip();
    ctx.translate(rect.x, rect.y);
    if (orient & 1) { ctx.translate(rect.w, 0); ctx.scale(-1, 1); }
    if (orient & 2) { ctx.translate(0, rect.h); ctx.scale(1, -1); }
    ctx.globalAlpha = opacity;
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 2;
    fn(ctx, rect.w, rect.h);
    ctx.restore();
  }

  PT.grids = { PHI, list: LIST, groups: GROUPS, draw, ASPECTS, portraitRatio, fitAspect, drawMask, clipRay, foot };
})(window.PT);
