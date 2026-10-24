package `in`.venkat.prolens.features.viewfinder.modes

import androidx.compose.runtime.Composable
import androidx.compose.runtime.State
import androidx.compose.ui.Modifier
import `in`.venkat.prolens.app.AppState
import `in`.venkat.prolens.core.model.CaptureMode
import `in`.venkat.prolens.core.model.ViewfinderSettings
import `in`.venkat.prolens.core.platform.CameraCapabilities
import `in`.venkat.prolens.core.platform.CameraController
import `in`.venkat.prolens.core.platform.CameraFeatures
import `in`.venkat.prolens.core.platform.DeviceOrientation
import `in`.venkat.prolens.core.platform.ZoomState
import `in`.venkat.prolens.features.viewfinder.modes.closeup.CloseUpMode
import `in`.venkat.prolens.features.viewfinder.modes.night.NightMode
import `in`.venkat.prolens.features.viewfinder.modes.panorama.PanoramaMode
import `in`.venkat.prolens.features.viewfinder.modes.slomo.SloMoMode
import `in`.venkat.prolens.features.viewfinder.modes.templates.TemplatesMode
import kotlinx.coroutines.CoroutineScope

/** Everything a capture mode can read or drive. Built fresh on each recomposition of the viewfinder. */
class ModeContext(
    val state: AppState,
    val controller: CameraController,
    val settings: ViewfinderSettings,
    val features: CameraFeatures,
    val capabilities: CameraCapabilities,
    val zoom: ZoomState,
    val orientation: State<DeviceOrientation>,
    /** How the phone is held: 0, 90, 180 or 270 (see core.platform.Hold). */
    val hold: Int,
    /** The angle upright controls are turned to for [hold]; apply with graphicsLayer { rotationZ = angle.value }. */
    val angle: State<Float>,
    val scope: CoroutineScope,
) {
    fun toast(message: String) = state.showToast(message)
}

enum class ShutterStyle { Photo, Record, Recording, Busy }

/**
 * What a capture mode adds to the viewfinder. The viewfinder owns the preview, grids, HUD and lens chips;
 * a mode adds its own layer and controls and may take over the shutter.
 */
abstract class ModeUi {
    /** Drawn over the preview rect, under the chips. Fill [modifier]; it's the preview's size. */
    @Composable
    open fun PreviewLayer(ctx: ModeContext, modifier: Modifier) {}

    /** Controls shown just above the lens chips (a frame-rate choice, a template picker, a stack button…). */
    @Composable
    open fun Controls(ctx: ModeContext) {}

    /** Called for a shutter press. Return false to take a normal photo. */
    open fun onShutter(ctx: ModeContext): Boolean = false

    /** How the shutter looks right now. */
    open fun shutterStyle(ctx: ModeContext): ShutterStyle = ShutterStyle.Photo

    /** Entering the mode: set up zoom, tools or exposure. */
    open fun onEnter(ctx: ModeContext) {}

    /** Leaving the mode: undo anything [onEnter] changed. */
    open fun onExit(ctx: ModeContext) {}
}

object PhotoMode : ModeUi()

fun modeUi(mode: CaptureMode): ModeUi = when (mode) {
    CaptureMode.Photo -> PhotoMode
    CaptureMode.Night -> NightMode
    CaptureMode.Macro, CaptureMode.Micro -> CloseUpMode
    CaptureMode.SloMo -> SloMoMode
    CaptureMode.Panorama -> PanoramaMode
    CaptureMode.Templates -> TemplatesMode
}

/** Modes this phone can do. Slo-mo needs high-speed video; everything else has a fallback. */
fun availableModes(features: CameraFeatures): List<CaptureMode> =
    CaptureMode.entries.filter { it != CaptureMode.SloMo || features.slowMotionFps.isNotEmpty() }
