package `in`.venkat.prolens.features.viewfinder

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.State
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import `in`.venkat.prolens.core.designsystem.ButtonVariant
import `in`.venkat.prolens.core.designsystem.Pro
import `in`.venkat.prolens.core.designsystem.ProButton
import `in`.venkat.prolens.core.designsystem.ProIcons
import `in`.venkat.prolens.core.designsystem.tabular
import `in`.venkat.prolens.core.model.ExposureSettings
import `in`.venkat.prolens.core.photomath.PhotoFormat
import `in`.venkat.prolens.core.platform.CameraCapabilities
import `in`.venkat.prolens.core.platform.CameraReadout
import kotlin.math.roundToInt

internal enum class HudField { Iso, Shutter, Wb, Ev, Focus }

@Composable
internal fun ToolToggle(icon: ImageVector, label: String, on: Boolean, angle: State<Float>, onClick: () -> Unit) {
    val c = Pro.colors
    Box(
        Modifier
            .size(40.dp)
            .clip(RoundedCornerShape(Pro.shapes.radius))
            .background(if (on) c.muted else Color.Transparent)
            .clickable(role = Role.Switch, onClick = onClick)
            .semantics { contentDescription = label },
        contentAlignment = Alignment.Center,
    ) {
        Icon(icon, null, tint = if (on) c.foreground else c.mutedForeground, modifier = Modifier.size(20.dp).turned(angle))
    }
}

@Composable
internal fun ToolRow(
    gridOn: Boolean, level: Boolean, histogram: Boolean, peaking: Boolean, zebras: Boolean, angle: State<Float>,
    onApps: () -> Unit, onGrid: () -> Unit, onLevel: () -> Unit, onHistogram: () -> Unit, onPeaking: () -> Unit, onZebras: () -> Unit, onTools: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
        ToolToggle(ProIcons.Apps, "Other screens", false, angle, onApps)
        Box(Modifier.weight(1f))
        ToolToggle(ProIcons.Grid, "Grid", gridOn, angle, onGrid)
        ToolToggle(ProIcons.Level, "Level", level, angle, onLevel)
        ToolToggle(ProIcons.Histogram, "Histogram", histogram, angle, onHistogram)
        ToolToggle(ProIcons.Focus, "Focus peaking", peaking, angle, onPeaking)
        ToolToggle(ProIcons.Zebra, "Zebras", zebras, angle, onZebras)
        Box(Modifier.weight(1f))
        ToolToggle(ProIcons.Sliders, "Tools", false, angle, onTools)
    }
}

@Composable
private fun HudCell(label: String, value: String, auto: Boolean, angle: State<Float>, modifier: Modifier, onClick: (() -> Unit)? = null) {
    val c = Pro.colors
    Box(
        modifier
            .height(48.dp)
            .clip(RoundedCornerShape(Pro.shapes.radius))
            .then(if (onClick != null) Modifier.background(c.card.copy(alpha = 0.8f)).clickable(role = Role.Button, onClick = onClick) else Modifier),
        contentAlignment = Alignment.Center,
    ) {
    Column(Modifier.turned(angle), horizontalAlignment = Alignment.CenterHorizontally) {
        Text(label, style = MaterialTheme.typography.labelSmall.copy(fontSize = 10.sp), maxLines = 1)
        Text(
            value,
            style = MaterialTheme.typography.labelLarge.copy(fontSize = 12.sp, color = if (auto) c.mutedForeground else c.foreground).tabular,
            maxLines = 1,
            textAlign = TextAlign.Center,
        )
    }
    }
}

