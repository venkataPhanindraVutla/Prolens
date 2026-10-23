package `in`.venkat.prolens.features.calculators

import `in`.venkat.prolens.core.designsystem.ProSelect

import androidx.compose.runtime.Composable
import `in`.venkat.prolens.app.AppState
import `in`.venkat.prolens.core.designsystem.ProCard
import `in`.venkat.prolens.core.designsystem.ProSegmented
import `in`.venkat.prolens.core.designsystem.ProSliderField
import `in`.venkat.prolens.core.designsystem.StatGrid
import `in`.venkat.prolens.core.model.GearState
import `in`.venkat.prolens.core.photomath.PhotoFormat
import `in`.venkat.prolens.core.photomath.PhotoMath
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.ui.unit.dp
import kotlin.math.abs
import kotlin.math.pow
import kotlin.math.roundToInt
import kotlin.math.sqrt

private data class Scene(val id: String, val label: String, val ev: Double)

private val Scenes = listOf(
    Scene("sun", "Full sun", 15.0), Scene("light-overcast", "Light overcast", 13.0), Scene("overcast", "Overcast", 12.0),
    Scene("shade", "Open shade", 12.0), Scene("sunset", "Sunset", 12.0), Scene("interior", "Bright interior", 8.0),
    Scene("night", "Night street", 5.0), Scene("moon", "Full-moon landscape", -3.0),
)

private val Sunny16 = listOf(
    "Full sun" to 16.0, "Light overcast" to 11.0, "Overcast" to 8.0, "Heavy overcast" to 5.6, "Open shade or sunset" to 4.0,
)

private const val CUSTOM = "custom"

@Composable
fun ExposureTab(gear: GearState, calc: CalcState) {
    val list = apertureList(gear.lens)
    val ev = if (calc.scene == CUSTOM) calc.customEv else (Scenes.firstOrNull { it.id == calc.scene } ?: Scenes[0]).ev
    val shutterIn = snapShutter(calc.shutter)
    val isoIn = PhotoMath.nearest(PhotoMath.ISOS.map { it.toDouble() }, calc.iso)

    var n = currentAperture(gear, calc)
    var t = shutterIn
    var iso = isoIn
    when (calc.solve) {
        "shutter" -> t = snapShutter(PhotoMath.shutterFor(n, ev, iso))
        "aperture" -> n = PhotoMath.nearest(list, sqrt(t * 2.0.pow(ev + kotlin.math.log2(iso / 100))))
        else -> iso = PhotoMath.nearestIso(PhotoMath.isoFor(n, t, ev)).toDouble()
    }
    /* Positive: the settings suit a brighter scene, so the frame is under-exposed. */
    val diff = PhotoMath.evAtIso(n, t, iso) - ev

    ProCard {
        ProSelect(
            label = "Scene brightness",
            options = Scenes.map { it.id to "${it.label} (EV ${it.ev.roundToInt()})" } + (CUSTOM to "Custom EV"),
            selected = calc.scene,
            onSelect = { calc.scene = it },
        )
        if (calc.scene == CUSTOM) {
            ProSliderField(
                "Scene EV at ISO 100", calc.customEv.toFloat(), { calc.customEv = it.roundToInt().toDouble() },
                "EV ${calc.customEv.roundToInt()}", -6f..20f,
            )
        }
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text("Solve for", style = MaterialTheme.typography.labelLarge)
            ProSegmented(
                listOf("shutter" to "Shutter", "aperture" to "Aperture", "iso" to "ISO"),
                calc.solve,
                { calc.solve = it },
            )
        }
        if (calc.solve != "aperture") ApertureSelect(gear, calc)
        if (calc.solve != "shutter") {
            ProSelect(
                "Shutter speed", PhotoMath.SHUTTERS.map { it to PhotoFormat.shutter(it) }, shutterIn, { calc.shutter = it },
            )
        }
        if (calc.solve != "iso") {
            ProSelect("ISO", PhotoMath.ISOS.map { it.toDouble() to it.toString() }, isoIn, { calc.iso = it })
        }
    }

    val (label, value) = when (calc.solve) {
        "shutter" -> "Shutter speed" to PhotoFormat.shutter(t)
        "aperture" -> "Aperture" to PhotoFormat.aperture(n)
        else -> "ISO" to iso.roundToInt().toString()
    }
    val verdict = if (abs(diff) < 0.2) "Matches the scene."
    else "Snapped to a standard stop, ${PhotoFormat.fixed(abs(diff), 1)} stops ${if (diff > 0) "under" else "over"} the scene."
    ProCard(title = "Result", description = "${PhotoFormat.ev(ev)} scene at ISO 100") {
        StatGrid(listOf(value to "$label to use", "${PhotoFormat.aperture(n)} · ${PhotoFormat.shutter(t)} · ISO ${iso.roundToInt()}" to "Full exposure"))
        Note(verdict)
    }

    val rows = (-2..2).map { k ->
        val ap = PhotoMath.nearest(PhotoMath.APERTURES, n * sqrt(2.0).pow(k))
        Triple(k, listOf(PhotoFormat.aperture(ap), PhotoFormat.shutter(snapShutter(t * 2.0.pow(k))), iso.roundToInt().toString()),
            ap >= list.first() - 0.01 && ap <= list.last() + 0.01)
    }
    ProCard(title = "Equivalent exposures", description = "Same brightness, different look. Dimmed rows are outside your lens range.") {
        CalcTable(
            listOf("Aperture", "Shutter", "ISO"), rows.map { it.second },
            emphasis = { i -> if (rows[i].first == 0) RowEmphasis.Strong else if (rows[i].third) RowEmphasis.Normal else RowEmphasis.Dim },
        )
    }

    val sunny = PhotoFormat.shutter(snapShutter(1 / calc.iso))
    ProCard(title = "Sunny 16", description = "Shutter is 1/ISO, so ISO ${calc.iso.roundToInt()} gives $sunny.") {
        CalcTable(listOf("Conditions", "Aperture", "Shutter"), Sunny16.map { listOf(it.first, PhotoFormat.aperture(it.second), sunny) })
    }
}
