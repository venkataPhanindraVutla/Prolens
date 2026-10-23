package `in`.venkat.prolens.features.viewfinder

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.State
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.FilterQuality
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.clipRect
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.graphics.drawscope.translate
import androidx.compose.ui.text.TextLayoutResult
import androidx.compose.ui.text.TextMeasurer
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import `in`.venkat.prolens.core.designsystem.OverlayChip
import `in`.venkat.prolens.core.designsystem.Pro
import `in`.venkat.prolens.core.grids.drawGrid
import `in`.venkat.prolens.core.platform.Hold
import `in`.venkat.prolens.core.model.GearState
import `in`.venkat.prolens.core.model.ViewfinderSettings
import `in`.venkat.prolens.core.photomath.PhotoMath
import `in`.venkat.prolens.core.platform.CameraCapabilities
import `in`.venkat.prolens.core.platform.DeviceOrientation
import `in`.venkat.prolens.core.sun.SkyPosition
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.hypot
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt
import kotlin.math.sin
import kotlin.math.tan

private val Pill = Color(0x8C09090B)
private val SunYellow = Color(0xFFFACC15)
private val Shadow = Color.Black.copy(alpha = 0.35f)

/** What the lens frame needs from gear, worked out once per change instead of per draw. */
internal class LensInfo(val ratio: Double?, val label: String)

internal fun lensInfo(gear: GearState, caps: CameraCapabilities): LensInfo {
    val target = gear.focal * PhotoMath.cropFactor(gear.body)
    val phone = caps.equivalentFocalMm?.toDouble() ?: 24.0
    val label = "${gear.body.name} · ${gear.focal.roundToInt()} mm (${target.roundToInt()} mm eq)"
    return LensInfo(lensFrameRatio(phone, target), label)
}

/** One Canvas on the preview rect. Everything here is drawn in that rect's own coordinates. */
@Composable
internal fun PreviewOverlay(
    settings: ViewfinderSettings,
    analysis: State<AnalysisResult?>,
    blink: State<Boolean>,
    orientation: State<DeviceOrientation>,
    lens: LensInfo,
    fov: Fov,
    sunPoints: List<SunPoint>,
    sunNow: State<SkyPosition?>,
    hold: Int,
    modifier: Modifier = Modifier,
) {
    val success = Pro.colors.success
    val measurer = rememberTextMeasurer()
    val small = MaterialTheme.typography.labelMedium.copy(fontSize = 11.sp, color = Color(0xFFFAFAFA))
    val tiny = MaterialTheme.typography.labelSmall.copy(fontSize = 10.sp, color = Color.White)
    val lensLayout = remember(lens.label, small) { measurer.measure(lens.label, small) }
    val hourLayouts = remember(tiny) { List(24) { measurer.measure(it.toString(), tiny) } }
    val sensors = orientation
    Canvas(modifier.clipToBounds()) {
        val full = Rect(0f, 0f, size.width, size.height)
        val o = sensors.value
        val an = analysis.value
        if (an != null) {
            if (settings.falseColor) an.falseColor?.let { drawScaled(it, full, smooth = false) }
            if (settings.peaking) an.peaking?.let { drawScaled(it, full, smooth = false) }
            if (settings.zebras) an.zebras?.let { drawScaled(it, full, smooth = false) }
            if (settings.clipping && blink.value) an.clipping?.let { drawScaled(it, full, smooth = false) }
        }

        // The camera already crops the preview to the chosen ratio, so the frame is the whole canvas.
        val frame = full

        if (settings.grid != "none") drawGrid(settings.grid, frame, Color(settings.gridColor), settings.gridOpacity, 1.dp.toPx(), settings.gridOrient)
        if (settings.grid2 != "none") drawGrid(settings.grid2, frame, Color(settings.gridColor), settings.gridOpacity * 0.8f, 1.dp.toPx(), settings.gridOrient)

        if (settings.groundGrid && o.available) drawGroundGrid(full, o, fov)
        if (settings.lensFrame && lens.ratio != null) drawLensFrame(full, lens.ratio.toFloat(), lensLayout)
        if (settings.sunPath && o.available) drawSun(full, o, fov, sunPoints, sunNow.value, hourLayouts)
        if (settings.level && o.available) drawLevel(frame, o, success, hold)
    }
}

