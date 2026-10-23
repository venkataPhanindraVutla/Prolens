package `in`.venkat.prolens.features.viewfinder

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import `in`.venkat.prolens.core.designsystem.ButtonVariant
import `in`.venkat.prolens.core.designsystem.Pro
import `in`.venkat.prolens.core.designsystem.ProButton
import `in`.venkat.prolens.core.designsystem.ProSegmented
import `in`.venkat.prolens.core.designsystem.ProSliderField
import `in`.venkat.prolens.core.designsystem.ProSwitchRow
import `in`.venkat.prolens.core.grids.GridGroup
import `in`.venkat.prolens.core.grids.Grids
import `in`.venkat.prolens.core.grids.drawGrid
import `in`.venkat.prolens.core.model.AspectRatio
import `in`.venkat.prolens.core.model.ExposureSettings
import `in`.venkat.prolens.core.model.PeakingSensitivity
import `in`.venkat.prolens.core.model.ViewfinderSettings
import `in`.venkat.prolens.core.photomath.PhotoFormat
import `in`.venkat.prolens.core.photomath.PhotoMath
import `in`.venkat.prolens.core.platform.CameraCapabilities
import kotlin.math.abs
import kotlin.math.ln
import kotlin.math.roundToInt

@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun ProSheet(title: String, onDismiss: () -> Unit, content: @Composable ColumnScope.() -> Unit) {
    val c = Pro.colors
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        shape = RoundedCornerShape(topStart = Pro.shapes.radiusLg, topEnd = Pro.shapes.radiusLg),
        containerColor = c.card,
        contentColor = c.foreground,
        tonalElevation = 0.dp,
        dragHandle = { Box(Modifier.padding(top = 10.dp, bottom = 6.dp).size(36.dp, 4.dp).clip(RoundedCornerShape(2.dp)).background(c.input)) },
    ) {
        Column(
            Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).navigationBarsPadding().padding(horizontal = 16.dp).padding(bottom = 16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Text(title, style = MaterialTheme.typography.titleMedium)
            content()
        }
    }
}

@Composable
private fun SectionLabel(text: String) = Text(text, style = MaterialTheme.typography.labelMedium)

/** Dims content and swallows touches while a control can't be used. */
@Composable
private fun Gate(enabled: Boolean, content: @Composable () -> Unit) {
    Box(Modifier.alpha(if (enabled) 1f else 0.4f)) {
        content()
        if (!enabled) {
            Box(Modifier.matchParentSize().clickable(interactionSource = remember { MutableInteractionSource() }, indication = null) {})
        }
    }
}

@Composable
private fun AutoRow(label: String, checked: Boolean, enabled: Boolean, hint: String, onChange: (Boolean) -> Unit) {
    val c = Pro.colors
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
            Text(label, style = MaterialTheme.typography.labelLarge)
            Text(hint, style = MaterialTheme.typography.bodySmall)
        }
        Switch(
            checked = checked, onCheckedChange = onChange, enabled = enabled,
            colors = SwitchDefaults.colors(
                checkedThumbColor = c.primaryForeground, checkedTrackColor = c.primary,
                uncheckedThumbColor = c.mutedForeground, uncheckedTrackColor = c.muted, uncheckedBorderColor = c.input,
            ),
        )
    }
}

private const val NO_MANUAL = "This phone doesn't allow manual exposure"

