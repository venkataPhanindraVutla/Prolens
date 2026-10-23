package `in`.venkat.prolens.core

import `in`.venkat.prolens.core.model.AspectRatio
import `in`.venkat.prolens.core.platform.Hold
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class HoldTest {
    @Test fun snapsToNearestQuarter() {
        assertEquals(0, Hold.snap(10, current = 0))
        assertEquals(90, Hold.snap(95, current = 0))
        assertEquals(270, Hold.snap(265, current = 0))
        assertEquals(180, Hold.snap(178, current = 90))
        assertEquals(0, Hold.snap(350, current = 270))
    }

    @Test fun hysteresisKeepsTheCurrentHoldNearTheBoundary() {
        // 50° is past the 45° midpoint but inside the 15° buffer, so portrait stays.
        assertEquals(0, Hold.snap(50, current = 0))
        assertEquals(90, Hold.snap(40, current = 90))
        assertEquals(90, Hold.snap(61, current = 0))
    }

    @Test fun unknownOrientationKeepsCurrent() {
        assertEquals(270, Hold.snap(-1, current = 270))
    }

    @Test fun rollIsMeasuredFromTheWayThePhoneIsHeld() {
        // Held with the top to the left: the sensor says about −92°, the horizon is 2.3° off.
        assertEquals(-2.3f, Hold.rollFromHold(-92.3f, 270), 0.001f)
        assertEquals(2.3f, Hold.rollFromHold(92.3f, 90), 0.001f)
        assertEquals(1f, Hold.rollFromHold(1f, 0), 0.001f)
        assertEquals(-1f, Hold.rollFromHold(179f, 180), 0.001f)
    }

    @Test fun uiTurnsAgainstTheHold() {
        assertEquals(0f, Hold.uiRotation(0))
        assertEquals(-90f, Hold.uiRotation(90))
        assertEquals(90f, Hold.uiRotation(270))
        assertEquals(180f, Hold.uiRotation(180))
    }
}

class AspectRatioTest {
    @Test fun ratiosTurnWithThePhone() {
        assertEquals("2:3", AspectRatio.ThreeTwo.label(landscape = false))
        assertEquals("3:2", AspectRatio.ThreeTwo.label(landscape = true))
        assertEquals("4:5", AspectRatio.FourFive.label(landscape = false))
        assertEquals("5:4", AspectRatio.FourFive.label(landscape = true))
        assertEquals("9:16", AspectRatio.SixteenNine.label(landscape = false))
        assertEquals("1:1", AspectRatio.Square.label(landscape = true))
        assertEquals("Full", AspectRatio.Full.label(landscape = true))
    }

    @Test fun screenRatioIsAlwaysUprightBecauseTheScreenIsLockedPortrait() {
        assertEquals(2.0 / 3, AspectRatio.ThreeTwo.portraitRatio!!, 1e-9)
        assertEquals(4.0 / 5, AspectRatio.FourFive.portraitRatio!!, 1e-9)
        assertEquals(1.0, AspectRatio.Square.portraitRatio!!, 1e-9)
        assertNull(AspectRatio.Full.portraitRatio)
    }
}
