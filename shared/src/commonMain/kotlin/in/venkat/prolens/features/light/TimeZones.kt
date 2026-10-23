package `in`.venkat.prolens.features.light

import kotlinx.datetime.DateTimeUnit
import kotlinx.datetime.LocalDate
import kotlinx.datetime.LocalDateTime
import kotlinx.datetime.LocalTime
import kotlinx.datetime.TimeZone
import kotlinx.datetime.atStartOfDayIn
import kotlinx.datetime.plus
import kotlinx.datetime.toInstant
import kotlinx.datetime.toLocalDateTime
import kotlin.time.ExperimentalTime
import kotlin.time.Instant

/**
 * Local-day helpers. Every time on the Light screen is shown in the location's time zone, and a day runs from
 * local midnight to the next local midnight in that zone. All instants are epoch milliseconds.
 */
@OptIn(ExperimentalTime::class)
object LightTime {
    /** The zone for [id], or the device's zone when [id] is null or unknown. */
    fun zone(id: String?): TimeZone =
        id?.let { runCatching { TimeZone.of(it) }.getOrNull() } ?: TimeZone.currentSystemDefault()

    fun localDate(epochMs: Long, tz: TimeZone): LocalDate =
        Instant.fromEpochMilliseconds(epochMs).toLocalDateTime(tz).date

    /** Local midnight at the start of [date]. */
    fun dayStart(date: LocalDate, tz: TimeZone): Long = date.atStartOfDayIn(tz).toEpochMilliseconds()

    /** Local midnight at the end of [date], which is the start of the next day. */
    fun dayEnd(date: LocalDate, tz: TimeZone): Long = dayStart(date.plus(1, DateTimeUnit.DAY), tz)

    /** Local noon, the instant SunCalc wants to pick the day. */
    fun noon(date: LocalDate, tz: TimeZone): Long =
        LocalDateTime(date, LocalTime(12, 0)).toInstant(tz).toEpochMilliseconds()

    fun minuteOfDay(epochMs: Long, tz: TimeZone): Int {
        val t = Instant.fromEpochMilliseconds(epochMs).toLocalDateTime(tz)
        return t.hour * 60 + t.minute
    }

    /** "04:43" in [tz], or an em dash for no time. */
    fun hhmm(epochMs: Long?, tz: TimeZone): String {
        if (epochMs == null) return "—"
        val m = minuteOfDay(epochMs, tz)
        return "${(m / 60).toString().padStart(2, '0')}:${(m % 60).toString().padStart(2, '0')}"
    }

    fun range(from: Long?, to: Long?, tz: TimeZone): String =
        if (from == null && to == null) "—" else "${hhmm(from, tz)}–${hhmm(to, tz)}"

    private val MONTHS = listOf("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec")

    /** "Sat, 21 Jun". */
    fun dateLabel(date: LocalDate): String {
        val dow = date.dayOfWeek.name.take(3).lowercase().replaceFirstChar { it.uppercase() }
        return "$dow, ${date.day} ${MONTHS[date.month.ordinal]}"
    }

    /** "1 h 12 min", "23 min", "2 h". */
    fun duration(ms: Long): String {
        val min = maxOf(1L, (ms / 60_000.0).let { kotlin.math.round(it).toLong() })
        val hr = min / 60
        val m = min % 60
        return if (hr > 0) (if (m > 0) "$hr h $m min" else "$hr h") else "$m min"
    }

    /** The line under the date: names the zone every time is shown in. */
    fun zoneNote(locationName: String, timeZoneId: String?): String =
        if (timeZoneId != null) "Times in $locationName time" else "Times in your device's time zone"
}
