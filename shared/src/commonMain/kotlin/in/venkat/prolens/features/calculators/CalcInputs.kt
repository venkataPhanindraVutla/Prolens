package `in`.venkat.prolens.features.calculators

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import `in`.venkat.prolens.app.AppState
import `in`.venkat.prolens.core.designsystem.Hairline
import `in`.venkat.prolens.core.designsystem.ProSelect
import `in`.venkat.prolens.core.designsystem.ProSliderField
import `in`.venkat.prolens.core.designsystem.tabular
import `in`.venkat.prolens.core.model.GearState
import `in`.venkat.prolens.core.photomath.PhotoFormat
import `in`.venkat.prolens.core.photomath.PhotoMath
import kotlin.math.roundToInt

@Composable
fun Note(text: String) = Text(text, style = MaterialTheme.typography.bodySmall)

enum class RowEmphasis { Normal, Strong, Dim }

/** A compact table with a muted header row and hairlines. */
@Composable
fun CalcTable(head: List<String>, rows: List<List<String>>, emphasis: (Int) -> RowEmphasis = { RowEmphasis.Normal }) {
    @Composable
    fun line(cells: List<String>, style: androidx.compose.ui.text.TextStyle, modifier: Modifier = Modifier) {
        Row(modifier.fillMaxWidth().padding(vertical = 8.dp)) {
            cells.forEachIndexed { i, cell ->
                Text(cell, style = style, modifier = Modifier.weight(if (i == 0) 1.5f else 1f))
            }
        }
    }
    Column {
        line(head, MaterialTheme.typography.bodySmall)
        rows.forEachIndexed { i, row ->
            Hairline()
            val e = emphasis(i)
            val style = MaterialTheme.typography.bodyMedium.tabular.let {
                if (e == RowEmphasis.Strong) it.copy(fontWeight = FontWeight.SemiBold) else it
            }
            line(row, style, if (e == RowEmphasis.Dim) Modifier.alpha(0.4f) else Modifier)
        }
    }
}

/** Aperture dropdown limited to what the lens can do. */
@Composable
fun ApertureSelect(gear: GearState, calc: CalcState) {
    val list = apertureList(gear.lens)
    ProSelect(
        label = "Aperture",
        options = list.map { it to PhotoFormat.aperture(it) },
        selected = currentAperture(gear, calc),
        onSelect = { calc.aperture = it },
        hint = "Limited to your lens: ${PhotoFormat.aperture(gear.lens.maxAperture)} to ${PhotoFormat.aperture(gear.lens.minAperture)}",
    )
}

internal fun currentAperture(gear: GearState, calc: CalcState): Double =
    PhotoMath.nearest(apertureList(gear.lens), if (calc.aperture > 0) calc.aperture else 2.8)

/** A slider for zooms, a fixed readout for primes. Writes straight to the shared gear profile. */
@Composable
fun FocalInput(state: AppState, gear: GearState) {
    val lens = gear.lens
    if (!lens.isZoom) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Text("Focal length", style = MaterialTheme.typography.labelLarge, modifier = Modifier.weight(1f))
            Text("${formatFocal(lens.minF)} (prime)", style = MaterialTheme.typography.bodySmall.tabular)
        }
    } else {
        ProSliderField(
            label = "Focal length",
            value = gear.focal.toFloat(),
            onValueChange = { v -> state.updateGear { it.copy(focalMm = v.roundToInt().toDouble()) } },
            valueText = formatFocal(gear.focal),
            range = lens.minF.toFloat()..lens.maxF.toFloat(),
        )
    }
}

/** A slider whose position is logarithmic, so close distances get as much travel as far ones. */
@Composable
fun LogSliderField(label: String, value: Double, min: Double, max: Double, onValueChange: (Double) -> Unit) {
    val v = value.coerceIn(min, max)
    ProSliderField(
        label = label,
        value = logPos(v, min, max).toFloat(),
        onValueChange = { p -> onValueChange((logVal(p.toDouble(), min, max) * 100).roundToInt() / 100.0) },
        valueText = formatMetres(v),
        range = 0f..1000f,
    )
}
