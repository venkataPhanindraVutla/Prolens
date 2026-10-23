package `in`.venkat.prolens.core.model

/** Exposure on the phone camera. Shutter in seconds. Auto values are solved by the camera. */
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

enum class AspectRatio(val label: String, val ratio: Double?) {
    Full("Full", null),
    Square("1:1", 1.0),
    FourFive("4:5", 4.0 / 5),
    ThreeTwo("3:2", 3.0 / 2),
    FourThree("4:3", 4.0 / 3),
    SixteenNine("16:9", 16.0 / 9),
    NineSixteen("9:16", 9.0 / 16),
    Cinema("2.39:1", 2.39);

    /** Width / height for a portrait screen: landscape ratios are turned upright. */
    val portraitRatio: Double? get() = ratio?.let { if (it > 1) 1 / it else it }
}

enum class PeakingSensitivity { Low, Medium, High }

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
)

data class Location(val name: String, val lat: Double, val lon: Double, val timeZoneId: String?)
