package `in`.venkat.prolens.core.grids

import kotlin.math.PI
import kotlin.math.ceil
import kotlin.math.cos
import kotlin.math.hypot
import kotlin.math.min
import kotlin.math.sin
import kotlin.math.sqrt

/** Geometry in frame pixels, origin top-left. Long lines may run past the frame; the renderer clips. */
sealed interface GridShape {
    val alpha: Float
    val dashed: Boolean
}
data class GLine(val x1: Float, val y1: Float, val x2: Float, val y2: Float, override val alpha: Float = 1f, override val dashed: Boolean = false) : GridShape
data class GPoly(val points: List<Pair<Float, Float>>, val closed: Boolean = false, override val alpha: Float = 1f, override val dashed: Boolean = false) : GridShape
data class GCircle(val cx: Float, val cy: Float, val r: Float, override val alpha: Float = 1f, override val dashed: Boolean = false) : GridShape
data class GRect(val x: Float, val y: Float, val w: Float, val h: Float, override val alpha: Float = 1f, override val dashed: Boolean = false) : GridShape

enum class GridGroup(val label: String) {
    Classic("Classic"), Golden("Golden ratio"), Triangles("Triangles"),
    Diagonals("Diagonals"), Perspective("Perspective and 3D"), Guides("Guides"),
}

data class GridSpec(
    val id: String,
    val group: GridGroup,
    val name: String,
    val asymmetric: Boolean,
    val tier: String,
    val desc: String,
    val bestFor: String,
)

object Grids {
    val PHI = (1 + sqrt(5.0)) / 2

