package `in`.venkat.prolens.features.gear

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import `in`.venkat.prolens.app.AppState
import `in`.venkat.prolens.core.designsystem.Hairline
import `in`.venkat.prolens.core.designsystem.Pro
import `in`.venkat.prolens.core.designsystem.ProCard
import `in`.venkat.prolens.core.designsystem.ProIcons
import `in`.venkat.prolens.core.designsystem.ProListRow
import `in`.venkat.prolens.core.model.GearState
import `in`.venkat.prolens.core.photomath.PhotoFormat

@Composable
private fun Radio(selected: Boolean) {
    val c = Pro.colors
    Box(
        Modifier.size(18.dp).clip(CircleShape).border(1.5.dp, if (selected) c.foreground else c.input, CircleShape),
        contentAlignment = Alignment.Center,
    ) {
        if (selected) Box(Modifier.size(8.dp).clip(CircleShape).background(c.foreground))
    }
}

@Composable
private fun GearRow(
    title: String,
    subtitle: String,
    active: Boolean,
    custom: Boolean,
    onPick: () -> Unit,
    onDelete: () -> Unit,
) {
    Row(Modifier.padding(vertical = 2.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        Radio(active)
        ProListRow(title, subtitle, onClick = onPick, contentPadding = PaddingValues(vertical = 10.dp, horizontal = 4.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                if (custom) {
                    val shape = CircleShape
                    Text(
                        "Custom",
                        modifier = Modifier.clip(shape).border(1.dp, Pro.colors.border, shape).padding(horizontal = 8.dp, vertical = 1.dp),
                        style = MaterialTheme.typography.labelSmall,
                    )
                }
                if (custom && !active) {
                    Icon(
                        ProIcons.Trash, "Delete $title", tint = Pro.colors.mutedForeground,
                        modifier = Modifier.size(32.dp).clip(CircleShape).clickable(role = Role.Button, onClick = onDelete).padding(8.dp),
                    )
                }
            }
        }
    }
}

@Composable
fun BodiesCard(state: AppState, gear: GearState) {
    ProCard(title = "Camera bodies", description = "Sensor size and megapixels drive crop factor, blur and diffraction.") {
        Column {
            gear.bodies.forEachIndexed { i, b ->
                if (i > 0) Hairline()
                GearRow(
                    title = b.name,
                    subtitle = "${b.format} · ${PhotoFormat.trim(b.megapixels, 1)} MP",
                    active = b.id == gear.activeBodyId,
                    custom = b.custom,
                    onPick = { state.updateGear { it.copy(activeBodyId = b.id) } },
                    onDelete = { state.updateGear { g -> g.copy(bodies = g.bodies.filterNot { it.id == b.id }) } },
                )
            }
        }
    }
}

@Composable
fun LensesCard(state: AppState, gear: GearState) {
    ProCard(title = "Lenses", description = "Focal range and maximum aperture limit the calculators.") {
        Column {
            gear.lenses.forEachIndexed { i, l ->
                if (i > 0) Hairline()
                val range = if (l.isZoom) "${PhotoFormat.trim(l.minF, 1)}–${PhotoFormat.trim(l.maxF, 1)} mm" else "${PhotoFormat.trim(l.minF, 1)} mm"
                GearRow(
                    title = l.name,
                    subtitle = "$range · ${PhotoFormat.aperture(l.maxAperture)}",
                    active = l.id == gear.activeLensId,
                    custom = l.custom,
                    onPick = { state.updateGear { it.copy(activeLensId = l.id, focalMm = it.focalMm.coerceIn(l.minF, l.maxF)) } },
                    onDelete = { state.updateGear { g -> g.copy(lenses = g.lenses.filterNot { it.id == l.id }) } },
                )
            }
        }
    }
}
