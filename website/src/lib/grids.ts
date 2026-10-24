/**
 * The 23 composition grids, ported line for line from core/grids/Grids.kt.
 * Geometry is in frame pixels, origin top-left. Long lines may run past the frame; the renderer clips.
 */

export type GridShape =
  | { kind: 'line'; x1: number; y1: number; x2: number; y2: number; alpha: number; dashed: boolean }
  | { kind: 'poly'; points: [number, number][]; closed: boolean; alpha: number; dashed: boolean }
  | { kind: 'circle'; cx: number; cy: number; r: number; alpha: number; dashed: boolean }
  | { kind: 'rect'; x: number; y: number; w: number; h: number; alpha: number; dashed: boolean }

export type GridGroup = 'Classic' | 'Golden' | 'Triangles' | 'Diagonals' | 'Perspective' | 'Guides'

export const GRID_GROUPS: { id: GridGroup; label: string }[] = [
  { id: 'Classic', label: 'Classic' },
  { id: 'Golden', label: 'Golden ratio' },
  { id: 'Triangles', label: 'Triangles' },
  { id: 'Diagonals', label: 'Diagonals' },
  { id: 'Perspective', label: 'Perspective and 3D' },
  { id: 'Guides', label: 'Guides' },
]

export interface GridSpec {
  id: string
  group: GridGroup
  name: string
  desc: string
  bestFor: string
}

const g = (id: string, group: GridGroup, name: string, desc: string, bestFor: string): GridSpec => ({ id, group, name, desc, bestFor })

export const GRIDS: GridSpec[] = [
  g('thirds', 'Classic', 'Rule of thirds', 'Two lines each way at 1/3 and 2/3. Put subjects on the lines or on the four crossings.', 'Everything. The default for most photographers.'),
  g('thirdsDiag', 'Classic', 'Thirds and diagonals', 'The thirds grid with both corner-to-corner diagonals on top.', 'Leading lines that should pass through a power point.'),
  g('center', 'Classic', 'Centre cross', 'Centre lines and a centre ring.', 'Symmetry, architecture, reflections.'),
  g('fine', 'Classic', 'Square grid', 'Square cells from the centre outwards.', 'Products, flat lays, keeping things aligned.'),
  g('rabatment', 'Classic', 'Rabatment', 'A painter’s device: fold each short side onto the long side to make two squares. Their inner edges are strong lines.', 'Wide frames; placing a figure or a tree on the square’s edge.'),
  g('phi', 'Golden', 'Phi grid', 'Like thirds, but the lines sit at 0.382 and 0.618, so the centre band is narrower.', 'Calmer, more classical placement; portraits and still life.'),
  g('spiral', 'Golden', 'Golden spiral', 'A Fibonacci spiral built from golden squares, stretched to fill the frame. The curve is a leading line into the eye point.', 'Landscapes, curved subjects, waves, staircases.'),
  g('spiralTrue', 'Golden', 'Golden spiral, true ratio', 'The same spiral kept at the real 1.618 ratio, so the curve isn’t squashed. The outline shows the golden rectangle.', 'Checking a composition against the exact proportion.'),
  g('goldenRects', 'Golden', 'Golden rectangles', 'The nested golden squares without the spiral. Each cut is a place to put an edge or horizon.', 'Architecture and graphic frames with straight edges.'),
  g('triangles', 'Triangles', 'Golden triangles', 'One diagonal plus a perpendicular from each of the other two corners.', 'Diagonal energy, movement, triangular subjects.'),
  g('trianglesDouble', 'Triangles', 'Double golden triangles', 'Both diagonals, each with perpendiculars from the opposite corners. Eight triangles and four extra crossing points.', 'Busy scenes where lines run both ways.'),
  g('pyramid', 'Triangles', 'Pyramid', 'A triangle with its point at the top centre, split into four. Flip it for an inverted V.', 'Group portraits, mountains, a stable and solid feel.'),
  g('triGrid', 'Triangles', 'Triangle grid', 'A lattice of equal triangles: horizontals plus lines at 60° and 120°.', 'Patterns, roofs, tiled floors, and finding hidden triangles.'),
  g('diagonal', 'Diagonals', 'Diagonal method', 'Edwin Westhoff’s 45° lines from each corner. Key details often sit on these lines.', 'Placing eyes, hands and small details.'),
  g('diagCross', 'Diagonals', 'Diagonal cross', 'The two main diagonals: the baroque (bottom-left to top-right) and the sinister (top-left to bottom-right).', 'Roads, rivers and limbs running corner to corner.'),
  g('diagLattice', 'Diagonals', 'Diagonal grid', 'A square grid turned 45°, so every line is a diagonal.', 'Lining up repeating diagonals: stairs, fences, crops in fields.'),
  g('dynamic', 'Diagonals', 'Dynamic symmetry', 'Jay Hambidge’s grid: both diagonals plus reciprocals that cross them at 90°.', 'Street and documentary; layered, painterly frames.'),
  g('armature', 'Diagonals', 'Harmonic armature', 'The 14-line armature: diagonals, corner-to-midpoint lines and the centre rhombus.', 'Classic painting-style composition.'),
  g('onePoint', 'Perspective', 'One-point perspective', 'Lines radiating from one vanishing point at the centre, with receding frames.', 'Corridors, roads, rail tracks, symmetrical interiors.'),
  g('twoPoint', 'Perspective', 'Two-point perspective', 'Two vanishing points on the horizon, outside the frame, with straight verticals.', 'Buildings shot from a corner, street corners, products at an angle.'),
  g('threePoint', 'Perspective', 'Three-point perspective', 'Two vanishing points on the horizon plus a third above the frame, so verticals converge. Flip it for looking down.', 'Tall buildings from street level, worm’s-eye and bird’s-eye views.'),
  g('isometric', 'Perspective', 'Isometric 3D grid', 'Lines at 30° and 150° plus verticals: the grid behind isometric 3D drawings.', 'Boxes, buildings and products shown in 3D without vanishing points.'),
  g('safe', 'Guides', 'Safe areas', 'Boxes at 90% and 80% of the frame, with a centre mark. Keep key content inside them.', 'Social posts, video frames, anything that gets cropped or covered by app buttons.'),
]

