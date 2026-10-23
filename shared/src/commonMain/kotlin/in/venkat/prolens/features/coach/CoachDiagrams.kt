package `in`.venkat.prolens.features.coach

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.width
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.PathFillType
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.clipPath
import androidx.compose.ui.graphics.drawscope.scale
import androidx.compose.ui.graphics.drawscope.withTransform
import androidx.compose.ui.graphics.vector.PathParser
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import `in`.venkat.prolens.core.designsystem.Pro
import kotlin.math.atan2
import kotlin.math.hypot
import kotlin.math.PI

/*
 * Line drawings on a small viewBox grid, ported from the prototype's SVGs. Coordinates are in viewBox
 * units; the canvas scales them to fit. Lines use the foreground colour, guides the muted one.
 */

private class Pen(val scope: DrawScope, val fg: Color, val muted: Color) {
    private val line = Stroke(1.5f, cap = StrokeCap.Round, join = StrokeJoin.Round)
    private val thin = Stroke(1f, cap = StrokeCap.Round)
    private val dashed = Stroke(1f, cap = StrokeCap.Round, pathEffect = PathEffect.dashPathEffect(floatArrayOf(2f, 3f)))

    fun stroke(p: Path, color: Color = fg) = scope.drawPath(p, color, style = line)
    fun path(build: Path.() -> Unit, color: Color = fg) = stroke(Path().apply(build), color)
    fun circle(x: Float, y: Float, r: Float, color: Color = fg) = scope.drawCircle(color, r, Offset(x, y), style = line)
    fun dot(x: Float, y: Float, r: Float) = scope.drawCircle(fg, r, Offset(x, y))
    fun guide(x1: Float, y1: Float, x2: Float, y2: Float) = scope.drawLine(muted, Offset(x1, y1), Offset(x2, y2), 1f)
    fun dash(x1: Float, y1: Float, x2: Float, y2: Float, color: Color = muted) {
        scope.drawPath(Path().apply { moveTo(x1, y1); lineTo(x2, y2) }, color, style = dashed)
    }
    fun thinPath(p: Path, color: Color = muted) = scope.drawPath(p, color, style = thin)

    /** A camera glyph pointing along +x, turned by [deg]. */
    fun camera(x: Float, y: Float, deg: Float) {
        scope.withTransform({ translate(x, y); rotate(deg, Offset.Zero) }) {
            drawRoundRect(fg, Offset(-6f, -4f), Size(10f, 8f), CornerRadius(1.5f), style = line)
            drawPath(Path().apply { moveTo(4f, -2.5f); lineTo(8f, -4.5f); lineTo(8f, 4.5f); lineTo(4f, 2.5f); close() }, fg, style = line)
        }
    }

    fun person(x: Float, ground: Float = 64f) {
        val top = ground - 44
        circle(x, top, 4.5f)
        path({
            moveTo(x, top + 4.5f); lineTo(x, ground - 20)
            moveTo(x - 6, top + 12); lineTo(x + 6, top + 12)
            moveTo(x, ground - 20); lineTo(x - 4, ground)
            moveTo(x, ground - 20); lineTo(x + 4, ground)
        })
    }
}

private fun svgPath(d: String): Path = PathParser().parsePathString(d).toPath()

@Composable
private fun Figure(viewW: Float, viewH: Float, width: Dp, draw: Pen.() -> Unit) {
    val c = Pro.colors
    Canvas(Modifier.width(width).aspectRatio(viewW / viewH)) {
        val s = size.width / viewW
        scale(s, s, Offset.Zero) { Pen(this, c.foreground, c.mutedForeground).draw() }
    }
}

@Composable
fun AngleDiagram(kind: AngleKind, width: Dp = 104.dp) = Figure(120f, 70f, width) {
    val tx = 84f
    guide(4f, 64f, 116f, 64f)
    fun aim(cx: Float, cy: Float, ty: Float) {
        val deg = (atan2(ty - cy, tx - cx) * 180 / PI).toFloat()
        dash(cx, cy, tx, ty); camera(cx, cy, deg)
    }
    when (kind) {
        AngleKind.Eye -> { person(tx); aim(22f, 20f, 20f) }
        AngleKind.High -> { person(tx); aim(22f, 6f, 22f) }
        AngleKind.Low -> { person(tx); aim(22f, 56f, 22f) }
        AngleKind.Overhead -> { person(tx); dash(tx, 12f, tx, 15f); camera(tx, 6f, 90f) }
        AngleKind.Worm -> { person(tx); aim(40f, 61f, 24f) }
        AngleKind.Dutch -> {
            person(tx); dash(22f, 22f, tx, 22f); camera(22f, 22f, 20f)
            guide(8f, 32f, 40f, 20f)
        }
        AngleKind.OverShoulder -> { person(26f); person(tx); dash(10f, 20f, tx, 20f); camera(8f, 20f, 0f) }
    }
}

