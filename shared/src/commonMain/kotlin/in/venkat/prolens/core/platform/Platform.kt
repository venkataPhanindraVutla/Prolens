package `in`.venkat.prolens.core.platform

import androidx.compose.runtime.Composable
import androidx.compose.runtime.State
import androidx.compose.ui.Modifier
import `in`.venkat.prolens.core.model.CaptureMode
import `in`.venkat.prolens.core.model.ExposureSettings
import kotlinx.coroutines.flow.StateFlow

/* ---------- Motion sensors ---------- */

/** Degrees. Roll is rotation around the lens axis, pitch is the lens axis against the horizon (+ = up), heading is true north = 0. */
data class DeviceOrientation(
    val roll: Float = 0f,
    val pitch: Float = 0f,
    val heading: Float = 0f,
    val available: Boolean = false,
    /** Gyro magnitude in rad/s, for steady-shot. */
    val motion: Float = 0f,
)

/** Low-pass filtered orientation of the phone held in portrait, camera facing away. */
@Composable
expect fun rememberDeviceOrientation(enabled: Boolean = true): State<DeviceOrientation>

/** How the phone is held ([Hold]: 0, 90, 180 or 270), from the accelerometer. Works while the screen stays portrait. */
@Composable
expect fun rememberHold(): State<Int>

/** While in composition, hides the status and navigation bars. A swipe from the edge shows them briefly. */
@Composable
expect fun ImmersiveMode()

/* ---------- Permissions ---------- */

enum class AppPermission { Camera, Location }

interface PermissionHandle {
    val granted: Boolean
    /** True once the user has turned down the request in this session. */
    val denied: Boolean
    fun request()
}

@Composable
expect fun rememberPermission(permission: AppPermission): PermissionHandle

/* ---------- Storage ---------- */

/** Small string storage for settings, gear and presets, kept between launches. */
interface KeyValueStore {
    fun get(key: String): String?
    fun put(key: String, value: String)
}

@Composable
expect fun rememberKeyValueStore(): KeyValueStore

/* ---------- Location ---------- */

data class GeoPoint(val lat: Double, val lon: Double)

interface LocationRequester {
    /** Last known coarse location, or null when unavailable. Needs [AppPermission.Location]. */
    fun request(onResult: (GeoPoint?) -> Unit)
}

@Composable
expect fun rememberLocationRequester(): LocationRequester

/* ---------- Camera ---------- */

/** What the phone camera can do. Null ranges mean the control isn't available on this device. */
data class CameraCapabilities(
    val manualSensor: Boolean = false,
    val isoRange: IntRange? = null,
    /** Seconds. */
    val exposureRange: ClosedFloatingPointRange<Double>? = null,
    /** Diopters (1/m); 0 means fixed focus. */
    val minFocusDiopters: Float = 0f,
    val focusCalibrated: Boolean = false,
    val focalLengthMm: Float? = null,
    val apertures: List<Float> = emptyList(),
    val sensorWidthMm: Float? = null,
    val sensorHeightMm: Float? = null,
    val evRange: IntRange = 0..0,
    val evStep: Float = 0f,
    /** Width / height of the preview and of every [LumaFrame], phone upright. The preview is letterboxed, never cropped. */
    val previewAspect: Float = 3f / 4f,
) {
    val equivalentFocalMm: Float?
        get() {
            val f = focalLengthMm ?: return null
            val w = sensorWidthMm ?: return null
            val h = sensorHeightMm ?: return null
            return (f * 43.267f / kotlin.math.hypot(w, h))
        }
}

/** A downsampled luma (Y) frame, row-major, one byte per pixel, oriented like the preview. */
class LumaFrame(val width: Int, val height: Int, val data: ByteArray)

/**
 * Zoom relative to the main back lens (1× = the main camera, 0.6× = a typical ultra-wide). The range spans every
 * back lens the app can reach; crossing a lens boundary switches cameras inside the controller.
 */
data class ZoomState(val min: Float = 1f, val max: Float = 1f, val ratio: Float = 1f)

enum class LensRole(val label: String) { UltraWide("Ultra-wide"), Wide("Main"), Tele("Telephoto"), Macro("Macro"), Front("Front") }