/** The slider sheet for one HUD cell: an Auto switch, then a slider that is locked while Auto is on. */
@Composable
internal fun ValueSheet(
    field: HudField,
    exposure: ExposureSettings,
    caps: CameraCapabilities,
    onChange: ((ExposureSettings) -> ExposureSettings) -> Unit,
    onDismiss: () -> Unit,
) {
    when (field) {
        HudField.Iso -> {
            val scale = PhotoMath.ISOS.filter { caps.isoRange?.contains(it) ?: true }.ifEmpty { PhotoMath.ISOS }
            val idx = scale.indices.minBy { abs(ln(scale[it].toDouble() / exposure.iso)) }
            ProSheet("ISO", onDismiss) {
                AutoRow("Auto", exposure.isoAuto, caps.manualSensor, if (caps.manualSensor) "The phone picks the value" else NO_MANUAL) { on ->
                    onChange { it.copy(isoAuto = on) }
                }
                Gate(caps.manualSensor && !exposure.isoAuto) {
                    ProSliderField("ISO", idx.toFloat(), { onChange { e -> e.copy(iso = scale[it.roundToInt().coerceIn(0, scale.lastIndex)]) } },
                        "${scale[idx]}", 0f..scale.lastIndex.toFloat(), steps = (scale.size - 2).coerceAtLeast(0))
                }
            }
        }
        HudField.Shutter -> {
            val r = caps.exposureRange
            val scale = PhotoMath.SHUTTERS.filter { r == null || it in r }.ifEmpty { PhotoMath.SHUTTERS }
            val idx = scale.indices.minBy { abs(ln(scale[it] / exposure.shutter)) }
            ProSheet("Shutter speed", onDismiss) {
                AutoRow("Auto", exposure.shutterAuto, caps.manualSensor, if (caps.manualSensor) "The phone picks the value" else NO_MANUAL) { on ->
                    onChange { it.copy(shutterAuto = on) }
                }
                Gate(caps.manualSensor && !exposure.shutterAuto) {
                    ProSliderField("Shutter speed", idx.toFloat(), { onChange { e -> e.copy(shutter = scale[it.roundToInt().coerceIn(0, scale.lastIndex)]) } },
                        PhotoFormat.shutter(scale[idx]), 0f..scale.lastIndex.toFloat(), steps = (scale.size - 2).coerceAtLeast(0))
                }
            }
        }
        HudField.Wb -> ProSheet("White balance", onDismiss) {
            AutoRow("Auto", exposure.wbAuto, true, "The phone picks the value") { on -> onChange { it.copy(wbAuto = on) } }
            Gate(!exposure.wbAuto) {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    ProSliderField("Temperature", exposure.wbKelvin.toFloat(), { onChange { e -> e.copy(wbKelvin = (it / 100).roundToInt() * 100) } },
                        "${exposure.wbKelvin} K", 2000f..10000f, steps = 79)
                    ProSliderField("Tint (green to magenta)", exposure.tint.toFloat(), { onChange { e -> e.copy(tint = it.roundToInt()) } },
                        if (exposure.tint == 0) "0" else (if (exposure.tint > 0) "+" else MINUS) + abs(exposure.tint), -50f..50f, steps = 99)
                }
            }
        }
        HudField.Ev -> {
            val step = caps.evStep
            val ok = step > 0f && caps.evRange.last > caps.evRange.first
            val range = caps.evRange
            val idx = if (ok) (exposure.ev / step).roundToInt().coerceIn(range.first, range.last) else 0
            ProSheet("Exposure compensation", onDismiss) {
                Gate(ok) {
                    ProSliderField("EV", idx.toFloat(), { onChange { e -> e.copy(ev = it.roundToInt() * step.toDouble()) } },
                        fmtEv(idx * step.toDouble()), range.first.toFloat()..range.last.toFloat().coerceAtLeast(range.first + 1f),
                        steps = (range.last - range.first - 1).coerceAtLeast(0),
                        hint = if (ok) null else "This phone doesn't allow exposure compensation")
                }
                ProButton("Reset to 0", { onChange { it.copy(ev = 0.0) } }, variant = ButtonVariant.Outline, small = true, enabled = ok)
            }
        }
        HudField.Focus -> {
            val fixed = caps.minFocusDiopters == 0f
            val lo = focusMinPos(caps.minFocusDiopters)
            val pos = focusToPos(exposure.focusM).coerceIn(lo, 100)
            ProSheet("Focus distance", onDismiss) {
                AutoRow("Autofocus", exposure.focusAuto, !fixed, if (fixed) "This phone has fixed focus" else "The phone picks the value") { on ->
                    onChange { it.copy(focusAuto = on) }
                }
                Gate(!fixed && !exposure.focusAuto) {
                    ProSliderField("Distance", pos.toFloat(), { onChange { e -> e.copy(focusM = focusFromPos(it.roundToInt())) } },
                        fmtFocus(focusFromPos(pos)), lo.toFloat()..100f, steps = (99 - lo).coerceAtLeast(0))
                }
            }
        }
    }
}

