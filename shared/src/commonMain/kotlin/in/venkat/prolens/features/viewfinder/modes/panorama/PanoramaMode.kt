package `in`.venkat.prolens.features.viewfinder.modes.panorama

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.unit.dp
import `in`.venkat.prolens.core.designsystem.OverlayChip
import `in`.venkat.prolens.core.designsystem.Pro
import `in`.venkat.prolens.core.platform.Hold
import `in`.venkat.prolens.core.platform.RgbImage
import `in`.venkat.prolens.features.viewfinder.HeldLayer
import `in`.venkat.prolens.features.viewfinder.fieldOfView
import `in`.venkat.prolens.features.viewfinder.modes.ModeContext
import `in`.venkat.prolens.features.viewfinder.modes.ModeUi
import `in`.venkat.prolens.features.viewfinder.modes.ShutterStyle
import `in`.venkat.prolens.features.viewfinder.turned
import `in`.venkat.prolens.features.viewfinder.zoomedFov
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlin.math.abs

/** A tiny colour grid standing in for a captured frame in the progress strip. */
internal class Thumb(val w: Int, val h: Int, val argb: IntArray)

internal enum class PanoPhase { Idle, Sweeping, Stitching }

/** How the phone sits against the next target. */
internal data class SweepStatus(val error: Double, val roll: Float, val steady: Boolean, val level: Boolean, val aligned: Boolean)

/** Guided sweep and on-phone stitching. */
object PanoramaMode : ModeUi() {
    private const val MAX_FRAMES = 10
    private const val FRAME_SIDE = 1280
    private const val OVERLAP_STEP = 0.7
    private const val HEADING_TOL = 2.0
    private const val MOTION_MAX = 0.05f
    private const val ROLL_MAX = 6f

    private var phase by mutableStateOf(PanoPhase.Idle)
    private var thumbs by mutableStateOf<List<Thumb>>(emptyList())
    private var stepDeg by mutableStateOf(40.0)
    private var fovDeg = 60.0
    private var startHeading = 0.0
    private var frames: List<RgbImage> = emptyList()
    private var headings: List<Double> = emptyList()
    private var capturing = false
    private var session = 0

    private fun reset() {
        session++
        phase = PanoPhase.Idle
        thumbs = emptyList()
        frames = emptyList()
        headings = emptyList()
        capturing = false
    }

    override fun onEnter(ctx: ModeContext) = reset()
    override fun onExit(ctx: ModeContext) = reset()

    override fun shutterStyle(ctx: ModeContext): ShutterStyle = when (phase) {
        PanoPhase.Idle -> ShutterStyle.Photo
        PanoPhase.Sweeping -> ShutterStyle.Recording
        PanoPhase.Stitching -> ShutterStyle.Busy
    }

    override fun onShutter(ctx: ModeContext): Boolean {
        when (phase) {
            PanoPhase.Stitching -> {}
            PanoPhase.Sweeping -> finish(ctx)
            PanoPhase.Idle -> start(ctx)
        }
        return true
    }

    private fun start(ctx: ModeContext) {
        val o = ctx.orientation.value
        if (!o.available) {
            ctx.toast("Panorama needs motion sensors")
            return
        }
        reset()
        val fov = zoomedFov(fieldOfView(ctx.capabilities), ctx.zoom.ratio, null)
        fovDeg = if (Hold.isLandscape(ctx.hold)) fov.v else fov.h
        stepDeg = fovDeg * OVERLAP_STEP
        startHeading = o.heading.toDouble()
        phase = PanoPhase.Sweeping
        grab(ctx, o.heading.toDouble())
    }

    private fun grab(ctx: ModeContext, heading: Double) {
        if (capturing) return
        capturing = true
        val id = session
        ctx.controller.captureFrame(FRAME_SIDE) { result ->
            ctx.scope.launch(Dispatchers.Default) {
                val img = result.getOrNull()
                if (id != session) return@launch
                if (img == null) {
                    capturing = false
                    ctx.toast("Couldn't capture a frame")
                    return@launch
                }
                val thumb = makeThumb(img)
                frames = frames + img
                headings = headings + heading
                thumbs = thumbs + thumb
                capturing = false
                val done = frames.size >= MAX_FRAMES || frames.size * stepDeg >= 360.0
                if (done) finish(ctx)
            }
        }
    }

    private fun status(ctx: ModeContext): SweepStatus {
        val o = ctx.orientation.value
        val progress = ((o.heading - startHeading) % 360 + 360) % 360
        val target = frames.size * stepDeg
        val err = Stitcher.headingDelta(target, progress)
        val roll = Hold.rollFromHold(o.roll, ctx.hold)
        val steady = o.motion < MOTION_MAX
        val level = abs(roll) <= ROLL_MAX
        return SweepStatus(err, roll, steady, level, abs(err) <= HEADING_TOL)
    }

    private fun tryAuto(ctx: ModeContext) {
        if (phase != PanoPhase.Sweeping || capturing || frames.isEmpty()) return
        val s = status(ctx)
        if (s.aligned && s.steady && s.level) grab(ctx, ctx.orientation.value.heading.toDouble())
    }

