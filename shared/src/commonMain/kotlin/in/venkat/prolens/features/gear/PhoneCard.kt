package `in`.venkat.prolens.features.gear

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import `in`.venkat.prolens.app.AppState
import `in`.venkat.prolens.core.designsystem.KvList
import `in`.venkat.prolens.core.designsystem.ProCard
import `in`.venkat.prolens.core.photomath.PhotoFormat
import `in`.venkat.prolens.core.platform.CameraLens
import `in`.venkat.prolens.core.platform.LensRole
import kotlin.math.roundToInt

/** What this phone's cameras let Prolens do, found when the viewfinder first opens. */
@Composable
internal fun PhoneCard(state: AppState) {
    val phone by state.phone.collectAsStateWithLifecycle()
    ProCard(title = "This phone", description = "Lenses and modes Prolens can use here. Other phones show their own.") {
        val (features, caps) = phone ?: run {
            Text("Open the viewfinder once and this fills in.", style = MaterialTheme.typography.bodySmall)
            return@ProCard
        }
        val lensRows = features.lenses.sortedBy { if (it.role == LensRole.Front) 99f else it.relativeZoom }.map { it.label() to it.detail() }
        KvList(
            lensRows + listOf(
                "Manual exposure" to if (caps.manualSensor) "Yes" else "No",
                "Night" to if (features.nightExtension) "Phone's night mode" else "Prolens long exposure",
                "Slo-mo" to features.slowMotionFps.takeIf { it.isNotEmpty() }?.joinToString(" · ") { "$it fps" }.orEmpty().ifEmpty { "Not available" },
                "Portrait blur" to if (features.bokehExtension) "Available" else "Not available",
            ),
        )
    }
}

private fun CameraLens.label(): String = when (role) {
    LensRole.Front -> "Front"
    else -> "${role.label} · ${PhotoFormat.trim(relativeZoom.toDouble(), 1)}×"
}

private fun CameraLens.detail(): String {
    val parts = mutableListOf<String>()
    equivalentFocalMm?.let { parts += "${it.roundToInt()} mm" }
    megapixels?.let { parts += "${it.roundToInt()} MP" }
    parts += if (minFocusDiopters > 0f) "focus from ${PhotoFormat.distance(1000.0 / minFocusDiopters)}" else "fixed focus"
    return parts.joinToString(" · ")
}
