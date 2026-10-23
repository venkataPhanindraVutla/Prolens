/* Sun and moon maths.
   Ported from SunCalc (https://github.com/mourner/suncalc)
   Copyright (c) 2011-2015, Vladimir Agafonkin. BSD-2-Clause licence.
   Redistribution and use in source and binary forms, with or without modification, are permitted
   provided the copyright notice and this condition are retained. Provided "as is", without warranty.
   Adapted for this prototype: degrees in the public API, azimuth 0 = north clockwise,
   null instead of NaN dates, extra twilight bands, local-day path. */
(function (PT) {
  const PI = Math.PI, rad = PI / 180, deg = 180 / PI;
  const dayMs = 86400000, J1970 = 2440588, J2000 = 2451545;

  const toJulian = date => date.valueOf() / dayMs - 0.5 + J1970;
  const fromJulian = j => new Date((j + 0.5 - J1970) * dayMs);
  const toDays = date => toJulian(date) - J2000;

  const e = rad * 23.4397;
  const rightAscension = (l, b) => Math.atan2(Math.sin(l) * Math.cos(e) - Math.tan(b) * Math.sin(e), Math.cos(l));
  const declination = (l, b) => Math.asin(Math.sin(b) * Math.cos(e) + Math.cos(b) * Math.sin(e) * Math.sin(l));
  const azimuthRad = (H, phi, dec) => Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi));
  const altitudeRad = (H, phi, dec) => Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H));
  const siderealTime = (d, lw) => rad * (280.16 + 360.9856235 * d) - lw;
  function astroRefraction(h) {
    if (h < 0) h = 0;
    return 0.0002967 / Math.tan(h + 0.00312536 / (h + 0.08901179));
  }

  const solarMeanAnomaly = d => rad * (357.5291 + 0.98560028 * d);
  function eclipticLongitude(M) {
    const C = rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
    return M + C + rad * 102.9372 + PI;
  }
  function sunCoords(d) {
    const M = solarMeanAnomaly(d), L = eclipticLongitude(M);
    return { dec: declination(L, 0), ra: rightAscension(L, 0) };
  }

  const J0 = 0.0009;
  const julianCycle = (d, lw) => Math.round(d - J0 - lw / (2 * PI));
  const approxTransit = (Ht, lw, n) => J0 + (Ht + lw) / (2 * PI) + n;
  const solarTransitJ = (ds, M, L) => J2000 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
  const hourAngle = (h, phi, d) => Math.acos((Math.sin(h) - Math.sin(phi) * Math.sin(d)) / (Math.cos(phi) * Math.cos(d)));
  function setJ(h, lw, phi, dec, n, M, L) {
    const w = hourAngle(h, phi, dec), a = approxTransit(w, lw, n);
    return solarTransitJ(a, M, L);
  }

  const norm360 = x => ((x % 360) + 360) % 360;

  function sunPosRaw(date, lat, lon) {
    const lw = rad * -lon, phi = rad * lat, d = toDays(date), c = sunCoords(d);
    const H = siderealTime(d, lw) - c.ra;
    return { az: azimuthRad(H, phi, c.dec), alt: altitudeRad(H, phi, c.dec) };
  }

  function position(date, lat, lon) {
    const p = sunPosRaw(date, lat, lon);
    return { azimuth: norm360(p.az * deg + 180), altitude: p.alt * deg };
  }

  /* Bands: [name, elevation degrees, rising key, setting key] */
  const ANGLES = [
    ['goldenMorningStart', -4, true], ['goldenMorningEnd', 6, true],
    ['goldenEveningStart', 6, false], ['goldenEveningEnd', -4, false],
    ['blueMorningStart', -6, true], ['blueMorningEnd', -4, true],
    ['blueEveningStart', -4, false], ['blueEveningEnd', -6, false],
    ['civilDawn', -6, true], ['civilDusk', -6, false],
    ['nauticalDawn', -12, true], ['nauticalDusk', -12, false],
    ['astroDawn', -18, true], ['astroDusk', -18, false],
    ['sunrise', -0.833, true], ['sunset', -0.833, false]
  ];

  function times(date, lat, lon) {
    const noonLocal = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);
    const lw = rad * -lon, phi = rad * lat, d = toDays(noonLocal);
    const n = julianCycle(d, lw), ds = approxTransit(0, lw, n);
    const M = solarMeanAnomaly(ds), L = eclipticLongitude(M), dec = declination(L, 0);
    const Jnoon = solarTransitJ(ds, M, L);
    const out = { solarNoon: fromJulian(Jnoon) };
    ANGLES.forEach(([key, angle, rising]) => {
      const Jset = setJ(angle * rad, lw, phi, dec, n, M, L);
      if (!isFinite(Jset)) { out[key] = null; return; }
      const j = rising ? Jnoon - (Jset - Jnoon) : Jset;
      out[key] = fromJulian(j);
    });
    return out;
  }

  function path(date, lat, lon, stepMin = 30) {
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
    const end = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1, 0, 0, 0, 0);
    const step = Math.max(1, stepMin) * 60000, res = [];
    for (let t = start.getTime(); t <= end.getTime(); t += step) {
      const time = new Date(t), p = position(time, lat, lon);
      res.push({ time, azimuth: p.azimuth, altitude: p.altitude });
    }
    return res;
  }

  function phaseAt(date, lat, lon) {
    const a = position(date, lat, lon).altitude;
    let id, name;
    if (a > 6) { id = 'day'; name = 'Daylight'; }
    else if (a >= -4) { id = 'golden'; name = 'Golden hour'; }
    else if (a >= -6) { id = 'blue'; name = 'Blue hour'; }
    else if (a >= -12) { id = 'nautical'; name = 'Nautical twilight'; }
    else if (a >= -18) { id = 'astro'; name = 'Astronomical twilight'; }
    else { id = 'night'; name = 'Night'; }
    return { id, name, altitude: a };
  }

  /* Moon */
  function moonCoords(d) {
    const L = rad * (218.316 + 13.176396 * d), M = rad * (134.963 + 13.064993 * d), F = rad * (93.272 + 13.229350 * d);
    const l = L + rad * 6.289 * Math.sin(M), b = rad * 5.128 * Math.sin(F), dt = 385001 - 20905 * Math.cos(M);
    return { ra: rightAscension(l, b), dec: declination(l, b), dist: dt };
  }
  function moonPosRaw(date, lat, lon) {
    const lw = rad * -lon, phi = rad * lat, d = toDays(date), c = moonCoords(d);
    const H = siderealTime(d, lw) - c.ra;
    let h = altitudeRad(H, phi, c.dec);
    h = h + astroRefraction(h);
    return { az: azimuthRad(H, phi, c.dec), alt: h };
  }
  function moonIllum(date) {
    const d = toDays(date), s = sunCoords(d), m = moonCoords(d), sdist = 149598000;
    const phi = Math.acos(Math.sin(s.dec) * Math.sin(m.dec) + Math.cos(s.dec) * Math.cos(m.dec) * Math.cos(s.ra - m.ra));
    const inc = Math.atan2(sdist * Math.sin(phi), m.dist - sdist * Math.cos(phi));
    const angle = Math.atan2(Math.cos(s.dec) * Math.sin(s.ra - m.ra), Math.sin(s.dec) * Math.cos(m.dec) - Math.cos(s.dec) * Math.sin(m.dec) * Math.cos(s.ra - m.ra));
    return { fraction: (1 + Math.cos(inc)) / 2, phase: 0.5 + 0.5 * inc * (angle < 0 ? -1 : 1) / PI };
  }
  function phaseName(p) {
    if (p < 0.03 || p >= 0.97) return 'New moon';
    if (p < 0.22) return 'Waxing crescent';
    if (p < 0.28) return 'First quarter';
    if (p < 0.47) return 'Waxing gibbous';
    if (p < 0.53) return 'Full moon';
    if (p < 0.72) return 'Waning gibbous';
    if (p < 0.78) return 'Last quarter';
    return 'Waning crescent';
  }
  /* Rise and set within the local calendar day of `date`, by hourly scan and quadratic interpolation. */
  function moonTimes(date, lat, lon) {
    const t0 = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0).getTime();
    const hc = 0.133 * rad;
    const alt = i => moonPosRaw(new Date(t0 + i * 3600000), lat, lon).alt - hc;
    let rise = null, set = null, h0 = alt(0);
    for (let i = 1; i <= 24; i += 2) {
      const h1 = alt(i), h2 = alt(i + 1);
      const a = (h0 + h2) / 2 - h1, b = (h2 - h0) / 2, xe = -b / (2 * a), ye = (a * xe + b) * xe + h1;
      const disc = b * b - 4 * a * h1;
      if (disc >= 0) {
        const dx = Math.sqrt(disc) / (Math.abs(a) * 2);
        let x1 = xe - dx; const x2 = xe + dx, roots = [];
        if (Math.abs(x1) <= 1) roots.push(x1);
        if (Math.abs(x2) <= 1) roots.push(x2);
        if (roots.length === 1) {
          if (h0 < 0) { if (!rise) rise = i + roots[0]; } else if (!set) set = i + roots[0];
        } else if (roots.length === 2) {
          const r = ye < 0 ? roots[1] : roots[0], s = ye < 0 ? roots[0] : roots[1];
          if (!rise) rise = i + r;
          if (!set) set = i + s;
        }
      }
      if (rise && set) break;
      h0 = h2;
    }
    const toDate = v => (v == null || !isFinite(v) || v > 24 || v < 0) ? null : new Date(t0 + v * 3600000);
    return { rise: toDate(rise), set: toDate(set) };
  }

  function moon(date, lat, lon) {
    const p = moonPosRaw(date, lat, lon), il = moonIllum(date), mt = moonTimes(date, lat, lon);
    return {
      azimuth: norm360(p.az * deg + 180), altitude: p.alt * deg,
      fraction: il.fraction, phase: il.phase, phaseName: phaseName(il.phase),
      rise: mt.rise, set: mt.set
    };
  }

  PT.sun = { position, times, path, moon, phaseAt };
})(window.PT);
