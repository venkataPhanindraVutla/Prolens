package `in`.venkat.prolens.features.light

import `in`.venkat.prolens.core.designsystem.ProTextField

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import `in`.venkat.prolens.app.AppState
import `in`.venkat.prolens.core.designsystem.ButtonVariant
import `in`.venkat.prolens.core.designsystem.ProButton
import `in`.venkat.prolens.core.designsystem.ProCard
import `in`.venkat.prolens.core.designsystem.ProIcons
import `in`.venkat.prolens.core.designsystem.ProScreen
import `in`.venkat.prolens.core.designsystem.KvList
import `in`.venkat.prolens.core.designsystem.StatGrid
import `in`.venkat.prolens.core.designsystem.TierBadge
import `in`.venkat.prolens.core.designsystem.tabular
import `in`.venkat.prolens.core.photomath.PhotoFormat
import `in`.venkat.prolens.core.photomath.PhotoMath
import `in`.venkat.prolens.core.sun.SunCalc
import kotlinx.coroutines.delay
import kotlinx.datetime.DateTimeUnit
import kotlinx.datetime.plus
import kotlin.math.roundToInt
import kotlin.time.Clock
import kotlin.time.ExperimentalTime

@OptIn(ExperimentalTime::class)
private fun nowMillis(): Long = Clock.System.now().toEpochMilliseconds()

@OptIn(ExperimentalTime::class)
@Composable
fun LightScreen(state: AppState) {
    val loc by state.location.collectAsStateWithLifecycle()
    val tz = remember(loc.timeZoneId) { LightTime.zone(loc.timeZoneId) }
    var realNow by remember { mutableLongStateOf(nowMillis()) }
    LaunchedEffect(Unit) { while (true) { delay(30_000); realNow = nowMillis() } }

    var dayOffset by rememberSaveable { mutableStateOf(0) }
    var heightText by rememberSaveable { mutableStateOf("1.8") }
    val isToday = dayOffset == 0

    val today = LightTime.localDate(realNow, tz)
    val date = today.plus(dayOffset, DateTimeUnit.DAY)
    val startMs = LightTime.dayStart(date, tz)
    val endMs = LightTime.dayEnd(date, tz)
    val times = remember(date, tz, loc.lat, loc.lon) { SunCalc.sunTimes(LightTime.noon(date, tz), loc.lat, loc.lon) }
    val segments = remember(startMs, endMs, loc.lat, loc.lon) { phaseSegments(startMs, endMs, loc.lat, loc.lon) }
    val at = if (isToday) realNow else times.solarNoon
    val sun = SunCalc.sunPosition(at, loc.lat, loc.lon)

    ProScreen("Light") {
        LocationSection(loc) { state.setLocation(it) }

        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                ProButton("Previous", { dayOffset -= 1 }, variant = ButtonVariant.Outline, icon = ProIcons.ChevronLeft, small = true)
                Text(
                    LightTime.dateLabel(date),
                    modifier = Modifier.weight(1f),
                    textAlign = TextAlign.Center,
                    style = MaterialTheme.typography.titleSmall.tabular,
                )
                ProButton("Next", { dayOffset += 1 }, variant = ButtonVariant.Outline, small = true)
                ProButton("Today", { dayOffset = 0 }, variant = ButtonVariant.Outline, small = true, enabled = !isToday)
            }
            Text(LightTime.zoneNote(loc.name, loc.timeZoneId), style = MaterialTheme.typography.bodySmall)
        }

        if (isToday) NowCard(state, realNow, tz)

        ProCard(title = "Day timeline", description = LightTime.dateLabel(date)) {
            Column {
                DayTimeline(segments, startMs, endMs, if (isToday) realNow else null)
                Box(Modifier.padding(top = 4.dp)) { PhaseLegend() }
            }
            KvList(
                listOf(
                    "Astronomical dawn" to LightTime.hhmm(times.astroDawn, tz),
                    "Blue hour, morning" to LightTime.range(times.blueMorningStart, times.blueMorningEnd, tz),
                    "Golden hour, morning" to LightTime.range(times.goldenMorningStart, times.goldenMorningEnd, tz),
                    "Sunrise" to LightTime.hhmm(times.sunrise, tz),
                    "Solar noon" to LightTime.hhmm(times.solarNoon, tz),
                    "Sunset" to LightTime.hhmm(times.sunset, tz),
                    "Golden hour, evening" to LightTime.range(times.goldenEveningStart, times.goldenEveningEnd, tz),
                    "Blue hour, evening" to LightTime.range(times.blueEveningStart, times.blueEveningEnd, tz),
                    "Astronomical dusk" to LightTime.hhmm(times.astroDusk, tz),
                ),
            )
        }

        ProCard(title = "Sun path", description = "Altitude through the day. Golden hour is the amber band, blue hour the blue band.") {
            SunPathChart(loc.lat, loc.lon, startMs, at)
        }

        ProCard(
            title = "Sun direction",
            description = (if (isToday) "The arrow shows the sun now." else "The arrow shows the sun at solar noon.") + " Circles mark sunrise and sunset.",
        ) {
            Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) { SunCompass(sun, times, loc.lat, loc.lon) }
            val line = if (times.sunset != null) {
                val az = SunCalc.sunPosition(times.sunset!!, loc.lat, loc.lon).azimuth
                "Sun sets toward the ${compassWord(az)} (${az.roundToInt()}°)"
            } else if (sun.altitude > 0 || SunCalc.sunPosition(times.solarNoon, loc.lat, loc.lon).altitude > 0) {
                "The sun does not set on this date."
            } else "The sun does not rise on this date."
            Text(line, modifier = Modifier.fillMaxWidth(), textAlign = TextAlign.Center, style = MaterialTheme.typography.bodySmall.tabular)
        }

        ShadowCard(heightText, { heightText = it }, sun.altitude, isToday)
        MoonCard(at, startMs, loc.lat, loc.lon, tz)
    }
}

