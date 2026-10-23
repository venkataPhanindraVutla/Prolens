package `in`.venkat.prolens.features.gear

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import `in`.venkat.prolens.app.AppState
import `in`.venkat.prolens.core.designsystem.ButtonVariant
import `in`.venkat.prolens.core.designsystem.Pro
import `in`.venkat.prolens.core.designsystem.ProButton
import `in`.venkat.prolens.core.designsystem.ProCard
import `in`.venkat.prolens.core.designsystem.ProIcons
import `in`.venkat.prolens.core.designsystem.tabular
import kotlin.time.Clock

@Composable
private fun FormField(
    label: String,
    value: String,
    onChange: (String) -> Unit,
    placeholder: String,
    modifier: Modifier = Modifier,
    number: Boolean = false,
    hint: String? = null,
) {
    val c = Pro.colors
    Column(modifier, verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(label, style = MaterialTheme.typography.labelLarge)
        OutlinedTextField(
            value = value,
            onValueChange = onChange,
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            placeholder = { Text(placeholder, style = MaterialTheme.typography.bodyMedium.copy(color = c.mutedForeground)) },
            textStyle = MaterialTheme.typography.bodyMedium.tabular,
            keyboardOptions = KeyboardOptions(keyboardType = if (number) KeyboardType.Decimal else KeyboardType.Text),
            shape = androidx.compose.foundation.shape.RoundedCornerShape(Pro.shapes.radius),
            colors = OutlinedTextFieldDefaults.colors(
                focusedTextColor = c.foreground, unfocusedTextColor = c.foreground,
                focusedBorderColor = c.ring, unfocusedBorderColor = c.input, errorBorderColor = c.destructive,
                cursorColor = c.foreground,
                focusedContainerColor = androidx.compose.ui.graphics.Color.Transparent,
                unfocusedContainerColor = androidx.compose.ui.graphics.Color.Transparent,
            ),
        )
        hint?.let { Text(it, style = MaterialTheme.typography.bodySmall) }
    }
}

/** A card whose header toggles a form open. */
@Composable
private fun CollapsibleForm(
    title: String,
    open: Boolean,
    onToggle: () -> Unit,
    error: String?,
    submitLabel: String,
    onSubmit: () -> Unit,
    fields: @Composable () -> Unit,
) {
    ProCard {
        Row(
            Modifier.fillMaxWidth().clickable(role = Role.Button, onClick = onToggle),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Icon(ProIcons.Plus, null, tint = Pro.colors.foreground, modifier = Modifier.size(16.dp))
            Text(title, style = MaterialTheme.typography.titleSmall, modifier = Modifier.weight(1f))
            Icon(ProIcons.ChevronRight, null, tint = Pro.colors.mutedForeground, modifier = Modifier.size(16.dp).rotate(if (open) 90f else 0f))
        }
        if (open) {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                fields()
                error?.let { Text(it, style = MaterialTheme.typography.bodySmall.copy(color = Pro.colors.destructive)) }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    ProButton(submitLabel, onSubmit, small = true)
                    ProButton("Cancel", onToggle, variant = ButtonVariant.Ghost, small = true)
                }
            }
        }
    }
}

private fun newId() = "custom-${Clock.System.now().toEpochMilliseconds()}"

@Composable
fun AddBodyForm(state: AppState) {
    var open by rememberSaveable { mutableStateOf(false) }
    var error by rememberSaveable { mutableStateOf<String?>(null) }
    var name by rememberSaveable { mutableStateOf("") }
    var width by rememberSaveable { mutableStateOf("") }
    var height by rememberSaveable { mutableStateOf("") }
    var mp by rememberSaveable { mutableStateOf("") }
    var stab by rememberSaveable { mutableStateOf("") }

    CollapsibleForm(
        title = "Add a body",
        open = open,
        onToggle = { open = !open; error = null },
        error = error,
        submitLabel = "Add body",
        onSubmit = {
            when (val r = validateBody(newId(), name, width, height, mp, stab)) {
                is Validated.Error -> error = r.message
                is Validated.Ok -> {
                    state.updateGear { it.copy(bodies = it.bodies + r.item) }
                    state.showToast("Body added")
                    name = ""; width = ""; height = ""; mp = ""; stab = ""
                    error = null
                    open = false
                }
            }
        },
    ) {
        FormField("Name", name, { name = it }, "Sony A7 III")
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            FormField("Sensor width (mm)", width, { width = it }, "35.9", Modifier.weight(1f), number = true)
            FormField("Sensor height (mm)", height, { height = it }, "23.9", Modifier.weight(1f), number = true)
        }
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            FormField("Megapixels", mp, { mp = it }, "24", Modifier.weight(1f), number = true)
            FormField("Stabilisation (stops)", stab, { stab = it }, "5", Modifier.weight(1f), number = true, hint = "Leave empty if none")
        }
    }
}

@Composable
fun AddLensForm(state: AppState) {
    var open by rememberSaveable { mutableStateOf(false) }
    var error by rememberSaveable { mutableStateOf<String?>(null) }
    var name by rememberSaveable { mutableStateOf("") }
    var minF by rememberSaveable { mutableStateOf("") }
    var maxF by rememberSaveable { mutableStateOf("") }
    var aperture by rememberSaveable { mutableStateOf("") }

    CollapsibleForm(
        title = "Add a lens",
        open = open,
        onToggle = { open = !open; error = null },
        error = error,
        submitLabel = "Add lens",
        onSubmit = {
            when (val r = validateLens(newId(), name, minF, maxF, aperture)) {
                is Validated.Error -> error = r.message
                is Validated.Ok -> {
                    state.updateGear { it.copy(lenses = it.lenses + r.item) }
                    state.showToast("Lens added")
                    name = ""; minF = ""; maxF = ""; aperture = ""
                    error = null
                    open = false
                }
            }
        },
    ) {
        FormField("Name", name, { name = it }, "35mm f/1.8")
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            FormField("Min focal (mm)", minF, { minF = it }, "24", Modifier.weight(1f), number = true)
            FormField("Max focal (mm)", maxF, { maxF = it }, "70", Modifier.weight(1f), number = true, hint = "Same as min for a prime")
        }
        FormField("Max aperture (f-number)", aperture, { aperture = it }, "2.8", number = true)
    }
}
