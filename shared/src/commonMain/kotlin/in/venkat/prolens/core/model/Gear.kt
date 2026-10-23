package `in`.venkat.prolens.core.model

/** A camera body. Sensor size in mm. Crop factor, CoC and pixel pitch are derived in PhotoMath. */
data class Body(
    val id: String,
    val name: String,
    val format: String,
    val sensorW: Double,
    val sensorH: Double,
    val megapixels: Double,
    val ibisStops: Double,
    val custom: Boolean = false,
)

/** A lens. Focal lengths are real mm, not equivalent. */
data class Lens(
    val id: String,
    val name: String,
    val minF: Double,
    val maxF: Double,
    val maxAperture: Double,
    val minAperture: Double = 22.0,
    val custom: Boolean = false,
) {
    val isZoom: Boolean get() = maxF > minF
}

data class GearState(
    val bodies: List<Body> = Presets.bodies,
    val lenses: List<Lens> = Presets.lenses,
    val activeBodyId: String = "sony-a7iv",
    val activeLensId: String = "z-24-70",
    val focalMm: Double = 35.0,
) {
    val body: Body get() = bodies.firstOrNull { it.id == activeBodyId } ?: bodies.first()
    val lens: Lens get() = lenses.firstOrNull { it.id == activeLensId } ?: lenses.first()
    /** Current focal length clamped into the active lens's range. */
    val focal: Double get() = focalMm.coerceIn(lens.minF, lens.maxF)
}

object Presets {
    val bodies = listOf(
        Body("sony-a7iv", "Sony A7 IV", "Full frame", 35.9, 23.9, 33.0, 5.5),
        Body("canon-r6ii", "Canon EOS R6 Mark II", "Full frame", 35.9, 23.9, 24.2, 8.0),
        Body("nikon-z8", "Nikon Z8", "Full frame", 35.9, 23.9, 45.7, 6.0),
        Body("fuji-xt5", "Fujifilm X-T5", "APS-C", 23.5, 15.6, 40.2, 7.0),
        Body("canon-r7", "Canon EOS R7", "APS-C (1.6×)", 22.3, 14.8, 32.5, 7.0),
        Body("om-1", "OM System OM-1", "Micro Four Thirds", 17.4, 13.0, 20.4, 7.0),
        Body("phone-main", "Phone main camera", "1/1.3-inch", 9.6, 7.2, 50.0, 2.0),
    )
    val lenses = listOf(
        Lens("z-16-35", "16–35mm f/4", 16.0, 35.0, 4.0),
        Lens("z-24-70", "24–70mm f/2.8", 24.0, 70.0, 2.8),
        Lens("p-35", "35mm f/1.4", 35.0, 35.0, 1.4, 16.0),
        Lens("p-50", "50mm f/1.8", 50.0, 50.0, 1.8),
        Lens("p-85", "85mm f/1.4", 85.0, 85.0, 1.4, 16.0),
        Lens("z-70-200", "70–200mm f/2.8", 70.0, 200.0, 2.8),
        Lens("z-200-600", "200–600mm f/5.6–6.3", 200.0, 600.0, 5.6, 32.0),
        Lens("m-100", "100mm f/2.8 Macro", 100.0, 100.0, 2.8, 32.0),
        Lens("phone-24", "Phone 24mm-eq f/1.7", 6.9, 6.9, 1.7, 1.7),
    )
}
