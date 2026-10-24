package `in`.venkat.prolens.features.viewfinder

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.layout.positionInParent
import androidx.compose.ui.platform.LocalDensity
import `in`.venkat.prolens.core.model.CaptureMode
import `in`.venkat.prolens.features.viewfinder.modes.ShutterStyle
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
import androidx.compose.ui.text.font.FontWeight
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
    gridOn: Boolean, level: Boolean, histogram: Boolean, peaking: Boolean, zebras: Boolean, timerSeconds: Int, angle: State<Float>,
    onGrid: () -> Unit, onLevel: () -> Unit, onHistogram: () -> Unit, onPeaking: () -> Unit, onZebras: () -> Unit,
    onTimer: () -> Unit, onTools: () -> Unit, onToolkit: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
        ToolToggle(ProIcons.Grid, "Grid", gridOn, angle, onGrid)
        ToolToggle(ProIcons.Level, "Level", level, angle, onLevel)
        ToolToggle(ProIcons.Histogram, "Histogram", histogram, angle, onHistogram)
        ToolToggle(ProIcons.Focus, "Focus peaking", peaking, angle, onPeaking)
        ToolToggle(ProIcons.Zebra, "Zebras", zebras, angle, onZebras)
        Box(Modifier.weight(1f))
        TimerToggle(timerSeconds, angle, onTimer)
        ToolToggle(ProIcons.Sliders, "Overlays and tools", false, angle, onTools)
        ToolToggle(ProIcons.Apps, "Toolkit", false, angle, onToolkit)
    }
}

/** Off, 2 s, 10 s: the number sits on the icon while it's on. */
@Composable
private fun TimerToggle(seconds: Int, angle: State<Float>, onClick: () -> Unit) {
    val c = Pro.colors
    Box(
        Modifier
            .size(40.dp)
            .clip(RoundedCornerShape(Pro.shapes.radius))
            .background(if (seconds > 0) c.muted else Color.Transparent)
            .clickable(role = Role.Button, onClick = onClick)
            .semantics { contentDescription = if (seconds == 0) "Timer off" else "Timer $seconds seconds" },
        contentAlignment = Alignment.Center,
    ) {
        Box(Modifier.turned(angle), contentAlignment = Alignment.Center) {
            Icon(ProIcons.Timer, null, tint = if (seconds > 0) c.foreground else c.mutedForeground, modifier = Modifier.size(20.dp))
            if (seconds > 0) {
                Text(
                    "$seconds", Modifier.align(Alignment.BottomEnd).offset(x = 6.dp, y = 4.dp),
                    style = MaterialTheme.typography.labelSmall.copy(fontSize = 9.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFFFACC15)).tabular,
                )
            }
        }
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
    zoomRatio: Float,
    angle: State<Float>,
    onOpen: (HudField) -> Unit,
) {
    val iso = if (exposure.isoAuto) readout.iso?.let { "${it}A" } ?: "Auto" else "${exposure.iso}"
    val shutter = if (exposure.shutterAuto) readout.shutter?.let { "${PhotoFormat.shutter(it)}A" } ?: "Auto" else PhotoFormat.shutter(exposure.shutter)
    val aperture = caps.apertures.firstOrNull()?.let { PhotoFormat.aperture(it.toDouble()) } ?: "—"
    val lens = caps.equivalentFocalMm?.let { "${(it * zoomRatio).roundToInt()} mm" } ?: "—"
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
internal fun CaptureRow(
    shutter: ShutterStyle, active: Boolean, saved: Int, canFlip: Boolean, front: Boolean, recordingMs: Long?, angle: State<Float>,
    onShutter: () -> Unit, onFlip: () -> Unit, onLast: () -> Unit,
) {
    val c = Pro.colors
    val shape = RoundedCornerShape(Pro.shapes.radius)
    Row(Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.weight(1f), contentAlignment = Alignment.CenterStart) {
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
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            ShutterButton(shutter, active, onShutter)
            recordingMs?.let {
                Text(
                    fmtClock(it), Modifier.padding(top = 4.dp),
                    style = MaterialTheme.typography.labelMedium.copy(color = c.destructive).tabular,
                )
            }
        }
        Box(Modifier.weight(1f), contentAlignment = Alignment.CenterEnd) {
            if (canFlip) {
                Box(
                    Modifier.size(48.dp).clip(CircleShape).background(c.card).border(1.dp, c.border, CircleShape)
                        .clickable(role = Role.Button, onClick = onFlip)
                        .semantics { contentDescription = if (front) "Use the back camera" else "Use the front camera" },
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(ProIcons.Flip, null, tint = c.foreground, modifier = Modifier.size(20.dp).turned(angle))
                }
            }
        }
    }
}

