package `in`.venkat.prolens.core.designsystem

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Icon
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.material3.MaterialTheme
import androidx.compose.ui.text.TextStyle

/** Tabular figures for every number the app shows. */
val TextStyle.tabular: TextStyle get() = copy(fontFeatureSettings = "tnum")

/** A scrolling screen with the large title, clear of the status bar. */
@Composable
fun ProScreen(
    title: String,
    modifier: Modifier = Modifier,
    trailing: (@Composable RowScope.() -> Unit)? = null,
    content: @Composable ColumnScope.() -> Unit,
) {
    Column(
        modifier
            .fillMaxSize()
            .background(Pro.colors.background)
            .statusBarsPadding()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Text(title, style = MaterialTheme.typography.headlineSmall, modifier = Modifier.weight(1f))
            trailing?.invoke(this)
        }
        content()
        Spacer(Modifier.height(8.dp))
    }
}

@Composable
fun ProCard(
    modifier: Modifier = Modifier,
    title: String? = null,
    description: String? = null,
    content: @Composable ColumnScope.() -> Unit,
) {
    val shape = RoundedCornerShape(Pro.shapes.radiusLg)
    Column(
        modifier
            .fillMaxWidth()
            .clip(shape)
            .background(Pro.colors.card)
            .border(1.dp, Pro.colors.border, shape)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        if (title != null || description != null) {
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                title?.let { Text(it, style = MaterialTheme.typography.titleMedium) }
                description?.let { Text(it, style = MaterialTheme.typography.bodySmall) }
            }
        }
        content()
    }
}

enum class ButtonVariant { Primary, Outline, Secondary, Ghost }

@Composable
fun ProButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    variant: ButtonVariant = ButtonVariant.Primary,
    icon: ImageVector? = null,
    small: Boolean = false,
    enabled: Boolean = true,
) {
    val c = Pro.colors
    val shape = RoundedCornerShape(Pro.shapes.radius)
    val (bg, fg, border) = when (variant) {
        ButtonVariant.Primary -> Triple(c.primary, c.primaryForeground, null)
        ButtonVariant.Outline -> Triple(c.background, c.foreground, c.input)
        ButtonVariant.Secondary -> Triple(c.muted, c.foreground, null)
        ButtonVariant.Ghost -> Triple(Color.Transparent, c.foreground, null)
    }
    Row(
        modifier
            .height(if (small) 32.dp else 40.dp)
            .clip(shape)
            .background(if (enabled) bg else bg.copy(alpha = 0.5f))
            .then(if (border != null) Modifier.border(1.dp, border, shape) else Modifier)
            .clickable(enabled = enabled, role = Role.Button, onClick = onClick)
            .padding(horizontal = if (small) 10.dp else 14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp, Alignment.CenterHorizontally),
    ) {
        icon?.let { Icon(it, null, tint = fg, modifier = Modifier.width(16.dp)) }
        Text(text, color = fg, style = MaterialTheme.typography.labelLarge.copy(fontSize = if (small) 13.sp else 14.sp))
    }
}

/** v1 = first release, v2 = pro tools, v3 = smart layer. */
@Composable
fun TierBadge(tier: String) {
    val c = Pro.colors
    val shape = RoundedCornerShape(50)
    val (bg, fg) = when (tier) {
        "v1" -> c.primary to c.primaryForeground
        "v2" -> c.muted to c.foreground
        else -> Color.Transparent to c.mutedForeground
    }
    Text(
        tier,
        modifier = Modifier.clip(shape).background(bg).border(1.dp, if (tier == "v1") bg else c.border, shape).padding(horizontal = 8.dp, vertical = 1.dp),
        color = fg,
        style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Medium, color = fg),
    )
}

/** shadcn Tabs list: a muted track with the selected item raised. Scrolls when it doesn't fit. */
@Composable
fun <T> ProSegmented(
    options: List<Pair<T, String>>,
    selected: T,
    onSelect: (T) -> Unit,
    modifier: Modifier = Modifier,
) {
    val c = Pro.colors
    val shape = RoundedCornerShape(Pro.shapes.radius)
    Row(
        modifier
            .clip(shape)
            .background(c.muted)
            .horizontalScroll(rememberScrollState())
            .padding(3.dp),
        horizontalArrangement = Arrangement.spacedBy(2.dp),
    ) {
        options.forEach { (value, label) ->
            val on = value == selected
            Text(
                label,
                modifier = Modifier
                    .clip(RoundedCornerShape(Pro.shapes.radius - 2.dp))
                    .background(if (on) c.background else Color.Transparent)
                    .clickable(role = Role.Tab) { onSelect(value) }
                    .padding(horizontal = 10.dp, vertical = 5.dp),
                color = if (on) c.foreground else c.mutedForeground,
                style = MaterialTheme.typography.labelMedium,
            )
        }
    }
}

