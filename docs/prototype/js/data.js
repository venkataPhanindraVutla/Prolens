/* Static data: gear presets, genre recipes, and the default app state. */
(function (PT) {
  /* Sensor sizes in mm. */
  const BODIES = [
    { id: 'sony-a7iv', name: 'Sony A7 IV', format: 'Full frame', sensorW: 35.9, sensorH: 23.9, mp: 33, ibisStops: 5.5 },
    { id: 'canon-r6ii', name: 'Canon EOS R6 Mark II', format: 'Full frame', sensorW: 35.9, sensorH: 23.9, mp: 24.2, ibisStops: 8 },
    { id: 'nikon-z8', name: 'Nikon Z8', format: 'Full frame', sensorW: 35.9, sensorH: 23.9, mp: 45.7, ibisStops: 6 },
    { id: 'fuji-xt5', name: 'Fujifilm X-T5', format: 'APS-C', sensorW: 23.5, sensorH: 15.6, mp: 40.2, ibisStops: 7 },
    { id: 'canon-r7', name: 'Canon EOS R7', format: 'APS-C (1.6×)', sensorW: 22.3, sensorH: 14.8, mp: 32.5, ibisStops: 7 },
    { id: 'om-1', name: 'OM System OM-1', format: 'Micro Four Thirds', sensorW: 17.4, sensorH: 13.0, mp: 20.4, ibisStops: 7 },
    { id: 'phone-main', name: 'Phone main camera', format: '1/1.3-inch', sensorW: 9.6, sensorH: 7.2, mp: 50, ibisStops: 2 }
  ];

  /* Focal lengths in real mm (not equivalent). */
  const LENSES = [
    { id: 'z-16-35', name: '16–35mm f/4', minF: 16, maxF: 35, maxAperture: 4, minAperture: 22 },
    { id: 'z-24-70', name: '24–70mm f/2.8', minF: 24, maxF: 70, maxAperture: 2.8, minAperture: 22 },
    { id: 'p-35', name: '35mm f/1.4', minF: 35, maxF: 35, maxAperture: 1.4, minAperture: 16 },
    { id: 'p-50', name: '50mm f/1.8', minF: 50, maxF: 50, maxAperture: 1.8, minAperture: 22 },
    { id: 'p-85', name: '85mm f/1.4', minF: 85, maxF: 85, maxAperture: 1.4, minAperture: 16 },
    { id: 'z-70-200', name: '70–200mm f/2.8', minF: 70, maxF: 200, maxAperture: 2.8, minAperture: 22 },
    { id: 'z-200-600', name: '200–600mm f/5.6–6.3', minF: 200, maxF: 600, maxAperture: 5.6, minAperture: 32 },
    { id: 'm-100', name: '100mm f/2.8 Macro', minF: 100, maxF: 100, maxAperture: 2.8, minAperture: 32 },
    { id: 'phone-24', name: 'Phone 24mm-eq f/1.7', minF: 6.9, maxF: 6.9, maxAperture: 1.7, minAperture: 1.7 }
  ];

  /* Genre recipes. `apply` is merged into state.viewfinder by Coach's "Use in viewfinder". */
  const RECIPES = [
    { id: 'headshot', name: 'Headshot', focal: '85–135 mm', aperture: 'f/1.8–f/2.8', shutter: '1/200 s+', iso: '100–400', af: 'AF-S, eye AF', grid: 'Thirds, eye on the top line',
      tips: ['Lens at or slightly above eye level.', 'Focus on the nearest eye.', 'Stand 1.5–3 m back so the face isn’t distorted.', 'Use open shade or a window at 45° for soft loop lighting.'],
      apply: { grid: 'thirds', aspect: '4:5', level: true, exposure: { iso: 200, shutter: 1 / 250, ev: 0.3 } } },
    { id: 'env-portrait', name: 'Environmental portrait', focal: '35 mm', aperture: 'f/2.8–f/4', shutter: '1/200 s', iso: 'Auto', af: 'Eye AF', grid: 'Phi grid',
      tips: ['Show the person’s place: their workshop, kitchen or street.', 'Keep verticals straight with the pitch level.', 'Put the person on a phi line, not dead centre.'],
      apply: { grid: 'phi', aspect: '3:2', level: true, exposure: { iso: 400, shutter: 1 / 200, ev: 0 } } },
    { id: 'landscape', name: 'Landscape', focal: '16–35 mm', aperture: 'f/8–f/11', shutter: 'Tripod, any', iso: '100', af: 'Manual, hyperfocal', grid: 'Level, thirds',
      tips: ['Put the horizon on a third, never through the middle.', 'Add a foreground element for depth.', 'Focus at the hyperfocal distance.', 'Shoot in golden hour for side light and long shadows.'],
      apply: { grid: 'thirds', aspect: '3:2', level: true, exposure: { iso: 100, shutter: 1 / 60, ev: -0.3 } } },
    { id: 'street', name: 'Street', focal: '28–35 mm', aperture: 'f/8', shutter: '1/500 s', iso: 'Auto', af: 'Zone focus at 3 m', grid: 'Dynamic symmetry',
      tips: ['Pre-focus at 3 m and shoot from the hip if needed.', 'Find good light and a background, then wait for the subject.', 'Use diagonals and reciprocals to place figures.'],
      apply: { grid: 'dynamic', aspect: '3:2', level: true, exposure: { iso: 800, shutter: 1 / 500, ev: 0 } } },
    { id: 'sports', name: 'Sports', focal: '70–400 mm', aperture: 'f/2.8–f/4', shutter: '1/1000 s+', iso: 'Auto', af: 'AF-C, tracking', grid: 'Lead room',
      tips: ['Leave space in the direction of travel.', 'Use burst mode and pick the peak moment.', 'Get low to make athletes look powerful.'],
      apply: { grid: 'thirds', aspect: '3:2', level: true, exposure: { iso: 1600, shutter: 1 / 1600, ev: 0 } } },
    { id: 'wildlife', name: 'Wildlife and birds', focal: '400–600 mm', aperture: 'Wide open', shutter: '1/2000 s+', iso: 'Auto', af: 'AF-C, animal eye', grid: 'Thirds',
      tips: ['Get down to the animal’s eye level.', 'Shoot with the sun behind you for catchlights.', 'Birds in flight need 1/2000 s or faster.'],
      apply: { grid: 'thirds', aspect: '3:2', level: true, exposure: { iso: 1600, shutter: 1 / 2000, ev: 0.3 } } },
    { id: 'astro', name: 'Astro and Milky Way', focal: '14–24 mm', aperture: 'f/1.4–f/2.8', shutter: 'NPF rule (≈10–20 s)', iso: '1600–6400', af: 'Manual at infinity', grid: 'Level',
      tips: ['Shoot near new moon, after astronomical twilight.', 'Use the NPF rule so stars stay round.', 'Focus manually on a bright star using the loupe.', 'Use a 2 s timer on a tripod.'],
      apply: { grid: 'thirds', aspect: '3:2', level: true, exposure: { iso: 3200, shutter: 15, ev: 0 } } },
    { id: 'macro', name: 'Macro', focal: '90–105 mm macro', aperture: 'f/8–f/16', shutter: '1/200 s + flash', iso: '100–400', af: 'Manual, focus stack', grid: 'Centre, peaking',
      tips: ['Depth of field is millimetres. Use focus stacking.', 'Move the camera, not the focus ring, for fine focus.', 'Use diffused flash to freeze motion.'],
      apply: { grid: 'center', aspect: '1:1', level: false, peaking: true, exposure: { iso: 200, shutter: 1 / 200, ev: 0 } } },
    { id: 'architecture', name: 'Architecture', focal: '16–24 mm', aperture: 'f/8', shutter: 'Tripod', iso: '100', af: 'AF-S', grid: 'Pitch level, centre cross',
      tips: ['Keep pitch at 0° so verticals stay parallel.', 'Use symmetry and the centre cross for facades.', 'Bracket exposures for bright windows.'],
      apply: { grid: 'center', aspect: '3:2', level: true, exposure: { iso: 100, shutter: 1 / 125, ev: 0 } } },
    { id: 'food', name: 'Food (top-down)', focal: '50–100 mm', aperture: 'f/4–f/8', shutter: '1/125 s', iso: '100–400', af: 'AF-S', grid: 'Top-down level, square grid',
      tips: ['Use the top-down bubble so the plate isn’t skewed.', 'Side light from a window gives texture.', 'Odd numbers of items look more natural.'],
      apply: { grid: 'fine', aspect: '4:5', level: true, exposure: { iso: 200, shutter: 1 / 125, ev: 0.3 } } },
    { id: 'product', name: 'Product', focal: '50–100 mm', aperture: 'f/8–f/11', shutter: 'Flash sync (1/200 s)', iso: '100', af: 'Manual, focus stack', grid: 'Fine grid',
      tips: ['Use a tripod so every frame lines up for stacking.', 'Big, soft light sources show the shape; add a rim light for edges.', 'Keep the product square to the camera with the level.'],
      apply: { grid: 'fine', aspect: '1:1', level: true, peaking: true, exposure: { iso: 100, shutter: 1 / 200, ev: 0 } } },
    { id: 'night-city', name: 'Night city', focal: '24–50 mm', aperture: 'f/8', shutter: '2–30 s', iso: '100', af: 'Manual', grid: 'Thirds',
      tips: ['Shoot in blue hour: the sky matches the city lights.', 'Long exposures turn traffic into light trails.', 'f/11–f/16 makes street lights into sunstars.'],
      apply: { grid: 'thirds', aspect: '16:9', level: true, exposure: { iso: 100, shutter: 8, ev: 0 } } },
    { id: 'waterfall', name: 'Waterfall', focal: '24–70 mm', aperture: 'f/11', shutter: '0.5–2 s', iso: '100', af: 'AF-S', grid: 'Golden spiral',
      tips: ['Use an ND filter to reach 1 s in daylight.', 'Overcast days avoid harsh highlights on the water.', 'Use a tripod and a 2 s timer.'],
      apply: { grid: 'spiral', aspect: '3:2', level: true, exposure: { iso: 100, shutter: 1, ev: -0.3 } } },
    { id: 'concert', name: 'Concert', focal: '24–200 mm', aperture: 'f/2.8', shutter: '1/250 s', iso: '3200–12800', af: 'AF-C', grid: 'Thirds',
      tips: ['Expose for the face, not the stage. Stage lights fool the meter.', 'Watch zebras so spotlights don’t clip skin.', 'Time shots for peaks in the lighting.'],
      apply: { grid: 'thirds', aspect: '3:2', level: false, zebras: true, exposure: { iso: 6400, shutter: 1 / 250, ev: -0.7 } } },
    { id: 'real-estate', name: 'Real estate', focal: '14–20 mm', aperture: 'f/8', shutter: 'Bracket', iso: '100', af: 'AF-S', grid: 'Pitch level',
      tips: ['Camera at about chest height, pitch at exactly 0°.', 'Bracket 3–5 frames for window views.', 'Shoot from a corner to show the room’s size.'],
      apply: { grid: 'center', aspect: '3:2', level: true, exposure: { iso: 100, shutter: 1 / 30, ev: 0 } } }
  ];

  PT.data = { BODIES, LENSES, RECIPES };

  /* Default app state. Screens read and write through PT.store. */
  PT.defaultState = {
    gear: {
      bodies: BODIES,
      lenses: LENSES,
      activeBodyId: 'sony-a7iv',
      activeLensId: 'z-24-70',
      focalMm: 35
    },
    viewfinder: {
      grid: 'thirds',          // id from PT.grids.list, or 'none'
      grid2: 'none',           // optional second overlay
      gridOrient: 0,           // 0–3, flips for asymmetric grids
      gridOpacity: 0.7,
      gridColor: '#ffffff',
      aspect: 'full',          // 'full' | '1:1' | '4:5' | '3:2' | '4:3' | '16:9' | '9:16' | '2.39:1'
      level: true,
      angleLabel: true,
      histogram: true,
      clipping: false,
      peaking: false,
      peakingColor: '#ef4444',
      zebras: false,
      zebraLevel: 95,
      falseColor: false,
      waveform: false,
      lensFrame: false,        // show the active body+lens framing inside the phone view
      sunAR: false,
      groundGrid: false,
      steadyShot: false,
      exposure: {
        iso: 100, isoAuto: true,
        shutter: 1 / 125, shutterAuto: true,
        ev: 0,
        wbK: 5500, wbAuto: true, tint: 0,
        focusM: 3, focusAuto: true
      }
    },
    sim: { roll: 2.5, pitch: -4, heading: 250 },   // used when the device has no motion sensors
    location: { name: 'London', lat: 51.5074, lon: -0.1278, tz: 'Europe/London' },
    lastRecipeId: null
  };
})(window.PT);
