/* Coach: genre recipes, camera angles, lighting and composition lessons.
   Recipes push their settings into the viewfinder; the rest is a pocket reference. */
(function (PT) {
  const { h } = PT;

  /* ---------- SVG helpers (line drawings, currentColor) ---------- */
  const MUTED = 'var(--muted-foreground)';
  let uid = 0;

  function fig(vb, inner, cls) {
    return h('div', {
      class: `coach-fig ${cls || ''}`,
      html: `<svg viewBox="${vb}" role="img" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`
    });
  }

  /* Camera glyph pointing along +x, rotated by deg. */
  function cam(x, y, deg) {
    return `<g transform="translate(${x} ${y}) rotate(${deg})"><rect x="-6" y="-4" width="10" height="8" rx="1.5"/><path d="M4 -2.5 L8 -4.5 L8 4.5 L4 2.5 Z"/></g>`;
  }
  function person(x, ground = 64) {
    const top = ground - 44;
    return `<circle cx="${x}" cy="${top}" r="4.5"/><path d="M${x} ${top + 4.5}V${ground - 20}M${x - 6} ${top + 12}H${x + 6}M${x} ${ground - 20}L${x - 4} ${ground}M${x} ${ground - 20}L${x + 4} ${ground}"/>`;
  }
  function sight(x1, y1, x2, y2) {
    return `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${MUTED}" stroke-dasharray="2 3" stroke-width="1"/>`;
  }
  const ground = `<path d="M4 64H116" stroke="${MUTED}" stroke-width="1"/>`;

  function angleFig(kind) {
    const tx = 84;
    const aim = (cx, cy, ty) => {
      const deg = Math.atan2(ty - cy, tx - cx) * 180 / Math.PI;
      return sight(cx, cy, tx, ty) + cam(cx, cy, deg);
    };
    let inner = ground;
    switch (kind) {
      case 'eye': inner += person(tx) + aim(22, 20, 20); break;
      case 'high': inner += person(tx) + aim(22, 6, 22); break;
      case 'low': inner += person(tx) + aim(22, 56, 22); break;
      case 'overhead': inner += person(tx) + `<path d="M${tx} 12V15" stroke="${MUTED}" stroke-dasharray="2 3" stroke-width="1"/>` + cam(tx, 6, 90); break;
      case 'worm': inner += person(tx) + aim(40, 61, 24); break;
      case 'dutch':
        inner += person(tx) + sight(22, 22, tx, 22) + cam(22, 22, 20) +
          `<path d="M8 32L40 20" stroke="${MUTED}" stroke-width="1"/>`;
        break;
      case 'ots':
        inner += person(26) + person(tx) + sight(10, 20, tx, 20) + cam(8, 20, 0);
        break;
    }
    return fig('0 0 120 70', inner);
  }

  /* Standing figure with labelled crop lines. */
  function shotSizesFig() {
    const body = `<circle cx="40" cy="18" r="9"/><path d="M40 27V92M22 44H58M40 92L30 190M40 92L50 190M22 44L16 100M58 44L64 100"/>`;
    const marks = [[16, 'Extreme close-up'], [34, 'Close-up'], [58, 'Medium close-up'], [92, 'Medium'], [122, 'Medium full'], [190, 'Full']];
    const lines = marks.map(([y, t]) =>
      `<path d="M4 ${y}H96" stroke="${MUTED}" stroke-dasharray="3 3" stroke-width="1"/><text x="102" y="${y + 3}" fill="currentColor" stroke="none" font-size="9.5" font-family="inherit">${t}</text>`).join('');
    return fig('0 0 200 196', body + lines, 'coach-fig-wide');
  }

  /* Top-down lighting diagram: subject circle, camera at the bottom, light dot. */
  function lightFig(kind) {
    const spots = { front: [88, 66], side: [14, 40], back: [60, 6], top: [60, 38] };
    const [lx, ly] = spots[kind];
    let inner = `<circle cx="60" cy="40" r="10"/><path d="M56 49.5L60 55L64 49.5" stroke="${MUTED}" stroke-width="1"/>` + cam(60, 80, -90);
    let light;
    if (kind === 'top') {
      light = `<circle cx="60" cy="40" r="19" stroke-dasharray="2 3" stroke-width="1"/><circle cx="60" cy="40" r="3" fill="currentColor"/><text x="64" y="12" fill="currentColor" stroke="none" font-size="9" font-family="inherit">from above</text>`;
    } else {
      const dx = 60 - lx, dy = 40 - ly, d = Math.hypot(dx, dy), ux = dx / d, uy = dy / d;
      const rays = [-6, 0, 6].map(o => {
        const sx = lx - uy * o, sy = ly + ux * o;
        const ex = lx + ux * (d - 16) - uy * o * 0.4, ey = ly + uy * (d - 16) + ux * o * 0.4;
        return `<path d="M${sx + ux * 6} ${sy + uy * 6}L${ex} ${ey}" stroke-dasharray="2 3" stroke-width="1"/>`;
      }).join('');
      light = rays + `<circle cx="${lx}" cy="${ly}" r="4.5" fill="currentColor"/>`;
    }
    return fig('0 0 120 90', inner + `<g class="coach-light">${light}</g>`);
  }

  /* Face oval with a shadow shape. lit = light position in the 64×80 box. */
  function faceFig({ light, shadow, shadowOpacity = 0.3, turned = false }) {
    const id = `cf${++uid}`;
    const cx = turned ? 34 : 32, nx = turned ? 42 : 32;
    const [lx, ly] = light;
    const dx = cx - lx, dy = 40 - ly, d = Math.hypot(dx, dy);
    const ray = `<path d="M${lx + dx / d * 6} ${ly + dy / d * 6}L${lx + dx / d * 16} ${ly + dy / d * 16}" stroke-dasharray="2 2" stroke-width="1"/>`;
    const inner =
      `<defs><clipPath id="${id}"><ellipse cx="${cx}" cy="40" rx="19" ry="27"/></clipPath></defs>` +
      `<g clip-path="url(#${id})"><path d="${shadow}" fill="currentColor" fill-opacity="${shadowOpacity}" fill-rule="evenodd" stroke="none"/></g>` +
      `<ellipse cx="${cx}" cy="40" rx="19" ry="27"/>` +
      `<path d="M${nx} 36L${nx - 2.5} 47H${nx + 2.5}" stroke="${MUTED}" stroke-width="1"/>` +
      `<path d="M${cx - 11} 32H${cx - 5}M${cx + 5} 32H${cx + 11}" stroke="${MUTED}" stroke-width="1"/>` +
      `<g class="coach-light"><circle cx="${lx}" cy="${ly}" r="3.5" fill="currentColor"/>${ray}</g>`;
    return fig('0 0 64 80', inner);
  }

  /* ---------- Content ---------- */
  const ANGLES = [
    { id: 'eye', name: 'Eye level', effect: 'Neutral and honest. The viewer meets the subject as an equal.', use: 'Portraits, documentary, kids and pets (at their eye level).' },
    { id: 'high', name: 'High angle', effect: 'Subject looks smaller or more vulnerable. It also slims faces.', use: 'Showing context, flattering a face, making a scene feel tidy.' },
    { id: 'low', name: 'Low angle', effect: 'Subject looks strong or heroic, and legs look longer.', use: 'Athletes, fashion, anyone you want to look confident.' },
    { id: 'overhead', name: 'Bird’s-eye, overhead', effect: 'Flattens the scene into a pattern. Graphic and a bit abstract.', use: 'Food, flat lays, crowds, tops of buildings.' },
    { id: 'worm', name: 'Worm’s-eye', effect: 'Dramatic scale. Everything towers over the camera.', use: 'Architecture, trees, tall subjects, dramatic skies.' },
    { id: 'dutch', name: 'Dutch tilt', effect: 'The horizon is rolled 10 to 30 degrees. It adds tension and energy.', use: 'Music, action, unease. Use it rarely, and commit when you do.' },
    { id: 'ots', name: 'Over the shoulder', effect: 'The viewer stands behind one person and looks at another. It builds connection.', use: 'Conversations, storytelling, weddings.' }
  ];

  const SHOT_SIZES = [
    ['Extreme wide', 'The person is tiny in a big place.', 'Establishing the location.'],
    ['Wide', 'Whole body with lots of space around.', 'Context and environment.'],
    ['Full', 'Head to toe.', 'Fashion, full-length portraits.'],
    ['Medium full', 'Head to mid-thigh, sometimes called cowboy.', 'Casual portraits, groups.'],
    ['Medium', 'Head to waist.', 'Conversation, most everyday portraits.'],
    ['Medium close-up', 'Head to chest.', 'Interviews, personality.'],
    ['Close-up', 'Face, shoulders at most.', 'Emotion, headshots.'],
    ['Extreme close-up', 'Eyes or one detail.', 'Intensity, texture.']
  ];

  const POSITIONING = [
    ['Portraits at eye level', 'Put the lens at or just above the eyes. Below the chin is rarely kind.'],
    ['Full-body at waist height', 'Hold the camera around waist or chest height so the legs don’t shrink.'],
    ['Get down to kids and pets', 'Shoot at their eye level, not yours.'],
    ['Don’t crop at joints', 'Crop between wrists, elbows, knees and ankles, not through them.'],
    ['Leave lead room', 'Give space in the direction the subject looks or moves.'],
    ['Watch the headroom', 'Keep a small gap above the head, or crop the forehead on purpose. Not a gap that is just a bit too big.'],
    ['Keep architecture vertical', 'Hold the phone level (pitch 0 degrees) so buildings don’t lean, or tilt hard on purpose.']
  ];

  const DIRECTIONS = [
    { id: 'front', name: 'Front light', effect: 'Flat and even. Colours show well, but there’s little depth.' },
    { id: 'side', name: 'Side light', effect: 'Brings out texture and shape. The go-to for landscapes and portraits with character.' },
    { id: 'back', name: 'Back or rim light', effect: 'A glow around the edges, or a silhouette. Expose for the face or add fill.' },
    { id: 'top', name: 'Top light', effect: 'Harsh at noon, with dark eye sockets. Step into shade or wait.' }
  ];

  const PATTERNS = [
    { name: 'Butterfly', where: 'Above and in front of the face.', look: 'Small shadow under the nose and chin. Glamour.',
      face: { light: [32, 5], shadow: 'M26 48Q32 52 38 48Q32 45 26 48ZM8 64Q32 80 56 64V80H8Z' } },
    { name: 'Loop', where: '30 to 45 degrees to the side, a little above.', look: 'A small loop of shadow from the nose onto the cheek. The default flattering light.',
      face: { light: [8, 14], shadow: 'M35 45Q43 45 45 51Q39 51 35 48ZM48 22Q53 40 45 64L60 70V16Z', shadowOpacity: 0.28 } },
    { name: 'Rembrandt', where: '45 degrees to the side and high.', look: 'A small triangle of light on the shadowed cheek. Dramatic.',
      face: { light: [7, 8], shadow: 'M32 0H64V80H32ZM37 37L49 35L41 52Z' } },
    { name: 'Split', where: 'Straight to the side, 90 degrees.', look: 'Half the face in light and half in shadow. Moody.',
      face: { light: [4, 40], shadow: 'M32 0H64V80H32Z' } },
    { name: 'Broad', where: 'Light falls on the side of the face that turns toward the camera.', look: 'Makes a face look wider and fuller.',
      face: { light: [5, 26], shadow: 'M42 0H64V80H42Z', turned: true } },
    { name: 'Short', where: 'Light falls on the side turned away from the camera.', look: 'Slims the face and adds shape. Most portrait photographers default to it.',
      face: { light: [60, 26], shadow: 'M0 0H42V80H0Z', turned: true } }
  ];

  const COMPOSITION = [
    ['Leading lines', 'Roads, rails and shadows pull the eye through the frame toward the subject.', 'Crouch until a line starts at your feet and ends at the subject.'],
    ['Frame within a frame', 'A doorway, window or branches around the subject add depth and focus.', 'Stand back and shoot through an opening, then check the edges.'],
    ['Negative space', 'Empty area around a subject gives it room and makes it feel isolated or calm.', 'Place the subject on a third and leave the rest of the frame empty.'],
    ['Symmetry and patterns', 'Mirror-like balance and repetition feel orderly. Breaking one element makes it the focus.', 'Centre yourself on the axis, then look for the one thing that doesn’t match.'],
    ['Figure and ground', 'The subject must separate from the background by tone, colour or sharpness.', 'Shift a step sideways until the subject stops blending into what’s behind.'],
    ['Layering', 'Foreground, middle ground and background give a flat photo depth.', 'Add something close to the lens, even if it’s a blurred leaf.'],
    ['Odd numbers', 'Groups of three or five feel more natural than pairs or fours.', 'Shoot a cluster and drop or add one subject until the count is odd.'],
    ['Fill the frame', 'Getting close removes distractions and shows detail.', 'Take one step closer than feels comfortable, then another.'],
    ['Juxtaposition', 'Two contrasting things in one frame tell a story: old and new, big and small.', 'Wait until the second element enters the frame.'],
    ['Colour harmony', 'Complementary colours pop. Analogous colours feel calm.', 'Pick the dominant colour and frame out anything that fights it.'],
    ['Balance', 'A heavy element on one side needs a lighter one on the other. Formal balance is symmetrical, informal is not.', 'Put a small bright object opposite a large dark one.'],
    ['Simplicity', 'Fewer elements make a stronger photo.', 'Check each edge of the frame and remove anything that isn’t helping.'],
    ['Decisive moment', 'The split second when shapes, light and gesture line up.', 'Frame the background first and wait for the subject to step in. Use burst mode.']
  ];

  const GRID_PICKS = [
    ['Portraits and headshots', 'phi', 'Phi grid'],
    ['Landscapes and horizons', 'thirds', 'Rule of thirds'],
    ['Waterfalls, shells, staircases', 'spiral', 'Golden spiral'],
    ['Street and documentary', 'dynamic', 'Dynamic symmetry'],
    ['Eyes, hands and small details', 'diagonal', 'Diagonal method'],
    ['Action and movement', 'triangles', 'Golden triangles'],
    ['Architecture and reflections', 'center', 'Centre cross'],
    ['Products and flat lays', 'fine', 'Square grid'],
    ['Group portraits', 'pyramid', 'Pyramid'],
    ['Patterns, roofs and tiles', 'triGrid', 'Triangle grid'],
    ['Corridors, roads and tracks', 'onePoint', 'One-point perspective'],
    ['Buildings from a corner', 'twoPoint', 'Two-point perspective'],
    ['Tall buildings looking up', 'threePoint', 'Three-point perspective'],
    ['Wide panoramic frames', 'rabatment', 'Rabatment'],
    ['Social posts and video', 'safe', 'Safe areas']
  ];

  const FLASH = [
    ['Guide number', 'GN is distance times f-number at ISO 100. A GN 40 flash at f/8 reaches 5 m.'],
    ['Inverse square law', 'Double the distance and you get a quarter of the light, which is 2 stops less.'],
    ['Sync speed', 'About 1/200 to 1/250 s. Faster needs high-speed sync, and that costs power.']
  ];

  /* ---------- Views ---------- */
  function recipeSummary(r) { return `${r.focal} · ${r.aperture} · ${r.shutter}`; }

  function useRecipe(r) {
    const a = r.apply;
    PT.store.set({
      /* Shutter priority with Auto ISO, the way most pros set up a body: the recipe's shutter
         is held and ISO floats so the frame stays exposed on any camera. */
      viewfinder: Object.assign({}, a, { exposure: Object.assign({}, a.exposure, { isoAuto: true, shutterAuto: false }) }),
      lastRecipeId: r.id
    });
    PT.toast(`${r.name} applied: ${PT.math.formatShutter(a.exposure.shutter)} with Auto ISO`);
    PT.nav('viewfinder');
  }

  function recipesView(openDetail) {
    return h('div', { class: 'list' }, PT.data.RECIPES.map(r =>
      h('button', { type: 'button', class: 'list-button coach-recipe', onclick: () => openDetail(r.id) },
        h('span', { class: 'coach-recipe-main' },
          h('span', { class: 'coach-recipe-name' }, r.name),
          h('span', { class: 'coach-recipe-sum num' }, recipeSummary(r))),
        PT.icon('chevronRight', 16))));
  }

  function recipeDetail(r, back) {
    return h('div', { class: 'stack' },
      h('div', { class: 'row-between' },
        h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onclick: back }, PT.icon('chevronLeft', 16), 'Recipes')),
      h('div', { class: 'coach-h', style: { fontSize: '18px' } }, r.name),
      PT.ui.kv([
        ['Focal length', r.focal], ['Aperture', r.aperture], ['Shutter', r.shutter],
        ['ISO', r.iso], ['Focus', r.af], ['Grid', r.grid]
      ]),
      h('div', { class: 'coach-section', style: { marginTop: '4px' } },
        h('div', { class: 'coach-h' }, 'Tips'),
        h('ul', { class: 'coach-tips' }, r.tips.map(t => h('li', null, t)))),
      h('button', { type: 'button', class: 'btn', onclick: () => useRecipe(r) }, 'Use in viewfinder'));
  }

  function section(title, sub, ...content) {
    return h('div', { class: 'coach-section' },
      h('div', { class: 'stack-sm', style: { gap: '2px' } }, h('div', { class: 'coach-h' }, title), sub ? h('div', { class: 'coach-sub' }, sub) : null),
      ...content);
  }
  function item(figure, name, ...lines) {
    return h('div', { class: 'coach-item' },
      h('div', { class: 'coach-fig-box' }, figure),
      h('div', { class: 'coach-item-body' }, h('div', { class: 'coach-item-name' }, name), ...lines));
  }
  const text = (...c) => h('div', { class: 'coach-item-text' }, ...c);
  const rows = list => h('div', { class: 'coach-rows' }, list.map(([n, t]) =>
    h('div', { class: 'coach-row' }, h('div', { class: 'coach-row-name' }, n), h('div', { class: 'coach-row-text' }, t))));

  function anglesView() {
    return h('div', null,
      section('Camera angles', 'Where the camera sits changes how the subject feels.',
        h('div', { class: 'coach-card' }, ANGLES.map(a =>
          item(angleFig(a.id), a.name, text(a.effect), text(h('b', null, 'Use it for: '), a.use))))),
      section('Shot sizes', 'How much of the person is in the frame.',
        h('div', { class: 'coach-card' }, shotSizesFig(), h('div', { style: { height: '8px' } }),
          h('div', { class: 'coach-rows' }, SHOT_SIZES.map(([n, d, u]) =>
            h('div', { class: 'coach-row' }, h('div', { class: 'coach-row-name' }, n), h('div', { class: 'coach-row-text' }, `${d} ${u}`)))))),
      section('Positioning rules', null, h('div', { class: 'coach-card' }, rows(POSITIONING))));
  }

  function lightingView() {
    return h('div', null,
      section('Light direction', 'Where the light comes from, seen from above. The camera is at the bottom.',
        h('div', { class: 'coach-card' }, DIRECTIONS.map(d => item(lightFig(d.id), d.name, text(d.effect))))),
      section('Portrait patterns', 'Named by the shadow the nose throws. The dot is the light.',
        h('div', { class: 'coach-card' }, PATTERNS.map(p =>
          item(faceFig(p.face), p.name, text(h('b', null, 'Light: '), p.where), text(p.look))))),
      section('Hard and soft light', null, h('div', { class: 'coach-card' }, rows([
        ['Hard light', 'A small or distant source, like the midday sun. Crisp shadows, strong texture, unforgiving on skin.'],
        ['Soft light', 'A big or close source. Overcast sky works like a giant softbox. Open shade is a portrait favourite.'],
        ['Make light softer', 'Move the source closer, make it bigger, or bounce it off a wall.']
      ]))),
      section('Flash basics', null, h('div', { class: 'coach-card' }, rows(FLASH))));
  }

  function compositionView() {
    const pick = (gridId, name) => {
      PT.store.set({ viewfinder: { grid: gridId } });
      PT.toast(`${name} grid on`);
      PT.nav('viewfinder');
    };
    return h('div', null,
      section('Composition principles', 'Guides, not laws. Try one at a time.',
        h('div', { class: 'coach-card' }, h('div', { class: 'coach-rows' }, COMPOSITION.map(([n, d, t]) =>
          h('div', { class: 'coach-row' },
            h('div', { class: 'coach-row-name' }, n),
            h('div', { class: 'coach-row-text' }, d),
            h('div', { class: 'coach-try' }, h('span', null, 'Try this: '), t)))))),
      section('Which grid should I use?', 'Pick by subject. The viewfinder switches to it.',
        h('div', { class: 'coach-card' }, GRID_PICKS.map(([subject, id, name]) =>
          h('div', { class: 'coach-pick' }, h('span', null, subject),
            h('button', { type: 'button', class: 'btn btn-outline btn-sm', onclick: () => pick(id, name) }, name))))));
  }

  /* ---------- Screen ---------- */
  function mount(el) {
    const pad = h('div', { class: 'screen-pad' });
    const content = h('div');
    let tab = 'recipes', detailId = null;

    function render() {
      content.replaceChildren();
      if (tab === 'recipes') {
        const r = detailId && PT.data.RECIPES.find(x => x.id === detailId);
        content.append(r ? recipeDetail(r, () => { detailId = null; render(); }) : recipesView(id => { detailId = id; render(); pad.parentNode && (pad.parentNode.scrollTop = 0); }));
      } else if (tab === 'angles') content.append(anglesView());
      else if (tab === 'lighting') content.append(lightingView());
      else content.append(compositionView());
    }

    const seg = PT.ui.segmented([
      { value: 'recipes', label: 'Recipes' }, { value: 'angles', label: 'Angles' },
      { value: 'lighting', label: 'Lighting' }, { value: 'composition', label: 'Composition' }
    ], tab, v => { tab = v; detailId = null; render(); if (pad.parentNode) pad.parentNode.scrollTop = 0; }, 'Coach sections');

    pad.append(h('div', { class: 'coach-head' }, h('h1', { class: 'screen-title' }, 'Coach'), seg), content);
    render();
    el.append(pad);
    return () => pad.remove();
  }

  PT.registerScreen({
    id: 'coach', title: 'Coach', icon: 'book', mount,
    panel: {
      summary: 'Recipes push their settings into the viewfinder, so you start a genre with sensible numbers. The rest of Coach is a pocket reference for angles, light and composition.',
      features: [
        { name: 'Genre recipes', tier: 'v1', note: 'Focal length, aperture, shutter, ISO, focus and grid for each genre, with tips.' },
        { name: 'Apply to viewfinder', tier: 'v1', note: 'Sets the grid, aspect and manual exposure in one tap.' },
        { name: 'Angles and shot sizes', tier: 'v1', note: 'Seven camera angles, eight shot sizes and the positioning rules working photographers follow.' },
        { name: 'Lighting patterns', tier: 'v1', note: 'Light direction, butterfly, loop, Rembrandt, split, broad and short, plus flash basics.' },
        { name: 'Composition lessons', tier: 'v1', note: 'Thirteen principles with a try-this tip each, and a grid chooser by subject.' },
        { name: 'AI photo critique', tier: 'v3', note: 'Shoot a frame and get notes on composition, exposure and light.' }
      ]
    }
  });
})(window.PT);
