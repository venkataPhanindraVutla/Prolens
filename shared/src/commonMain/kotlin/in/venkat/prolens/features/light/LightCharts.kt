package `in`.venkat.prolens.features.light

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.RoundRect
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.compositeOver
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.clipPath
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.text.TextMeasurer
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import `in`.venkat.prolens.core.designsystem.Pro
import `in`.venkat.prolens.core.designsystem.tabular
import `in`.venkat.prolens.core.sun.LightPhase
import `in`.venkat.prolens.core.sun.MoonInfo
import `in`.venkat.prolens.core.sun.SkyPosition
import `in`.venkat.prolens.core.sun.SunCalc
import `in`.venkat.prolens.core.sun.SunTimes
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.ceil
import kotlin.math.cos
import kotlin.math.sin

/** The restrained ramp: near-black night, zinc twilights, a blue and an amber wash, light zinc day. */
object LightColors {
    private val base = Color(0xFF27272A)
    fun of(phase: LightPhase): Color = when (phase) {
        LightPhase.Night -> Color(0xFF0C0C0E)
        LightPhase.Astro -> Color(0xFF1F1F23)
        LightPhase.Nautical -> Color(0xFF3F3F46)
        LightPhase.Blue -> Color(0xFF3B82F6).copy(alpha = 0.45f).compositeOver(base)
        LightPhase.Golden -> Color(0xFFF59E0B).copy(alpha = 0.55f).compositeOver(base)
        LightPhase.Day -> Color(0xFFD4D4D8)
    }
    val goldenBand = Color(0xFFF59E0B).copy(alpha = 0.22f)
    val blueBand = Color(0xFF3B82F6).copy(alpha = 0.28f)
}

private enum class Anchor { Start, Center, End }

/** Draws [text] with its vertical centre at [y]. */
private fun DrawScope.chartText(m: TextMeasurer, text: String, x: Float, y: Float, style: TextStyle, anchor: Anchor = Anchor.Center) {
    val r = m.measure(text, style)
    val left = when (anchor) { Anchor.Start -> x; Anchor.Center -> x - r.size.width / 2f; Anchor.End -> x - r.size.width }
    drawText(r, topLeft = Offset(left, y - r.size.height / 2f))
}

@Composable
private fun chartStyle(color: Color): TextStyle =
    MaterialTheme.typography.labelSmall.copy(fontSize = 10.sp, color = color).tabular

private val HOURS = listOf(0, 6, 12, 18, 24)

@Composable
fun DayTimeline(segments: List<PhaseSegment>, startMs: Long, endMs: Long, nowMs: Long?, modifier: Modifier = Modifier) {
    val c = Pro.colors
    val m = rememberTextMeasurer()
    val ts = chartStyle(c.mutedForeground)
    Canvas(modifier.fillMaxWidth().height(54.dp)) {
        val w = size.width
        val barTop = 4.dp.toPx(); val barH = 30.dp.toPx()
        val span = (endMs - startMs).toFloat()
        fun x(t: Long) = (t - startMs) / span * w
        val bar = Path().apply { addRoundRect(RoundRect(0f, barTop, w, barTop + barH, CornerRadius(4.dp.toPx()))) }
        clipPath(bar) {
            drawRect(c.muted, Offset(0f, barTop), Size(w, barH))
            segments.forEach { g ->
                val x0 = x(g.fromMs)
                drawRect(LightColors.of(g.phase), Offset(x0, barTop), Size(maxOf(0.5f, x(g.toMs) - x0 + 0.5f), barH))
            }
        }
        drawRoundRect(c.border, Offset(0.5f, barTop + 0.5f), Size(w - 1f, barH - 1f), CornerRadius(4.dp.toPx()), style = Stroke(1.dp.toPx()))
        HOURS.forEach { hr ->
            val px = (hr / 24f * w).coerceIn(0.5f, w - 0.5f)
            drawLine(c.border, Offset(px, barTop + barH), Offset(px, barTop + barH + 4.dp.toPx()), 1.dp.toPx())
            chartText(m, "${hr.toString().padStart(2, '0')}:00", px, barTop + barH + 15.dp.toPx(), ts,
                if (hr == 0) Anchor.Start else if (hr == 24) Anchor.End else Anchor.Center)
        }
        if (nowMs != null) {
            val nx = x(nowMs).coerceIn(0f, w)
            drawLine(c.foreground, Offset(nx, 0f), Offset(nx, barTop + barH + 2.dp.toPx()), 2.dp.toPx())
        }
    }
}

