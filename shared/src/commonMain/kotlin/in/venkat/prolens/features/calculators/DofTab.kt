package `in`.venkat.prolens.features.calculators

import androidx.compose.runtime.Composable
import `in`.venkat.prolens.app.AppState
import `in`.venkat.prolens.core.designsystem.ButtonVariant
import `in`.venkat.prolens.core.designsystem.ProButton
import `in`.venkat.prolens.core.designsystem.ProCard
import `in`.venkat.prolens.core.designsystem.StatGrid
import `in`.venkat.prolens.core.model.GearState
import `in`.venkat.prolens.core.photomath.PhotoFormat
import `in`.venkat.prolens.core.photomath.PhotoMath

@Composable
fun DofTab(state: AppState, gear: GearState, calc: CalcState) {
    val f = gear.focal
    val s = maxOf(calc.distanceM * 1000, f * 1.2)
    val r = PhotoMath.dof(f, currentAperture(gear, calc), PhotoMath.coc(gear.body), s)
    /* The log slider rounds, so treat "at or just short of H" as infinity. */
    val far = if (s >= r.hyperfocal * 0.99) Double.POSITIVE_INFINITY else r.far

    ProCard {
        ApertureSelect(gear, calc)
        FocalInput(state, gear)
        LogSliderField("Subject distance", calc.distanceM, 0.3, 100.0) { calc.distanceM = it }
    }
    ProCard(title = "Sharp zone") {
        StatGrid(
            listOf(
                formatMetres(r.near / 1000) to "Near limit",
                formatMetres(far / 1000) to "Far limit",
                (if (far.isFinite()) formatMetres((far - r.near) / 1000) else "∞") to "Total depth of field",
                formatMetres(r.hyperfocal / 1000) to "Hyperfocal distance",
            ),
        )
        DofDiagram(r.near / 1000, far / 1000, s / 1000)
        ProButton(
            "Focus at hyperfocal",
            onClick = { calc.distanceM = (r.hyperfocal / 1000).coerceIn(0.3, 100.0) },
            variant = ButtonVariant.Outline,
            small = true,
        )
        Note("Focus at the hyperfocal distance and everything from H/2 to infinity is sharp. Here that is ${formatMetres(r.hyperfocal / 2000)} to infinity.")
    }
}
