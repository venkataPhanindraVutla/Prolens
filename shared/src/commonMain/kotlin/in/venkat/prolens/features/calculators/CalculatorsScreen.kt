package `in`.venkat.prolens.features.calculators

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import `in`.venkat.prolens.app.AppState
import `in`.venkat.prolens.core.designsystem.ProScreen

@Composable
fun CalculatorsScreen(state: AppState) {
    ProScreen("Calculators") {
        Text("Depth of field, blur, exposure, ND, shutter, astro, field of view and flash.", style = MaterialTheme.typography.bodySmall)
    }
}