/** One camera the phone lets apps use. [relativeZoom] is its field of view against the main back lens. */
data class CameraLens(
    val id: String,
    val role: LensRole,
    val equivalentFocalMm: Float?,
    val relativeZoom: Float,
    val minFocusDiopters: Float,
    val megapixels: Float?,
)

/** What this phone's cameras can do. Modes and lens chips adapt to it, so the app works on any model. */
data class CameraFeatures(
    val lenses: List<CameraLens> = emptyList(),
    val nightExtension: Boolean = false,
    val hdrExtension: Boolean = false,
    val bokehExtension: Boolean = false,
    /** High-speed frame rates for slo-mo, e.g. [120, 240]; empty when the phone has none. */
    val slowMotionFps: List<Int> = emptyList(),
    /** The lens Macro and Micro use: a macro lens if the phone exposes one, otherwise the closest-focusing lens. */
    val closeFocusLensId: String? = null,
) {
    val hasFront: Boolean get() = lenses.any { it.role == LensRole.Front }
    val hasUltraWide: Boolean get() = lenses.any { it.role == LensRole.UltraWide }
}

/** An image in memory: ARGB_8888 pixels, row-major, upright as the photographer held the phone. */
class RgbImage(val width: Int, val height: Int, val argb: IntArray)

/** A slo-mo recording in progress. */
data class Recording(val elapsedMs: Long, val fps: Int)

/** What the camera reports back while metering on auto. */
data class CameraReadout(val iso: Int? = null, val shutter: Double? = null, val focusDiopters: Float? = null)

interface CameraController {
    val capabilities: StateFlow<CameraCapabilities>
    val readout: StateFlow<CameraReadout>
    val zoom: StateFlow<ZoomState>
    /** Zoom relative to the main back lens; switches lenses when the ratio crosses into another camera. */
    fun setZoom(ratio: Float)
    val features: StateFlow<CameraFeatures>
    /** Back or front camera. */
    fun setFront(front: Boolean)
    /**
     * Binds the session the mode needs: Photo, Templates and Panorama use the normal photo session; Night the
     * phone maker's night mode where offered; Macro and Micro the close-focus lens; Slo-mo high-speed video.
     */
    fun setMode(mode: CaptureMode, slowMotionFps: Int = 0)
    /** Takes a frame into memory for panorama and focus stacking, scaled so its long side is at most [maxLongSide]. */
    fun captureFrame(maxLongSide: Int, onResult: (Result<RgbImage>) -> Unit)
    /** Saves an image the app made (a stitched panorama, a focus stack) as a JPEG in the photo library. */
    fun saveImage(image: RgbImage, name: String, onResult: (Result<String>) -> Unit)
    val recording: StateFlow<Recording?>
    /** Starts slo-mo recording in [CaptureMode.SloMo]; [onSaved] gets the library location when it stops. */
    fun startRecording(onSaved: (Result<String>) -> Unit)
    fun stopRecording()
    /**
     * Focuses and meters at ([x], [y]), each 0..1 across the preview. With [lock] they hold until [unlockFocus];
     * otherwise the camera returns to continuous auto after a few seconds. Manual focus or exposure is left alone.
     */
    fun focusAt(x: Float, y: Float, lock: Boolean)
    fun unlockFocus()
    /** Push manual or auto exposure, white balance and focus to the camera. */
    fun apply(exposure: ExposureSettings)
    /** Receives downsampled luma frames (~8 fps) while non-null. */
    fun setAnalyzer(analyzer: ((LumaFrame) -> Unit)?)
    /** Turns the saved photo to match how the phone is held ([Hold]). */
    fun setHold(hold: Int)
    /** Crops preview, analysis frames and photos to [sensorRatio] (long / short side); null keeps the whole sensor. */
    fun setAspect(sensorRatio: Double?)
    /** Saves a full-resolution photo. The callback gets a user-visible location, or an error. */
    fun capture(onResult: (Result<String>) -> Unit)
}

@Composable
expect fun rememberCameraController(): CameraController

/** The live preview for [controller]. Grant [AppPermission.Camera] before showing it. */
@Composable
expect fun CameraPreview(controller: CameraController, modifier: Modifier = Modifier)
