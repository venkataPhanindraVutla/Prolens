package `in`.venkat.prolens.features.calculators

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextMeasurer
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.unit.dp
import `in`.venkat.prolens.core.designsystem.Pro
import `in`.venkat.prolens.core.designsystem.tabular
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.ln
import kotlin.math.min

private enum class Anchor { Start, Center }

private fun DrawScope.label(
    measurer: TextMeasurer, text: String, x: Float, bottom: Float, style: TextStyle, color: Color, anchor: Anchor = Anchor.Start,
) {
    val s = style.copy(color = color)
    val size = measurer.measure(text, s).size
    val left = if (anchor == Anchor.Center) x - size.width / 2f else x
    drawText(measurer, text, Offset(left, bottom - size.height), style = s)
}

/** The sharp zone on a log distance axis from the camera out to infinity. */
@Composable
fun DofDiagram(nearM: Double, farM: Double, subjectM: Double) {
    val c = Pro.colors
    val measurer = rememberTextMeasurer()
    val small = MaterialTheme.typography.labelSmall.tabular
    val strong = small.copy(fontWeight = FontWeight.Medium)
    val farText = if (farM.isFinite()) "to ${formatMetres(farM)}" else "to infinity"
    Canvas(
        Modifier
            .fillMaxWidth()
            .aspectRatio(320f / 78f)
            .semantics { contentDescription = "Depth of field: sharp from ${formatMetres(nearM)} $farText, subject at ${formatMetres(subjectM)}" },
    ) {
        val k = size.width / 320f
        val x0 = 16f
        val x1 = 280f
        val xi = 304f
        val y = 46f
        fun x(d: Double): Float = x0 + (x1 - x0) * (ln(d / 0.3) / ln(100 / 0.3)).coerceIn(0.0, 1.0).toFloat()
        val zx0 = x(nearM)
        val zx1 = if (!farM.isFinite() || farM > 100) xi else x(farM)
        drawRoundRect(
            c.success.copy(alpha = 0.45f), Offset(zx0 * k, (y - 16) * k), Size(maxOf(2f, zx1 - zx0) * k, 16f * k), CornerRadius(2f * k),
        )
        drawLine(c.foreground, Offset(x0 * k, y * k), Offset(x1 * k, y * k), strokeWidth = 1.5f * k)
        drawLine(
            c.mutedForeground, Offset(x1 * k, y * k), Offset(xi * k, y * k), strokeWidth = 1.5f * k,
            pathEffect = PathEffect.dashPathEffect(floatArrayOf(4f * k, 3f * k)),
        )
        listOf(1.0, 3.0, 10.0, 30.0, 100.0).forEach { d ->
            drawLine(c.mutedForeground, Offset(x(d) * k, y * k), Offset(x(d) * k, (y + 4) * k), strokeWidth = k)
            label(measurer, "${d.toInt()} m", x(d) * k, (y + 16) * k, small, c.mutedForeground, Anchor.Center)
        }
        label(measurer, "∞", xi * k, (y + 16) * k, small, c.mutedForeground, Anchor.Center)
        drawRect(c.foreground, Offset((x0 - 8) * k, (y - 10) * k), Size(8f * k, 10f * k), style = Stroke(1.5f * k))
        label(measurer, "Camera", (x0 - 8) * k, (y - 12) * k, small, c.mutedForeground)
        val sx = x(subjectM.coerceAtLeast(0.3))
        drawLine(c.foreground, Offset(sx * k, (y - 26) * k), Offset(sx * k, y * k), strokeWidth = 1.5f * k)
        drawCircle(c.foreground, 3f * k, Offset(sx * k, (y - 28) * k))
        label(measurer, "Subject", min(sx + 6, 270f) * k, (y - 24) * k, strong, c.foreground)
    }
}

private val BgDots = listOf(
    Triple(.1f, .15f, 5f), Triple(.25f, .3f, 8f), Triple(.08f, .55f, 6f), Triple(.2f, .8f, 7f), Triple(.38f, .12f, 6f),
    Triple(.4f, .88f, 5f), Triple(.62f, .1f, 7f), Triple(.78f, .22f, 6f), Triple(.9f, .4f, 8f), Triple(.7f, .85f, 6f),
    Triple(.92f, .75f, 5f), Triple(.58f, .62f, 4f), Triple(.33f, .62f, 4f), Triple(.85f, .08f, 4f),
)

