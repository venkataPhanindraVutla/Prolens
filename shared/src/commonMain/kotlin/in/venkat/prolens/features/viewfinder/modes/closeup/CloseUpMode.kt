package `in`.venkat.prolens.features.viewfinder.modes.closeup

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.wrapContentWidth
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.unit.dp
import `in`.venkat.prolens.core.designsystem.OverlayChip
import `in`.venkat.prolens.core.designsystem.Pro
import `in`.venkat.prolens.core.designsystem.ProSegmented
import `in`.venkat.prolens.core.model.CaptureMode
import `in`.venkat.prolens.core.photomath.PhotoFormat
import `in`.venkat.prolens.core.platform.RgbImage
import `in`.venkat.prolens.features.viewfinder.fmtFocus
import `in`.venkat.prolens.features.viewfinder.modes.ModeContext
import `in`.venkat.prolens.features.viewfinder.modes.ModeUi
import `in`.venkat.prolens.features.viewfinder.modes.ShutterStyle
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import kotlin.coroutines.resume

/** Guidance text, focus range and stack steps for the close-up modes. Pure, so it is tested without a camera. */
internal object CloseUpMath {
    const val FAR_M = 0.5
    val FRAME_COUNTS = listOf(5, 8, 12)

    /** Long side per stacked frame, so a whole 4:3 stack stays under about 100 MB: 2400 px for 5 frames, 1600 px for 12. */
    fun stackFrameSize(count: Int): Int = when {
        count <= 5 -> 2400
        count <= 8 -> 2000
        else -> 1600
    }

    fun nearestM(minFocusDiopters: Float): Double? = if (minFocusDiopters > 0f) 1.0 / minFocusDiopters else null

    fun cm(m: Double): String = PhotoFormat.trim(m * 100, if (m * 100 < 10) 1 else 0)

    fun guidance(mode: CaptureMode, minFocusDiopters: Float): String {
        val name = if (mode == CaptureMode.Micro) "Micro" else "Macro"
        val near = nearestM(minFocusDiopters) ?: return "Fixed-focus macro lens: move the phone until it's sharp"
        val far = maxOf(FAR_M, near + 0.02)
        return "$name: ${cm(near)} to ${cm(far)} cm from the subject"
    }

    /** Far end of the focus slider in metres. */
    fun farM(nearM: Double): Double = maxOf(FAR_M, nearM + 0.02)

    /** Focus distances for a stack, near to far, evenly spaced in diopters so each step shifts the depth equally. */
    fun stackFocus(nearM: Double, count: Int): List<Double> {
        val dNear = 1.0 / nearM
        val dFar = 1.0 / farM(nearM)
        if (count <= 1) return listOf(nearM)
        return List(count) { i -> 1.0 / (dNear + (dFar - dNear) * i / (count - 1)) }
    }

    fun mult(mode: CaptureMode): Float = if (mode == CaptureMode.Micro) 4f else 2f
}

/**
 * Macro and Micro share this object. The controller binds the close-focus lens; Micro crops in further.
 * With manual focus available, Stack takes several frames across the focus range and merges the sharpest parts.
 */
object CloseUpMode : ModeUi() {
    private var savedPeaking: Boolean? = null
    private var savedFocus: Pair<Double, Boolean>? = null
    private var job: Job? = null

    private val stackOn = mutableStateMapOf<CaptureMode, Boolean>()
    private val frameCount = mutableStateMapOf<CaptureMode, Int>()
    private var status by mutableStateOf<String?>(null)
    private var busy by mutableStateOf(false)

    override fun onEnter(ctx: ModeContext) {
        savedPeaking = ctx.settings.peaking
        savedFocus = ctx.settings.exposure.focusM to ctx.settings.exposure.focusAuto
        ctx.state.updateViewfinder { it.copy(peaking = true) }
    }

    override fun onExit(ctx: ModeContext) {
        job?.cancel()
        job = null
        busy = false
        status = null
        val peaking = savedPeaking
        val focus = savedFocus
        savedPeaking = null
        savedFocus = null
        ctx.state.updateViewfinder { s ->
            s.copy(
                peaking = peaking ?: s.peaking,
                exposure = focus?.let { (m, auto) -> s.exposure.copy(focusM = m, focusAuto = auto) } ?: s.exposure,
            )
        }
    }

    override fun shutterStyle(ctx: ModeContext): ShutterStyle = if (busy) ShutterStyle.Busy else ShutterStyle.Photo

    private fun canStack(ctx: ModeContext) = ctx.capabilities.minFocusDiopters > 0f

