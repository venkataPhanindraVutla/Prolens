package `in`.venkat.prolens.core.platform

import androidx.compose.runtime.Composable
import androidx.compose.runtime.State
import androidx.compose.ui.Modifier
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

/** What the camera reports back while metering on auto. */
data class CameraReadout(val iso: Int? = null, val shutter: Double? = null, val focusDiopters: Float? = null)

interface CameraController {
    val capabilities: StateFlow<CameraCapabilities>
    val readout: StateFlow<CameraReadout>
    /** Push manual or auto exposure, white balance and focus to the camera. */
    fun apply(exposure: ExposureSettings)
    /** Receives downsampled luma frames (~8 fps) while non-null. */
    fun setAnalyzer(analyzer: ((LumaFrame) -> Unit)?)
    /** Saves a full-resolution photo. The callback gets a user-visible location, or an error. */
    fun capture(onResult: (Result<String>) -> Unit)
}

@Composable
expect fun rememberCameraController(): CameraController

/** The live preview for [controller]. Grant [AppPermission.Camera] before showing it. */
@Composable
expect fun CameraPreview(controller: CameraController, modifier: Modifier = Modifier)
