package `in`.venkat.prolens.features.viewfinder.modes.night

import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.wrapContentWidth
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.graphicsLayer
import `in`.venkat.prolens.core.designsystem.OverlayChip
import `in`.venkat.prolens.core.model.ExposureSettings
import `in`.venkat.prolens.features.viewfinder.modes.ModeContext
import `in`.venkat.prolens.features.viewfinder.modes.ModeUi

/**
 * Night uses the phone maker's night mode where the phone offers it to apps (CameraX Night extension).
 * Elsewhere Prolens does its own: a held long exposure with Auto ISO, and steady shot waits for stillness.
 */
object NightMode : ModeUi() {
    private var restore: Pair<ExposureSettings, Boolean>? = null

    override fun onEnter(ctx: ModeContext) {
        if (ctx.features.nightExtension || !ctx.capabilities.manualSensor) return
        val s = ctx.settings
        restore = s.exposure to s.steadyShot
        val t = minOf(0.5, ctx.capabilities.exposureRange?.endInclusive ?: 0.5)
        ctx.state.updateViewfinder {
            it.copy(exposure = it.exposure.copy(shutterAuto = false, shutter = t, isoAuto = true), steadyShot = true)
        }
    }

    override fun onExit(ctx: ModeContext) {
        val (exposure, steady) = restore ?: return
        restore = null
        ctx.state.updateViewfinder { it.copy(exposure = exposure, steadyShot = steady) }
    }

    @Composable
    override fun Controls(ctx: ModeContext) {
        val text = when {
            ctx.features.nightExtension -> "Night mode by your phone"
            ctx.capabilities.manualSensor -> "Long exposure: hold still or use a tripod"
            else -> "This phone has no night mode for apps"
        }
        OverlayChip(text, modifier = Modifier.fillMaxWidth().wrapContentWidth().graphicsLayer { rotationZ = ctx.angle.value })
    }
}