/** Histogram and waveform panels. They sit in the held layer so they read upright in landscape. */
@Composable
internal fun HistogramPanel(analysis: State<AnalysisResult?>, modifier: Modifier = Modifier) {
    Canvas(modifier.size(112.dp, 64.dp)) { analysis.value?.let { drawHistogram(it.histogram) } }
}

@Composable
internal fun WaveformPanel(analysis: State<AnalysisResult?>, modifier: Modifier = Modifier) {
    Canvas(modifier.size(136.dp, 80.dp)) { analysis.value?.waveform?.let { drawWaveform(it) } }
}

private fun DrawScope.drawScaled(img: ImageBitmap, to: Rect, smooth: Boolean) {
    drawImage(
        img,
        srcOffset = IntOffset.Zero, srcSize = IntSize(img.width, img.height),
        dstOffset = IntOffset(to.left.roundToInt(), to.top.roundToInt()),
        dstSize = IntSize(to.width.roundToInt(), to.height.roundToInt()),
        filterQuality = if (smooth) FilterQuality.Low else FilterQuality.None,
    )
}

private fun DrawScope.dimOutside(outer: Rect, inner: Rect, alpha: Float) {
    val c = Color.Black.copy(alpha = alpha)
    drawRect(c, Offset(outer.left, outer.top), Size(outer.width, max(0f, inner.top - outer.top)))
    drawRect(c, Offset(outer.left, inner.bottom), Size(outer.width, max(0f, outer.bottom - inner.bottom)))
    drawRect(c, Offset(outer.left, inner.top), Size(max(0f, inner.left - outer.left), inner.height))
    drawRect(c, Offset(inner.right, inner.top), Size(max(0f, outer.right - inner.right), inner.height))
}

private fun DrawScope.edge(color: Color, a: Offset, b: Offset, w: Float) {
    drawLine(Shadow, a, b, w + 1.5.dp.toPx(), StrokeCap.Round)
    drawLine(color, a, b, w, StrokeCap.Round)
}

private fun DrawScope.ring(color: Color, c: Offset, r: Float, w: Float) {
    drawCircle(Shadow, r, c, style = Stroke(w + 1.5.dp.toPx()))
    drawCircle(color, r, c, style = Stroke(w))
}

