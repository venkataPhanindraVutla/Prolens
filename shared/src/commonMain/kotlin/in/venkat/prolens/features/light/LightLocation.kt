package `in`.venkat.prolens.features.light

import `in`.venkat.prolens.core.designsystem.ProTextField

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.setValue
import androidx.compose.runtime.getValue
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import `in`.venkat.prolens.core.designsystem.ButtonVariant
import `in`.venkat.prolens.core.designsystem.Pro
import `in`.venkat.prolens.core.designsystem.ProButton
import `in`.venkat.prolens.core.designsystem.ProCard
import `in`.venkat.prolens.core.designsystem.ProIcons
import `in`.venkat.prolens.core.designsystem.tabular
import `in`.venkat.prolens.core.model.Location
import `in`.venkat.prolens.core.photomath.PhotoFormat
import `in`.venkat.prolens.core.platform.AppPermission
import `in`.venkat.prolens.core.platform.rememberLocationRequester
import `in`.venkat.prolens.core.platform.rememberPermission

val LightPresets = listOf(
    Location("London", 51.5074, -0.1278, "Europe/London"),
    Location("New York", 40.7128, -74.006, "America/New_York"),
    Location("Tokyo", 35.6762, 139.6503, "Asia/Tokyo"),
    Location("Bengaluru", 12.9716, 77.5946, "Asia/Kolkata"),
    Location("Sydney", -33.8688, 151.2093, "Australia/Sydney"),
    Location("Reykjavík", 64.1466, -21.9426, "Atlantic/Reykjavik"),
    Location("Cape Town", -33.9249, 18.4241, "Africa/Johannesburg"),
    Location("San Francisco", 37.7749, -122.4194, "America/Los_Angeles"),
)

private const val BLOCKED = "Location is blocked. Pick a city or enter coordinates."
private const val BAD_COORDS = "Latitude must be between −90 and 90, longitude between −180 and 180."

/** "51.5074° N, 0.1278° W". */
fun formatCoords(lat: Double, lon: Double): String =
    "${PhotoFormat.fixed(kotlin.math.abs(lat), 4)}° ${if (lat >= 0) "N" else "S"}, " +
        "${PhotoFormat.fixed(kotlin.math.abs(lon), 4)}° ${if (lon >= 0) "E" else "W"}"

/** Parses a coordinate typed by hand, allowing a comma decimal and a typographic minus. */
fun parseCoordinate(text: String): Double? = text.trim().replace(',', '.').replace('−', '-').toDoubleOrNull()?.takeIf { it.isFinite() }

/** Validates a latitude and longitude pair, or null when either is missing or out of range. */
fun parseLatLon(lat: String, lon: String): Pair<Double, Double>? {
    val a = parseCoordinate(lat) ?: return null
    val b = parseCoordinate(lon) ?: return null
    return if (a in -90.0..90.0 && b in -180.0..180.0) a to b else null
}

/** Location name and coordinates with a Change button that opens the editor. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun LocationSection(loc: Location, onLocation: (Location) -> Unit) {
    var open by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf("") }
    var waiting by remember { mutableStateOf(false) }
    var latText by remember(loc.lat, loc.lon) { mutableStateOf(PhotoFormat.trim(loc.lat, 4)) }
    var lonText by remember(loc.lat, loc.lon) { mutableStateOf(PhotoFormat.trim(loc.lon, 4)) }
    val permission = rememberPermission(AppPermission.Location)
    val requester = rememberLocationRequester()

    fun locate() {
        message = "Finding your location."
        requester.request { p ->
            waiting = false
            if (p == null) message = BLOCKED
            else { message = ""; onLocation(Location("My location", p.lat, p.lon, null)) }
        }
    }
    // Permission can arrive after the system dialog, so continue once it is granted.
    LaunchedEffect(permission.granted, waiting) { if (waiting && permission.granted) locate() }
    LaunchedEffect(permission.denied, waiting) { if (waiting && permission.denied) { waiting = false; message = BLOCKED } }

    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(loc.name, style = MaterialTheme.typography.titleMedium)
                Text(formatCoords(loc.lat, loc.lon), style = MaterialTheme.typography.bodySmall.tabular)
            }
            ProButton(if (open) "Done" else "Change", { open = !open }, variant = ButtonVariant.Ghost, small = true)
        }
        if (open) {
            ProCard {
                Text("City", style = MaterialTheme.typography.labelMedium)
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    LightPresets.forEach { p ->
                        Chip(p.name, selected = p.name == loc.name && p.timeZoneId == loc.timeZoneId) { message = ""; onLocation(p) }
                    }
                }
                ProButton(
                    "Use my location",
                    {
                        if (permission.granted) locate()
                        else { waiting = true; message = "Waiting for location permission."; permission.request() }
                    },
                    variant = ButtonVariant.Outline, icon = ProIcons.MapPin, small = true,
                )
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    ProTextField(latText, { latText = it }, "Latitude", Modifier.weight(1f))
                    ProTextField(lonText, { lonText = it }, "Longitude", Modifier.weight(1f))
                }
                ProButton(
                    "Save coordinates",
                    {
                        val ll = parseLatLon(latText, lonText)
                        if (ll == null) message = BAD_COORDS
                        else { message = ""; onLocation(Location("Custom location", ll.first, ll.second, null)) }
                    },
                    small = true,
                )
                if (message.isNotEmpty()) Text(message, style = MaterialTheme.typography.bodySmall)
            }
        }
    }
}

@Composable
private fun Chip(text: String, selected: Boolean, onClick: () -> Unit) {
    val c = Pro.colors
    val shape = RoundedCornerShape(50)
    Text(
        text,
        modifier = Modifier
            .clip(shape)
            .background(if (selected) c.primary else c.background)
            .border(1.dp, if (selected) c.primary else c.input, shape)
            .clickable(role = Role.Button, onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 6.dp),
        color = if (selected) c.primaryForeground else c.foreground,
        style = MaterialTheme.typography.labelMedium,
    )
}

