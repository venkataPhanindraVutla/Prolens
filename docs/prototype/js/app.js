/* App shell: tab bar, screen mounting, side panel, page switching. Loaded last. */
(function (PT) {
  const { h } = PT;
  const ORDER = ['viewfinder', 'calculators', 'light', 'coach', 'gear'];

  PT.store.init(PT.defaultState);

  const body = document.getElementById('screen-body');
  const tabbar = document.getElementById('tabbar');
  const panel = document.getElementById('panel');
  const screens = ORDER.map(id => PT.screens.find(s => s.id === id)).filter(Boolean);

  let cleanup = null, panelCleanup = null, current = null;

  screens.forEach(s => {
    const b = h('button', { type: 'button', 'data-screen': s.id }, PT.icon(s.icon, 20), h('span', null, s.title));
    b.addEventListener('click', () => nav(s.id));
    tabbar.append(b);
  });

  function nav(id) {
    const s = screens.find(x => x.id === id) || screens[0];
    if (!s) return;
    if (cleanup) { try { cleanup(); } catch (e) { console.error(e); } cleanup = null; }
    if (panelCleanup) { try { panelCleanup(); } catch (e) { console.error(e); } panelCleanup = null; }
    current = s.id;
    body.replaceChildren();
    body.scrollTop = 0;
    tabbar.querySelectorAll('button').forEach(b => b.removeAttribute('aria-current'));
    tabbar.querySelector(`[data-screen="${s.id}"]`).setAttribute('aria-current', 'page');
    try { cleanup = s.mount(body) || null; } catch (e) { console.error(e); body.append(h('div', { class: 'screen-pad muted' }, `This screen failed to load: ${e.message}`)); }
    renderPanel(s);
    if (location.hash !== `#${s.id}`) history.replaceState(null, '', `#${s.id}`);
  }
  PT.nav = nav;

  function renderPanel(s) {
    panel.replaceChildren();
    const p = s.panel || {};
    panel.append(
      h('div', { class: 'stack-sm' }, h('h2', null, s.title), p.summary ? h('p', { class: 'lede' }, p.summary) : null)
    );
    if (p.features && p.features.length) {
      panel.append(PT.ui.card({
        title: 'Features on this screen',
        description: 'v1 is the first release, v2 adds pro tools, v3 is the smart layer.',
        content: h('div', { class: 'features' }, p.features.map(f =>
          h('div', { class: 'feature' },
            h('span', { class: 'feature-name' }, f.name),
            PT.ui.tierBadge(f.tier),
            f.note ? h('span', { class: 'feature-note' }, f.note) : null)))
      }));
    }
    if (s.panelExtras) {
      const extras = h('div', { class: 'stack' });
      panel.append(extras);
      try { panelCleanup = s.panelExtras(extras) || null; } catch (e) { console.error(e); }
    }
  }

  /* Page tabs: app screens vs grid library */
  const pageApp = document.getElementById('page-app');
  const pageLib = document.getElementById('page-library');
  let libraryMounted = false;
  document.querySelectorAll('#page-tabs .tab').forEach(t => t.addEventListener('click', () => {
    const page = t.dataset.page;
    document.querySelectorAll('#page-tabs .tab').forEach(x => x.setAttribute('aria-selected', String(x === t)));
    pageApp.hidden = page !== 'app';
    pageLib.hidden = page !== 'library';
    if (page === 'library' && !libraryMounted && PT.library) { PT.library.mount(pageLib); libraryMounted = true; }
  }));

  nav((location.hash || '').slice(1) || 'viewfinder');
})(window.PT);
