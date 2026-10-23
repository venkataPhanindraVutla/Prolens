/* Gear screen: pick the active body and lens, add custom ones. Everything else reads this profile. */
(function (PT) {
  const { h } = PT;
  const M = PT.math;

  const fmtF = f => `${+f.toFixed(1)} mm`;
  const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

  function stat(value, label) {
    return h('div', { class: 'stat' }, h('span', { class: 'stat-value num' }, value), h('span', { class: 'stat-label' }, label));
  }

  function field(label, input, hint) {
    return h('label', { class: 'field' }, h('span', { class: 'label' }, label), input, hint ? h('span', { class: 'hint' }, hint) : null);
  }
  const numInput = (placeholder, step) => h('input', { type: 'number', class: 'input num', step: step || 'any', placeholder, inputmode: 'decimal' });
  const num = input => (input.value.trim() === '' ? NaN : Number(input.value));

  function mount(el) {
    /* ----- active setup ----- */
    const namesEl = h('div', { class: 'gear-names' });
    const sliderEl = h('div');
    const statsEl = h('div', { class: 'stats' });
    const activeCard = PT.ui.card({
      title: 'Active setup',
      description: 'Every calculator and the viewfinder lens frame use this profile.',
      content: h('div', { class: 'stack' }, namesEl, sliderEl, statsEl)
    });

    function renderStats() {
      const { body, lens, f } = M.activeGear();
      statsEl.replaceChildren(
        stat(`${M.cropFactor(body).toFixed(2)}×`, 'Crop factor'),
        stat(`${M.coc(body).toFixed(3)} mm`, 'Circle of confusion'),
        stat(`${M.pixelPitchUm(body).toFixed(1)} µm`, 'Pixel pitch'),
        stat(M.formatAperture(M.diffractionLimitN(body)), 'Diffraction starts near'),
        stat(`${body.sensorW}×${body.sensorH}`, 'Sensor size (mm)'),
        stat(fmtF(M.eqFocal(f, body)), 'Equivalent focal'));
    }

    function renderActive() {
      const { body, lens, f } = M.activeGear();
      const zoom = lens.minF !== lens.maxF;
      namesEl.replaceChildren(
        h('span', { class: 'name' }, body.name),
        h('span', { class: 'sub' }, `${lens.name}${zoom ? ` at ${fmtF(f)}` : ''}`));
      sliderEl.replaceChildren();
      if (zoom) {
        sliderEl.append(PT.ui.slider({
          label: 'Focal length', min: lens.minF, max: lens.maxF, step: 1, value: Math.round(f), format: fmtF,
          onInput: v => PT.store.set({ gear: { focalMm: v } })
        }));
      } else {
        sliderEl.append(h('div', { class: 'row-between small muted' }, h('span', null, 'Focal length'), h('span', { class: 'num' }, `${fmtF(lens.minF)} (prime)`)));
      }
      renderStats();
    }

    /* ----- lists ----- */
    const bodiesEl = h('div', { class: 'gear-list', role: 'radiogroup', 'aria-label': 'Camera bodies' });
    const lensesEl = h('div', { class: 'gear-list', role: 'radiogroup', 'aria-label': 'Lenses' });

    function row({ name, sub, active, custom, onPick, onDelete }) {
      const opt = h('button', { type: 'button', class: 'gear-option', role: 'radio', 'aria-checked': String(active), onclick: onPick },
        h('span', { class: 'gear-radio' }),
        h('span', { class: 'gear-option-text' },
          h('span', { class: 'gear-option-name' }, name),
          h('span', { class: 'gear-option-sub' }, sub)));
      const del = custom && !active
        ? h('button', { type: 'button', class: 'btn btn-ghost btn-icon btn-sm', 'aria-label': `Delete ${name}`, title: 'Delete', onclick: onDelete }, PT.icon('trash', 16))
        : null;
      return h('div', { class: 'gear-row' }, opt, custom ? h('span', { class: 'badge badge-outline' }, 'Custom') : null, del);
    }

    function renderLists() {
      const g = PT.store.get().gear;
      bodiesEl.replaceChildren(...g.bodies.map(b => row({
        name: b.name,
        sub: `${b.format} · ${b.mp} MP`,
        active: b.id === g.activeBodyId,
        custom: !!b.custom,
        onPick: () => PT.store.set({ gear: { activeBodyId: b.id } }),
        onDelete: () => PT.store.set({ gear: { bodies: PT.store.get().gear.bodies.filter(x => x.id !== b.id) } })
      })));
      lensesEl.replaceChildren(...g.lenses.map(l => row({
        name: l.name,
        sub: `${l.minF === l.maxF ? fmtF(l.minF) : `${l.minF}–${l.maxF} mm`} · ${M.formatAperture(l.maxAperture)}`,
        active: l.id === g.activeLensId,
        custom: !!l.custom,
        onPick: () => PT.store.set({ gear: { activeLensId: l.id, focalMm: clamp(g.focalMm, l.minF, l.maxF) } }),
        onDelete: () => PT.store.set({ gear: { lenses: PT.store.get().gear.lenses.filter(x => x.id !== l.id) } })
      })));
    }

    /* ----- add forms ----- */
    function collapsible(title, fields, onSubmit, submitLabel) {
      const err = h('div', { class: 'gear-error', role: 'alert' });
      const form = h('form', { class: 'gear-form', hidden: true, novalidate: true }, ...fields, err,
        h('div', { class: 'row' },
          h('button', { type: 'submit', class: 'btn btn-sm' }, submitLabel),
          h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onclick: () => toggle(false) }, 'Cancel')));
      const head = h('button', { type: 'button', class: 'gear-add-head', 'aria-expanded': 'false', onclick: () => toggle(form.hidden) },
        h('span', { class: 'lead' }, PT.icon('plus', 16), title),
        h('span', { class: 'chev' }, PT.icon('chevronRight', 16)));
      function toggle(open) { form.hidden = !open; head.setAttribute('aria-expanded', String(open)); err.textContent = ''; }
      form.addEventListener('submit', e => {
        e.preventDefault();
        const msg = onSubmit();
        err.textContent = msg || '';
        if (!msg) { form.reset(); toggle(false); }
      });
      return h('div', { class: 'card' }, head, form);
    }

    const bName = h('input', { type: 'text', class: 'input', placeholder: 'Sony A7 III', maxlength: 40 });
    const bW = numInput('35.9', '0.1'), bH = numInput('23.9', '0.1'), bMp = numInput('24', '0.1'), bStab = numInput('5', '0.5');
    const addBody = collapsible('Add a body', [
      field('Name', bName),
      h('div', { class: 'field-row' }, field('Sensor width (mm)', bW), field('Sensor height (mm)', bH)),
      h('div', { class: 'field-row' }, field('Megapixels', bMp), field('Stabilisation (stops)', bStab, 'Leave empty if none'))
    ], () => {
      const name = bName.value.trim(), w = num(bW), hh = num(bH), mp = num(bMp);
      const stab = bStab.value.trim() === '' ? 0 : num(bStab);
      if (!name) return 'Enter a name for the body.';
      if (!(w >= 3 && w <= 60)) return 'Sensor width must be between 3 and 60 mm.';
      if (!(hh >= 2 && hh <= 50)) return 'Sensor height must be between 2 and 50 mm.';
      if (hh > w) return 'Sensor width must be at least the height.';
      if (!(mp >= 1 && mp <= 200)) return 'Megapixels must be between 1 and 200.';
      if (!(stab >= 0 && stab <= 10)) return 'Stabilisation must be between 0 and 10 stops.';
      const crop = M.FF_DIAG / Math.hypot(w, hh);
      const item = { id: `custom-${Date.now()}`, name, format: `Custom (${crop.toFixed(1)}×)`, sensorW: w, sensorH: hh, mp, ibisStops: stab, custom: true };
      PT.store.set({ gear: { bodies: [...PT.store.get().gear.bodies, item] } });
      PT.toast('Body added');
      return '';
    }, 'Add body');

    const lName = h('input', { type: 'text', class: 'input', placeholder: '35mm f/1.8', maxlength: 40 });
    const lMin = numInput('24', '1'), lMax = numInput('70', '1'), lAp = numInput('2.8', '0.1');
    const addLens = collapsible('Add a lens', [
      field('Name', lName),
      h('div', { class: 'field-row' }, field('Min focal (mm)', lMin), field('Max focal (mm)', lMax, 'Same as min for a prime')),
      field('Max aperture (f-number)', lAp)
    ], () => {
      const name = lName.value.trim(), mn = num(lMin), mx = num(lMax), ap = num(lAp);
      if (!name) return 'Enter a name for the lens.';
      if (!(mn >= 4 && mn <= 2000)) return 'Min focal length must be between 4 and 2000 mm.';
      if (!(mx >= 4 && mx <= 2000)) return 'Max focal length must be between 4 and 2000 mm.';
      if (mx < mn) return 'Max focal length must be at least the min.';
      if (!(ap >= 0.7 && ap <= 32)) return 'Max aperture must be between f/0.7 and f/32.';
      const item = { id: `custom-${Date.now()}`, name, minF: mn, maxF: mx, maxAperture: ap, minAperture: Math.max(22, ap), custom: true };
      PT.store.set({ gear: { lenses: [...PT.store.get().gear.lenses, item] } });
      PT.toast('Lens added');
      return '';
    }, 'Add lens');

    const pad = h('div', { class: 'screen-pad stack' },
      h('h1', { class: 'screen-title' }, 'Gear'),
      activeCard,
      PT.ui.card({ title: 'Camera bodies', description: 'Sensor size and megapixels drive crop factor, blur and diffraction.', content: bodiesEl }),
      addBody,
      PT.ui.card({ title: 'Lenses', description: 'Focal range and maximum aperture limit the calculators.', content: lensesEl }),
      addLens);
    el.append(pad);

    renderActive();
    renderLists();

    const unsub = PT.store.subscribe((state, patch) => {
      const keys = patch && patch.gear ? Object.keys(patch.gear) : [];
      if (keys.length === 1 && keys[0] === 'focalMm') {
        /* Slider drag: keep the slider element alive and refresh the readouts only. */
        const { body, lens, f } = M.activeGear();
        const sub = namesEl.querySelector('.sub');
        if (sub) sub.textContent = `${lens.name} at ${fmtF(f)}`;
        renderStats();
        return;
      }
      renderActive();
      renderLists();
    });
    return unsub;
  }

  PT.registerScreen({
    id: 'gear',
    title: 'Gear',
    icon: 'aperture',
    mount,
    panel: {
      summary: 'The gear profile feeds every calculator and the viewfinder lens frame. Pick your camera and lens once and the sensor maths follows.',
      features: [
        { name: 'Camera bodies', tier: 'v1', note: 'Sensor width, height and megapixels give crop factor, circle of confusion and pixel pitch.' },
        { name: 'Lenses', tier: 'v1', note: 'Focal range and maximum aperture limit the sliders and aperture lists.' },
        { name: 'Active setup readouts', tier: 'v1', note: 'Crop factor, CoC, pixel pitch, diffraction limit and equivalent focal at the current zoom.' },
        { name: 'Custom bodies and lenses', tier: 'v1', note: 'Add your own gear with validated inputs. The active item cannot be deleted.' },
        { name: 'Virtual lens frames', tier: 'v2', note: 'The viewfinder draws the field of view of this body and lens inside the live view.' }
      ]
    }
  });
})(window.PT);
