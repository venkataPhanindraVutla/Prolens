package `in`.venkat.prolens.features.viewfinder

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import `in`.venkat.prolens.app.AppState
import `in`.venkat.prolens.core.designsystem.ProScreen

@Composable
fun ViewfinderScreen(state: AppState) {
    ProScreen("Viewfinder") {
        Text("The live camera with grids, level and exposure tools.", style = MaterialTheme.typography.bodySmall)
    }
}
