package `in`.venkat.prolens.features.viewfinder

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.State
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import `in`.venkat.prolens.core.designsystem.tabular
import `in`.venkat.prolens.core.platform.ZoomState
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlin.math.abs
import kotlin.math.ceil
import kotlin.math.log2
import kotlin.math.pow

private val ChipBg = Color(0x8C09090B)
private val Accent = Color(0xFFFACC15)

/**
 * Lens chips (0.5× · 1× · 2× · 5×) with the live ratio on the active one. Tap a chip to jump to that lens;
 * drag along the row to open the fine dial, where each 120dp of travel doubles the zoom.
 */
@Composable
internal fun ZoomBar(zoom: ZoomState, angle: State<Float>, onZoom: (Float) -> Unit, modifier: Modifier = Modifier) {
    val presets = remember(zoom.min, zoom.max) { zoomPresets(zoom.min, zoom.max) }
    if (presets.size < 2) return
    val active = activePreset(presets, zoom.ratio)
    val scope = rememberCoroutineScope()
    var dialOpen by remember { mutableStateOf(false) }
    var dragging by remember { mutableStateOf(false) }
    var hideJob by remember { mutableStateOf<Job?>(null) }
    var anim by remember { mutableStateOf<Job?>(null) }
    val pxPerDoubling = with(LocalDensity.current) { 120.dp.toPx() }
    var dragStart by remember { mutableFloatStateOf(1f) }
    var dragged by remember { mutableFloatStateOf(0f) }

    /* Glide to a preset over ~150 ms so the jump between lenses isn't a hard cut. */
    fun glideTo(target: Float) {
        anim?.cancel()
        val from = zoom.ratio
        anim = scope.launch {
            for (i in 1..8) {
                val t = i / 8f
                onZoom(from * (target / from).pow(t))
                delay(18)
            }
        }
    }

    Column(modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
        AnimatedVisibility(dialOpen, enter = fadeIn(), exit = fadeOut()) {
            ZoomDial(zoom, presets, pxPerDoubling, angle, Modifier.fillMaxWidth().height(52.dp))
        }
        Row(
            Modifier
                .padding(vertical = 6.dp)
                .clip(RoundedCornerShape(50))
                .background(ChipBg)
                .padding(horizontal = 4.dp, vertical = 4.dp)
                .pointerInput(zoom.min, zoom.max) {
                    detectHorizontalDragGestures(
                        onDragStart = {
                            anim?.cancel(); hideJob?.cancel()
                            dragging = true; dialOpen = true
                            dragStart = zoom.ratio; dragged = 0f
                        },
                        onDragEnd = {
                            hideJob = scope.launch { delay(250); dragging = false; delay(1200); dialOpen = false }
                        },
                        onDragCancel = { dragging = false; dialOpen = false },
                    ) { change, dx ->
                        change.consume()
                        // Dragging left pulls the longer end of the ruler to the centre, so it zooms in.
                        dragged -= dx
                        onZoom(zoomFromDrag(dragStart, dragged, pxPerDoubling, zoom.min, zoom.max))
                    }
                },
            horizontalArrangement = Arrangement.spacedBy(2.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            presets.forEachIndexed { i, p ->
                val on = i == active
                val label = if (on) fmtZoom(zoom.ratio) else shortZoom(p)
                Box(
                    Modifier
                        .size(if (on) 44.dp else 38.dp)
                        .clip(CircleShape)
                        .background(if (on) Color(0x33FFFFFF) else Color.Transparent)
                        .clickable(remember { MutableInteractionSource() }, null, role = Role.Button) {
                            if (!dragging) glideTo(p)
                        }
                        .semantics { contentDescription = "Zoom ${fmtZoom(p)}" },
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        label,
                        modifier = Modifier.turned(angle),
                        style = MaterialTheme.typography.labelMedium.copy(
                            fontSize = if (on) 13.sp else 12.sp,
                            fontWeight = if (on) FontWeight.SemiBold else FontWeight.Medium,
                            color = if (on) Accent else Color(0xFFFAFAFA),
                        ).tabular,
                    )
                }
            }
        }
    }
}

/** "0.6", "1", "2": presets read without the × until they're the active lens. */
private fun shortZoom(v: Float): String = fmtZoom(v).removeSuffix("×")

/** A ruler of zoom ticks centred on the current ratio, log-spaced so each lens gets the same travel. */
@Composable
private fun ZoomDial(zoom: ZoomState, presets: List<Float>, pxPerDoubling: Float, angle: State<Float>, modifier: Modifier) {
    val measurer = rememberTextMeasurer()
    val tickStyle = MaterialTheme.typography.labelSmall.copy(fontSize = 10.sp, color = Color(0xFFFAFAFA))
    val nowStyle = MaterialTheme.typography.labelMedium.copy(fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = Accent)
    val ticks = remember(zoom.min, zoom.max) { dialTicks(zoom.min, zoom.max) }
    Canvas(modifier.semantics { contentDescription = "Zoom ${fmtZoom(zoom.ratio)}" }) {
        val dp = 1.dp.toPx()
        val cx = size.width / 2
        val base = size.height - 6 * dp
        drawRect(Color(0x8C09090B))
        ticks.forEach { v ->
            val x = cx + log2(v / zoom.ratio) * pxPerDoubling
            if (x < -4 * dp || x > size.width + 4 * dp) return@forEach
            val major = presets.any { abs(it - v) < 0.001f }
            val h = if (major) 14 * dp else 7 * dp
            drawLine(Color.White.copy(alpha = if (major) 0.9f else 0.45f), Offset(x, base - h), Offset(x, base), 1.2f * dp)
            if (major) {
                val l = measurer.measure(fmtZoom(v), tickStyle)
                val p = Offset(x - l.size.width / 2f, base - h - l.size.height - 2 * dp)
                rotate(angle.value, Offset(x, p.y + l.size.height / 2f)) { drawText(l, topLeft = p) }
            }
        }
        val marker = Path().apply {
            moveTo(cx - 5 * dp, 4 * dp); lineTo(cx + 5 * dp, 4 * dp); lineTo(cx, 10 * dp); close()
        }
        drawPath(marker, Accent)
        drawLine(Accent, Offset(cx, 10 * dp), Offset(cx, base), 1.5f * dp)
        val now = measurer.measure(fmtZoom(zoom.ratio), nowStyle)
        val np = Offset(cx + 8 * dp, 2 * dp)
        rotate(angle.value, Offset(np.x + now.size.width / 2f, np.y + now.size.height / 2f)) { drawText(now, topLeft = np) }
    }
}

/** Minor ticks every 0.1× below 2×, 0.5× to 5×, then every 1×. Counted in whole tenths so floats don't drift. */
private fun dialTicks(min: Float, max: Float): List<Float> {
    val out = mutableListOf<Float>()
    var t = ceil(min * 10 - 0.001f).toInt()
    val end = (max * 10 + 0.001f).toInt()
    while (t <= end) {
        out += t / 10f
        t += when { t < 20 -> 1; t < 50 -> 5; else -> 10 }
    }
    return out
}
