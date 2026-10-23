package `in`.venkat.prolens.features.calculators

import `in`.venkat.prolens.core.designsystem.ProSelect

import androidx.compose.runtime.Composable
import `in`.venkat.prolens.core.designsystem.ProCard
import `in`.venkat.prolens.core.designsystem.ProSliderField
import `in`.venkat.prolens.core.designsystem.StatGrid
import `in`.venkat.prolens.core.model.GearState
import `in`.venkat.prolens.core.photomath.PhotoFormat
import `in`.venkat.prolens.core.photomath.PhotoMath
import kotlin.math.roundToInt

@Composable
fun FlashTab(gear: GearState, calc: CalcState) {
    val n = currentAperture(gear, calc)
    val isos = PhotoMath.ISOS.filter { it <= 6400 }.map { it.toDouble() }
    val iso = PhotoMath.nearest(isos, calc.flashIso)

    ProCard {
        ProSliderField(
            "Guide number (ISO 100, metres)", calc.guideNumber.toFloat(), { calc.guideNumber = it.roundToInt().toDouble() },
            "GN ${calc.guideNumber.roundToInt()}", 10f..60f,
        )
        ProSelect("ISO", isos.map { it to it.roundToInt().toString() }, iso, { calc.flashIso = it })
        ApertureSelect(gear, calc)
    }
    ProCard(title = "Reach at full power") {
        StatGrid(listOf(formatMetres(PhotoMath.flashDistanceM(calc.guideNumber, n, iso)) to "Maximum distance", PhotoFormat.aperture(n) to "At this aperture"))
        Note("Sync speed is about 1/200 to 1/250 s. Faster needs high-speed sync.")
    }
    ProCard(title = "Inverse square law", description = "2× distance = ¼ light = −2 stops") {
        InverseSquareDiagram()
    }
}