    val all: List<GridSpec> = listOf(
        GridSpec("thirds", GridGroup.Classic, "Rule of thirds", false, "v1", "Two lines each way at 1/3 and 2/3. Put subjects on the lines or on the four crossings.", "Everything. The default for most photographers."),
        GridSpec("thirdsDiag", GridGroup.Classic, "Thirds and diagonals", false, "v1", "The thirds grid with both corner-to-corner diagonals on top.", "Leading lines that should pass through a power point."),
        GridSpec("center", GridGroup.Classic, "Centre cross", false, "v1", "Centre lines and a centre ring.", "Symmetry, architecture, reflections."),
        GridSpec("fine", GridGroup.Classic, "Square grid", false, "v1", "Square cells from the centre outwards.", "Products, flat lays, keeping things aligned."),
        GridSpec("rabatment", GridGroup.Classic, "Rabatment", false, "v1", "A painter’s device: fold each short side onto the long side to make two squares. Their inner edges are strong lines.", "Wide frames; placing a figure or a tree on the square’s edge."),
        GridSpec("phi", GridGroup.Golden, "Phi grid", false, "v1", "Like thirds, but the lines sit at 0.382 and 0.618, so the centre band is narrower.", "Calmer, more classical placement; portraits and still life."),
        GridSpec("spiral", GridGroup.Golden, "Golden spiral", true, "v1", "A Fibonacci spiral built from golden squares, stretched to fill the frame. The curve is a leading line into the eye point.", "Landscapes, curved subjects, waves, staircases."),
        GridSpec("spiralTrue", GridGroup.Golden, "Golden spiral, true ratio", true, "v1", "The same spiral kept at the real 1.618 ratio, so the curve isn’t squashed. The outline shows the golden rectangle.", "Checking a composition against the exact proportion."),
        GridSpec("goldenRects", GridGroup.Golden, "Golden rectangles", true, "v1", "The nested golden squares without the spiral. Each cut is a place to put an edge or horizon.", "Architecture and graphic frames with straight edges."),
        GridSpec("triangles", GridGroup.Triangles, "Golden triangles", true, "v1", "One diagonal plus a perpendicular from each of the other two corners.", "Diagonal energy, movement, triangular subjects."),
        GridSpec("trianglesDouble", GridGroup.Triangles, "Double golden triangles", false, "v1", "Both diagonals, each with perpendiculars from the opposite corners. Eight triangles and four extra crossing points.", "Busy scenes where lines run both ways."),
        GridSpec("pyramid", GridGroup.Triangles, "Pyramid", true, "v1", "A triangle with its point at the top centre, split into four. Flip it for an inverted V.", "Group portraits, mountains, a stable and solid feel."),
        GridSpec("triGrid", GridGroup.Triangles, "Triangle grid", false, "v1", "A lattice of equal triangles: horizontals plus lines at 60° and 120°.", "Patterns, roofs, tiled floors, and finding hidden triangles."),
        GridSpec("diagonal", GridGroup.Diagonals, "Diagonal method", false, "v1", "Edwin Westhoff’s 45° lines from each corner. Key details often sit on these lines.", "Placing eyes, hands and small details."),
        GridSpec("diagCross", GridGroup.Diagonals, "Diagonal cross", false, "v1", "The two main diagonals: the baroque (bottom-left to top-right) and the sinister (top-left to bottom-right).", "Roads, rivers and limbs running corner to corner."),
        GridSpec("diagLattice", GridGroup.Diagonals, "Diagonal grid", false, "v1", "A square grid turned 45°, so every line is a diagonal.", "Lining up repeating diagonals: stairs, fences, crops in fields."),
        GridSpec("dynamic", GridGroup.Diagonals, "Dynamic symmetry", false, "v1", "Jay Hambidge’s grid: both diagonals plus reciprocals that cross them at 90°.", "Street and documentary; layered, painterly frames."),
        GridSpec("armature", GridGroup.Diagonals, "Harmonic armature", false, "v2", "The 14-line armature: diagonals, corner-to-midpoint lines and the centre rhombus.", "Classic painting-style composition."),
        GridSpec("onePoint", GridGroup.Perspective, "One-point perspective", false, "v2", "Lines radiating from one vanishing point at the centre, with receding frames.", "Corridors, roads, rail tracks, symmetrical interiors."),
        GridSpec("twoPoint", GridGroup.Perspective, "Two-point perspective", false, "v2", "Two vanishing points on the horizon, outside the frame, with straight verticals.", "Buildings shot from a corner, street corners, products at an angle."),
        GridSpec("threePoint", GridGroup.Perspective, "Three-point perspective", true, "v2", "Two vanishing points on the horizon plus a third above the frame, so verticals converge. Flip it for looking down.", "Tall buildings from street level, worm’s-eye and bird’s-eye views."),
        GridSpec("isometric", GridGroup.Perspective, "Isometric 3D grid", false, "v2", "Lines at 30° and 150° plus verticals: the grid behind isometric 3D drawings.", "Boxes, buildings and products shown in 3D without vanishing points."),
        GridSpec("safe", GridGroup.Guides, "Safe areas", false, "v1", "Boxes at 90% and 80% of the frame, with a centre mark. Keep key content inside them.", "Social posts, video frames, anything that gets cropped or covered by app buttons."),
    )

    fun spec(id: String): GridSpec? = all.firstOrNull { it.id == id }

    /** Shapes for grid [id] in a w × h frame, unflipped. Empty for unknown ids and "none". */
    fun shapes(id: String, w: Float, h: Float): List<GridShape> = Builder(w, h).apply { build(id) }.out

    private class Builder(val W: Float, val H: Float) {
        val out = mutableListOf<GridShape>()
        fun line(x1: Float, y1: Float, x2: Float, y2: Float, a: Float = 1f, dashed: Boolean = false) { out += GLine(x1, y1, x2, y2, a, dashed) }
        fun dot(x: Float, y: Float, r: Float = 3f) { out += GCircle(x, y, r) }
        fun poly(pts: List<Pair<Float, Float>>, closed: Boolean = false, a: Float = 1f) { out += GPoly(pts, closed, a) }