    override fun onShutter(ctx: ModeContext): Boolean {
        val mode = ctx.settings.mode
        if (busy) {
            // A second press cancels the stack and returns focus to how it was.
            job?.cancel()
            return true
        }
        if (!canStack(ctx) || stackOn[mode] != true) return false
        val count = frameCount[mode] ?: CloseUpMath.FRAME_COUNTS[1]
        val near = CloseUpMath.nearestM(ctx.capabilities.minFocusDiopters) ?: return false
        val before = ctx.settings.exposure.let { it.focusM to it.focusAuto }
        busy = true
        job = ctx.scope.launch {
            try {
                val frames = ArrayList<RgbImage>(count)
                for ((i, m) in CloseUpMath.stackFocus(near, count).withIndex()) {
                    status = "Taking ${i + 1} of $count"
                    ctx.state.updateViewfinder { it.copy(exposure = it.exposure.copy(focusAuto = false, focusM = m)) }
                    delay(350)
                    val shot = suspendCancellableCoroutine<Result<RgbImage>> { c ->
                        ctx.controller.captureFrame(CloseUpMath.stackFrameSize(count)) { c.resume(it) }
                    }
                    val img = shot.getOrElse { e ->
                        ctx.toast("Stack failed: ${e.message ?: "no frame"}")
                        return@launch
                    }
                    frames += img
                }
                ctx.state.updateViewfinder { it.copy(exposure = it.exposure.copy(focusM = before.first, focusAuto = before.second)) }
                status = "Merging"
                val merged = withContext(Dispatchers.Default) { FocusStacker.merge(frames) }
                val saved = suspendCancellableCoroutine<Result<String>> { c ->
                    ctx.controller.saveImage(merged, "Prolens_stack") { c.resume(it) }
                }
                saved.fold(
                    onSuccess = { ctx.toast("Saved to $it") },
                    onFailure = { ctx.toast("Couldn't save: ${it.message ?: "unknown error"}") },
                )
            } catch (e: CancellationException) {
                throw e
            } catch (e: Throwable) {
                ctx.toast("Stack failed: ${e.message ?: "unknown error"}")
            } finally {
                ctx.state.updateViewfinder { it.copy(exposure = it.exposure.copy(focusM = before.first, focusAuto = before.second)) }
                busy = false
                status = null
            }
        }
        return true
    }

    @Composable
    override fun Controls(ctx: ModeContext) {
        val mode = ctx.settings.mode
        val exposure = ctx.settings.exposure
        val minD = ctx.capabilities.minFocusDiopters
        val c = Pro.colors
        val turn = Modifier.graphicsLayer { rotationZ = ctx.angle.value }

        LaunchedEffect(mode, ctx.zoom.min, ctx.zoom.max) {
            ctx.controller.setZoom((ctx.zoom.min * CloseUpMath.mult(mode)).coerceAtMost(ctx.zoom.max))
        }

        Column(Modifier.fillMaxWidth().padding(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            OverlayChip(
                status ?: CloseUpMath.guidance(mode, minD),
                modifier = Modifier.fillMaxWidth().wrapContentWidth().then(turn),
            )
            if (minD > 0f) {
                val near = CloseUpMath.nearestM(minD)!!
                val farD = 1.0 / CloseUpMath.farM(near)
                val nearD = 1.0 / near
                // The slider runs in diopters, nearest focus on the left, so equal travel is equal depth change.
                val pos = ((1.0 / exposure.focusM.coerceAtLeast(0.01) - nearD) / (farD - nearD)).toFloat().coerceIn(0f, 1f)
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        if (exposure.focusAuto) "Focus" else fmtFocus(exposure.focusM),
                        style = MaterialTheme.typography.labelMedium,
                        color = c.foreground,
                        modifier = turn,
                    )
                    Slider(
                        value = pos,
                        onValueChange = { p ->
                            if (!busy) {
                                val m = 1.0 / (nearD + (farD - nearD) * p)
                                ctx.state.updateViewfinder { it.copy(exposure = it.exposure.copy(focusAuto = false, focusM = m)) }
                            }
                        },
                        enabled = !busy,
                        modifier = Modifier.weight(1f),
                        colors = SliderDefaults.colors(
                            thumbColor = c.primary, activeTrackColor = c.primary, inactiveTrackColor = c.muted,
                        ),
                    )
                    Text("Auto", style = MaterialTheme.typography.labelMedium, color = c.foreground, modifier = turn)
                    Switch(
                        checked = exposure.focusAuto,
                        onCheckedChange = { on ->
                            if (!busy) ctx.state.updateViewfinder { it.copy(exposure = it.exposure.copy(focusAuto = on)) }
                        },
                        colors = SwitchDefaults.colors(
                            checkedThumbColor = c.primaryForeground, checkedTrackColor = c.primary,
                            uncheckedThumbColor = c.mutedForeground, uncheckedTrackColor = c.muted, uncheckedBorderColor = c.input,
                        ),
                    )
                }
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Stack", style = MaterialTheme.typography.labelMedium, color = c.foreground, modifier = turn)
                    Switch(
                        checked = stackOn[mode] == true,
                        onCheckedChange = { if (!busy) stackOn[mode] = it },
                        colors = SwitchDefaults.colors(
                            checkedThumbColor = c.primaryForeground, checkedTrackColor = c.primary,
                            uncheckedThumbColor = c.mutedForeground, uncheckedTrackColor = c.muted, uncheckedBorderColor = c.input,
                        ),
                    )
                    if (stackOn[mode] == true) {
                        ProSegmented(
                            options = CloseUpMath.FRAME_COUNTS.map { it to "$it" },
                            selected = frameCount[mode] ?: CloseUpMath.FRAME_COUNTS[1],
                            onSelect = { if (!busy) frameCount[mode] = it },
                        )
                    }
                }
            }
        }
    }
}
