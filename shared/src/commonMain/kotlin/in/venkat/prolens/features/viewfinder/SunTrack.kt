package `in`.venkat.prolens.features.viewfinder

import `in`.venkat.prolens.core.model.Location
import `in`.venkat.prolens.core.sun.SunCalc
import kotlinx.datetime.TimeZone
import kotlinx.datetime.atStartOfDayIn
import kotlinx.datetime.toLocalDateTime
import kotlin.time.Clock
import kotlin.time.ExperimentalTime
import kotlin.time.Instant

/** One sample of today's sun path. [hour] is set on samples that fall on a whole local hour. */
internal class SunPoint(val azimuth: Double, val altitude: Double, val hour: Int?)

internal fun nowMs(): Long = @OptIn(ExperimentalTime::class) Clock.System.now().toEpochMilliseconds()

/** The sun's path over the local day that contains now, sampled every 30 minutes. */
@OptIn(ExperimentalTime::class)
internal fun sunTrack(location: Location, now: Long): List<SunPoint> {
    val tz = location.timeZoneId?.let { runCatching { TimeZone.of(it) }.getOrNull() } ?: TimeZone.currentSystemDefault()
    val date = Instant.fromEpochMilliseconds(now).toLocalDateTime(tz).date
    val start = date.atStartOfDayIn(tz).toEpochMilliseconds()
    return SunCalc.sunPath(start, location.lat, location.lon, 30).map { p ->
        val t = Instant.fromEpochMilliseconds(p.epochMs).toLocalDateTime(tz)
        SunPoint(p.azimuth, p.altitude, if (t.minute == 0) t.hour else null)
    }
}