/* ---------- Grid sheet ---------- */

private val GRID_COLORS = listOf(0xFFFFFFFF to "White", 0xFFFACC15 to "Yellow", 0xFF22D3EE to "Cyan", 0xFFEF4444 to "Red")
private val PEAK_COLORS = listOf(0xFFEF4444 to "Red", 0xFFFACC15 to "Yellow", 0xFF22D3EE to "Cyan", 0xFFFFFFFF to "White")

@Composable
private fun Swatches(colors: List<Pair<Long, String>>, selected: Long, onPick: (Long) -> Unit) {
    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        colors.forEach { (hex, name) ->
            val on = hex == selected
            Box(
                Modifier.size(32.dp).clip(CircleShape)
                    .border(if (on) 2.dp else 1.dp, if (on) Pro.colors.foreground else Pro.colors.input, CircleShape)
                    .padding(4.dp).clip(CircleShape).background(Color(hex))
                    .clickable(role = Role.RadioButton) { onPick(hex) }
                    .semantics { contentDescription = name },
            )
        }
    }
}

@Composable
private fun GridTile(id: String, name: String, selected: Boolean, onClick: () -> Unit) {
    val c = Pro.colors
    val shape = RoundedCornerShape(6.dp)
    Column(
        Modifier.width(68.dp).clickable(role = Role.RadioButton, onClick = onClick),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Canvas(
            Modifier.size(68.dp, 88.dp).clip(shape)
                .background(Brush.verticalGradient(listOf(Color(0xFF3F3F46), Color(0xFF18181B))))
                .border(if (selected) 2.dp else 1.dp, if (selected) c.foreground else c.border, shape),
        ) {
            if (id != "none") drawGrid(id, Rect(Offset.Zero, size), Color.White, 0.95f, 1.dp.toPx())
        }
        Text(
            name, maxLines = 2, overflow = TextOverflow.Ellipsis, textAlign = TextAlign.Center,
            style = MaterialTheme.typography.labelSmall.copy(fontSize = 11.sp, lineHeight = 13.sp, color = if (selected) c.foreground else c.mutedForeground),
        )
    }
}

@Composable
private fun TileRow(group: GridGroup, selectedId: String, onPick: (String) -> Unit) {
    Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        GridTile("none", "None", selectedId == "none") { onPick("none") }
        Grids.all.filter { it.group == group }.forEach { g -> GridTile(g.id, g.name, selectedId == g.id) { onPick(g.id) } }
    }
}

@Composable
internal fun GridSheet(settings: ViewfinderSettings, onChange: ((ViewfinderSettings) -> ViewfinderSettings) -> Unit, onDismiss: () -> Unit) {
    var group by rememberSaveable { mutableIntStateOf(Grids.spec(settings.grid)?.group?.ordinal ?: 0) }
    val family = GridGroup.entries[group]
    val asymmetric = Grids.spec(settings.grid)?.asymmetric == true || Grids.spec(settings.grid2)?.asymmetric == true
    ProSheet("Grid and framing", onDismiss) {
        SectionLabel("Family")
        ProSegmented(GridGroup.entries.map { it to it.label }, family, { group = it.ordinal })
        SectionLabel("Grid")
        TileRow(family, settings.grid) { id -> onChange { it.copy(grid = id) } }
        SectionLabel("Second overlay")
        TileRow(family, settings.grid2) { id -> onChange { it.copy(grid2 = id) } }
        if (asymmetric) {
            SectionLabel("Flip")
            ProSegmented(listOf(0 to "Normal", 1 to "Flip H", 2 to "Flip V", 3 to "Both"), settings.gridOrient, { v -> onChange { it.copy(gridOrient = v) } })
        }
        ProSliderField("Opacity", settings.gridOpacity, { v -> onChange { it.copy(gridOpacity = v) } },
            "${(settings.gridOpacity * 100).roundToInt()}%", 0.1f..1f)
        SectionLabel("Colour")
        Swatches(GRID_COLORS, settings.gridColor) { v -> onChange { it.copy(gridColor = v) } }
        SectionLabel("Aspect ratio")
        Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            AspectRatio.entries.forEach { a ->
                ProButton(a.label, { onChange { it.copy(aspect = a) } },
                    variant = if (a == settings.aspect) ButtonVariant.Primary else ButtonVariant.Outline, small = true)
            }
        }
    }
}

