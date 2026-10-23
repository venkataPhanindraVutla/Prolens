/* Core: namespace, DOM helper, store, screen registry, shared UI pieces.
   Classic scripts only (no modules) so the prototype opens straight from file://. */
window.PT = window.PT || {};

(function (PT) {
  /* h('div', {class: 'x', onclick: fn, style: {...}}, child, 'text', [more]) */
  function h(tag, attrs, ...children) {
    const el = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v == null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
        else if (k === 'html') el.innerHTML = v;
        else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
        else if (v === true) el.setAttribute(k, '');
        else el.setAttribute(k, v);
      }
    }
    for (const c of children.flat(Infinity)) {
      if (c == null || c === false) continue;
      el.append(c instanceof Node ? c : document.createTextNode(String(c)));
    }
    return el;
  }
  PT.h = h;

  /* Store: one shared state object, persisted to localStorage when it can be. */
  const STORAGE_KEY = 'pt-prototype-v1';
  const listeners = new Set();
  let state = {};

  PT.store = {
    init(defaults) {
      let saved = {};
      try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch (e) { saved = {}; }
      state = deepMerge(structuredClone(defaults), saved);
    },
    get() { return state; },
    /* set({viewfinder: {grid: 'phi'}}) merges deeply; arrays are replaced. */
    set(patch) {
      state = deepMerge(state, patch);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* storage unavailable */ }
      listeners.forEach(fn => fn(state, patch));
    },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    reset() {
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
      location.reload();
    }
  };

  function deepMerge(target, src) {
    if (!src || typeof src !== 'object') return target;
    for (const [k, v] of Object.entries(src)) {
      if (v && typeof v === 'object' && !Array.isArray(v) && target[k] && typeof target[k] === 'object' && !Array.isArray(target[k])) {
        target[k] = deepMerge({ ...target[k] }, v);
      } else {
        target[k] = v;
      }
    }
    return target;
  }

  /* Screen registry.
     PT.registerScreen({
       id, title, icon,            // icon: key into PT.icons
       mount(el) -> cleanup fn,    // el is the scrollable phone screen body
       panel: { summary, features: [{name, tier: 'v1'|'v2'|'v3', note}] },
       panelExtras(el) -> cleanup  // optional: extra cards under the panel (e.g. sensor simulators)
     }) */
  PT.screens = [];
  PT.registerScreen = def => { PT.screens.push(def); };

  /* Lucide-style icons, 24px viewBox, stroke = currentColor. */
  const ICON_PATHS = {
    camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
    calculator: '<rect width="16" height="20" x="4" y="2" rx="2"/><line x1="8" x2="16" y1="6" y2="6"/><line x1="16" x2="16" y1="14" y2="18"/><path d="M16 10h.01M12 10h.01M8 10h.01M12 14h.01M8 14h.01M12 18h.01M8 18h.01"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
    book: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
    aperture: '<circle cx="12" cy="12" r="10"/><path d="m14.31 8 5.74 9.94M9.69 8h11.48M7.38 12l5.74-9.94M9.69 16 3.95 6.06M14.31 16H2.83M16.62 12l-5.74 9.94"/>',
    grid: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>',
    level: '<path d="M2 12h20"/><circle cx="12" cy="12" r="3"/>',
    histogram: '<path d="M3 3v18h18"/><path d="M7 16v-3M11 16V8M15 16v-6M19 16v-9"/>',
    focus: '<circle cx="12" cy="12" r="3"/><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/>',
    settings: '<path d="M20 7h-9M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/>',
    crop: '<path d="M6 2v14a2 2 0 0 0 2 2h14"/><path d="M18 22V8a2 2 0 0 0-2-2H2"/>',
    compass: '<circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>',
    mapPin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    plus: '<path d="M5 12h14M12 5v14"/>',
    trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    chevronLeft: '<path d="m15 18-6-6 6-6"/>',
    chevronRight: '<path d="m9 18 6-6-6-6"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
    timer: '<line x1="10" x2="14" y1="2" y2="2"/><line x1="12" x2="15" y1="14" y2="11"/><circle cx="12" cy="14" r="8"/>',
    layers: '<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/>',
    video: '<path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2"/>',
    image: '<rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21"/>'
  };
  PT.icon = (name, size = 20) => {
    const span = document.createElement('span');
    span.className = 'icon';
    span.style.display = 'inline-flex';
    span.innerHTML = `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name] || ''}</svg>`;
    return span;
  };

  /* Shared UI builders. Each returns a DOM node. */
  PT.ui = {
    /* segmented([{value, label}], current, onChange) */
    segmented(options, current, onChange, ariaLabel) {
      const wrap = h('div', { class: 'segmented', role: 'tablist', 'aria-label': ariaLabel || null });
      options.forEach(o => {
        const b = h('button', { type: 'button', role: 'tab', 'aria-selected': String(o.value === current) }, o.label);
        b.addEventListener('click', () => {
          wrap.querySelectorAll('button').forEach(x => x.setAttribute('aria-selected', 'false'));
          b.setAttribute('aria-selected', 'true');
          onChange(o.value);
        });
        wrap.append(b);
      });
      return wrap;
    },
    switchRow(label, checked, onChange, hint) {
      const sw = h('button', { type: 'button', class: 'switch', role: 'switch', 'aria-checked': String(!!checked), 'aria-label': label });
      sw.addEventListener('click', () => {
        const next = sw.getAttribute('aria-checked') !== 'true';
        sw.setAttribute('aria-checked', String(next));
        onChange(next);
      });
      return h('div', { class: 'switch-row' },
        h('div', { class: 'stack-sm', style: { gap: '0' } }, h('span', { class: 'label' }, label), hint ? h('span', { class: 'hint' }, hint) : null),
        sw);
    },
    /* slider({label, min, max, step, value, format(v), onInput(v)}) */
    slider({ label, min, max, step = 1, value, format = v => v, onInput, hint }) {
      const out = h('span', { class: 'small muted num' }, format(value));
      const input = h('input', { type: 'range', class: 'slider', min, max, step, value, 'aria-label': label });
      input.addEventListener('input', () => { const v = Number(input.value); out.textContent = format(v); onInput(v); });
      return h('div', { class: 'field' },
        h('div', { class: 'row-between' }, h('span', { class: 'label' }, label), out),
        input,
        hint ? h('span', { class: 'hint' }, hint) : null);
    },
    /* select({label, options: [{value, label}], value, onChange}) */
    select({ label, options, value, onChange, hint }) {
      const sel = h('select', { class: 'select', 'aria-label': label });
      options.forEach(o => sel.append(h('option', { value: o.value, selected: String(o.value) === String(value) }, o.label)));
      sel.addEventListener('change', () => onChange(sel.value));
      return h('label', { class: 'field' }, h('span', { class: 'label' }, label), sel, hint ? h('span', { class: 'hint' }, hint) : null);
    },
    /* numberInput({label, value, step, min, max, suffix, onChange}) */
    numberInput({ label, value, step = 'any', min, max, suffix, onChange, hint }) {
      const input = h('input', { type: 'number', class: 'input num', value, step, min, max, inputmode: 'decimal' });
      input.addEventListener('input', () => { const v = parseFloat(input.value); if (!Number.isNaN(v)) onChange(v); });
      return h('label', { class: 'field' },
        h('span', { class: 'label' }, suffix ? `${label} (${suffix})` : label),
        input,
        hint ? h('span', { class: 'hint' }, hint) : null);
    },
    card({ title, description, content, footer }) {
      return h('div', { class: 'card' },
        (title || description) ? h('div', { class: 'card-header' },
          title ? h('div', { class: 'card-title' }, title) : null,
          description ? h('div', { class: 'card-description' }, description) : null) : null,
        h('div', { class: 'card-content' }, content),
        footer ? h('div', { class: 'card-footer' }, footer) : null);
    },
    kv(rows) {
      return h('dl', { class: 'kv' }, rows.map(([k, v]) => h('div', { class: 'kv-row' }, h('dt', null, k), h('dd', null, v))));
    },
    tierBadge(tier) {
      return h('span', { class: `badge badge-${tier}` }, tier);
    }
  };

  /* Toast inside the phone screen. */
  PT.toast = (msg) => {
    const host = document.getElementById('phone-screen');
    if (!host) return;
    host.querySelectorAll('.toast').forEach(t => t.remove());
    const t = h('div', { class: 'toast', role: 'status' }, msg);
    host.append(t);
    setTimeout(() => t.remove(), 1800);
  };

  /* Navigate to an app screen by id. Set by app.js. */
  PT.nav = () => {};
})(window.PT);