/** Swatches for the six phases. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun PhaseLegend() {
    FlowRow(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
        listOf(LightPhase.Night to "Night", LightPhase.Astro to "Astro", LightPhase.Nautical to "Nautical",
            LightPhase.Blue to "Blue", LightPhase.Golden to "Golden", LightPhase.Day to "Day").forEach { (p, name) ->
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(5.dp)) {
                Box(Modifier.size(10.dp).clip(RoundedCornerShape(2.dp)).background(LightColors.of(p)))
                Text(name, style = MaterialTheme.typography.labelSmall)
            }
        }
    }
}

/** Sun altitude against time over [startMs] plus 24 h, with golden and blue bands and a dot at [markerMs]. */
@Composable
fun SunPathChart(lat: Double, lon: Double, startMs: Long, markerMs: Long, modifier: Modifier = Modifier) {
    val c = Pro.colors
    val m = rememberTextMeasurer()
    val ts = chartStyle(c.mutedForeground)
    val points = androidx.compose.runtime.remember(lat, lon, startMs) { SunCalc.sunPath(startMs, lat, lon, 15) }
    val marker = androidx.compose.runtime.remember(lat, lon, markerMs) { SunCalc.sunPosition(markerMs, lat, lon) }
    Canvas(modifier.fillMaxWidth().height(170.dp)) {
        val minAlt = -30.0
        val maxAlt = maxOf(10.0, ceil((points.maxOf { it.altitude } + 4) / 10) * 10)
        val left = 28.dp.toPx(); val right = 6.dp.toPx(); val top = 8.dp.toPx(); val bottom = 20.dp.toPx()
        val w = size.width; val h = size.height
        val span = 24 * 3_600_000.0
        fun px(t: Long) = (left + ((t - startMs) / span) * (w - left - right)).toFloat().coerceIn(left, w - right)
        fun py(a: Double) = (top + (1 - (a - minAlt) / (maxAlt - minAlt)) * (h - top - bottom)).toFloat()
        drawRect(LightColors.goldenBand, Offset(left, py(6.0)), Size(w - left - right, py(-4.0) - py(6.0)))
        drawRect(LightColors.blueBand, Offset(left, py(-4.0)), Size(w - left - right, py(-6.0) - py(-4.0)))
        val ticks = (0..maxAlt.toInt() step (if (maxAlt > 40) 30 else 10)).map { it.toDouble() } + minAlt
        ticks.forEach { a ->
            if (a != 0.0) drawLine(c.border, Offset(left, py(a)), Offset(w - right, py(a)), 1.dp.toPx())
            chartText(m, "${a.toInt()}°", left - 4.dp.toPx(), py(a), ts, Anchor.End)
        }
        drawLine(c.input, Offset(left, py(0.0)), Offset(w - right, py(0.0)), 1.dp.toPx())
        HOURS.forEach { hr ->
            val x = left + hr / 24f * (w - left - right)
            chartText(m, hr.toString().padStart(2, '0'), x, h - 6.dp.toPx(), ts,
                if (hr == 0) Anchor.Start else if (hr == 24) Anchor.End else Anchor.Center)
        }
        val curve = Path()
        points.forEachIndexed { i, p ->
            val x = px(p.epochMs); val y = py(maxOf(minAlt, p.altitude))
            if (i == 0) curve.moveTo(x, y) else curve.lineTo(x, y)
        }
        drawPath(curve, c.foreground, style = Stroke(1.75.dp.toPx(), cap = StrokeCap.Round, join = StrokeJoin.Round))
        val dot = Offset(px(markerMs), py(maxOf(minAlt, marker.altitude)))
        drawCircle(c.background, 6.5.dp.toPx(), dot)
        drawCircle(c.foreground, 5.dp.toPx(), dot)
    }
}

