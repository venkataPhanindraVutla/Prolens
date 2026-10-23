package `in`.venkat.prolens.features.coach

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import `in`.venkat.prolens.app.AppState
import `in`.venkat.prolens.core.designsystem.ProScreen

@Composable
fun CoachScreen(state: AppState) {
    ProScreen("Coach") {
        Text("Genre recipes, camera angles, lighting patterns and composition.", style = MaterialTheme.typography.bodySmall)
    }
}
