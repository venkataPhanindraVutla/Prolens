package `in`.venkat.prolens.features.gear

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import `in`.venkat.prolens.app.AppState
import `in`.venkat.prolens.core.designsystem.ProScreen

@Composable
fun GearScreen(state: AppState) {
    ProScreen("Gear") {
        Text("Your camera bodies and lenses. Every calculator uses them.", style = MaterialTheme.typography.bodySmall)
    }
}