        /** Parallel lines at [deg], [spacing] apart, one of them through the centre. */
        fun family(deg: Double, spacing: Float, a: Float = 1f) {
            val r = deg * PI / 180; val dx = cos(r).toFloat(); val dy = sin(r).toFloat(); val len = hypot(W, H)
            val n = ceil(len / spacing).toInt() + 1
            for (k in -n..n) {
                val px = W / 2 - dy * k * spacing; val py = H / 2 + dx * k * spacing
                line(px - dx * len, py - dy * len, px + dx * len, py + dy * len, a)
            }
        }
        fun fan(vx: Float, vy: Float, targets: List<Pair<Float, Float>>, a: Float = 1f) = targets.forEach { (x, y) -> line(vx, vy, x, y, a) }
        fun range(a: Float, b: Float, n: Int) = (0..n).map { a + (b - a) * it / n }

        fun foot(p: Pair<Float, Float>, a: Pair<Float, Float>, b: Pair<Float, Float>): Pair<Float, Float> {
            val dx = b.first - a.first; val dy = b.second - a.second
            val t = ((p.first - a.first) * dx + (p.second - a.second) * dy) / (dx * dx + dy * dy)
            return (a.first + dx * t) to (a.second + dy * t)
        }
        fun clipRay(px: Float, py: Float, dx: Float, dy: Float): Pair<Float, Float> {
            var t = Float.POSITIVE_INFINITY
            if (dx > 1e-6f) t = min(t, (W - px) / dx)
            if (dx < -1e-6f) t = min(t, -px / dx)
            if (dy > 1e-6f) t = min(t, (H - py) / dy)
            if (dy < -1e-6f) t = min(t, -py / dy)
            return (px + dx * t) to (py + dy * t)
        }

        /** Golden spiral in unit space (PHI × 1). Portrait frames turn it upright; fit keeps the true ratio. */
        fun spiral(fit: Boolean, arcs: Boolean) {
            val portrait = H > W
            val phi = PHI.toFloat()
            val map: (Float, Float) -> Pair<Float, Float> = when {
                !fit && portrait -> { x, y -> (y * W) to (x * H / phi) }
                !fit -> { x, y -> (x * W / phi) to (y * H) }
                portrait -> { val gh = min(H, W * phi); val gw = gh / phi; val ox = (W - gw) / 2; val oy = (H - gh) / 2; { x, y -> (ox + y * gw) to (oy + x * gh / phi) } }
                else -> { val gw = min(W, H * phi); val gh = gw / phi; val ox = (W - gw) / 2; val oy = (H - gh) / 2; { x, y -> (ox + x * gw / phi) to (oy + y * gh) } }
            }
            if (fit) {
                val a = map(0f, 0f); val b = map(phi, 1f)
                out += GRect(min(a.first, b.first), min(a.second, b.second), kotlin.math.abs(b.first - a.first), kotlin.math.abs(b.second - a.second), 0.45f)
            }
            var x = 0f; var y = 0f; var w = phi; var h = 1f
            repeat(9) { i ->
                val s: Float; val cx: Float; val cy: Float; val a0: Double
                when (i % 4) {
                    0 -> { s = h; cx = x + s; cy = y + s; a0 = PI; divider(map, x + s, y, x + s, y + h, arcs); x += s; w -= s }
                    1 -> { s = w; cx = x; cy = y + s; a0 = 1.5 * PI; divider(map, x, y + s, x + w, y + s, arcs); y += s; h -= s }
                    2 -> { s = h; cx = x + w - s; cy = y; a0 = 0.0; divider(map, x + w - s, y, x + w - s, y + h, arcs); w -= s }
                    else -> { s = w; cx = x + s; cy = y + h - s; a0 = 0.5 * PI; divider(map, x, y + h - s, x + w, y + h - s, arcs); h -= s }
                }
                if (arcs) poly((0..24).map { k -> val a = a0 + k / 24.0 * PI / 2; map(cx + s * cos(a).toFloat(), cy + s * sin(a).toFloat()) })
            }
            val eye = map(x + w / 2, y + h / 2)
            dot(eye.first, eye.second, 4f)
        }
        fun divider(map: (Float, Float) -> Pair<Float, Float>, x1: Float, y1: Float, x2: Float, y2: Float, arcs: Boolean) {
            val a = map(x1, y1); val b = map(x2, y2)
            line(a.first, a.second, b.first, b.second, if (arcs) 0.45f else 1f)
        }

