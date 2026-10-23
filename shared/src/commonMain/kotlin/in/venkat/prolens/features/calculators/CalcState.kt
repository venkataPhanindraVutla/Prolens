package `in`.venkat.prolens.features.calculators

import androidx.compose.runtime.Stable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableDoubleStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.Saver
import androidx.compose.runtime.saveable.listSaver
import androidx.compose.runtime.setValue

/** Inputs that survive switching calculator tabs and leaving the screen. Aperture 0 means "pick a default". */
@Stable
class CalcState(
    aperture: Double = 0.0,
    distanceM: Double = 3.0,
    backgroundM: Double = 5.0,
    scene: String = "sun",
    customEv: Double = 12.0,
    solve: String = "shutter",
    shutter: Double = 1.0 / 250,
    iso: Double = 100.0,
    ndBase: Double = 1.0 / 125,
    ndFilter: String = "ND1000",
    ndCustom: Double = 6.0,
    ibis: Boolean = true,
    guideNumber: Double = 36.0,
    flashIso: Double = 100.0,
) {
    var aperture by mutableDoubleStateOf(aperture)
    var distanceM by mutableDoubleStateOf(distanceM)
    var backgroundM by mutableDoubleStateOf(backgroundM)
    var scene by mutableStateOf(scene)
    var customEv by mutableDoubleStateOf(customEv)
    var solve by mutableStateOf(solve)
    var shutter by mutableDoubleStateOf(shutter)
    var iso by mutableDoubleStateOf(iso)
    var ndBase by mutableDoubleStateOf(ndBase)
    var ndFilter by mutableStateOf(ndFilter)
    var ndCustom by mutableDoubleStateOf(ndCustom)
    var ibis by mutableStateOf(ibis)
    var guideNumber by mutableDoubleStateOf(guideNumber)
    var flashIso by mutableDoubleStateOf(flashIso)

    companion object {
        val Saver: Saver<CalcState, Any> = listSaver(
            save = {
                listOf(
                    it.aperture, it.distanceM, it.backgroundM, it.scene, it.customEv, it.solve, it.shutter, it.iso,
                    it.ndBase, it.ndFilter, it.ndCustom, it.ibis, it.guideNumber, it.flashIso,
                )
            },
            restore = {
                CalcState(
                    it[0] as Double, it[1] as Double, it[2] as Double, it[3] as String, it[4] as Double, it[5] as String,
                    it[6] as Double, it[7] as Double, it[8] as Double, it[9] as String, it[10] as Double, it[11] as Boolean,
                    it[12] as Double, it[13] as Double,
                )
            },
        )
    }
}