private fun DrawScope.drawLevel(frame: Rect, o: DeviceOrientation, success: Color, hold: Int) {
    val c = frame.center
    val dp = 1.dp.toPx()
    if (abs(o.pitch) > 70) {
        val big = min(frame.width, frame.height) * 0.2f
        val r = big * 0.45f
        val k = big / 20f
        val offP = if (o.pitch < 0) o.pitch + 90 else o.pitch - 90
        val bubble = Offset(
            c.x + (o.roll * k).coerceIn(-big * 1.2f, big * 1.2f),
            c.y + (-offP * k).coerceIn(-big * 1.2f, big * 1.2f),
        )
        val white = Color.White.copy(alpha = 0.7f)
        ring(white, c, r, 1.5f * dp)
        edge(white, Offset(c.x - r - 8 * dp, c.y), Offset(c.x + r + 8 * dp, c.y), 1.5f * dp)
        edge(white, Offset(c.x, c.y - r - 8 * dp), Offset(c.x, c.y + r + 8 * dp), 1.5f * dp)
        drawCircle(
            Color.White.copy(alpha = 0.4f), big * 1.2f, c,
            style = Stroke(1.5f * dp, pathEffect = PathEffect.dashPathEffect(floatArrayOf(3 * dp, 4 * dp))),
        )
        val col = if (hypot(o.roll, offP) < 1f) success else Color.White
        ring(col, bubble, r, 2 * dp)
        edge(col, Offset(bubble.x - r - 8 * dp, bubble.y), Offset(bubble.x + r + 8 * dp, bubble.y), 2 * dp)
        edge(col, Offset(bubble.x, bubble.y - r - 8 * dp), Offset(bubble.x, bubble.y + r + 8 * dp), 2 * dp)
        return
    }
    // Drawn in the frame as the photographer holds it: turned for the hold, then tilted by the roll from that hold.
    val rel = Hold.rollFromHold(o.roll, hold)
    val sideways = Hold.isLandscape(hold)
    val heldWidth = if (sideways) frame.height else frame.width
    val len = min(heldWidth * 0.3f, 110 * dp)
    val col = if (abs(rel) < 0.5f) success else Color.White
    val ref = Color.White.copy(alpha = 0.55f)
    rotate(Hold.uiRotation(hold), c) {
        edge(ref, Offset(c.x - len - 26 * dp, c.y), Offset(c.x - len - 10 * dp, c.y), 1.5f * dp)
        edge(ref, Offset(c.x + len + 10 * dp, c.y), Offset(c.x + len + 26 * dp, c.y), 1.5f * dp)
        rotate(-rel, c) {
            edge(col, Offset(c.x - len, c.y), Offset(c.x - 12 * dp, c.y), 2 * dp)
            edge(col, Offset(c.x + 12 * dp, c.y), Offset(c.x + len, c.y), 2 * dp)
            drawCircle(col, 2 * dp, c)
        }
        val px = c.x + heldWidth / 2 - 16 * dp
        val span = 48 * dp
        val track = Color.White.copy(alpha = 0.4f)
        edge(track, Offset(px, c.y - span), Offset(px, c.y + span), 1.5f * dp)
        edge(track, Offset(px - 6 * dp, c.y), Offset(px + 6 * dp, c.y), 1.5f * dp)
        val my = c.y - o.pitch.coerceIn(-30f, 30f) / 30f * span
        drawCircle(Shadow, 5.5f * dp, Offset(px, my))
        drawCircle(if (abs(o.pitch) < 1f) success else Color.White, 4 * dp, Offset(px, my))
    }
}

private fun DrawScope.drawHistogram(bins: IntArray) {
    val dp = 1.dp.toPx()
    val x = 8 * dp
    val y = 8 * dp
    val w = 96 * dp
    val h = 48 * dp
    drawRoundRect(Pill, Offset(x, y), Size(w, h), CornerRadius(6 * dp))
    val peak = bins.max()
    if (peak == 0) return
    val bw = (w - 8 * dp) / HIST_BINS
    val bar = Color(0xD9FAFAFA)
    for (i in 0 until HIST_BINS) {
        val bh = kotlin.math.sqrt(bins[i].toFloat() / peak) * (h - 8 * dp)
        drawRect(bar, Offset(x + 4 * dp + i * bw, y + h - 4 * dp - bh), Size(max(dp, bw - 0.4f * dp), bh))
    }
}

private fun DrawScope.drawWaveform(img: ImageBitmap) {
    val dp = 1.dp.toPx()
    val w = 120 * dp
    val h = 64 * dp
    val r = Rect(8 * dp, size.height - h - 8 * dp, 8 * dp + w, size.height - 8 * dp)
    drawRoundRect(Color(0x9909090B), r.topLeft, r.size, CornerRadius(6 * dp))
    drawScaled(img, r, smooth = false)
}

private fun DrawScope.drawLensFrame(rect: Rect, ratio: Float, label: TextLayoutResult) {
    val dp = 1.dp.toPx()
    val fw = rect.width * ratio
    val fh = fw * 1.5f
    val c = rect.center
    val r = Rect(c.x - fw / 2, c.y - fh / 2, c.x + fw / 2, c.y + fh / 2)
    val inner = Rect(max(r.left, rect.left), max(r.top, rect.top), min(r.right, rect.right), min(r.bottom, rect.bottom))
    dimOutside(rect, inner, 0.4f)
    val dash = Stroke(1.5f * dp, pathEffect = PathEffect.dashPathEffect(floatArrayOf(6 * dp, 4 * dp)))
    drawRect(Shadow, r.topLeft, r.size, style = Stroke(3f * dp))
    drawRect(Color.White, r.topLeft, r.size, style = dash)
    val tw = label.size.width + 12 * dp
    val th = 20 * dp
    val lx = (c.x - tw / 2).coerceIn(rect.left + 4 * dp, max(rect.left + 4 * dp, rect.right - tw - 4 * dp))
    val ly = max(r.top + 6 * dp, rect.top + 6 * dp)
    drawRoundRect(Color(0xB309090B), Offset(lx, ly), Size(tw, th), CornerRadius(6 * dp))
    drawText(label, topLeft = Offset(lx + 6 * dp, ly + (th - label.size.height) / 2))
}