        fun build(id: String) {
            when (id) {
                "thirds" -> thirds()
                "thirdsDiag" -> { thirds(); line(0f, 0f, W, H, 0.7f); line(0f, H, W, 0f, 0.7f) }
                "phi" -> {
                    val a = (1 / PHI / PHI).toFloat(); val b = (1 / PHI).toFloat()
                    listOf(a, b).forEach { f -> line(W * f, 0f, W * f, H); line(0f, H * f, W, H * f) }
                    listOf(a, b).forEach { fx -> listOf(a, b).forEach { fy -> dot(W * fx, H * fy) } }
                }
                "spiral" -> spiral(fit = false, arcs = true)
                "spiralTrue" -> spiral(fit = true, arcs = true)
                "goldenRects" -> spiral(fit = false, arcs = false)
                "triangles" -> {
                    val a = 0f to H; val b = W to 0f
                    line(a.first, a.second, b.first, b.second)
                    val f1 = foot(0f to 0f, a, b); val f2 = foot(W to H, a, b)
                    line(0f, 0f, f1.first, f1.second); line(W, H, f2.first, f2.second)
                }
                "trianglesDouble" -> {
                    line(0f, 0f, W, H); line(0f, H, W, 0f)
                    val d1 = (0f to 0f) to (W to H); val d2 = (0f to H) to (W to 0f)
                    listOf((0f to H) to d1, (W to 0f) to d1, (0f to 0f) to d2, (W to H) to d2).forEach { (p, d) ->
                        val f = foot(p, d.first, d.second); line(p.first, p.second, f.first, f.second)
                    }
                }
                "pyramid" -> {
                    poly(listOf(0f to H, W / 2 to 0f, W to H))
                    poly(listOf(W / 4 to H / 2, W * 3 / 4 to H / 2, W / 2 to H), closed = true, a = 0.6f)
                }
                "triGrid" -> { val d = min(W, H) / 5 * sqrt(3f) / 2; listOf(0.0, 60.0, 120.0).forEach { family(it, d) } }
                "diagonal" -> {
                    val m = min(W, H)
                    line(0f, 0f, m, m); line(W, 0f, W - m, m); line(0f, H, m, H - m); line(W, H, W - m, H - m)
                }
                "diagCross" -> { line(0f, 0f, W, H); line(0f, H, W, 0f); dot(W / 2, H / 2, 4f) }
                "diagLattice" -> { val s = min(W, H) / 6; family(45.0, s); family(135.0, s) }
                "dynamic" -> {
                    line(0f, 0f, W, H); line(0f, H, W, 0f)
                    listOf(Triple(W, 0f, -H to W), Triple(0f, H, H to -W), Triple(0f, 0f, H to W), Triple(W, H, -H to -W)).forEach { (px, py, d) ->
                        val e = clipRay(px, py, d.first, d.second); line(px, py, e.first, e.second)
                    }
                }
                "armature" -> {
                    line(0f, 0f, W, H); line(0f, H, W, 0f)
                    val top = W / 2 to 0f; val right = W to H / 2; val bottom = W / 2 to H; val left = 0f to H / 2
                    listOf((0f to 0f) to listOf(right, bottom), (W to 0f) to listOf(left, bottom), (W to H) to listOf(left, top), (0f to H) to listOf(right, top))
                        .forEach { (c, mids) -> mids.forEach { m -> line(c.first, c.second, m.first, m.second) } }
                    poly(listOf(top, right, bottom, left), closed = true)
                }
                "center" -> {
                    line(W / 2, 0f, W / 2, H, 0.6f); line(0f, H / 2, W, H / 2, 0.6f)
                    out += GCircle(W / 2, H / 2, min(W, H) * 0.06f)
                }
                "fine" -> {
                    val cell = min(W, H) / 6
                    var x = (W / 2) % cell; while (x < W) { line(x, 0f, x, H); x += cell }
                    var y = (H / 2) % cell; while (y < H) { line(0f, y, W, y); y += cell }
                }
                "rabatment" -> if (W >= H) {
                    line(H, 0f, H, H); line(W - H, 0f, W - H, H)
                    line(0f, 0f, H, H, 0.7f, true); line(0f, H, H, 0f, 0.7f, true); line(W - H, 0f, W, H, 0.7f, true); line(W - H, H, W, 0f, 0.7f, true)
                } else {
                    line(0f, W, W, W); line(0f, H - W, W, H - W)
                    line(0f, 0f, W, W, 0.7f, true); line(W, 0f, 0f, W, 0.7f, true); line(0f, H - W, W, H, 0.7f, true); line(W, H - W, 0f, H, 0.7f, true)
                }
                "onePoint" -> {
                    val vx = W / 2; val vy = H / 2; val e = range(0f, 1f, 4)
                    fan(vx, vy, e.map { W * it to 0f } + e.map { W * it to H } + e.subList(1, 4).map { 0f to H * it } + e.subList(1, 4).map { W to H * it })
                    listOf(0.25f, 0.5f, 0.75f).forEach { k -> out += GRect(vx - W * k / 2, vy - H * k / 2, W * k, H * k, 0.6f) }
                    line(0f, vy, W, vy, 0.7f, true); dot(vx, vy, 4f)
                }
                "twoPoint" -> {
                    val hz = H * 0.5f; val ys = range(-H, 2 * H, 12)
                    fan(-W * 0.35f, hz, ys.map { W * 1.2f to it }); fan(W * 1.35f, hz, ys.map { -W * 0.2f to it })
                    range(0.2f, 0.8f, 3).forEach { f -> line(W * f, 0f, W * f, H, 0.6f) }
                    line(0f, hz, W, hz, 0.7f, true)
                }
                "threePoint" -> {
                    val hz = H * 0.72f; val ys = range(-H, 2 * H, 10)
                    fan(-W * 0.4f, hz, ys.map { W * 1.2f to it }); fan(W * 1.4f, hz, ys.map { -W * 0.2f to it })
                    fan(W / 2, -H * 1.1f, range(-W * 0.6f, W * 1.6f, 11).map { it to H * 1.2f }, 0.75f)
                    line(0f, hz, W, hz, 0.7f, true)
                }
                "isometric" -> { val d = min(W, H) / 6; family(30.0, d); family(150.0, d); family(90.0, d, 0.6f) }
                "safe" -> {
                    out += GRect(W * 0.05f, H * 0.05f, W * 0.9f, H * 0.9f)
                    out += GRect(W * 0.1f, H * 0.1f, W * 0.8f, H * 0.8f, 0.7f, true)
                    val c = min(W, H) * 0.03f
                    line(W / 2 - c, H / 2, W / 2 + c, H / 2); line(W / 2, H / 2 - c, W / 2, H / 2 + c)
                }
            }
        }

        fun thirds() {
            listOf(1f / 3, 2f / 3).forEach { f -> line(W * f, 0f, W * f, H); line(0f, H * f, W, H * f) }
            listOf(1f / 3, 2f / 3).forEach { fx -> listOf(1f / 3, 2f / 3).forEach { fy -> dot(W * fx, H * fy) } }
        }
    }
}

/** Largest rect of [ratio] (w / h) centred in the outer box: returns (x, y, w, h). */
fun fitAspect(x: Float, y: Float, w: Float, h: Float, ratio: Double?): FloatArray {
    if (ratio == null) return floatArrayOf(x, y, w, h)
    var fw = w; var fh = (w / ratio).toFloat()
    if (fh > h) { fh = h; fw = (h * ratio).toFloat() }
    return floatArrayOf(x + (w - fw) / 2, y + (h - fh) / 2, fw, fh)
}