export const gridSpec = (id: string) => GRIDS.find((x) => x.id === id)

const PHI = (1 + Math.sqrt(5)) / 2
type Pt = [number, number]

/** Shapes for grid id in a w × h frame, unflipped. Empty for unknown ids. */
export function gridShapes(id: string, W: number, H: number): GridShape[] {
  const out: GridShape[] = []
  const { min, cos, sin, hypot, ceil, sqrt, abs, PI } = Math

  const line = (x1: number, y1: number, x2: number, y2: number, alpha = 1, dashed = false) =>
    out.push({ kind: 'line', x1, y1, x2, y2, alpha, dashed })
  const dot = (cx: number, cy: number, r = 3) => out.push({ kind: 'circle', cx, cy, r, alpha: 1, dashed: false })
  const poly = (points: Pt[], closed = false, alpha = 1) => out.push({ kind: 'poly', points, closed, alpha, dashed: false })
  const rect = (x: number, y: number, w: number, h: number, alpha = 1, dashed = false) =>
    out.push({ kind: 'rect', x, y, w, h, alpha, dashed })

  /** Parallel lines at deg, spacing apart, one of them through the centre. */
  const family = (deg: number, spacing: number, a = 1) => {
    const r = (deg * PI) / 180
    const dx = cos(r)
    const dy = sin(r)
    const len = hypot(W, H)
    const n = ceil(len / spacing) + 1
    for (let k = -n; k <= n; k++) {
      const px = W / 2 - dy * k * spacing
      const py = H / 2 + dx * k * spacing
      line(px - dx * len, py - dy * len, px + dx * len, py + dy * len, a)
    }
  }
  const fan = (vx: number, vy: number, targets: Pt[], a = 1) => targets.forEach(([x, y]) => line(vx, vy, x, y, a))
  const range = (a: number, b: number, n: number) => Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n)

  const foot = (p: Pt, a: Pt, b: Pt): Pt => {
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)
    return [a[0] + dx * t, a[1] + dy * t]
  }
  const clipRay = (px: number, py: number, dx: number, dy: number): Pt => {
    let t = Infinity
    if (dx > 1e-6) t = min(t, (W - px) / dx)
    if (dx < -1e-6) t = min(t, -px / dx)
    if (dy > 1e-6) t = min(t, (H - py) / dy)
    if (dy < -1e-6) t = min(t, -py / dy)
    return [px + dx * t, py + dy * t]
  }

  /** Golden spiral in unit space (PHI × 1). Portrait frames turn it upright; fit keeps the true ratio. */
  const spiral = (fit: boolean, arcs: boolean) => {
    const portrait = H > W
    let map: (x: number, y: number) => Pt
    if (!fit && portrait) map = (x, y) => [y * W, (x * H) / PHI]
    else if (!fit) map = (x, y) => [(x * W) / PHI, y * H]
    else if (portrait) {
      const gh = min(H, W * PHI)
      const gw = gh / PHI
      const ox = (W - gw) / 2
      const oy = (H - gh) / 2
      map = (x, y) => [ox + y * gw, oy + (x * gh) / PHI]
    } else {
      const gw = min(W, H * PHI)
      const gh = gw / PHI
      const ox = (W - gw) / 2
      const oy = (H - gh) / 2
      map = (x, y) => [ox + (x * gw) / PHI, oy + y * gh]
    }
    if (fit) {
      const a = map(0, 0)
      const b = map(PHI, 1)
      rect(min(a[0], b[0]), min(a[1], b[1]), abs(b[0] - a[0]), abs(b[1] - a[1]), 0.45)
    }
    const divider = (x1: number, y1: number, x2: number, y2: number) => {
      const a = map(x1, y1)
      const b = map(x2, y2)
      line(a[0], a[1], b[0], b[1], arcs ? 0.45 : 1)
    }
    let x = 0
    let y = 0
    let w = PHI
    let h = 1
    for (let i = 0; i < 9; i++) {
      let s: number, cx: number, cy: number, a0: number
      switch (i % 4) {
        case 0:
          s = h; cx = x + s; cy = y + s; a0 = PI
          divider(x + s, y, x + s, y + h); x += s; w -= s
          break
        case 1:
          s = w; cx = x; cy = y + s; a0 = 1.5 * PI
          divider(x, y + s, x + w, y + s); y += s; h -= s
          break
        case 2:
          s = h; cx = x + w - s; cy = y; a0 = 0
          divider(x + w - s, y, x + w - s, y + h); w -= s
          break
        default:
          s = w; cx = x + s; cy = y + h - s; a0 = 0.5 * PI
          divider(x, y + h - s, x + w, y + h - s); h -= s
      }
      if (arcs) poly(range(0, 24, 24).map((k) => { const a = a0 + (k / 24) * (PI / 2); return map(cx + s * cos(a), cy + s * sin(a)) }))
    }
    const eye = map(x + w / 2, y + h / 2)
    dot(eye[0], eye[1], 4)
  }

  const thirds = () => {
    for (const f of [1 / 3, 2 / 3]) { line(W * f, 0, W * f, H); line(0, H * f, W, H * f) }
    for (const fx of [1 / 3, 2 / 3]) for (const fy of [1 / 3, 2 / 3]) dot(W * fx, H * fy)
  }

  switch (id) {
    case 'thirds':
      thirds()
      break
    case 'thirdsDiag':
      thirds(); line(0, 0, W, H, 0.7); line(0, H, W, 0, 0.7)
      break
    case 'phi': {
      const a = 1 / PHI / PHI
      const b = 1 / PHI
      for (const f of [a, b]) { line(W * f, 0, W * f, H); line(0, H * f, W, H * f) }
      for (const fx of [a, b]) for (const fy of [a, b]) dot(W * fx, H * fy)
      break
    }
    case 'spiral':
      spiral(false, true)
      break
    case 'spiralTrue':
      spiral(true, true)
      break
    case 'goldenRects':
      spiral(false, false)
      break
    case 'triangles': {
      const a: Pt = [0, H]
      const b: Pt = [W, 0]
      line(a[0], a[1], b[0], b[1])
      const f1 = foot([0, 0], a, b)
      const f2 = foot([W, H], a, b)
      line(0, 0, f1[0], f1[1]); line(W, H, f2[0], f2[1])
      break
    }
    case 'trianglesDouble': {
      line(0, 0, W, H); line(0, H, W, 0)
      const d1: [Pt, Pt] = [[0, 0], [W, H]]
      const d2: [Pt, Pt] = [[0, H], [W, 0]]
      const pairs: [Pt, [Pt, Pt]][] = [[[0, H], d1], [[W, 0], d1], [[0, 0], d2], [[W, H], d2]]
      for (const [p, d] of pairs) { const f = foot(p, d[0], d[1]); line(p[0], p[1], f[0], f[1]) }
      break
    }
    case 'pyramid':
      poly([[0, H], [W / 2, 0], [W, H]])
      poly([[W / 4, H / 2], [(W * 3) / 4, H / 2], [W / 2, H]], true, 0.6)
      break
    case 'triGrid': {
      const d = ((min(W, H) / 5) * sqrt(3)) / 2
      for (const deg of [0, 60, 120]) family(deg, d)
      break
    }
    case 'diagonal': {
      const m = min(W, H)
      line(0, 0, m, m); line(W, 0, W - m, m); line(0, H, m, H - m); line(W, H, W - m, H - m)
      break
    }
    case 'diagCross':
      line(0, 0, W, H); line(0, H, W, 0); dot(W / 2, H / 2, 4)
      break
    case 'diagLattice': {
      const s = min(W, H) / 6
      family(45, s); family(135, s)
      break
    }
    case 'dynamic': {
      line(0, 0, W, H); line(0, H, W, 0)
      const rays: [number, number, number, number][] = [[W, 0, -H, W], [0, H, H, -W], [0, 0, H, W], [W, H, -H, -W]]
      for (const [px, py, dx, dy] of rays) { const e = clipRay(px, py, dx, dy); line(px, py, e[0], e[1]) }
      break
    }
    case 'armature': {
      line(0, 0, W, H); line(0, H, W, 0)
      const top: Pt = [W / 2, 0]
      const right: Pt = [W, H / 2]
      const bottom: Pt = [W / 2, H]
      const left: Pt = [0, H / 2]
      const spokes: [Pt, Pt[]][] = [[[0, 0], [right, bottom]], [[W, 0], [left, bottom]], [[W, H], [left, top]], [[0, H], [right, top]]]
      for (const [c, mids] of spokes) for (const m of mids) line(c[0], c[1], m[0], m[1])
      poly([top, right, bottom, left], true)
      break
    }
    case 'center':
      line(W / 2, 0, W / 2, H, 0.6); line(0, H / 2, W, H / 2, 0.6)
      out.push({ kind: 'circle', cx: W / 2, cy: H / 2, r: min(W, H) * 0.06, alpha: 1, dashed: false })
      break
    case 'fine': {
      const cell = min(W, H) / 6
      for (let x = (W / 2) % cell; x < W; x += cell) line(x, 0, x, H)
      for (let y = (H / 2) % cell; y < H; y += cell) line(0, y, W, y)
      break
    }
    case 'rabatment':
      if (W >= H) {
        line(H, 0, H, H); line(W - H, 0, W - H, H)
        line(0, 0, H, H, 0.7, true); line(0, H, H, 0, 0.7, true); line(W - H, 0, W, H, 0.7, true); line(W - H, H, W, 0, 0.7, true)
      } else {
        line(0, W, W, W); line(0, H - W, W, H - W)
        line(0, 0, W, W, 0.7, true); line(W, 0, 0, W, 0.7, true); line(0, H - W, W, H, 0.7, true); line(W, H - W, 0, H, 0.7, true)
      }
      break
    case 'onePoint': {
      const vx = W / 2
      const vy = H / 2
      const e = range(0, 1, 4)
      fan(vx, vy, [
        ...e.map((t): Pt => [W * t, 0]),
        ...e.map((t): Pt => [W * t, H]),
        ...e.slice(1, 4).map((t): Pt => [0, H * t]),
        ...e.slice(1, 4).map((t): Pt => [W, H * t]),
      ])
      for (const k of [0.25, 0.5, 0.75]) rect(vx - (W * k) / 2, vy - (H * k) / 2, W * k, H * k, 0.6)
      line(0, vy, W, vy, 0.7, true); dot(vx, vy, 4)
      break
    }
    case 'twoPoint': {
      const hz = H * 0.5
      const ys = range(-H, 2 * H, 12)
      fan(-W * 0.35, hz, ys.map((y): Pt => [W * 1.2, y])); fan(W * 1.35, hz, ys.map((y): Pt => [-W * 0.2, y]))
      for (const f of range(0.2, 0.8, 3)) line(W * f, 0, W * f, H, 0.6)
      line(0, hz, W, hz, 0.7, true)
      break
    }
    case 'threePoint': {
      const hz = H * 0.72
      const ys = range(-H, 2 * H, 10)
      fan(-W * 0.4, hz, ys.map((y): Pt => [W * 1.2, y])); fan(W * 1.4, hz, ys.map((y): Pt => [-W * 0.2, y]))
      fan(W / 2, -H * 1.1, range(-W * 0.6, W * 1.6, 11).map((x): Pt => [x, H * 1.2]), 0.75)
      line(0, hz, W, hz, 0.7, true)
      break
    }
    case 'isometric': {
      const d = min(W, H) / 6
      family(30, d); family(150, d); family(90, d, 0.6)
      break
    }
    case 'safe': {
      rect(W * 0.05, H * 0.05, W * 0.9, H * 0.9)
      rect(W * 0.1, H * 0.1, W * 0.8, H * 0.8, 0.7, true)
      const c = min(W, H) * 0.03
      line(W / 2 - c, H / 2, W / 2 + c, H / 2); line(W / 2, H / 2 - c, W / 2, H / 2 + c)
      break
    }
  }
  return out
}