    private fun finish(ctx: ModeContext) {
        if (phase != PanoPhase.Sweeping) return
        val shots = frames
        val hs = headings
        val fov = fovDeg
        if (shots.size < 2) {
            reset()
            ctx.toast("Turn further before stopping")
            return
        }
        val id = ++session
        capturing = false
        phase = PanoPhase.Stitching
        ctx.scope.launch(Dispatchers.Default) {
            val pano = runCatching { Stitcher.stitch(shots, hs, fov) }.getOrNull()
            if (pano == null) {
                if (id == session) reset()
                ctx.toast("Couldn't stitch the panorama")
                return@launch
            }
            ctx.controller.saveImage(pano, "Prolens_pano") { r ->
                ctx.toast(r.fold({ "Saved to $it" }, { "Couldn't save the panorama" }))
                if (id == session) reset()
            }
        }
    }

    private fun makeThumb(img: RgbImage): Thumb {
        val tw = 24
        val th = (tw * img.height / img.width.toFloat()).toInt().coerceAtLeast(1)
        val out = IntArray(tw * th)
        for (y in 0 until th) for (x in 0 until tw) {
            val sx = ((x + 0.5f) / tw * img.width).toInt().coerceIn(0, img.width - 1)
            val sy = ((y + 0.5f) / th * img.height).toInt().coerceIn(0, img.height - 1)
            out[y * tw + x] = img.argb[sy * img.width + sx] or (0xFF shl 24)
        }
        return Thumb(tw, th, out)
    }

    @Composable
    override fun PreviewLayer(ctx: ModeContext, modifier: Modifier) {
        val latest by rememberUpdatedState(ctx)
        LaunchedEffect(Unit) {
            snapshotFlow { latest.orientation.value }.collect { tryAuto(latest) }
        }
        val c = Pro.colors
        Box(modifier.fillMaxSize()) {
            when (phase) {
                PanoPhase.Idle -> HeldLayer(ctx.hold, ctx.angle, Modifier.fillMaxSize()) {
                    OverlayChip(
                        "Press the shutter, then turn slowly to the right",
                        modifier = Modifier.align(Alignment.TopCenter).padding(top = 16.dp),
                    )
                }
                PanoPhase.Stitching -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    OverlayChip("Stitching", modifier = Modifier.turned(ctx.angle))
                }
                PanoPhase.Sweeping -> HeldLayer(ctx.hold, ctx.angle, Modifier.fillMaxSize()) {
                    val s = status(ctx)
                    val fov = fovDeg
                    val ready = frames.isNotEmpty()
                    Canvas(Modifier.fillMaxSize()) {
                        val dp = density
                        val cx = size.width / 2
                        val cy = size.height / 2
                        val raw = cx - (s.error / fov).toFloat() * size.width
                        val x = raw.coerceIn(size.width * 0.12f, size.width * 0.88f)
                        val off = x != raw
                        val col = if (s.aligned) c.success else Color.White
                        if (ready) {
                            drawCircle(col.copy(alpha = if (off) 0.5f else 0.9f), 30 * dp, Offset(x, cy), style = Stroke(2 * dp))
                        }
                        drawCircle(Color.White, 3.5f * dp, Offset(cx, cy))
                        // Level: a short line that tilts with the roll, between fixed reference ticks.
                        val ly = size.height * 0.78f
                        val len = 40 * dp
                        val lc = if (s.level) c.success else c.warning
                        drawLine(Color.White.copy(alpha = 0.5f), Offset(cx - len - 24 * dp, ly), Offset(cx - len - 10 * dp, ly), 1.5f * dp)
                        drawLine(Color.White.copy(alpha = 0.5f), Offset(cx + len + 10 * dp, ly), Offset(cx + len + 24 * dp, ly), 1.5f * dp)
                        rotate(-s.roll, Offset(cx, ly)) {
                            drawLine(lc, Offset(cx - len, ly), Offset(cx + len, ly), 2 * dp)
                        }
                    }
                    val hint = when {
                        !s.level -> "Hold level"
                        !s.steady -> "Slow down"
                        else -> "Turn slowly to the right"
                    }
                    OverlayChip(
                        hint,
                        tone = if (!s.level) c.warning else if (!s.steady) c.warning else null,
                        modifier = Modifier.align(Alignment.TopCenter).padding(top = 16.dp),
                    )
                }
            }
        }
    }

    @Composable
    override fun Controls(ctx: ModeContext) {
        if (phase == PanoPhase.Idle) return
        val c = Pro.colors
        Column(
            Modifier.fillMaxWidth().padding(bottom = 8.dp).turned(ctx.angle),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            OverlayChip("${thumbs.size} of $MAX_FRAMES frames")
            Row(horizontalArrangement = Arrangement.spacedBy(3.dp), verticalAlignment = Alignment.CenterVertically) {
                val shown = thumbs
                for (i in 0 until MAX_FRAMES) {
                    val t = shown.getOrNull(i)
                    val shape = RoundedCornerShape(3.dp)
                    if (t == null) {
                        Box(Modifier.size(width = 22.dp, height = 30.dp).clip(shape).background(Color(0x66090909)))
                    } else {
                        Canvas(Modifier.size(width = 22.dp, height = 30.dp).clip(shape)) {
                            val cw = size.width / t.w
                            val ch = size.height / t.h
                            for (y in 0 until t.h) for (x in 0 until t.w) {
                                drawRect(Color(t.argb[y * t.w + x]), Offset(x * cw, y * ch), Size(cw + 0.5f, ch + 0.5f))
                            }
                        }
                    }
                }
            }
        }
    }
}
