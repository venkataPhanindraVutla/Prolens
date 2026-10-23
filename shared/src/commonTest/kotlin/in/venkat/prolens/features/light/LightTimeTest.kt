package `in`.venkat.prolens.features.light

import `in`.venkat.prolens.core.sun.SunCalc
import kotlinx.datetime.LocalDate
import kotlinx.datetime.TimeZone
import kotlinx.datetime.toLocalDateTime
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue
import kotlin.time.ExperimentalTime
import kotlin.time.Instant

@OptIn(ExperimentalTime::class)
class LightTimeTest {
    private val date = LocalDate(2026, 6, 21)

    @Test
    fun londonSunriseIsAbout0443Local() {
        val tz = LightTime.zone("Europe/London")
        val t = SunCalc.sunTimes(LightTime.noon(date, tz), 51.5074, -0.1278)
        val minutes = LightTime.minuteOfDay(t.sunrise!!, tz)
        assertTrue(kotlin.math.abs(minutes - (4 * 60 + 43)) <= 2, "sunrise was ${LightTime.hhmm(t.sunrise, tz)}")
    }

    @Test
    fun bengaluruDayStartsAt1830UtcThePreviousDay() {
        val tz = LightTime.zone("Asia/Kolkata")
        val start = Instant.fromEpochMilliseconds(LightTime.dayStart(date, tz)).toLocalDateTime(TimeZone.UTC)
        assertEquals(LocalDate(2026, 6, 20), start.date)
        assertEquals(18, start.hour)
        assertEquals(30, start.minute)
    }

    @Test
    fun dayLengthFollowsDst() {
        val tz = LightTime.zone("Europe/London")
        val spring = LocalDate(2026, 3, 29)
        assertEquals(23 * 3_600_000L, LightTime.dayEnd(spring, tz) - LightTime.dayStart(spring, tz))
    }

    @Test
    fun formatsDurationsAndCompass() {
        assertEquals("1 h 12 min", LightTime.duration(72 * 60_000L))
        assertEquals("23 min", LightTime.duration(23 * 60_000L))
        assertEquals("2 h", LightTime.duration(120 * 60_000L))
        assertEquals("WNW", compassWord(292.0))
        assertEquals("N", compassWord(359.0))
    }

    @Test
    fun zoneNoteAndCoordinates() {
        assertEquals("Times in London time", LightTime.zoneNote("London", "Europe/London"))
        assertEquals("Times in your device's time zone", LightTime.zoneNote("My location", null))
        assertEquals(51.5 to -0.1, parseLatLon("51.5", "−0.1"))
        assertNull(parseLatLon("95", "0"))
        assertNull(parseLatLon("abc", "0"))
    }
}
