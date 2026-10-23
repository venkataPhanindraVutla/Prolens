package `in`.venkat.prolens.features.light

import `in`.venkat.prolens.core.sun.LightPhase
import `in`.venkat.prolens.core.sun.SunCalc
import `in`.venkat.prolens.core.sun.SunTimes

private val COMPASS = listOf("N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW")

/** Sixteen-point compass word for an azimuth in degrees. */
fun compassWord(azimuth: Double): String = COMPASS[((kotlin.math.round(azimuth / 22.5).toInt() % 16) + 16) % 16]

/** A stretch of the day in one light phase. */
data class PhaseSegment(val phase: LightPhase, val fromMs: Long, val toMs: Long)

/** The phase every [stepMs] from [startMs] to [endMs], with neighbours in the same phase merged. */
fun phaseSegments(startMs: Long, endMs: Long, lat: Double, lon: Double, stepMs: Long = 5 * 60_000L): List<PhaseSegment> {
    val out = ArrayList<PhaseSegment>()
    var t = startMs
    while (t < endMs) {
        val phase = SunCalc.phaseAt(t + stepMs / 2, lat, lon)
        val last = out.lastOrNull()
        if (last != null && last.phase == phase) out[out.lastIndex] = last.copy(toMs = minOf(endMs, t + stepMs))
        else out += PhaseSegment(phase, t, minOf(endMs, t + stepMs))
        t += stepMs
    }
    return out
}

/**
 * The next golden or blue hour, or the time left in the current one, as a sentence. Looks at today's and
 * tomorrow's times. Null when nothing is coming.
 */
fun nextLightEvent(nowMs: Long, phase: LightPhase, today: SunTimes, tomorrow: SunTimes): String? {
    fun pick(t: SunTimes, vararg times: Long?) = times.filterNotNull().filter { it > nowMs }
    val days = listOf(today, tomorrow)
    return when (phase) {
        LightPhase.Golden -> {
            val e = days.flatMap { pick(it, it.goldenMorningEnd, it.goldenEveningEnd) }.minOrNull() ?: return null
            "Golden hour, ${LightTime.duration(e - nowMs)} left"
        }
        LightPhase.Blue -> {
            val e = days.flatMap { pick(it, it.blueMorningEnd, it.blueEveningEnd) }.minOrNull() ?: return null
            "Blue hour, ${LightTime.duration(e - nowMs)} left"
        }
        else -> {
            val golden = days.flatMap { pick(it, it.goldenMorningStart, it.goldenEveningStart) }.minOrNull()
            val blue = days.flatMap { pick(it, it.blueMorningStart, it.blueEveningStart) }.minOrNull()
            when {
                golden == null && blue == null -> null
                blue == null || (golden != null && golden <= blue) -> "Golden hour starts in ${LightTime.duration(golden!! - nowMs)}"
                else -> "Blue hour starts in ${LightTime.duration(blue - nowMs)}"
            }
        }
    }
}
