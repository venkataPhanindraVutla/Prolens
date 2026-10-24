package `in`.venkat.prolens.features.gear

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import `in`.venkat.prolens.app.AppState
import `in`.venkat.prolens.core.designsystem.ProCard
import `in`.venkat.prolens.core.designsystem.ProScreen
import `in`.venkat.prolens.core.designsystem.ProSliderField
import `in`.venkat.prolens.core.designsystem.StatGrid
import `in`.venkat.prolens.core.designsystem.tabular
import `in`.venkat.prolens.core.model.GearState
import `in`.venkat.prolens.core.photomath.PhotoFormat
import `in`.venkat.prolens.core.photomath.PhotoMath
import kotlin.math.roundToInt

private fun focal(mm: Double) = "${PhotoFormat.trim(mm, 1)} mm"

@Composable
fun GearScreen(state: AppState) {
    val gear by state.gear.collectAsStateWithLifecycle()
    ProScreen("Gear") {
        ActiveSetupCard(state, gear)
        PhoneCard(state)
        BodiesCard(state, gear)
        AddBodyForm(state)
        LensesCard(state, gear)
        AddLensForm(state)
    }
}

@Composable
private fun ActiveSetupCard(state: AppState, gear: GearState) {
    val body = gear.body
    val lens = gear.lens
    val f = gear.focal
    ProCard(title = "Active setup", description = "Every calculator and the viewfinder lens frame use this profile.") {
        Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(body.name, style = MaterialTheme.typography.titleSmall)
            Text(if (lens.isZoom) "${lens.name} at ${focal(f)}" else lens.name, style = MaterialTheme.typography.bodySmall)
        }
        if (lens.isZoom) {
            ProSliderField(
                label = "Focal length",
                value = f.toFloat(),
                onValueChange = { v -> state.updateGear { it.copy(focalMm = v.roundToInt().toDouble()) } },
                valueText = focal(f),
                range = lens.minF.toFloat()..lens.maxF.toFloat(),
            )
        } else {
            Row(Modifier.fillMaxWidth()) {
                Text("Focal length", style = MaterialTheme.typography.bodySmall, modifier = Modifier.weight(1f))
                Text("${focal(lens.minF)} (prime)", style = MaterialTheme.typography.bodySmall.tabular)
            }
        }
        StatGrid(
            listOf(
                "${PhotoFormat.fixed(PhotoMath.cropFactor(body), 2)}×" to "Crop factor",
                "${PhotoFormat.fixed(PhotoMath.coc(body), 3)} mm" to "Circle of confusion",
                "${PhotoFormat.fixed(PhotoMath.pixelPitchUm(body), 1)} µm" to "Pixel pitch",
                PhotoFormat.aperture(PhotoMath.diffractionLimitN(body)) to "Diffraction starts near",
                "${PhotoFormat.trim(body.sensorW, 1)}×${PhotoFormat.trim(body.sensorH, 1)}" to "Sensor size (mm)",
                focal(PhotoMath.eqFocal(f, body)) to "Equivalent focal",
            ),
        )
    }
}