@Composable
private fun NowCard(state: AppState, nowMs: Long, tz: kotlinx.datetime.TimeZone) {
    val loc by state.location.collectAsStateWithLifecycle()
    val phase = SunCalc.phaseAt(nowMs, loc.lat, loc.lon)
    val pos = SunCalc.sunPosition(nowMs, loc.lat, loc.lon)
    val event = remember(nowMs, loc.lat, loc.lon, tz) {
        val today = LightTime.localDate(nowMs, tz)
        val t0 = SunCalc.sunTimes(LightTime.noon(today, tz), loc.lat, loc.lon)
        val t1 = SunCalc.sunTimes(LightTime.noon(today.plus(1, DateTimeUnit.DAY), tz), loc.lat, loc.lon)
        nextLightEvent(nowMs, phase, t0, t1)
    }
    ProCard(title = "Now") {
        Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(phase.label, style = MaterialTheme.typography.titleLarge)
            Text(event ?: "No golden or blue hour in the next day.", style = MaterialTheme.typography.bodySmall.tabular)
        }
        StatGrid(
            listOf(
                "${pos.azimuth.roundToInt()}° ${compassWord(pos.azimuth)}" to "Sun azimuth",
                "${PhotoFormat.fixed(pos.altitude, 1)}°" to "Sun altitude",
            ),
        )
    }
}

@Composable
private fun ShadowCard(heightText: String, onHeight: (String) -> Unit, altitude: Double, isToday: Boolean) {
    val height = parseCoordinate(heightText)?.takeIf { it > 0 } ?: 1.8
    ProCard(title = "Shadow length") {
        ProTextField(heightText, onHeight, "Subject height", suffix = "m", keyboardType = KeyboardType.Decimal)
        Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
            if (altitude <= 0) {
                Text("No shadow", style = MaterialTheme.typography.titleLarge)
                Text("The sun is below the horizon.", style = MaterialTheme.typography.bodySmall)
            } else {
                val len = PhotoMath.shadowLength(height, altitude)
                Text(if (len > 200) "Over 200 m" else PhotoFormat.distance(len * 1000), style = MaterialTheme.typography.titleLarge.tabular)
                Text(
                    "For a ${PhotoFormat.trim(height, 2)} m subject with the sun ${PhotoFormat.fixed(altitude, 1)}° up" +
                        if (isToday) " now." else " at solar noon.",
                    style = MaterialTheme.typography.bodySmall.tabular,
                )
            }
        }
    }
}

@Composable
private fun MoonCard(atMs: Long, dayStartMs: Long, lat: Double, lon: Double, tz: kotlinx.datetime.TimeZone) {
    val moon = remember(atMs / 60_000, dayStartMs, lat, lon) { SunCalc.moon(atMs, dayStartMs, lat, lon) }
    ProCard(title = "Moon") {
        Row(horizontalArrangement = Arrangement.spacedBy(16.dp), verticalAlignment = Alignment.CenterVertically) {
            MoonDisc(moon, lat)
            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(moon.phaseName, style = MaterialTheme.typography.titleMedium)
                Text("${(moon.fraction * 100).roundToInt()}% lit", style = MaterialTheme.typography.bodySmall.tabular)
            }
        }
        KvList(
            listOf(
                "Moonrise" to LightTime.hhmm(moon.rise, tz),
                "Moonset" to LightTime.hhmm(moon.set, tz),
                "Altitude" to "${PhotoFormat.fixed(moon.altitude, 1)}°",
                "Azimuth" to "${moon.azimuth.roundToInt()}° ${compassWord(moon.azimuth)}",
            ),
        )
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
            TierBadge("v2")
            Text("The Milky Way core is best in dark skies within a few days of new moon.", style = MaterialTheme.typography.bodySmall, modifier = Modifier.weight(1f))
        }
    }
}