@Composable
internal fun HudRow(
    exposure: ExposureSettings,
    readout: CameraReadout,
    caps: CameraCapabilities,
    angle: State<Float>,
    onOpen: (HudField) -> Unit,
) {
    val iso = if (exposure.isoAuto) readout.iso?.let { "${it}A" } ?: "Auto" else "${exposure.iso}"
    val shutter = if (exposure.shutterAuto) readout.shutter?.let { "${PhotoFormat.shutter(it)}A" } ?: "Auto" else PhotoFormat.shutter(exposure.shutter)
    val aperture = caps.apertures.firstOrNull()?.let { PhotoFormat.aperture(it.toDouble()) } ?: "—"
    val lens = caps.equivalentFocalMm?.let { "${it.roundToInt()} mm" } ?: "—"
    val wb = if (exposure.wbAuto) "AWB" else "${exposure.wbKelvin}K"
    val focus = if (exposure.focusAuto) "AF" else fmtFocus(exposure.focusM)
    Row(Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 4.dp), horizontalArrangement = Arrangement.spacedBy(3.dp)) {
        val m = Modifier.weight(1f)
        HudCell("ISO", iso, exposure.isoAuto, angle, m) { onOpen(HudField.Iso) }
        HudCell("Shutter", shutter, exposure.shutterAuto, angle, m) { onOpen(HudField.Shutter) }
        HudCell("Aperture", aperture, false, angle, m)
        HudCell("Lens", lens, false, angle, m)
        HudCell("WB", wb, exposure.wbAuto, angle, m) { onOpen(HudField.Wb) }
        HudCell("EV", fmtEv(exposure.ev), false, angle, m) { onOpen(HudField.Ev) }
        HudCell("Focus", focus, exposure.focusAuto, angle, m) { onOpen(HudField.Focus) }
    }
}

@Composable
internal fun CaptureRow(timerSeconds: Int, active: Boolean, saved: Int, angle: State<Float>, onShutter: () -> Unit, onTimer: () -> Unit, onLast: () -> Unit) {
    val c = Pro.colors
    Row(Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.weight(1f), contentAlignment = Alignment.CenterStart) {
            val shape = RoundedCornerShape(Pro.shapes.radius)
            Box(
                Modifier.size(48.dp).clip(shape).background(c.card).border(1.dp, c.border, shape)
                    .clickable(role = Role.Button, onClick = onLast).semantics { contentDescription = "Last capture" },
                contentAlignment = Alignment.Center,
            ) {
                Icon(ProIcons.Image, null, tint = c.mutedForeground, modifier = Modifier.size(20.dp).turned(angle))
                if (saved > 0) {
                    Text(
                        "$saved",
                        modifier = Modifier.align(Alignment.BottomEnd).padding(3.dp),
                        style = MaterialTheme.typography.labelSmall.copy(fontSize = 10.sp, color = c.foreground).tabular,
                    )
                }
            }
        }
        ShutterButton(active, onShutter)
        Box(Modifier.weight(1f), contentAlignment = Alignment.CenterEnd) {
            ProButton(
                if (timerSeconds == 0) "Off" else "$timerSeconds s", onTimer,
                variant = if (timerSeconds == 0) ButtonVariant.Outline else ButtonVariant.Secondary,
                icon = ProIcons.Timer, small = true, modifier = Modifier.turned(angle),
            )
        }
    }
}

@Composable
private fun ShutterButton(active: Boolean, onClick: () -> Unit) {
    val c = Pro.colors
    Box(
        Modifier
            .size(72.dp)
            .clip(CircleShape)
            .border(3.dp, Color.White, CircleShape)
            .clickable(role = Role.Button, onClick = onClick)
            .semantics { contentDescription = if (active) "Cancel" else "Take photo" }
            .padding(6.dp),
        contentAlignment = Alignment.Center,
    ) {
        Canvas(Modifier.size(54.dp)) {
            if (active) {
                val s = size.width * 0.42f
                drawRoundRect(c.destructive, topLeft = androidx.compose.ui.geometry.Offset((size.width - s) / 2, (size.height - s) / 2),
                    size = androidx.compose.ui.geometry.Size(s, s), cornerRadius = androidx.compose.ui.geometry.CornerRadius(6.dp.toPx()))
            } else {
                drawCircle(Color.White)
            }
        }
    }
}
