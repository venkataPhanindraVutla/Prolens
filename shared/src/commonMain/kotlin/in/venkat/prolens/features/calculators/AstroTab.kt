package `in`.venkat.prolens.features.calculators

import androidx.compose.runtime.Composable
import `in`.venkat.prolens.app.AppState
import `in`.venkat.prolens.core.designsystem.KvList
import `in`.venkat.prolens.core.designsystem.ProCard
import `in`.venkat.prolens.core.designsystem.StatGrid
import `in`.venkat.prolens.core.model.GearState
import `in`.venkat.prolens.core.photomath.PhotoFormat
import `in`.venkat.prolens.core.photomath.PhotoMath

@Composable
fun AstroTab(state: AppState, gear: GearState, calc: CalcState) {
    val body = gear.body
    val f = gear.focal
    val pitch = PhotoMath.pixelPitchUm(body)
    val r500 = PhotoMath.rule500(f, PhotoMath.cropFactor(body))
    val npf = PhotoMath.npf(currentAperture(gear, calc), pitch, f)
    val reason = if (npf < r500 * 0.9) "Your ${PhotoFormat.trim(pitch, 1)} µm pixels show trailing sooner than the 500 rule predicts."
    else "It uses your pixel pitch and aperture, so it follows your sensor."

    ProCard {
        FocalInput(state, gear)
        ApertureSelect(gear, calc)
    }
    ProCard(title = "Longest exposure for round stars") {
        StatGrid(listOf(PhotoFormat.shutter(npf) to "NPF rule (recommended)", PhotoFormat.shutter(r500) to "500 rule"))
        Note("Use NPF. $reason")
        KvList(listOf("Pixel pitch" to "${PhotoFormat.fixed(pitch, 1)} µm"))
    }
    ProCard(title = "Tip") {
        KvList(listOf("ISO" to "1600 to 6400", "Focus" to "Manual, on a bright star"))
    }
}
