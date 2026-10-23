package `in`.venkat.prolens.features.calculators

import androidx.compose.runtime.Composable
import `in`.venkat.prolens.app.AppState
import `in`.venkat.prolens.core.designsystem.ProCard
import `in`.venkat.prolens.core.designsystem.ProSwitchRow
import `in`.venkat.prolens.core.designsystem.StatGrid
import `in`.venkat.prolens.core.model.GearState
import `in`.venkat.prolens.core.photomath.PhotoFormat
import `in`.venkat.prolens.core.photomath.PhotoMath

private val Motion = listOf(
    "Walking" to 1.0 / 250, "Kids and pets" to 1.0 / 500, "Sports" to 1.0 / 1000,
    "Birds in flight" to 1.0 / 2000, "Panning" to 1.0 / 30, "Silky water" to 1.0,
)

@Composable
fun ShutterTab(state: AppState, gear: GearState, calc: CalcState) {
    val body = gear.body
    val f = gear.focal
    val crop = PhotoMath.cropFactor(body)
    val stab = if (calc.ibis) body.ibisStops else 0.0
    val withIbis = snapShutter(PhotoMath.handheldMin(f, crop, stab))
    val plain = snapShutter(PhotoMath.handheldMin(f, crop, 0.0))

    ProCard {
        FocalInput(state, gear)
        ProSwitchRow(
            label = "Use IBIS (${PhotoFormat.trim(body.ibisStops, 1)} stops)",
            checked = calc.ibis,
            onCheckedChange = { calc.ibis = it },
            hint = "In-body stabilisation of your camera",
        )
    }
    ProCard(
        title = "Handheld minimum",
        description = "${formatFocal(PhotoMath.eqFocal(f, body))} equivalent, 1 / (focal × crop)",
    ) {
        StatGrid(
            listOf(
                PhotoFormat.shutter(withIbis) to (if (calc.ibis) "With IBIS" else "Without stabilisation"),
                PhotoFormat.shutter(plain) to "No stabilisation",
            ),
        )
        Note("A steady stance helps, but moving subjects need faster speeds than this.")
    }
    ProCard(title = "Freeze or blur motion") {
        CalcTable(
            listOf("Subject", "Shutter", ""),
            Motion.map { (label, t) -> listOf(label, PhotoFormat.shutter(t), if (t > withIbis * 1.01) "Tripod" else "") },
        )
    }
}
