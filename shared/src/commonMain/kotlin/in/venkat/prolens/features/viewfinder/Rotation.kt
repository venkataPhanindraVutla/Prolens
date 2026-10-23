package `in`.venkat.prolens.features.viewfinder

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.runtime.Composable
import androidx.compose.runtime.State
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.layout
import androidx.compose.ui.unit.Constraints
import `in`.venkat.prolens.core.platform.Hold

/**
 * The angle controls turn to for [hold], animated the short way round (−90° to 180° turns 90°, not 270°).
 * The layout never moves; only the content of each control turns, like the system camera.
 */
@Composable
internal fun rememberUiAngle(hold: Int): State<Float> {
    var target by remember { mutableFloatStateOf(Hold.uiRotation(hold)) }
    val wanted = Hold.uiRotation(hold)
    val delta = ((wanted - target) % 360f + 540f) % 360f - 180f
    if (delta != 0f) target += delta
    return animateFloatAsState(target, tween(220), label = "uiAngle")
}

/** Turns this element's drawing (not its slot in the layout) by [angle]. */
internal fun Modifier.turned(angle: State<Float>): Modifier = graphicsLayer { rotationZ = angle.value }

/**
 * A full-size layer whose children are laid out as the photographer sees the frame: when the phone is held
 * sideways the layer swaps width and height and turns, so TopEnd is the visual top right in either hold.
 */
@Composable
internal fun HeldLayer(hold: Int, angle: State<Float>, modifier: Modifier = Modifier, content: @Composable BoxScope.() -> Unit) {
    val swap = Hold.isLandscape(hold)
    Box(
        modifier
            .layout { measurable, constraints ->
                val w = constraints.maxWidth
                val h = constraints.maxHeight
                val placeable = measurable.measure(if (swap) Constraints.fixed(h, w) else Constraints.fixed(w, h))
                layout(w, h) { placeable.place((w - placeable.width) / 2, (h - placeable.height) / 2) }
            }
            .turned(angle),
        content = content,
    )
}