/** A sharp head and shoulders in front of background dots that grow and fade with the blur. */
@Composable
fun BlurPreview(pct: Double, description: String, modifier: Modifier = Modifier) {
    val c = Pro.colors
    val shape = RoundedCornerShape(Pro.shapes.radius)
    Canvas(
        modifier
            .fillMaxWidth()
            .aspectRatio(3f / 2f)
            .clip(shape)
            .background(c.background)
            .border(1.dp, c.border, shape)
            .semantics { contentDescription = description },
    ) {
        val w = 300f
        val h = 200f
        val k = size.width / w
        val disc = (pct / 100 * w).toFloat()
        BgDots.forEach { (px, py, r) ->
            val rr = r + disc / 2
            val alpha = 0.9f * min(1f, (r * r) / (rr * rr)) + 0.1f
            drawCircle(c.mutedForeground.copy(alpha = alpha), rr * k, Offset(px * w * k, py * h * k))
        }
        val body = Offset((w / 2 - 70) * k, (h + 6 - 62) * k)
        val bodySize = Size(140f * k, 124f * k)
        drawArc(c.foreground, 180f, 180f, true, body, bodySize)
        drawArc(c.background, 180f, 180f, false, body, bodySize, style = Stroke(3f * k))
        val head = Offset(w / 2 * k, h * 0.42f * k)
        drawCircle(c.foreground, 28f * k, head)
        drawCircle(c.background, 28f * k, head, style = Stroke(3f * k))
    }
}

/** The horizontal angle of view as a wedge opening upward from the camera. */
@Composable
fun FovWedge(horizontalDeg: Double) {
    val c = Pro.colors
    val measurer = rememberTextMeasurer()
    val small = MaterialTheme.typography.labelSmall.tabular
    val strong = small.copy(fontWeight = FontWeight.Medium)
    Canvas(
        Modifier
            .fillMaxWidth()
            .aspectRatio(320f / 112f)
            .semantics { contentDescription = "Horizontal angle of view, ${horizontalDeg.toInt()} degrees" },
    ) {
        val k = size.width / 320f
        val ax = 160f
        val ay = 100f
        val len = 84f
        val half = min(horizontalDeg, 170.0).toFloat() / 2
        val topLeft = Offset((ax - len) * k, (ay - len) * k)
        val box = Size(2 * len * k, 2 * len * k)
        drawArc(c.foreground.copy(alpha = 0.12f), -90f - half, 2 * half, true, topLeft, box)
        drawArc(c.foreground, -90f - half, 2 * half, true, topLeft, box, style = Stroke(1.5f * k))
        drawCircle(c.foreground, 3f * k, Offset(ax * k, ay * k))
        val edgeY = ay - len * cos(half * PI / 180).toFloat()
        label(measurer, "${horizontalDeg.toInt()}°", ax * k, min(ay - 8, edgeY + 18) * k, strong, c.foreground, Anchor.Center)
        label(measurer, "Camera", (ax + 8) * k, (ay + 11) * k, small, c.mutedForeground)
    }
}

/** Twice the distance spreads the light over four times the area. */
@Composable
fun InverseSquareDiagram() {
    val c = Pro.colors
    val measurer = rememberTextMeasurer()
    val small = MaterialTheme.typography.labelSmall.tabular
    val strong = small.copy(fontWeight = FontWeight.Medium)
    Canvas(
        Modifier
            .fillMaxWidth()
            .aspectRatio(320f / 90f)
            .semantics { contentDescription = "Light from a flash spreads over four times the area at twice the distance" },
    ) {
        val k = size.width / 320f
        drawCircle(c.foreground, 4f * k, Offset(20f * k, 45f * k))
        drawLine(c.mutedForeground, Offset(20f * k, 45f * k), Offset(200f * k, 9f * k), strokeWidth = k)
        drawLine(c.mutedForeground, Offset(20f * k, 45f * k), Offset(200f * k, 81f * k), strokeWidth = k)
        drawLine(c.foreground, Offset(110f * k, 27f * k), Offset(110f * k, 63f * k), strokeWidth = 1.5f * k)
        drawLine(c.foreground, Offset(200f * k, 9f * k), Offset(200f * k, 81f * k), strokeWidth = 1.5f * k)
        label(measurer, "d", 110f * k, 80f * k, small, c.mutedForeground, Anchor.Center)
        label(measurer, "2d", 200f * k, 90f * k, small, c.mutedForeground, Anchor.Center)
        label(measurer, "Full light", 118f * k, 42f * k, strong, c.foreground)
        label(measurer, "Quarter light", 208f * k, 42f * k, strong, c.foreground)
    }
}