/** Compass with the sun arrow at [sun], and sunrise and sunset markers from [times]. */
@Composable
fun SunCompass(sun: SkyPosition, times: SunTimes, lat: Double, lon: Double, modifier: Modifier = Modifier) {
    val c = Pro.colors
    val m = rememberTextMeasurer()
    val ts = chartStyle(c.mutedForeground)
    val cardinal = MaterialTheme.typography.labelMedium.copy(color = c.foreground)
    val rise = androidx.compose.runtime.remember(times, lat, lon) { times.sunrise?.let { SunCalc.sunPosition(it, lat, lon).azimuth } }
    val set = androidx.compose.runtime.remember(times, lat, lon) { times.sunset?.let { SunCalc.sunPosition(it, lat, lon).azimuth } }
    Canvas(modifier.size(240.dp)) {
        val k = size.width / 220f
        val cx = 110f * k; val cy = 110f * k; val r = 70f * k
        fun at(az: Double, rad: Float): Offset {
            val a = az * PI / 180
            return Offset(cx + rad * sin(a).toFloat(), cy - rad * cos(a).toFloat())
        }
        drawCircle(c.input, r, Offset(cx, cy), style = Stroke(1.dp.toPx()))
        for (a in 0 until 360 step 30) {
            drawLine(c.input, at(a.toDouble(), r), at(a.toDouble(), r - (if (a % 90 == 0) 8f else 4f) * k), 1.dp.toPx())
        }
        listOf("N" to 0.0, "E" to 90.0, "S" to 180.0, "W" to 270.0).forEach { (t, a) ->
            val p = at(a, r + 15f * k)
            chartText(m, t, p.x, p.y, cardinal)
        }
        listOf("Rise" to rise, "Set" to set).forEach { (label, az) ->
            if (az == null) return@forEach
            val p = at(az, r)
            drawCircle(c.card, 5.5.dp.toPx(), p)
            drawCircle(c.mutedForeground, 4.5.dp.toPx(), p, style = Stroke(1.5.dp.toPx()))
            val l = at(az, r - 17f * k)
            chartText(m, label, l.x, l.y, ts)
        }
        val tip = at(sun.azimuth, r - 24f * k)
        val up = sun.altitude >= 0
        drawLine(if (up) c.foreground else c.ring, Offset(cx, cy), tip, 2.dp.toPx(), StrokeCap.Round)
        drawCircle(if (up) c.foreground else c.ring, 5.dp.toPx(), tip)
        drawCircle(c.foreground, 2.5.dp.toPx(), Offset(cx, cy))
    }
}

/** The moon disc: [MoonInfo.fraction] lit, waxing on the right, turned over in the southern hemisphere. */
@Composable
fun MoonDisc(moon: MoonInfo, lat: Double, modifier: Modifier = Modifier) {
    val c = Pro.colors
    val lit = Color(0xFFE4E4E7)
    Canvas(modifier.size(72.dp)) {
        val ctr = size.width / 2f
        val r = size.width * 30f / 72f
        val k = moon.fraction
        val waxing = moon.phase < 0.5
        rotate(if (lat < 0) 180f else 0f, Offset(ctr, ctr)) {
            drawCircle(c.muted, r, Offset(ctr, ctr))
            drawCircle(c.border, r, Offset(ctr, ctr), style = Stroke(1.dp.toPx()))
            if (k > 0.985) drawCircle(lit, r, Offset(ctr, ctr))
            else if (k > 0.015) {
                val rx = abs(1 - 2 * k).toFloat() * r
                val limbRight = waxing
                val bulgeRight = if (k < 0.5) limbRight else !limbRight
                val path = Path().apply {
                    moveTo(ctr, ctr - r)
                    arcTo(Rect(ctr - r, ctr - r, ctr + r, ctr + r), -90f, if (limbRight) 180f else -180f, false)
                    arcTo(Rect(ctr - maxOf(rx, 0.01f), ctr - r, ctr + maxOf(rx, 0.01f), ctr + r), 90f, if (bulgeRight) -180f else 180f, false)
                    close()
                }
                drawPath(path, lit)
            }
        }
    }
}