/** A standing figure with labelled crop lines. */
@Composable
fun ShotSizesDiagram() {
    val c = Pro.colors
    val m = rememberTextMeasurer()
    val density = LocalDensity.current
    val style = MaterialTheme.typography.labelSmall.copy(color = c.foreground)
    val marks = listOf(16f to "Extreme close-up", 34f to "Close-up", 58f to "Medium close-up", 92f to "Medium", 122f to "Medium full", 190f to "Full")
    Canvas(Modifier.aspectRatio(200f / 196f).width(280.dp)) {
        val s = size.width / 200f
        scale(s, s, Offset.Zero) {
            val pen = Pen(this, c.foreground, c.mutedForeground)
            pen.circle(40f, 18f, 9f)
            pen.path({
                moveTo(40f, 27f); lineTo(40f, 92f)
                moveTo(22f, 44f); lineTo(58f, 44f)
                moveTo(40f, 92f); lineTo(30f, 190f)
                moveTo(40f, 92f); lineTo(50f, 190f)
                moveTo(22f, 44f); lineTo(16f, 100f)
                moveTo(58f, 44f); lineTo(64f, 100f)
            })
            marks.forEach { (y, _) -> pen.dash(4f, y, 96f, y) }
        }
        marks.forEach { (y, label) ->
            val r = m.measure(label, style.copy(fontSize = with(density) { (9.5f * s).toSp() }))
            drawText(r, topLeft = Offset(102f * s, y * s - r.size.height / 2f))
        }
    }
}

/** Top-down: the subject in the middle, the camera at the bottom and the light as a dot with rays. */
@Composable
fun LightDirectionDiagram(kind: LightDirection, width: Dp = 104.dp) {
    val c = Pro.colors
    val m = rememberTextMeasurer()
    val density = LocalDensity.current
    val style = MaterialTheme.typography.labelSmall.copy(color = c.foreground)
    Canvas(Modifier.width(width).aspectRatio(120f / 90f)) {
        val s = size.width / 120f
        scale(s, s, Offset.Zero) {
            val pen = Pen(this, c.foreground, c.mutedForeground)
            pen.circle(60f, 40f, 10f)
            pen.thinPath(Path().apply { moveTo(56f, 49.5f); lineTo(60f, 55f); lineTo(64f, 49.5f) })
            pen.camera(60f, 80f, -90f)
            if (kind == LightDirection.Top) {
                drawCircle(c.foreground, 19f, Offset(60f, 40f), style = Stroke(1f, pathEffect = PathEffect.dashPathEffect(floatArrayOf(2f, 3f))))
                pen.dot(60f, 40f, 3f)
            } else {
                val (lx, ly) = when (kind) {
                    LightDirection.Front -> 88f to 66f
                    LightDirection.Side -> 14f to 40f
                    else -> 60f to 6f
                }
                val dx = 60 - lx; val dy = 40 - ly; val d = hypot(dx, dy); val ux = dx / d; val uy = dy / d
                listOf(-6f, 0f, 6f).forEach { o ->
                    val sx = lx - uy * o; val sy = ly + ux * o
                    val ex = lx + ux * (d - 16) - uy * o * 0.4f; val ey = ly + uy * (d - 16) + ux * o * 0.4f
                    pen.dash(sx + ux * 6, sy + uy * 6, ex, ey, c.foreground)
                }
                pen.dot(lx, ly, 4.5f)
            }
        }
        if (kind == LightDirection.Top) {
            val r = m.measure("from above", style.copy(fontSize = with(density) { (9f * s).toSp() }))
            drawText(r, topLeft = Offset(64f * s, 12f * s - r.size.height / 2f))
        }
    }
}

/** A face oval with the shadow pattern. [light] is the dot position in the 64 by 80 box. */
@Composable
fun FaceDiagram(face: FaceSpec, width: Dp = 64.dp) = Figure(64f, 80f, width) {
    val cx = if (face.turned) 34f else 32f
    val nx = if (face.turned) 42f else 32f
    val oval = Rect(cx - 19, 13f, cx + 19, 67f)
    val shadow = svgPath(face.shadow).apply { fillType = PathFillType.EvenOdd }
    scope.clipPath(Path().apply { addOval(oval) }) { drawPath(shadow, fg.copy(alpha = face.shadowAlpha)) }
    stroke(Path().apply { addOval(oval) })
    thinPath(Path().apply { moveTo(nx, 36f); lineTo(nx - 2.5f, 47f); lineTo(nx + 2.5f, 47f) })
    thinPath(Path().apply {
        moveTo(cx - 11, 32f); lineTo(cx - 5, 32f)
        moveTo(cx + 5, 32f); lineTo(cx + 11, 32f)
    })
    val dx = cx - face.lightX; val dy = 40 - face.lightY; val d = hypot(dx, dy)
    dot(face.lightX, face.lightY, 3.5f)
    dash(face.lightX + dx / d * 6, face.lightY + dy / d * 6, face.lightX + dx / d * 16, face.lightY + dy / d * 16, fg)
}