internal fun fmtClock(ms: Long): String {
    val s = ms / 1000
    return "${s / 60}:${(s % 60).toString().padStart(2, '0')}"
}

@Composable
private fun ShutterButton(style: ShutterStyle, active: Boolean, onClick: () -> Unit) {
    val c = Pro.colors
    val label = when {
        style == ShutterStyle.Recording -> "Stop recording"
        style == ShutterStyle.Record -> "Start recording"
        active -> "Cancel"
        else -> "Take photo"
    }
    Box(
        Modifier
            .size(72.dp)
            .clip(CircleShape)
            .border(3.dp, Color.White, CircleShape)
            .clickable(enabled = style != ShutterStyle.Busy, role = Role.Button, onClick = onClick)
            .semantics { contentDescription = label }
            .padding(6.dp),
        contentAlignment = Alignment.Center,
    ) {
        Canvas(Modifier.size(54.dp)) {
            val square = { colour: Color ->
                val sq = size.width * 0.42f
                drawRoundRect(colour, topLeft = androidx.compose.ui.geometry.Offset((size.width - sq) / 2, (size.height - sq) / 2),
                    size = androidx.compose.ui.geometry.Size(sq, sq), cornerRadius = androidx.compose.ui.geometry.CornerRadius(6.dp.toPx()))
            }
            when {
                style == ShutterStyle.Recording || active -> square(c.destructive)
                style == ShutterStyle.Record -> drawCircle(c.destructive)
                style == ShutterStyle.Busy -> drawCircle(Color.White.copy(alpha = 0.4f))
                else -> drawCircle(Color.White)
            }
        }
    }
}

/**
 * The camera-style mode strip above the shutter: Night · Micro · Macro · Photo · Slo-mo · Pano · Templates,
 * only the ones this phone can do, scrolled so the current mode sits in the middle.
 */
@Composable
internal fun ModeStrip(modes: List<CaptureMode>, current: CaptureMode, onSelect: (CaptureMode) -> Unit, modifier: Modifier = Modifier) {
    val c = Pro.colors
    val scroll = rememberScrollState()
    val centres = remember { mutableStateMapOf<CaptureMode, Int>() }
    var width by remember { mutableIntStateOf(0) }
    LaunchedEffect(current, width, centres[current]) {
        val x = centres[current] ?: return@LaunchedEffect
        scroll.animateScrollTo((x - width / 2).coerceAtLeast(0))
    }
    Row(
        modifier
            .fillMaxWidth()
            .onSizeChanged { width = it.width }
            .horizontalScroll(scroll)
            .padding(vertical = 6.dp),
        horizontalArrangement = Arrangement.spacedBy(14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Spacer(Modifier.width(with(LocalDensity.current) { (width / 2).toDp() }))
        modes.forEach { m ->
            val on = m == current
            Text(
                m.label,
                modifier = Modifier
                    .onGloballyPositioned { centres[m] = (it.positionInParent().x + it.size.width / 2).toInt() }
                    .clip(RoundedCornerShape(Pro.shapes.radius))
                    .clickable(enabled = !on, role = Role.Tab) { onSelect(m) }
                    .padding(horizontal = 6.dp, vertical = 6.dp),
                style = MaterialTheme.typography.labelMedium.copy(
                    fontSize = 13.sp,
                    fontWeight = if (on) FontWeight.SemiBold else FontWeight.Medium,
                    color = if (on) Color(0xFFFACC15) else c.mutedForeground,
                ),
            )
        }
        Spacer(Modifier.width(with(LocalDensity.current) { (width / 2).toDp() }))
    }
}
