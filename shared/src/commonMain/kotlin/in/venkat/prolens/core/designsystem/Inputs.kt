package `in`.venkat.prolens.core.designsystem

import androidx.compose.foundation.BorderStroke
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp

/** A bordered dropdown with the label above it. */
@Composable
fun <T> ProSelect(
    label: String,
    options: List<Pair<T, String>>,
    selected: T,
    onSelect: (T) -> Unit,
    hint: String? = null,
) {
    val c = Pro.colors
    val shape = RoundedCornerShape(Pro.shapes.radius)
    var open by remember { mutableStateOf(false) }
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(label, style = MaterialTheme.typography.labelLarge)
        Box {
            Row(
                Modifier
                    .fillMaxWidth()
                    .height(40.dp)
                    .clip(shape)
                    .border(1.dp, c.input, shape)
                    .clickable(role = Role.DropdownList) { open = true }
                    .padding(horizontal = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    options.firstOrNull { it.first == selected }?.second.orEmpty(),
                    style = MaterialTheme.typography.bodyMedium.tabular,
                    modifier = Modifier.weight(1f),
                )
                Icon(ProIcons.ChevronRight, null, tint = c.mutedForeground, modifier = Modifier.size(16.dp).rotate(90f))
            }
            DropdownMenu(
                expanded = open,
                onDismissRequest = { open = false },
                shape = shape,
                containerColor = c.card,
                tonalElevation = 0.dp,
                shadowElevation = 0.dp,
                border = BorderStroke(1.dp, c.border),
            ) {
                options.forEach { (value, text) ->
                    DropdownMenuItem(
                        text = { Text(text, style = MaterialTheme.typography.bodyMedium.tabular) },
                        onClick = { onSelect(value); open = false },
                    )
                }
            }
        }
        hint?.let { Text(it, style = MaterialTheme.typography.bodySmall) }
    }
}

/** A single-line input with the label above it, an optional unit suffix, placeholder and hint. */
@Composable
fun ProTextField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    modifier: Modifier = Modifier,
    placeholder: String? = null,
    suffix: String? = null,
    hint: String? = null,
    keyboardType: KeyboardType = KeyboardType.Text,
) {
    val c = Pro.colors
    val shape = RoundedCornerShape(Pro.shapes.radius)
    Column(modifier, verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(label, style = MaterialTheme.typography.labelLarge)
        Row(
            Modifier.fillMaxWidth().height(40.dp).clip(shape).background(c.background).border(1.dp, c.input, shape).padding(horizontal = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(Modifier.weight(1f)) {
                if (value.isEmpty() && placeholder != null) {
                    Text(placeholder, style = MaterialTheme.typography.bodyMedium.copy(color = c.mutedForeground))
                }
                BasicTextField(
                    value, onValueChange,
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    textStyle = MaterialTheme.typography.bodyMedium.tabular,
                    cursorBrush = SolidColor(c.foreground),
                    keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
                )
            }
            suffix?.let { Text(it, style = MaterialTheme.typography.bodySmall) }
        }
        hint?.let { Text(it, style = MaterialTheme.typography.bodySmall) }
    }
}

/** A small outlined pill for a short status word. */
@Composable
fun ProBadge(text: String) {
    val shape = RoundedCornerShape(50)
    Text(
        text,
        modifier = Modifier.clip(shape).border(1.dp, Pro.colors.border, shape).padding(horizontal = 8.dp, vertical = 1.dp),
        style = MaterialTheme.typography.labelMedium,
    )
}
