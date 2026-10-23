/* Light screen: sun times, timeline, sun path, direction, shadow length and moon. */
(function (PT) {
  const { h } = PT;
  const NS = 'http://www.w3.org/2000/svg';

  const PRESETS = [
    ['London', 51.5074, -0.1278, 'Europe/London'], ['New York', 40.7128, -74.006, 'America/New_York'],
    ['Tokyo', 35.6762, 139.6503, 'Asia/Tokyo'], ['Bengaluru', 12.9716, 77.5946, 'Asia/Kolkata'],
    ['Sydney', -33.8688, 151.2093, 'Australia/Sydney'], ['Reykjavík', 64.1466, -21.9426, 'Atlantic/Reykjavik'],
    ['Cape Town', -33.9249, 18.4241, 'Africa/Johannesburg'], ['San Francisco', 37.7749, -122.4194, 'America/Los_Angeles']
  ];
  const BANDS = [
    ['Daylight', 'Above +6°', 'day'], ['Golden hour', '+6° to −4°', 'golden'], ['Blue hour', '−4° to −6°', 'blue'],
    ['Nautical twilight', '−6° to −12°', 'nautical'], ['Astronomical twilight', '−12° to −18°', 'astro'], ['Night', 'Below −18°', 'night']
  ];
  const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];

  /* Module-level state, kept while switching tabs. */
  let dateStr = null;      // 'YYYY-MM-DD', or null for today
  let heightM = 1.8;

  const pad = n => String(n).padStart(2, '0');

  /* All times show in the location's time zone (presets carry one; custom and GPS
     locations use the device's). TZ is set at the start of every render. */
  const DEVICE_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
  let TZ = DEVICE_TZ;
  const tzFor = loc => loc.tz || DEVICE_TZ;
  function wall(d) {
    const parts = {};
    new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
      .formatToParts(d).forEach(p => { parts[p.type] = Number(p.value); });
    return parts;
  }
  /* Milliseconds the location's clock is ahead of UTC at instant d. */
  function offsetMs(d) {
    const w = wall(d);
    return Date.UTC(w.year, w.month - 1, w.day, w.hour % 24, w.minute, w.second) - Math.floor(d.getTime() / 1000) * 1000;
  }
  const fromWall = (y, m, d, hr) => { const u = Date.UTC(y, m - 1, d, hr); return new Date(u - offsetMs(new Date(u))); };
  const ymd = d => { const w = wall(d); return `${w.year}-${pad(w.month)}-${pad(w.day)}`; };
  const hhmm = d => { if (!d) return '—'; const w = wall(d); return `${pad(w.hour % 24)}:${pad(w.minute)}`; };
  const range = (a, b) => (a || b) ? `${hhmm(a)}–${hhmm(b)}` : '—';
  const compassWord = az => COMPASS[Math.round(az / 22.5) % 16];
  const fmtDeg = v => `${Math.round(v)}°`;
  const dayStart = d => { const w = wall(d); return fromWall(w.year, w.month, w.day, 0); };
  function chosenDate() {
    if (!dateStr) return new Date();
    const [y, m, d] = dateStr.split('-').map(Number);
    return fromWall(y, m, d, 12);
  }
  function duration(ms) {
    const min = Math.max(1, Math.round(ms / 60000)), hr = Math.floor(min / 60), m = min % 60;
    return hr ? (m ? `${hr} h ${m} min` : `${hr} h`) : `${m} min`;
  }

  function svg(viewBox, children, label) {
    const el = document.createElementNS(NS, 'svg');
    el.setAttribute('viewBox', viewBox);
    el.setAttribute('class', 'light-svg');
    el.setAttribute('role', 'img');
    if (label) el.setAttribute('aria-label', label);
    children.forEach(c => c && el.append(c));
    return el;
  }
  function s(tag, attrs, text) {
    const el = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs || {})) el.setAttribute(k, v);
    if (text != null) el.textContent = text;
    return el;
  }

  /* Next golden or blue hour event, or the time left in the current one. */
  function nextEvent(now, loc, phase) {
    const t0 = PT.sun.times(now, loc.lat, loc.lon);
    const tomorrow = new Date(now.getTime() + 86400000);
    const t1 = PT.sun.times(tomorrow, loc.lat, loc.lon);
    const pick = (keys, label, t) => keys.map(k => ({ at: t[k], label })).filter(e => e.at && e.at > now);
    const first = list => list.sort((a, b) => a.at - b.at)[0];
    if (phase.id === 'golden') {
      const e = first([].concat(pick(['goldenMorningEnd', 'goldenEveningEnd'], 'Golden hour', t0), pick(['goldenMorningEnd', 'goldenEveningEnd'], 'Golden hour', t1)));
      return e ? { text: `Golden hour, ${duration(e.at - now)} left` } : null;
    }
    if (phase.id === 'blue') {
      const e = first([].concat(pick(['blueMorningEnd', 'blueEveningEnd'], 'Blue hour', t0), pick(['blueMorningEnd', 'blueEveningEnd'], 'Blue hour', t1)));
      return e ? { text: `Blue hour, ${duration(e.at - now)} left` } : null;
    }
    const all = [];
    [t0, t1].forEach(t => {
      all.push(...pick(['goldenMorningStart', 'goldenEveningStart'], 'Golden hour', t), ...pick(['blueMorningStart', 'blueEveningStart'], 'Blue hour', t));
    });
    const e = first(all);
    return e ? { text: `${e.label} starts in ${duration(e.at - now)}` } : null;
  }

  function buildTimeline(date, loc, now, isToday) {
    const W = 336, H = 30, top = 4, start = dayStart(date).getTime();
    const end = dayStart(new Date(start + 36 * 3600000)).getTime();
    const span = end - start, step = 5 * 60000, segs = [];
    for (let t = start; t < end; t += step) {
      const id = PT.sun.phaseAt(new Date(t + step / 2), loc.lat, loc.lon).id;
      const last = segs[segs.length - 1];
      if (last && last.id === id) last.to = t + step; else segs.push({ id, from: t, to: t + step });
    }
    const x = t => ((t - start) / span) * W;
    const kids = [s('rect', { x: 0, y: top, width: W, height: H, rx: 4, fill: '#27272a' })];
    segs.forEach(g => kids.push(s('rect', { x: x(g.from), y: top, width: Math.max(0.5, x(Math.min(g.to, end)) - x(g.from) + 0.5), height: H, class: `light-seg-${g.id}` })));
    kids.push(s('rect', { x: 0.5, y: top + 0.5, width: W - 1, height: H - 1, rx: 4, class: 'light-bar-frame' }));
    [0, 6, 12, 18, 24].forEach(hr => {
      const px = Math.min(W - 0.5, Math.max(0.5, (hr / 24) * W));
      kids.push(s('line', { x1: px, x2: px, y1: top + H, y2: top + H + 4, class: 'light-axis' }));
      kids.push(s('text', { x: px, y: top + H + 15, 'text-anchor': hr === 0 ? 'start' : hr === 24 ? 'end' : 'middle' }, `${pad(hr % 24 === 0 && hr ? 24 : hr)}:00`));
    });
    if (isToday) {
      const nx = Math.min(W, Math.max(0, x(now.getTime())));
      kids.push(s('line', { x1: nx, x2: nx, y1: 0, y2: top + H + 2, class: 'light-nowline' }));
    }
    return svg(`0 0 ${W} 54`, kids, 'Day timeline coloured by light phase');
  }

  function buildPath(date, loc, now, isToday, tm) {
    const W = 336, H = 150, L = 26, R = 6, T = 8, B = 20;
    const day0 = dayStart(date).getTime();
    const pts = Array.from({ length: 97 }, (_, i) => { const t = new Date(day0 + i * 15 * 60000); return { time: t, ...PT.sun.position(t, loc.lat, loc.lon) }; });
    const maxAlt = Math.max(10, Math.ceil((Math.max(...pts.map(p => p.altitude)) + 4) / 10) * 10);
    const minAlt = -30;
    const start = dayStart(date).getTime(), span = 24 * 3600000;
    const px = t => L + ((t - start) / span) * (W - L - R);
    const py = a => T + (1 - (a - minAlt) / (maxAlt - minAlt)) * (H - T - B);
    const kids = [];
    kids.push(s('rect', { x: L, y: py(6), width: W - L - R, height: py(-4) - py(6), class: 'light-band-golden' }));
    kids.push(s('rect', { x: L, y: py(-4), width: W - L - R, height: py(-6) - py(-4), class: 'light-band-blue' }));
    const ticks = [];
    for (let a = 0; a <= maxAlt; a += (maxAlt > 40 ? 30 : 10)) ticks.push(a);
    ticks.concat([-30]).forEach(a => {
      if (a !== 0) kids.push(s('line', { x1: L, x2: W - R, y1: py(a), y2: py(a), class: 'light-axis' }));
      kids.push(s('text', { x: L - 4, y: py(a) + 3, 'text-anchor': 'end' }, `${a}°`));
    });
    kids.push(s('line', { x1: L, x2: W - R, y1: py(0), y2: py(0), class: 'light-horizon' }));
    [0, 6, 12, 18, 24].forEach(hr => {
      const x = L + (hr / 24) * (W - L - R);
      kids.push(s('text', { x, y: H - 5, 'text-anchor': hr === 0 ? 'start' : hr === 24 ? 'end' : 'middle' }, `${pad(hr)}`));
    });
    kids.push(s('polyline', { points: pts.map(p => `${px(p.time.getTime()).toFixed(1)},${py(Math.max(minAlt, p.altitude)).toFixed(1)}`).join(' '), class: 'light-curve' }));
    const marker = isToday ? now : tm.solarNoon;
    const mp = PT.sun.position(marker, loc.lat, loc.lon);
    kids.push(s('circle', { cx: px(marker.getTime()), cy: py(Math.max(minAlt, mp.altitude)), r: 5, class: 'light-dot' }));
    return svg(`0 0 ${W} ${H}`, kids, 'Sun altitude through the day');
  }

  function buildCompass(date, loc, now, isToday, tm) {
    const C = 110, R = 70, kids = [];
    kids.push(s('circle', { cx: C, cy: C, r: R, class: 'light-ring' }));
    for (let a = 0; a < 360; a += 30) {
      const r1 = R - (a % 90 ? 4 : 8), rad = a * Math.PI / 180;
      kids.push(s('line', { x1: C + R * Math.sin(rad), y1: C - R * Math.cos(rad), x2: C + r1 * Math.sin(rad), y2: C - r1 * Math.cos(rad), class: 'light-axis' }));
    }
    [['N', 0], ['E', 90], ['S', 180], ['W', 270]].forEach(([t, a]) => {
      const rad = a * Math.PI / 180;
      kids.push(s('text', { x: C + (R + 15) * Math.sin(rad), y: C - (R + 15) * Math.cos(rad) + 4, 'text-anchor': 'middle', class: 'light-card' }, t));
    });
    const at = (az, r) => [C + r * Math.sin(az * Math.PI / 180), C - r * Math.cos(az * Math.PI / 180)];
    const marks = [['Rise', tm.sunrise], ['Set', tm.sunset]];
    marks.forEach(([label, t]) => {
      if (!t) return;
      const az = PT.sun.position(t, loc.lat, loc.lon).azimuth, [x, y] = at(az, R), [lx, ly] = at(az, R - 16);
      kids.push(s('circle', { cx: x, cy: y, r: 4.5, class: 'light-mark' }));
      kids.push(s('text', { x: lx, y: ly + 3, 'text-anchor': 'middle' }, label));
    });
    const when = isToday ? now : tm.solarNoon;
    const p = PT.sun.position(when, loc.lat, loc.lon), [ax, ay] = at(p.azimuth, R - 24);
    kids.push(s('line', { x1: C, y1: C, x2: ax, y2: ay, class: `light-arrow${p.altitude < 0 ? ' light-arrow-off' : ''}` }));
    kids.push(s('circle', { cx: ax, cy: ay, r: 5, class: 'light-dot' }));
    kids.push(s('circle', { cx: C, cy: C, r: 2.5, fill: 'currentColor' }));
    return { el: svg('0 0 220 220', kids, 'Compass showing the sun direction'), p };
  }

  function buildMoon(m, lat) {
    const r = 30, c = 36, k = m.fraction, waxing = m.phase < 0.5;
    const outer = waxing ? 1 : 0, inner = k > 0.5 ? outer : 1 - outer, rx = Math.abs(1 - 2 * k) * r;
    const kids = [s('circle', { cx: c, cy: c, r, fill: 'var(--muted)', stroke: 'var(--border)' })];
    if (k > 0.985) kids.push(s('circle', { cx: c, cy: c, r, fill: '#e4e4e7' }));
    else if (k > 0.015) kids.push(s('path', { d: `M${c} ${c - r} A${r} ${r} 0 0 ${outer} ${c} ${c + r} A${Math.max(rx, 0.01)} ${r} 0 0 ${inner} ${c} ${c - r}Z`, fill: '#e4e4e7' }));
    const el = svg('0 0 72 72', kids, `Moon, ${Math.round(k * 100)}% lit`);
    if (lat < 0) el.style.transform = 'rotate(180deg)';
    return el;
  }

  function mount(el) {
    const loc0 = () => PT.store.get().location;
    const root = h('div', { class: 'screen-pad stack-lg' });

    /* Header and location */
    const locName = h('div', { class: 'light-locname' });
    const locCoords = h('div', { class: 'light-coords' });
    const msg = h('div', { class: 'light-msg', role: 'status' });
    const latIn = h('input', { type: 'number', class: 'input num', step: 'any', 'aria-label': 'Latitude', inputmode: 'decimal' });
    const lonIn = h('input', { type: 'number', class: 'input num', step: 'any', 'aria-label': 'Longitude', inputmode: 'decimal' });
    const sel = h('select', { class: 'select', 'aria-label': 'City' },
      h('option', { value: '' }, 'Choose a city'),
      PRESETS.map((p, i) => h('option', { value: i }, p[0])));
    const syncInputs = () => { latIn.value = +loc0().lat.toFixed(4); lonIn.value = +loc0().lon.toFixed(4); };
    sel.addEventListener('change', () => {
      const p = PRESETS[Number(sel.value)];
      if (!p) return;
      msg.textContent = '';
      PT.store.set({ location: { name: p[0], lat: p[1], lon: p[2], tz: p[3] } });
    });
    const geoBtn = h('button', { type: 'button', class: 'btn btn-outline btn-sm' }, PT.icon('mapPin', 14), 'Use my location');
    geoBtn.addEventListener('click', () => {
      if (!navigator.geolocation) { msg.textContent = 'Location is not available here. Pick a city or enter coordinates.'; return; }
      msg.textContent = 'Finding your location.';
      navigator.geolocation.getCurrentPosition(
        pos => { msg.textContent = ''; PT.store.set({ location: { name: 'My location', lat: pos.coords.latitude, lon: pos.coords.longitude, tz: null } }); },
        () => { msg.textContent = 'Location is blocked. Pick a city or enter coordinates.'; },
        { timeout: 8000 });
    });
    const saveBtn = h('button', { type: 'button', class: 'btn btn-sm' }, 'Save coordinates');
    saveBtn.addEventListener('click', () => {
      const lat = parseFloat(latIn.value), lon = parseFloat(lonIn.value);
      if (!(lat >= -90 && lat <= 90) || !(lon >= -180 && lon <= 180)) { msg.textContent = 'Latitude must be between −90 and 90, longitude between −180 and 180.'; return; }
      msg.textContent = '';
      PT.store.set({ location: { name: 'Custom location', lat, lon, tz: null } });
    });
    const editCard = h('div', { class: 'card', hidden: true },
      h('div', { class: 'card-content stack' },
        h('label', { class: 'field' }, h('span', { class: 'label' }, 'City'), sel),
        geoBtn,
        h('div', { class: 'field-row' },
          h('label', { class: 'field' }, h('span', { class: 'label' }, 'Latitude'), latIn),
          h('label', { class: 'field' }, h('span', { class: 'label' }, 'Longitude'), lonIn)),
        h('div', { class: 'row' }, saveBtn),
        msg));
    const changeBtn = h('button', { type: 'button', class: 'btn btn-ghost btn-sm', 'aria-expanded': 'false' }, 'Change');
    changeBtn.addEventListener('click', () => {
      editCard.hidden = !editCard.hidden;
      changeBtn.setAttribute('aria-expanded', String(!editCard.hidden));
      changeBtn.textContent = editCard.hidden ? 'Change' : 'Done';
      syncInputs();
    });

    TZ = tzFor(loc0());
    const dateIn = h('input', { type: 'date', class: 'input num', 'aria-label': 'Date', value: dateStr || ymd(new Date()) });
    const todayBtn = h('button', { type: 'button', class: 'btn btn-outline btn-sm' }, 'Today');
    dateIn.addEventListener('input', () => {
      if (!dateIn.value) return;
      dateStr = dateIn.value === ymd(new Date()) ? null : dateIn.value;
      render();
    });
    todayBtn.addEventListener('click', () => { dateStr = null; dateIn.value = ymd(new Date()); render(); });

    /* Dynamic hosts */
    const nowHost = h('div'), dataHost = h('div', { class: 'stack-lg' });
    const shadowOut = h('div', { class: 'light-shadow-out' });
    const shadowSub = h('div', { class: 'light-sub' });
    const shadowCard = PT.ui.card({
      title: 'Shadow length',
      content: h('div', { class: 'stack' },
        PT.ui.numberInput({ label: 'Subject height', suffix: 'm', value: heightM, step: 0.1, min: 0.1, onChange: v => { heightM = Math.max(0.01, v); render(); } }),
        h('div', { class: 'stack-sm' }, shadowOut, shadowSub))
    });
    const moonHost = h('div');

    root.append(
      h('div', { class: 'stack' },
        h('h1', { class: 'screen-title' }, 'Light'),
        h('div', { class: 'light-locrow' }, h('div', null, locName, locCoords), changeBtn),
        editCard,
        h('div', { class: 'light-daterow' }, dateIn, todayBtn)),
      nowHost, dataHost, shadowCard, moonHost);
    el.append(root);

    function render() {
      const loc = loc0(), real = new Date();
      TZ = tzFor(loc);
      dateIn.value = dateStr || ymd(real);
      const date = chosenDate(), isToday = !dateStr, now = isToday ? real : date;
      locName.textContent = loc.name;
      locCoords.textContent = `${Math.abs(loc.lat).toFixed(4)}° ${loc.lat >= 0 ? 'N' : 'S'}, ${Math.abs(loc.lon).toFixed(4)}° ${loc.lon >= 0 ? 'E' : 'W'}`;
      const tm = PT.sun.times(date, loc.lat, loc.lon);

      /* Now */
      nowHost.replaceChildren();
      if (isToday) {
        const ph = PT.sun.phaseAt(real, loc.lat, loc.lon), pos = PT.sun.position(real, loc.lat, loc.lon);
        const ev = nextEvent(real, loc, ph);
        nowHost.append(PT.ui.card({
          title: 'Now',
          content: h('div', { class: 'stack' },
            h('div', { class: 'stack-sm' },
              h('div', { class: 'light-now-value' }, ph.name),
              h('div', { class: 'light-now-count' }, ev ? ev.text : 'No golden or blue hour in the next day.')),
            h('div', { class: 'stats' },
              h('div', { class: 'stat' }, h('div', { class: 'stat-value' }, `${fmtDeg(pos.azimuth)} ${compassWord(pos.azimuth)}`), h('div', { class: 'stat-label' }, 'Sun azimuth')),
              h('div', { class: 'stat' }, h('div', { class: 'stat-value' }, `${pos.altitude.toFixed(1)}°`), h('div', { class: 'stat-label' }, 'Sun altitude'))))
        }));
      }

      /* Timeline, path, direction */
      const rows = [
        ['Astronomical dawn', hhmm(tm.astroDawn)],
        ['Blue hour, morning', range(tm.blueMorningStart, tm.blueMorningEnd)],
        ['Golden hour, morning', range(tm.goldenMorningStart, tm.goldenMorningEnd)],
        ['Sunrise', hhmm(tm.sunrise)],
        ['Solar noon', hhmm(tm.solarNoon)],
        ['Sunset', hhmm(tm.sunset)],
        ['Golden hour, evening', range(tm.goldenEveningStart, tm.goldenEveningEnd)],
        ['Blue hour, evening', range(tm.blueEveningStart, tm.blueEveningEnd)],
        ['Astronomical dusk', hhmm(tm.astroDusk)]
      ];
      const legend = h('div', { class: 'light-legend' },
        [['night', 'Night'], ['astro', 'Astro'], ['nautical', 'Nautical'], ['blue', 'Blue'], ['golden', 'Golden'], ['day', 'Day']]
          .map(([id, t]) => h('span', null, h('i', { class: `light-swatch light-sw-${id}` }), t)));
      const timelineCard = PT.ui.card({
        title: 'Day timeline',
        description: `${date.toLocaleDateString(undefined, { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short' })}, times in ${loc.tz ? `${loc.name} time` : 'your device’s time zone'}`,
        content: h('div', null, buildTimeline(date, loc, now, isToday), legend, h('div', { class: 'light-times' }, PT.ui.kv(rows)))
      });
      const pathCard = PT.ui.card({
        title: 'Sun path',
        description: 'Altitude through the day. Golden hour is the amber band, blue hour the blue band.',
        content: buildPath(date, loc, now, isToday, tm)
      });
      const comp = buildCompass(date, loc, now, isToday, tm);
      let setLine;
      if (tm.sunset) {
        const az = PT.sun.position(tm.sunset, loc.lat, loc.lon).azimuth;
        setLine = `Sun sets toward the ${compassWord(az)} (${Math.round(az)}°)`;
      } else {
        setLine = comp.p.altitude > 0 || PT.sun.position(tm.solarNoon, loc.lat, loc.lon).altitude > 0 ? 'The sun does not set on this date.' : 'The sun does not rise on this date.';
      }
      const dirCard = PT.ui.card({
        title: 'Sun direction',
        description: isToday ? 'The arrow shows the sun now. Circles mark sunrise and sunset.' : 'The arrow shows the sun at solar noon. Circles mark sunrise and sunset.',
        content: h('div', null, h('div', { style: { maxWidth: '240px', margin: '0 auto' } }, comp.el),
          h('div', { class: 'light-caption', style: { textAlign: 'center' } }, setLine))
      });
      dataHost.replaceChildren(timelineCard, pathCard, dirCard);

      /* Shadow */
      const alt = PT.sun.position(now, loc.lat, loc.lon).altitude;
      if (alt <= 0) { shadowOut.textContent = 'No shadow'; shadowSub.textContent = 'No shadow, sun below the horizon.'; }
      else {
        const len = PT.math.shadowLength(heightM, alt);
        shadowOut.textContent = len > 200 ? 'Over 200 m' : PT.math.formatDistance(len * 1000);
        shadowSub.textContent = `For a ${+heightM.toFixed(2)} m subject with the sun ${alt.toFixed(1)}° up${isToday ? ' now' : ' at solar noon'}.`;
      }
      if (!isToday) { /* shadow at solar noon for other dates */
        const a2 = PT.sun.position(tm.solarNoon, loc.lat, loc.lon).altitude;
        if (a2 > 0) { const len = PT.math.shadowLength(heightM, a2); shadowOut.textContent = len > 200 ? 'Over 200 m' : PT.math.formatDistance(len * 1000); shadowSub.textContent = `For a ${+heightM.toFixed(2)} m subject at solar noon, sun ${a2.toFixed(1)}° up.`; }
      }

      /* Moon */
      const mo = PT.sun.moon(isToday ? real : tm.solarNoon, loc.lat, loc.lon);
      moonHost.replaceChildren(PT.ui.card({
        title: 'Moon',
        content: h('div', { class: 'stack' },
          h('div', { class: 'light-moon' }, buildMoon(mo, loc.lat),
            h('div', { class: 'stack-sm' },
              h('div', { class: 'light-now-value', style: { fontSize: '18px' } }, mo.phaseName),
              h('div', { class: 'light-sub num' }, `${Math.round(mo.fraction * 100)}% lit`))),
          PT.ui.kv([
            ['Moonrise', hhmm(mo.rise)], ['Moonset', hhmm(mo.set)],
            ['Altitude', `${mo.altitude.toFixed(1)}°`], ['Azimuth', `${fmtDeg(mo.azimuth)} ${compassWord(mo.azimuth)}`]
          ]),
          h('div', { class: 'light-note' }, PT.ui.tierBadge('v2'),
            h('span', null, 'The Milky Way core is best in dark skies within a few days of new moon.')))
      }));
    }

    syncInputs();
    render();
    const timer = setInterval(render, 30000);
    const unsub = PT.store.subscribe(() => { syncInputs(); render(); });
    return () => { clearInterval(timer); unsub(); };
  }

  function panelExtras(el) {
    el.append(PT.ui.card({
      title: 'How the phases are defined',
      description: 'By the elevation of the sun’s centre above the horizon. Sunrise and sunset use −0.833°.',
      content: h('div', { class: 'list' }, BANDS.map(([name, band, id]) =>
        h('div', { class: 'list-item' },
          h('span', { class: 'row' }, h('i', { class: `light-swatch light-sw-${id}` }), name),
          h('span', { class: 'muted num' }, band))))
    }));
  }

  PT.registerScreen({
    id: 'light', title: 'Light', icon: 'sun', mount, panelExtras,
    panel: {
      summary: 'Plan shoots around golden and blue hour. Everything is computed offline from the location and date, so it works without a signal. Pick a city or use your location, then check the timeline, sun path and direction.',
      features: [
        { name: 'Sun times', tier: 'v1', note: 'Sunrise, sunset, solar noon and twilight for any date.' },
        { name: 'Golden and blue hour', tier: 'v1', note: 'Start and end times, shown on a 24-hour timeline.' },
        { name: 'Sun azimuth and altitude', tier: 'v1', note: 'Where the sun is now, with a compass direction.' },
        { name: 'Countdown', tier: 'v1', note: 'Time to the next golden or blue hour, or time left in this one.' },
        { name: 'Sun path in AR', tier: 'v2', note: 'Draws the day’s arc over the live camera. This lives in the viewfinder.' },
        { name: 'Moon', tier: 'v2', note: 'Phase, illumination, rise, set and position.' },
        { name: 'Shadow length', tier: 'v2', note: 'Subject height divided by the tangent of the sun’s elevation.' },
        { name: 'Milky Way', tier: 'v2', note: 'When the galactic core is up and where. Best near new moon.' },
        { name: 'Map planner', tier: 'v2', note: 'Sun and moon direction lines on a map with a time slider.' },
        { name: 'Weather', tier: 'v3', note: 'Cloud cover and visibility to judge if the light will show up.' }
      ]
    }
  });
})(window.PT);
