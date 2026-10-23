package `in`.venkat.prolens.features.calculators

import `in`.venkat.prolens.core.model.Presets
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class CalcMathTest {
    @Test
    fun apertureListStartsAtMaxApertureAndStopsAtMinimum() {
        val lens = Presets.lenses.first { it.id == "z-24-70" }
        val list = apertureList(lens)
        assertEquals(2.8, list.first())
        assertEquals(22.0, list.last())
        assertTrue(list.zipWithNext().all { (a, b) -> a < b })
    }

    @Test
    fun fixedApertureLensHasOneStop() {
        assertEquals(listOf(1.7), apertureList(Presets.lenses.first { it.id == "phone-24" }))
    }

    @Test
    fun logSliderRoundTrips() {
        assertEquals(0.0, logPos(0.3, 0.3, 100.0), 1e-9)
        assertEquals(1000.0, logPos(100.0, 0.3, 100.0), 1e-6)
        assertEquals(5.0, logVal(logPos(5.0, 0.3, 100.0), 0.3, 100.0), 1e-9)
    }

    @Test
    fun blurVerdictThresholds() {
        assertEquals("Barely blurred", blurVerdict(0.5).label)
        assertEquals("Soft", blurVerdict(1.0).label)
        assertEquals("Creamy", blurVerdict(3.0).label)
        assertEquals("Very strong", blurVerdict(8.0).label)
    }

    @Test
    fun countdownRoundsUp() {
        assertEquals("00:00", formatCountdown(0.0))
        assertEquals("00:01", formatCountdown(0.2))
        assertEquals("01:05", formatCountdown(64.1))
        assertEquals("04:22", formatCountdown(262.0))
    }

    @Test
    fun percentFormat() {
        assertEquals("0.45%", formatPct(0.451))
        assertEquals("3.2%", formatPct(3.21))
    }
}
