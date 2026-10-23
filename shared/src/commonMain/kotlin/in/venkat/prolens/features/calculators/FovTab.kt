package `in`.venkat.prolens.features.calculators

import androidx.compose.runtime.Composable
import `in`.venkat.prolens.app.AppState
import `in`.venkat.prolens.core.designsystem.ProCard
import `in`.venkat.prolens.core.designsystem.StatGrid
import `in`.venkat.prolens.core.model.GearState
import `in`.venkat.prolens.core.photomath.PhotoFormat
import `in`.venkat.prolens.core.photomath.PhotoMath

private val Formats = listOf("Full frame" to 1.0, "APS-C" to 1.5, "APS-C Canon" to 1.6, "Micro Four Thirds" to 2.0)

@Composable
fun FovTab(state: AppState, gear: GearState) {
    val body = gear.body
    val f = gear.focal
    val h = PhotoMath.fovDeg(f, body.sensorW)
    val v = PhotoMath.fovDeg(f, body.sensorH)
    val d = PhotoMath.fovDeg(f, PhotoMath.diag(body))
    val eq = PhotoMath.eqFocal(f, body)

    ProCard { FocalInput(state, gear) }
    ProCard(title = "Angle of view", description = "${body.name} at ${formatFocal(f)}") {
        StatGrid(
            listOf(
                "${PhotoFormat.fixed(h, 1)}°" to "Horizontal",
                "${PhotoFormat.fixed(v, 1)}°" to "Vertical",
                "${PhotoFormat.fixed(d, 1)}°" to "Diagonal",
                formatFocal(eq) to "Full-frame equivalent",
            ),
        )
        FovWedge(h)
    }
    ProCard(title = "Same view on other formats", description = "The focal length you would need to see what you see now.") {
        CalcTable(
            listOf("Format", "Crop", "Focal"),
            Formats.map { (name, crop) -> listOf(name, "${PhotoFormat.trim(crop, 1)}×", formatFocal(eq / crop)) },
        )
    }
}