private fun DrawScope.drawGroundGrid(rect: Rect, o: DeviceOrientation, fov: Fov) {
    val f = rect.width / (2 * tan(fov.h * PI / 360)).toFloat()
    val c = rect.center
    val pitch = o.pitch * PI / 180
    val sp = sin(pitch).toFloat()
    val cp = cos(pitch).toFloat()
    val th = -o.roll * PI / 180
    val cr = cos(th).toFloat()
    val sr = sin(th).toFloat()
    val camY = -1.5f
    fun proj(x: Float, z: Float): Offset? {
        val y2 = camY * cp - z * sp
        val z2 = z * cp + camY * sp
        if (z2 < 0.1f) return null
        val dx = f * x / z2
        val dy = -f * y2 / z2
        return Offset(c.x + dx * cr - dy * sr, c.y + dx * sr + dy * cr)
    }
    fun trace(pts: List<Offset?>): Path {
        val p = Path()
        var pen = false
        for (pt in pts) {
            if (pt == null) { pen = false; continue }
            if (pen) p.lineTo(pt.x, pt.y) else { p.moveTo(pt.x, pt.y); pen = true }
        }
        return p
    }
    val dp = 1.dp.toPx()
    clipRect(rect.left, rect.top, rect.right, rect.bottom) {
        for (x in -10..10 step 2) {
            val path = trace((1..40).map { proj(x.toFloat(), it.toFloat()) })
            drawPath(path, Color.White.copy(alpha = if (x == 0) 0.65f else 0.4f), style = Stroke(dp))
        }
        for (z in 1..39 step 2) {
            val path = trace((-10..10 step 2).map { proj(it.toFloat(), z.toFloat()) })
            drawPath(path, Color.White.copy(alpha = 0.4f), style = Stroke(dp))
        }
    }
}

private fun DrawScope.drawSun(
    rect: Rect, o: DeviceOrientation, fov: Fov, points: List<SunPoint>, now: SkyPosition?, hours: List<TextLayoutResult>,
) {
    val dp = 1.dp.toPx()
    val w = rect.width
    val h = rect.height
    val c = rect.center
    val th = -o.roll * PI / 180
    val cr = cos(th).toFloat()
    val sr = sin(th).toFloat()
    // Screen position and the unrotated horizontal offset, used to break the line where it wraps around.
    fun proj(az: Double, alt: Double): Triple<Float, Float, Float> {
        val dx = (wrap180(az - o.heading) / fov.h * w).toFloat()
        val dy = (-(alt - o.pitch) / fov.v * h).toFloat()
        return Triple(c.x + dx * cr - dy * sr, c.y + dx * sr + dy * cr, dx)
    }
    val path = Path()
    var pen = false
    var prevDx = 0f
    val visible = ArrayList<Pair<SunPoint, Triple<Float, Float, Float>>>()
    for (p in points) {
        if (p.altitude < 0) continue
        val q = proj(p.azimuth, p.altitude)
        visible += p to q
        if (pen && abs(q.third - prevDx) > w * 2) pen = false
        if (pen) path.lineTo(q.first, q.second) else { path.moveTo(q.first, q.second); pen = true }
        prevDx = q.third
    }
    val dash = PathEffect.dashPathEffect(floatArrayOf(5 * dp, 5 * dp))
    drawPath(path, Shadow, style = Stroke(3f * dp, pathEffect = dash))
    drawPath(path, SunYellow.copy(alpha = 0.9f), style = Stroke(1.5f * dp, pathEffect = dash))
    for ((p, q) in visible) {
        val hr = p.hour ?: continue
        if (q.first < 6 * dp || q.first > w - 6 * dp || q.second < 6 * dp || q.second > h - 6 * dp) continue
        drawCircle(SunYellow.copy(alpha = 0.95f), 2.5f * dp, Offset(q.first, q.second))
        val t = hours[hr.coerceIn(0, 23)]
        drawText(t, topLeft = Offset(q.first - t.size.width / 2f, q.second - 5 * dp - t.size.height))
    }
    if (now == null) return
    val s = proj(now.azimuth, now.altitude)
    val alpha = if (now.altitude < 0) 0.55f else 1f
    if (s.first < 12 * dp || s.first > w - 12 * dp || s.second < 12 * dp || s.second > h - 12 * dp) {
        val ang = atan2(s.second - c.y, s.first - c.x)
        val dxn = cos(ang)
        val dyn = sin(ang)
        val tx = if (abs(dxn) > 1e-6f) (w / 2 - 14 * dp) / abs(dxn) else Float.MAX_VALUE
        val ty = if (abs(dyn) > 1e-6f) (h / 2 - 14 * dp) / abs(dyn) else Float.MAX_VALUE
        val t = min(tx, ty)
        translate(c.x + dxn * t, c.y + dyn * t) {
            rotate((ang * 180 / PI).toFloat(), Offset.Zero) {
                val tri = Path().apply {
                    moveTo(10 * dp, 0f); lineTo(-6 * dp, -7 * dp); lineTo(-6 * dp, 7 * dp); close()
                }
                drawPath(tri, SunYellow.copy(alpha = alpha))
                drawPath(tri, Color.White.copy(alpha = alpha), style = Stroke(dp))
            }
        }
    } else {
        drawCircle(SunYellow.copy(alpha = alpha), 8 * dp, Offset(s.first, s.second))
        drawCircle(Color.White.copy(alpha = alpha), 8 * dp, Offset(s.first, s.second), style = Stroke(1.5f * dp))
    }
}

