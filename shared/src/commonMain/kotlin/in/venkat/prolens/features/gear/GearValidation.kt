package `in`.venkat.prolens.features.gear

import `in`.venkat.prolens.core.model.Body
import `in`.venkat.prolens.core.model.Lens
import `in`.venkat.prolens.core.photomath.PhotoFormat
import `in`.venkat.prolens.core.photomath.PhotoMath
import kotlin.math.hypot

/** Either the item to add or a plain sentence saying what to fix. */
sealed interface Validated<out T> {
    data class Ok<T>(val item: T) : Validated<T>
    data class Error(val message: String) : Validated<Nothing>
}

private fun String.number(): Double = trim().toDoubleOrNull() ?: Double.NaN

fun validateBody(id: String, name: String, width: String, height: String, megapixels: String, stabilisation: String): Validated<Body> {
    val n = name.trim()
    val w = width.number()
    val h = height.number()
    val mp = megapixels.number()
    val stab = if (stabilisation.isBlank()) 0.0 else stabilisation.number()
    return when {
        n.isEmpty() -> Validated.Error("Enter a name for the body.")
        !(w in 3.0..60.0) -> Validated.Error("Sensor width must be between 3 and 60 mm.")
        !(h in 2.0..50.0) -> Validated.Error("Sensor height must be between 2 and 50 mm.")
        h > w -> Validated.Error("Sensor width must be at least the height.")
        !(mp in 1.0..200.0) -> Validated.Error("Megapixels must be between 1 and 200.")
        !(stab in 0.0..10.0) -> Validated.Error("Stabilisation must be between 0 and 10 stops.")
        else -> {
            val crop = PhotoMath.FF_DIAG / hypot(w, h)
            Validated.Ok(Body(id, n, "Custom (${PhotoFormat.trim(crop, 1)}×)", w, h, mp, stab, custom = true))
        }
    }
}

fun validateLens(id: String, name: String, minFocal: String, maxFocal: String, maxAperture: String): Validated<Lens> {
    val n = name.trim()
    val mn = minFocal.number()
    val mx = maxFocal.number()
    val ap = maxAperture.number()
    return when {
        n.isEmpty() -> Validated.Error("Enter a name for the lens.")
        !(mn in 4.0..2000.0) -> Validated.Error("Min focal length must be between 4 and 2000 mm.")
        !(mx in 4.0..2000.0) -> Validated.Error("Max focal length must be between 4 and 2000 mm.")
        mx < mn -> Validated.Error("Max focal length must be at least the min.")
        !(ap in 0.7..32.0) -> Validated.Error("Max aperture must be between f/0.7 and f/32.")
        else -> Validated.Ok(Lens(id, n, mn, mx, ap, maxOf(22.0, ap), custom = true))
    }
}