@Composable
fun ProSwitchRow(label: String, checked: Boolean, onCheckedChange: (Boolean) -> Unit, hint: String? = null, badge: String? = null) {
    val c = Pro.colors
    Row(Modifier.fillMaxWidth().padding(vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(label, style = MaterialTheme.typography.labelLarge)
                badge?.let { TierBadge(it) }
            }
            hint?.let { Text(it, style = MaterialTheme.typography.bodySmall) }
        }
        Switch(
            checked = checked,
            onCheckedChange = onCheckedChange,
            colors = SwitchDefaults.colors(
                checkedThumbColor = c.primaryForeground, checkedTrackColor = c.primary,
                uncheckedThumbColor = c.mutedForeground, uncheckedTrackColor = c.muted, uncheckedBorderColor = c.input,
            ),
        )
    }
}

/** Label, live value and a slider over [range]. */
@Composable
fun ProSliderField(
    label: String,
    value: Float,
    onValueChange: (Float) -> Unit,
    valueText: String,
    range: ClosedFloatingPointRange<Float>,
    steps: Int = 0,
    hint: String? = null,
) {
    val c = Pro.colors
    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
        Row(Modifier.fillMaxWidth()) {
            Text(label, style = MaterialTheme.typography.labelLarge, modifier = Modifier.weight(1f))
            Text(valueText, style = MaterialTheme.typography.bodySmall.tabular)
        }
        Slider(
            value = value.coerceIn(range.start, range.endInclusive),
            onValueChange = onValueChange,
            valueRange = range,
            steps = steps,
            colors = SliderDefaults.colors(
                thumbColor = c.primary, activeTrackColor = c.primary, inactiveTrackColor = c.muted,
                activeTickColor = Color.Transparent, inactiveTickColor = Color.Transparent,
            ),
        )
        hint?.let { Text(it, style = MaterialTheme.typography.bodySmall) }
    }
}

/** Definition-list rows separated by hairlines. */
@Composable
fun KvList(rows: List<Pair<String, String>>) {
    val c = Pro.colors
    Column {
        rows.forEachIndexed { i, (k, v) ->
            Row(Modifier.fillMaxWidth().padding(vertical = 8.dp), verticalAlignment = Alignment.Top) {
                Text(k, style = MaterialTheme.typography.bodySmall, modifier = Modifier.weight(1f))
                Text(v, style = MaterialTheme.typography.labelMedium.tabular, textAlign = TextAlign.End)
            }
            if (i < rows.lastIndex) Box(Modifier.fillMaxWidth().height(1.dp).background(c.border))
        }
    }
}

@Composable
fun Stat(value: String, label: String, modifier: Modifier = Modifier) {
    Column(modifier, verticalArrangement = Arrangement.spacedBy(2.dp)) {
        Text(value, style = MaterialTheme.typography.titleLarge.copy(fontSize = 22.sp).tabular)
        Text(label, style = MaterialTheme.typography.bodySmall)
    }
}

/** Two-column grid of [Stat]s. */
@Composable
fun StatGrid(stats: List<Pair<String, String>>) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        stats.chunked(2).forEach { pair ->
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                pair.forEach { (v, l) -> Stat(v, l, Modifier.weight(1f)) }
                if (pair.size == 1) Spacer(Modifier.weight(1f))
            }
        }
    }
}

@Composable
fun Hairline(modifier: Modifier = Modifier) {
    Box(modifier.fillMaxWidth().height(1.dp).background(Pro.colors.border))
}

/** A tappable list row with a title, a muted subtitle and an optional trailing slot. */
@Composable
fun ProListRow(
    title: String,
    subtitle: String? = null,
    onClick: (() -> Unit)? = null,
    contentPadding: PaddingValues = PaddingValues(vertical = 12.dp),
    trailing: (@Composable () -> Unit)? = null,
) {
    Row(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(Pro.shapes.radius))
            .then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier)
            .padding(contentPadding),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(title, style = MaterialTheme.typography.titleSmall)
            subtitle?.let { Text(it, style = MaterialTheme.typography.bodySmall) }
        }
        trailing?.invoke()
    }
}

/** Translucent chip used over the camera preview. */
@Composable
fun OverlayChip(text: String, tone: Color? = null, modifier: Modifier = Modifier) {
    val shape = RoundedCornerShape(6.dp)
    Text(
        text,
        modifier = modifier
            .clip(shape)
            .background(Color(0x99090909))
            .border(BorderStroke(1.dp, tone?.copy(alpha = 0.5f) ?: Color(0x1FFFFFFF)), shape)
            .padding(horizontal = 8.dp, vertical = 3.dp),
        color = tone ?: Color(0xFFFAFAFA),
        style = MaterialTheme.typography.labelMedium.tabular,
    )
}
