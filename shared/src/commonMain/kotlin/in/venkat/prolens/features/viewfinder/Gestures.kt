package `in`.venkat.prolens.features.viewfinder

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.gestures.calculateZoom
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.input.pointer.positionChange
import androidx.compose.ui.input.pointer.positionChanged
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import kotlin.math.abs
import kotlin.math.roundToInt

/** A tap or hold on the preview, in preview pixels. */
internal data class FocusMark(val x: Float, val y: Float, val locked: Boolean, val id: Long)

/**
 * One gesture handler for the preview, so the gestures can't fight:
 * - tap focuses and meters, press and hold locks them
 * - two fingers pinch-zoom
 * - a swipe along the photographer's horizontal changes screen, along their vertical shows or hides the HUD
 */
internal fun Modifier.previewGestures(
    hold: Int,
    onTap: (px: Offset, unit: Offset) -> Unit,
    onHold: (px: Offset, unit: Offset) -> Unit,
    onPinchStart: () -> Unit,
    onPinch: (Float) -> Unit,
    onSwipeSideways: (towardsNext: Boolean) -> Unit,
    onSwipeUpDown: () -> Unit,
): Modifier = pointerInput(hold) {
    fun unit(p: Offset) = Offset(p.x / size.width.coerceAtLeast(1), p.y / size.height.coerceAtLeast(1))
    val swipeX = 72.dp.toPx()
    val swipeY = 56.dp.toPx()
    awaitEachGesture {
        val down = awaitFirstDown(requireUnconsumed = false)
        var pan = Offset.Zero
        var pinching = false
        var dragging = false
        // Wait for the gesture to show what it is: a lift (tap), a move (swipe), a second finger (pinch) or nothing (hold).
        val settled = withTimeoutOrNull(viewConfiguration.longPressTimeoutMillis) {
            while (true) {
                val e = awaitPointerEvent()
                if (e.changes.count { it.pressed } >= 2) { pinching = true; onPinchStart(); return@withTimeoutOrNull true }
                val c = e.changes.firstOrNull { it.id == down.id } ?: return@withTimeoutOrNull false
                if (!c.pressed) { onTap(down.position, unit(down.position)); return@withTimeoutOrNull false }
                pan += c.positionChange()
                if (pan.getDistance() > viewConfiguration.touchSlop) { dragging = true; return@withTimeoutOrNull true }
            }
            @Suppress("UNREACHABLE_CODE")
            true
        }
        if (settled == false) return@awaitEachGesture
        if (settled == null) onHold(down.position, unit(down.position))
        while (true) {
            val e = awaitPointerEvent()
            if (!pinching && e.changes.count { it.pressed } >= 2) { pinching = true; dragging = false; onPinchStart() }
            if (pinching) {
                val z = e.calculateZoom()
                if (z != 1f) onPinch(z)
                e.changes.forEach { if (it.positionChanged()) it.consume() }
            } else if (dragging) {
                e.changes.firstOrNull { it.id == down.id }?.let { pan += it.positionChange() }
            }
            if (e.changes.none { it.pressed }) break
        }
        if (dragging && !pinching) {
            val (hx, hy) = heldDelta(pan.x, pan.y, hold)
            when {
                abs(hx) > abs(hy) && abs(hx) > swipeX -> onSwipeSideways(hx < 0)
                abs(hy) > abs(hx) && abs(hy) > swipeY -> onSwipeUpDown()
            }
        }
    }
}

/** The focus square: shrinks into place, then fades unless focus and exposure are locked. */
@Composable
internal fun FocusSquare(mark: FocusMark) {
    val sizeDp = 72.dp
    val half = with(LocalDensity.current) { sizeDp.toPx() / 2 }
    val scale = remember(mark.id) { Animatable(1.25f) }
    val alpha = remember(mark.id) { Animatable(1f) }
    LaunchedEffect(mark.id, mark.locked) {
        scale.animateTo(1f, tween(160))
        if (!mark.locked) {
            kotlinx.coroutines.delay(900)
            alpha.animateTo(0f, tween(300))
        } else {
            alpha.snapTo(1f)
        }
    }
    Canvas(
        Modifier
            .offset { IntOffset((mark.x - half).roundToInt(), (mark.y - half).roundToInt()) }
            .size(sizeDp)
            .graphicsLayer { scaleX = scale.value; scaleY = scale.value; this.alpha = alpha.value },
    ) {
        val w = 1.5.dp.toPx()
        drawRect(Color.Black.copy(alpha = 0.35f), style = Stroke(w + 1.5.dp.toPx()))
        drawRect(Color(0xFFFACC15), style = Stroke(w))
        val t = 6.dp.toPx()
        val c = size.width / 2
        drawLine(Color(0xFFFACC15), Offset(c, 0f), Offset(c, t), w)
        drawLine(Color(0xFFFACC15), Offset(c, size.height - t), Offset(c, size.height), w)
        drawLine(Color(0xFFFACC15), Offset(0f, c), Offset(t, c), w)
        drawLine(Color(0xFFFACC15), Offset(size.width - t, c), Offset(size.width, c), w)
    }
}
