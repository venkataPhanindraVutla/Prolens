/* A procedural golden-hour landscape used when there is no camera feed.
   It has a bright sun (for clipping/zebras), hard edges (for peaking) and a person on a thirds point. */
(function (PT) {
  const cache = new Map();

  function render(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    const horizon = h * 0.58;

    const sky = g.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, '#24345c');
    sky.addColorStop(0.55, '#c9785a');
    sky.addColorStop(1, '#f6c27a');
    g.fillStyle = sky; g.fillRect(0, 0, w, horizon);

    // Sun, clipped highlights in the core
    const sx = w * 0.7, sy = horizon - h * 0.07, sr = Math.min(w, h) * 0.05;
    const glow = g.createRadialGradient(sx, sy, 0, sx, sy, sr * 6);
    glow.addColorStop(0, 'rgba(255,250,235,1)');
    glow.addColorStop(0.18, 'rgba(255,236,190,0.9)');
    glow.addColorStop(1, 'rgba(255,200,140,0)');
    g.fillStyle = glow; g.fillRect(0, 0, w, horizon);
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(sx, sy, sr, 0, Math.PI * 2); g.fill();

    // Far mountains
    g.fillStyle = '#6b4a5e';
    ridge(g, w, horizon, h * 0.16, 7, 0.3);
    g.fillStyle = '#3d2f45';
    ridge(g, w, horizon, h * 0.09, 11, 0.7);

    // Lake with reflection
    const lake = g.createLinearGradient(0, horizon, 0, h * 0.78);
    lake.addColorStop(0, '#e9a86f');
    lake.addColorStop(1, '#3b3550');
    g.fillStyle = lake; g.fillRect(0, horizon, w, h * 0.2);
    g.fillStyle = 'rgba(255,240,210,0.55)';
    for (let i = 0; i < 9; i++) g.fillRect(sx - sr * (1.6 - i * 0.12), horizon + 4 + i * h * 0.012, sr * (3.2 - i * 0.24), 2);

    // Foreground ground
    const fg = g.createLinearGradient(0, h * 0.76, 0, h);
    fg.addColorStop(0, '#2b2a24');
    fg.addColorStop(1, '#0d0d0b');
    g.fillStyle = fg;
    g.beginPath(); g.moveTo(0, h * 0.8);
    g.quadraticCurveTo(w * 0.5, h * 0.73, w, h * 0.79);
    g.lineTo(w, h); g.lineTo(0, h); g.fill();

    // Tree on the left
    const tx = w * 0.16, ty = h * 0.8;
    g.fillStyle = '#121210';
    g.fillRect(tx - 3, ty - h * 0.2, 6, h * 0.2);
    for (let i = 0; i < 5; i++) {
      g.beginPath();
      g.ellipse(tx + (i % 2 ? 14 : -14), ty - h * 0.2 - i * 16, 30 - i * 3, 22 - i * 2, 0, 0, Math.PI * 2);
      g.fill();
    }

    // Person on the lower-right thirds point
    const px = w * 0.62, pb = h * 0.775, ph = h * 0.11;
    g.fillStyle = '#0a0a0a';
    g.beginPath(); g.arc(px, pb - ph * 0.92, ph * 0.09, 0, Math.PI * 2); g.fill();
    g.beginPath();
    g.moveTo(px - ph * 0.13, pb - ph * 0.8); g.lineTo(px + ph * 0.13, pb - ph * 0.8);
    g.lineTo(px + ph * 0.1, pb - ph * 0.38); g.lineTo(px + ph * 0.07, pb);
    g.lineTo(px - ph * 0.07, pb); g.lineTo(px - ph * 0.1, pb - ph * 0.38);
    g.closePath(); g.fill();

    // A little texture so peaking has something to find on the ground
    g.strokeStyle = 'rgba(255,255,255,0.08)';
    for (let i = 0; i < 60; i++) {
      const x = (i * 97) % w, y = h * 0.84 + ((i * 53) % (h * 0.15));
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + 6, y - 8); g.stroke();
    }
    return c;
  }

  function ridge(g, w, base, amp, n, phase) {
    g.beginPath(); g.moveTo(0, base);
    for (let i = 0; i <= n * 4; i++) {
      const x = (i / (n * 4)) * w;
      const y = base - amp * (0.55 + 0.45 * Math.sin(i * 0.9 + phase * 10) * Math.cos(i * 0.37 + phase));
      g.lineTo(x, y);
    }
    g.lineTo(w, base); g.closePath(); g.fill();
  }

  PT.scene = {
    /* Returns a cached canvas of the scene at w×h. Draw it with ctx.drawImage(). */
    get(w, h) {
      const key = `${w}x${h}`;
      if (!cache.has(key)) cache.set(key, render(w, h));
      return cache.get(key);
    }
  };
})(window.PT);
