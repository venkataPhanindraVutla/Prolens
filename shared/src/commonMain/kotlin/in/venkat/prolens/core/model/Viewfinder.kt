package `in`.venkat.prolens.core.model

import kotlinx.serialization.Serializable

/** Exposure on the phone camera. Shutter in seconds. Auto values are solved by the camera. */
@Serializable
data class ExposureSettings(
    val iso: Int = 100,
    val isoAuto: Boolean = true,
    val shutter: Double = 1.0 / 125,
    val shutterAuto: Boolean = true,
    val ev: Double = 0.0,
    val wbKelvin: Int = 5500,
    val wbAuto: Boolean = true,
    val tint: Int = 0,
    val focusM: Double = 3.0,
    val focusAuto: Boolean = true,
)

/**
 * A crop of the sensor, described by its long and short sides. The camera screen is locked portrait, so the
 * crop is drawn upright on screen, and the saved photo comes out landscape when the phone is held sideways.
 */
@Serializable
enum class AspectRatio(private val long: String?, private val short: String?) {
    Full(null, null),
    Square("1", "1"),
    FourFive("5", "4"),
    ThreeTwo("3", "2"),
    SixteenNine("16", "9"),
    Cinema("2.39", "1");

    /** Long side / short side; null keeps the whole sensor. */
    val sensorRatio: Double? get() = long?.let { it.toDouble() / short!!.toDouble() }

    /** Width / height on the portrait screen. */
    val portraitRatio: Double? get() = sensorRatio?.let { 1 / it }

    /** The ratio as the photographer sees it: 2:3 held upright, 3:2 held sideways. Cinema always reads 2.39:1. */
    fun label(landscape: Boolean): String = when {
        long == null -> "Full"
        this == Cinema || landscape || long == short -> "$long:$short"
        else -> "$short:$long"
    }
}

@Serializable
enum class PeakingSensitivity { Low, Medium, High }

@Serializable
data class ViewfinderSettings(
    val grid: String = "thirds",          // a GridSpec id, or "none"
    val grid2: String = "none",
    val gridOrient: Int = 0,              // bit 1 flips X, bit 2 flips Y
    val gridOpacity: Float = 0.7f,
    val gridColor: Long = 0xFFFFFFFF,
    val aspect: AspectRatio = AspectRatio.Full,
    val level: Boolean = true,
    val angleLabel: Boolean = true,
    val histogram: Boolean = true,
    val clipping: Boolean = false,
    val peaking: Boolean = false,
    val peakingColor: Long = 0xFFEF4444,
    val peakingSensitivity: PeakingSensitivity = PeakingSensitivity.Medium,
    val zebras: Boolean = false,
    val zebraLevel: Int = 95,
    val falseColor: Boolean = false,
    val waveform: Boolean = false,
    val lensFrame: Boolean = false,
    val sunPath: Boolean = false,
    val groundGrid: Boolean = false,
    val steadyShot: Boolean = false,
    val timerSeconds: Int = 0,
    val exposure: ExposureSettings = ExposureSettings(),
    val mode: CaptureMode = CaptureMode.Photo,
    val frontCamera: Boolean = false,
    val slowMotionFps: Int = 0,
    val templateId: String? = null,
)

@Serializable
data class Location(val name: String, val lat: Double, val lon: Double, val timeZoneId: String?)
