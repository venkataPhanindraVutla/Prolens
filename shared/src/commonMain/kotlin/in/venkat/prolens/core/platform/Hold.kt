package `in`.venkat.prolens.core.platform

import kotlin.math.abs

/**
 * How the phone is held, as the clockwise degrees it's turned from upright portrait: 0, 90, 180 or 270.
 * The camera screen stays locked to portrait; the hold turns the controls and the saved photo.
 */
object Hold {
    private const val BUFFER = 15

    /** Snaps a 0..359 device orientation to a quarter, keeping [current] until it's [BUFFER]° past the midpoint. -1 means unknown (flat). */
    fun snap(orientationDeg: Int, current: Int): Int {
        if (orientationDeg < 0) return current
        if (distance(orientationDeg, current) <= 45 + BUFFER) return current
        return ((orientationDeg + 45) / 90 % 4) * 90
    }

    /** The hold as a signed roll: 0, 90, 180 or −90. */
    fun signed(hold: Int): Int = if (hold > 180) hold - 360 else hold

    /** Roll measured from the way the phone is held, so the level reads near 0 in landscape too. */
    fun rollFromHold(roll: Float, hold: Int): Float = wrap180(roll - signed(hold))

    /** How far to turn a control so it reads upright for this hold. */
    fun uiRotation(hold: Int): Float = if (hold == 180) 180f else (0 - signed(hold)).toFloat()

    fun isLandscape(hold: Int) = hold == 90 || hold == 270

    private fun distance(a: Int, b: Int): Int = abs(((a - b) % 360 + 540) % 360 - 180)
    private fun wrap180(d: Float) = ((d % 360f) + 540f) % 360f - 180f
}
