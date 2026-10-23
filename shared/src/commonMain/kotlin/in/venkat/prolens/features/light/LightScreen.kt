package `in`.venkat.prolens.features.light

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import `in`.venkat.prolens.app.AppState
import `in`.venkat.prolens.core.designsystem.ProScreen

@Composable
fun LightScreen(state: AppState) {
    ProScreen("Light") {
        Text("Golden and blue hour, sun path, direction, shadows and the moon.", style = MaterialTheme.typography.bodySmall)
    }
}
