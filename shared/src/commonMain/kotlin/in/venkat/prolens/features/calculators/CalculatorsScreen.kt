package `in`.venkat.prolens.features.calculators

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import `in`.venkat.prolens.app.AppState
import `in`.venkat.prolens.app.Tab
import `in`.venkat.prolens.core.designsystem.ButtonVariant
import `in`.venkat.prolens.core.designsystem.ProButton
import `in`.venkat.prolens.core.designsystem.ProScreen
import `in`.venkat.prolens.core.designsystem.ProSegmented

private enum class CalcTab(val label: String) {
    Dof("Depth of field"), Blur("Background blur"), Exposure("Exposure"), Nd("ND filter"),
    Shutter("Shutter speed"), Astro("Astro"), Fov("Field of view"), Flash("Flash"),
}

@Composable
fun CalculatorsScreen(state: AppState) {
    val gear by state.gear.collectAsStateWithLifecycle()
    var tabIndex by rememberSaveable { mutableIntStateOf(0) }
    val calc = rememberSaveable(saver = CalcState.Saver) { CalcState() }
    val tab = CalcTab.entries[tabIndex.coerceIn(0, CalcTab.entries.lastIndex)]

    val lens = gear.lens
    val gearText = if (lens.isZoom) "${gear.body.name} · ${lens.name} at ${formatFocal(gear.focal)}" else "${gear.body.name} · ${lens.name}"

    ProScreen("Calculators") {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Text(gearText, style = MaterialTheme.typography.bodySmall, modifier = Modifier.weight(1f))
            ProButton("Change", onClick = { state.select(Tab.Gear) }, variant = ButtonVariant.Ghost, small = true)
        }
        ProSegmented(CalcTab.entries.map { it to it.label }, tab, { tabIndex = it.ordinal })
        Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
            when (tab) {
                CalcTab.Dof -> DofTab(state, gear, calc)
                CalcTab.Blur -> BlurTab(state, gear, calc)
                CalcTab.Exposure -> ExposureTab(gear, calc)
                CalcTab.Nd -> NdTab(calc, onFinished = { state.showToast("Exposure finished") })
                CalcTab.Shutter -> ShutterTab(state, gear, calc)
                CalcTab.Astro -> AstroTab(state, gear, calc)
                CalcTab.Fov -> FovTab(state, gear)
                CalcTab.Flash -> FlashTab(gear, calc)
            }
        }
    }
}