/** Notes that sit over the top right of the preview. */
@Composable
internal fun OverlayChips(
    settings: ViewfinderSettings,
    orientation: State<DeviceOrientation>,
    lens: LensInfo,
    holding: Boolean,
    hold: Int,
    modifier: Modifier = Modifier,
) {
    val o by orientation
    val roll = Hold.rollFromHold(o.roll, hold)
    val c = Pro.colors
    val needsSensors = settings.level || settings.angleLabel || settings.sunPath || settings.groundGrid
    Column(modifier, horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(4.dp)) {
        if (settings.lensFrame && lens.ratio == null) OverlayChip("Wider than this camera", c.warning)
        if (needsSensors && !o.available) {
            OverlayChip("Level needs motion sensors", c.warning)
        } else {
            if (settings.level) {
                OverlayChip(
                    "Roll ${signed(roll.toDouble(), 1)}° · Pitch ${signed(o.pitch.toDouble())}°",
                    if (abs(roll) < 0.5f) c.success else null,
                )
            }
            if (settings.angleLabel) {
                OverlayChip(angleName(o.pitch))
                if (abs(roll) > 8f) OverlayChip("Dutch tilt")
            }
        }
        if (holding) OverlayChip("Hold steady")
    }
}

private val LEGEND = listOf(
    "Over 97%" to Color(0xFFEF4444), "90 to 97%" to Color(0xFFFACC15), "Skin 52 to 58%" to Color(0xFFF472B6),
    "Mid 40 to 48%" to Color(0xFF16A34A), "10 to 20%" to Color(0xFF0D9488), "3 to 10%" to Color(0xFF2563EB),
    "Under 3%" to Color(0xFF7C3AED),
)

@Composable
internal fun FalseColorLegend(modifier: Modifier = Modifier) {
    Column(
        modifier.clip(RoundedCornerShape(6.dp)).background(Color(0xB309090B)).padding(horizontal = 6.dp, vertical = 4.dp),
        verticalArrangement = Arrangement.spacedBy(2.dp),
    ) {
        LEGEND.forEach { (t, col) ->
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(5.dp)) {
                Box(Modifier.size(8.dp).background(col))
                Text(t, style = MaterialTheme.typography.labelSmall.copy(fontSize = 10.sp, color = Color(0xFFFAFAFA)))
            }
        }
    }
}