/* ---------- Tools sheet ---------- */

private class ToolDef(
    val label: String, val hint: String, val v2: Boolean,
    val get: (ViewfinderSettings) -> Boolean, val set: (ViewfinderSettings, Boolean) -> ViewfinderSettings,
)

private val TOOLS = listOf(
    ToolDef("Level", "Horizon line and pitch", false, { it.level }, { s, b -> s.copy(level = b) }),
    ToolDef("Camera angle label", "Eye level, high angle, low angle", true, { it.angleLabel }, { s, b -> s.copy(angleLabel = b) }),
    ToolDef("Histogram", "Brightness spread of the scene", false, { it.histogram }, { s, b -> s.copy(histogram = b) }),
    ToolDef("Clipping warnings", "Red blinks for blown highlights, blue for crushed shadows", false, { it.clipping }, { s, b -> s.copy(clipping = b) }),
    ToolDef("Focus peaking", "Outlines the sharpest edges", false, { it.peaking }, { s, b -> s.copy(peaking = b) }),
    ToolDef("Zebras", "Stripes over bright areas", true, { it.zebras }, { s, b -> s.copy(zebras = b) }),
    ToolDef("False colour", "Maps brightness to a colour key", true, { it.falseColor }, { s, b -> s.copy(falseColor = b) }),
    ToolDef("Waveform", "Brightness by column", true, { it.waveform }, { s, b -> s.copy(waveform = b) }),
    ToolDef("Lens frame", "Shows what your camera and lens would see", true, { it.lensFrame }, { s, b -> s.copy(lensFrame = b) }),
    ToolDef("Sun path", "Today's sun arc over the live view", true, { it.sunPath }, { s, b -> s.copy(sunPath = b) }),
    ToolDef("3D ground grid", "Perspective floor grid for camera height and angle", true, { it.groundGrid }, { s, b -> s.copy(groundGrid = b) }),
    ToolDef("Steady shot", "Waits until the phone is still before firing", true, { it.steadyShot }, { s, b -> s.copy(steadyShot = b) }),
)

@Composable
private fun SubRow(label: String, content: @Composable () -> Unit) {
    Row(Modifier.fillMaxWidth().padding(start = 12.dp, bottom = 6.dp), verticalAlignment = Alignment.CenterVertically) {
        Text(label, style = MaterialTheme.typography.bodySmall, modifier = Modifier.width(88.dp))
        content()
    }
}

@Composable
internal fun ToolsSheet(settings: ViewfinderSettings, onChange: ((ViewfinderSettings) -> ViewfinderSettings) -> Unit, onDismiss: () -> Unit) {
    ProSheet("Tools", onDismiss) {
        Column {
            TOOLS.forEach { t ->
                ProSwitchRow(t.label, t.get(settings), { on -> onChange { t.set(it, on) } }, t.hint, if (t.v2) "v2" else null)
                if (t.label == "Focus peaking" && settings.peaking) {
                    SubRow("Colour") { Swatches(PEAK_COLORS, settings.peakingColor) { v -> onChange { it.copy(peakingColor = v) } } }
                    SubRow("Sensitivity") {
                        ProSegmented(
                            PeakingSensitivity.entries.map { it to it.name }, settings.peakingSensitivity,
                            { v -> onChange { it.copy(peakingSensitivity = v) } },
                        )
                    }
                }
                if (t.label == "Zebras" && settings.zebras) {
                    SubRow("Level") {
                        ProSegmented(listOf(70, 95, 100).map { it to "$it%" }, settings.zebraLevel, { v -> onChange { it.copy(zebraLevel = v) } })
                    }
                }
            }
        }
    }
}
