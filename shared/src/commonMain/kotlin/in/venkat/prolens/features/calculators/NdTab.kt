package `in`.venkat.prolens.features.calculators

import `in`.venkat.prolens.core.designsystem.ProSelect

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableDoubleStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import `in`.venkat.prolens.core.designsystem.ButtonVariant
import `in`.venkat.prolens.core.designsystem.ProButton
import `in`.venkat.prolens.core.designsystem.ProCard
import `in`.venkat.prolens.core.designsystem.ProIcons
import `in`.venkat.prolens.core.designsystem.ProSliderField
import `in`.venkat.prolens.core.designsystem.StatGrid
import `in`.venkat.prolens.core.designsystem.tabular
import `in`.venkat.prolens.core.photomath.PhotoFormat
import `in`.venkat.prolens.core.photomath.PhotoMath
import kotlinx.coroutines.delay
import kotlin.math.roundToInt
import kotlin.time.DurationUnit
import kotlin.time.TimeSource

private const val CUSTOM = "custom"

@Composable
fun NdTab(calc: CalcState, onFinished: () -> Unit) {
    val base = snapShutter(calc.ndBase)
    val stops = if (calc.ndFilter == CUSTOM) calc.ndCustom
    else (PhotoMath.ND_FILTERS.firstOrNull { it.name == calc.ndFilter } ?: PhotoMath.ND_FILTERS.last()).stops
    val total = PhotoMath.ndShutter(base, stops)

    ProCard {
        ProSelect("Shutter without the filter", PhotoMath.SHUTTERS.map { it to PhotoFormat.shutter(it) }, base, { calc.ndBase = it })
        ProSelect(
            label = "Filter",
            options = PhotoMath.ND_FILTERS.map { it.name to "${it.name} (${PhotoFormat.trim(it.stops, 1)} stops)" } + (CUSTOM to "Custom stops"),
            selected = calc.ndFilter,
            onSelect = { calc.ndFilter = it },
        )
        if (calc.ndFilter == CUSTOM) {
            ProSliderField(
                "Filter strength", calc.ndCustom.toFloat(), { calc.ndCustom = (it * 2).roundToInt() / 2.0 },
                "${PhotoFormat.trim(calc.ndCustom, 1)} stops", 0f..20f, steps = 39,
            )
        }
    }
    ProCard(title = "New exposure") {
        StatGrid(listOf(PhotoFormat.shutter(total) to "Shutter with the filter", PhotoFormat.trim(stops, 1) to "Stops removed"))
        NdTimer(total, onFinished)
    }
    ProCard(title = "Other filters at this shutter") {
        CalcTable(
            listOf("Filter", "Stops", "Shutter"),
            PhotoMath.ND_FILTERS.map { listOf(it.name, PhotoFormat.trim(it.stops, 1), PhotoFormat.shutter(PhotoMath.ndShutter(base, it.stops))) },
        )
    }
}

@Composable
private fun NdTimer(total: Double, onFinished: () -> Unit) {
    var running by remember(total) { mutableStateOf(false) }
    var left by remember(total) { mutableDoubleStateOf(total) }
    val usable = total >= 1

    LaunchedEffect(running, total) {
        if (!running) return@LaunchedEffect
        val start = TimeSource.Monotonic.markNow()
        while (true) {
            val remaining = total - start.elapsedNow().toDouble(DurationUnit.SECONDS)
            if (remaining <= 0) {
                running = false
                left = total
                onFinished()
                return@LaunchedEffect
            }
            left = remaining
            delay(200)
        }
    }

    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text("Exposure countdown", style = MaterialTheme.typography.bodySmall)
                Text(
                    formatCountdown(if (running) left else total),
                    style = MaterialTheme.typography.titleLarge.tabular,
                )
            }
            ProButton(
                text = if (running) "Stop" else "Start timer",
                onClick = { if (running) { running = false; left = total } else running = true },
                variant = if (running) ButtonVariant.Outline else ButtonVariant.Primary,
                icon = if (running) null else ProIcons.Timer,
                small = true,
                enabled = usable,
            )
        }
        if (!usable) Note("The timer needs an exposure of 1 s or longer.")
    }
}
