/* Grid library: every composition overlay on the sample scene, plus frame guides and perspective grids. */
(function (PT) {
  const { h } = PT;
  const ASPECT_OPTS = ['3:2', '4:5', '16:9', '1:1', '2.39:1'];
  const COLORS = [['#ffffff', 'White'], ['#facc15', 'Yellow'], ['#22d3ee', 'Cyan'], ['#ef4444', 'Red']];
  const PLAIN = '#18181b';

  function mount(root) {
    const st = { aspect: '3:2', color: '#ffffff', image: 'scene' };
    const redraws = [];

    /* Size a canvas to its CSS width at the given ratio and return a scaled 2D context. */
    function prep(canvas, ratio) {
      const w = Math.round(canvas.clientWidth);
      if (w < 2) return null;
      const hgt = Math.round(w / ratio);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(hgt * dpr);
      canvas.style.aspectRatio = `${w} / ${hgt}`;
      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { ctx, w, h: hgt, dpr };
    }
    function paintBase(p) {
      if (st.image === 'plain') { p.ctx.fillStyle = PLAIN; p.ctx.fillRect(0, 0, p.w, p.h); }
      else p.ctx.drawImage(PT.scene.get(Math.round(p.w * p.dpr), Math.round(p.h * p.dpr)), 0, 0, p.w, p.h);
    }
    function observe(canvas, fn) {
      redraws.push(fn);
      if (window.ResizeObserver) new ResizeObserver(() => fn()).observe(canvas);
    }
    const redrawAll = () => redraws.forEach(fn => fn());

    /* ---- header ---- */
    const aspectSeg = PT.ui.segmented(ASPECT_OPTS.map(a => ({ value: a, label: a })), st.aspect, v => { st.aspect = v; redrawAll(); }, 'Aspect ratio');
    const imageSeg = PT.ui.segmented([{ value: 'scene', label: 'Sample scene' }, { value: 'plain', label: 'Plain' }], st.image, v => { st.image = v; redrawAll(); }, 'Image');
    const swatches = h('div', { class: 'lib-swatches', role: 'group', 'aria-label': 'Line colour' });
    COLORS.forEach(([c, name]) => {
      const b = h('button', { type: 'button', class: 'lib-swatch', style: { background: c }, 'aria-label': name, 'aria-pressed': String(c === st.color), title: name });
      b.addEventListener('click', () => {
        st.color = c;
        swatches.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
        redrawAll();
      });
      swatches.append(b);
    });
    const control = (label, node) => h('div', { class: 'lib-control' }, h('span', { class: 'label' }, label), node);

    const head = h('div', { class: 'lib-head' },
      h('div', { class: 'stack-sm' },
        h('h2', null, 'Grid library'),
        h('p', { class: 'lib-lede' }, `All ${PT.grids.list.length} overlays the viewfinder can draw, on the same sample frame. Change the ratio and colour to see how each one behaves, and flip the lopsided ones to fit your subject.`)),
      h('div', { class: 'lib-controls' },
        control('Aspect ratio', aspectSeg), control('Line colour', swatches), control('Image', imageSeg)));

    /* ---- grid cards ---- */
    const cardFor = item => {
      let orient = 0;
      const canvas = h('canvas', { class: 'lib-canvas', role: 'img', 'aria-label': `${item.name} drawn over the sample scene` });
      const draw = () => {
        const p = prep(canvas, PT.grids.ASPECTS[st.aspect]);
        if (!p) return;
        paintBase(p);
        PT.grids.draw(p.ctx, { x: 0, y: 0, w: p.w, h: p.h }, item.id, { color: st.color, opacity: 0.85, lineWidth: 1.5, orient });
      };
      observe(canvas, draw);
      const flip = item.asymmetric ? h('div', { class: 'lib-flip' }, PT.ui.segmented(
        [{ value: 0, label: 'Normal' }, { value: 1, label: 'Flip H' }, { value: 2, label: 'Flip V' }, { value: 3, label: 'Both' }],
        0, v => { orient = v; draw(); }, 'Flip')) : null;
      return h('div', { class: 'card lib-card' }, canvas,
        h('div', { class: 'lib-card-body' },
          h('div', { class: 'lib-card-title' }, h('span', { class: 'lib-card-name' }, item.name), PT.ui.tierBadge(item.tier)),
          h('p', { class: 'lib-desc' }, item.desc),
          h('p', { class: 'lib-best' }, h('span', null, 'Best for: '), item.bestFor.replace(/\.$/, '')),
          flip));
    };

    const groupSections = PT.grids.groups.map(g => {
      const items = PT.grids.list.filter(i => i.group === g.id);
      if (!items.length) return null;
      return h('section', { class: 'stack', id: `lib-group-${g.id}`, 'aria-label': g.name },
        h('div', { class: 'lib-section-title' }, h('h3', null, g.name), h('span', { class: 'muted small num' }, `${items.length} ${items.length === 1 ? 'grid' : 'grids'}`)),
        h('div', { class: 'lib-grid' }, items.map(cardFor)));
    });
    const jump = h('nav', { class: 'lib-jump', 'aria-label': 'Grid groups' },
      PT.grids.groups.map(g => {
        const b = h('button', { type: 'button', class: 'btn btn-outline btn-sm' }, g.name);
        b.addEventListener('click', () => document.getElementById(`lib-group-${g.id}`)?.scrollIntoView({ block: 'start' }));
        return b;
      }));

    /* ---- aspect-ratio frame guides ---- */
    const frameCanvas = h('canvas', { class: 'lib-canvas lib-frame-canvas', role: 'img', 'aria-label': 'Frame guides for 1:1, 4:5, 16:9 and 2.39:1 inside a 3:2 frame' });
    const drawFrames = () => {
      const p = prep(frameCanvas, 3 / 2);
      if (!p) return;
      paintBase(p);
      const { ctx } = p, outer = { x: 0, y: 0, w: p.w, h: p.h };
      const defs = [['1:1', 'tl'], ['4:5', 'tr'], ['16:9', 'tl'], ['2.39:1', 'tl']];
      ctx.save();
      ctx.strokeStyle = st.color; ctx.lineWidth = 1.5; ctx.font = '600 12px Geist, system-ui, sans-serif'; ctx.textBaseline = 'middle';
      defs.forEach(([key, pos], i) => {
        const r = PT.grids.fitAspect(outer, PT.grids.ASPECTS[key]);
        ctx.setLineDash(i % 2 ? [6, 4] : []);
        ctx.strokeRect(r.x + 0.75, r.y + 0.75, r.w - 1.5, r.h - 1.5);
        ctx.setLineDash([]);
        const tw = ctx.measureText(key).width + 12;
        const lx = pos === 'tr' ? r.x + r.w - tw - 6 : r.x + 6, ly = r.y + 6;
        ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(lx, ly, tw, 20);
        ctx.fillStyle = '#fff'; ctx.fillText(key, lx + 6, ly + 10.5);
      });
      ctx.restore();
    };
    observe(frameCanvas, drawFrames);

    /* ---- perspective illustrations (static) ---- */
    const INK = '#e4e4e7', DIM = '#71717a', ACCENT = '#f59e0b';
    function label(ctx, txt, x, y, align = 'left') {
      ctx.save(); ctx.font = '12px Geist, system-ui, sans-serif'; ctx.fillStyle = INK; ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillText(txt, x, y); ctx.restore();
    }
    const groundCanvas = h('canvas', { class: 'lib-canvas', role: 'img', 'aria-label': 'Ground-plane grid converging to a vanishing point on the horizon' });
    const drawGround = () => {
      const p = prep(groundCanvas, 4 / 3);
      if (!p) return;
      const { ctx, w, h: H } = p, hy = H * 0.42, vx = w / 2;
      ctx.fillStyle = PLAIN; ctx.fillRect(0, 0, w, H);
      ctx.save(); ctx.beginPath(); ctx.rect(0, hy, w, H - hy); ctx.clip();
      ctx.strokeStyle = INK; ctx.globalAlpha = 0.7; ctx.lineWidth = 1;
      for (let i = -12; i <= 12; i++) { ctx.beginPath(); ctx.moveTo(vx, hy); ctx.lineTo(vx + i * w * 0.2, H * 1.6); ctx.stroke(); }
      for (let z = 1; z <= 14; z++) { const y = hy + (H - hy) * 1.05 / (z * 0.9 + 0.2) ; if (y > hy) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); } }
      ctx.restore();
      ctx.strokeStyle = DIM; ctx.lineWidth = 1; ctx.setLineDash([5, 4]);
      ctx.beginPath(); ctx.moveTo(0, hy); ctx.lineTo(w, hy); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = ACCENT; ctx.beginPath(); ctx.arc(vx, hy, 4, 0, Math.PI * 2); ctx.fill();
      label(ctx, 'Horizon', 10, hy - 12); label(ctx, 'Vanishing point', vx + 10, hy - 12);
    };
    observe(groundCanvas, drawGround);

    const vertCanvas = h('canvas', { class: 'lib-canvas', role: 'img', 'aria-label': 'A building with leaning verticals next to the same building with straight verticals' });
    const drawVert = () => {
      const p = prep(vertCanvas, 4 / 3);
      if (!p) return;
      const { ctx, w, h: H } = p;
      ctx.fillStyle = PLAIN; ctx.fillRect(0, 0, w, H);
      const panel = (x0, pw, lean, title, note) => {
        const top = H * 0.16, bot = H * 0.8, cx = x0 + pw / 2, bw = pw * 0.5, inset = lean * bw * 0.22;
        ctx.strokeStyle = INK; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(cx - bw / 2, bot); ctx.lineTo(cx - bw / 2 + inset, top); ctx.lineTo(cx + bw / 2 - inset, top); ctx.lineTo(cx + bw / 2, bot); ctx.closePath(); ctx.stroke();
        ctx.globalAlpha = 0.45; ctx.lineWidth = 1;
        for (let r = 1; r < 6; r++) { const t = r / 6, y = bot - (bot - top) * t, ins = inset * t; ctx.beginPath(); ctx.moveTo(cx - bw / 2 + ins, y); ctx.lineTo(cx + bw / 2 - ins, y); ctx.stroke(); }
        for (let c = 1; c < 3; c++) { const f = c / 3; ctx.beginPath(); ctx.moveTo(cx - bw / 2 + bw * f, bot); ctx.lineTo(cx - bw / 2 + inset + (bw - 2 * inset) * f, top); ctx.stroke(); }
        ctx.globalAlpha = 1;
        ctx.strokeStyle = ACCENT; ctx.setLineDash([5, 4]);
        [cx - bw / 2, cx + bw / 2].forEach(x => { ctx.beginPath(); ctx.moveTo(x, bot + 8); ctx.lineTo(x, top - 14); ctx.stroke(); });
        ctx.setLineDash([]);
        label(ctx, title, cx, H * 0.07, 'center'); label(ctx, note, cx, H * 0.9, 'center');
      };
      panel(0, w / 2, 1, 'Camera tilted up', 'Verticals lean in');
      panel(w / 2, w / 2, 0, 'Camera level', 'Verticals stay straight');
      ctx.strokeStyle = '#3f3f46'; ctx.beginPath(); ctx.moveTo(w / 2, 12); ctx.lineTo(w / 2, H - 12); ctx.stroke();
    };
    observe(vertCanvas, drawVert);

    const sectionHead = (title, tier) => h('div', { class: 'lib-section-title' }, h('h3', null, title), tier ? PT.ui.tierBadge(tier) : null);

    const frames = PT.ui.card({
      title: 'Aspect-ratio frame guides',
      description: 'Shoot 3:2 and keep the final crop in mind. Each outline shows what stays when you crop to that ratio.',
      content: frameCanvas
    });

    const perspective = h('div', { class: 'stack' },
      sectionHead('Live perspective tools', 'v2'),
      h('div', { class: 'lib-two' },
        PT.ui.card({
          title: 'Ground-plane grid',
          description: 'A floor grid that stays locked to the real horizon as you tilt the phone. Lines run to a vanishing point on the horizon, so you can see how far the camera is from level and where the ground sits in the frame.',
          content: groundCanvas
        }),
        PT.ui.card({
          title: 'Vertical convergence',
          description: 'Tilt the camera up and the tops of buildings lean in. The guide reads the phone’s pitch and shows how far off vertical you are, so you can level the camera or step back and crop later.',
          content: vertCanvas
        })));

    const using = PT.ui.card({
      title: 'Using grids well',
      content: h('ul', { class: 'lib-list' },
        h('li', null, 'Use one or two at a time. A third overlay just hides the picture.'),
        h('li', null, 'Turn the grid off now and then to check the whole frame, edges included.'),
        h('li', null, 'Grids are guides, not rules. If the picture works with the subject dead centre, leave it there.'))
    });

    const wrap = h('div', { class: 'lib' },
      head,
      jump,
      groupSections,
      frames,
      perspective,
      using);
    root.replaceChildren(wrap);
    redrawAll();
  }

  PT.library = { mount };
})(window.PT);
