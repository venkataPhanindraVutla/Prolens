package `in`.venkat.prolens.features.calculators

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import `in`.venkat.prolens.app.AppState
import `in`.venkat.prolens.core.designsystem.ProCard
import `in`.venkat.prolens.core.designsystem.Stat
import `in`.venkat.prolens.core.model.GearState
import `in`.venkat.prolens.core.photomath.PhotoFormat
import `in`.venkat.prolens.core.photomath.PhotoMath

@Composable
fun BlurTab(state: AppState, gear: GearState, calc: CalcState) {
    val lens = gear.lens
    val f = gear.focal
    val n = currentAperture(gear, calc)
    val n8 = 8.0.coerceIn(lens.maxAperture, lens.minAperture)
    fun pct(ap: Double) =
        PhotoMath.blurPctOfWidth(f, ap, maxOf(calc.distanceM * 1000, f * 1.2), calc.backgroundM * 1000, gear.body)

    ProCard {
        ApertureSelect(gear, calc)
        FocalInput(state, gear)
        LogSliderField("Subject distance", calc.distanceM, 0.3, 100.0) { calc.distanceM = it }
        LogSliderField("Background behind the subject", calc.backgroundM, 0.5, 50.0) { calc.backgroundM = it }
    }
    val verdict = blurVerdict(pct(n))
    ProCard(title = "Background blur", description = "${verdict.label}. ${verdict.text}") {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            listOf("This setting (${PhotoFormat.aperture(n)})" to n, "At ${PhotoFormat.aperture(n8)}" to n8).forEach { (title, ap) ->
                val p = pct(ap)
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(title, style = MaterialTheme.typography.labelMedium)
                    BlurPreview(p, "Preview of background blur at ${PhotoFormat.aperture(ap)}")
                    Stat(formatPct(p), "Blur disc, % of frame width")
                    Badge(blurVerdict(p).label)
                }
            }
        }
        Note("Under 1% barely blurred, 1 to 3% soft, 3 to 8% creamy, over 8% very strong. The subject stays sharp in the preview.")
    }
}
