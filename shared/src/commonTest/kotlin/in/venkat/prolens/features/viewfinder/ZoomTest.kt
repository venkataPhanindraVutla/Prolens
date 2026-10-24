package `in`.venkat.prolens.features.viewfinder

import kotlin.math.abs
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class ZoomTest {
    @Test fun presetsFollowThePhonesRange() {
        assertEquals(listOf(0.6f, 1f, 2f, 5f, 10f), zoomPresets(0.6f, 10f))
        assertEquals(listOf(1f, 2f, 5f), zoomPresets(1f, 8f))
        assertEquals(listOf(0.5f, 1f, 2f, 3f), zoomPresets(0.5f, 4f))
        assertEquals(listOf(1f), zoomPresets(1f, 1f))
        assertEquals(listOf(1f, 1.5f), zoomPresets(1f, 1.5f))
    }

    @Test fun activeChipIsTheLensYouAreOn() {
        val p = listOf(0.6f, 1f, 2f, 5f)
        assertEquals(0, activePreset(p, 0.8f))
        assertEquals(1, activePreset(p, 1f))
        assertEquals(1, activePreset(p, 1.4f))
        assertEquals(2, activePreset(p, 2f))
        assertEquals(3, activePreset(p, 9f))
    }

    @Test fun zoomLabels() {
        assertEquals("1×", fmtZoom(1f))
        assertEquals("1.4×", fmtZoom(1.42f))
        assertEquals("0.6×", fmtZoom(0.6f))
        assertEquals("10×", fmtZoom(10f))
    }

    @Test fun dialDoublesPerStep() {
        assertEquals(2f, zoomFromDrag(1f, 120f, 120f, 0.5f, 10f), 0.001f)
        assertEquals(0.5f, zoomFromDrag(1f, -120f, 120f, 0.5f, 10f), 0.001f)
        assertEquals(10f, zoomFromDrag(4f, 600f, 120f, 0.5f, 10f), 0.001f)
    }

    @Test fun fieldOfViewNarrowsWithZoomAndCrop() {
        val base = Fov(60.0, 75.0)
        val z2 = zoomedFov(base, 2f, null)
        assertTrue(abs(z2.h - 32.2) < 0.2, "h was ${z2.h}")
        // A 16:9 crop of a 4:3 sensor keeps the long side and trims the short side to 0.5625 / 0.75 of it.
        val crop = zoomedFov(base, 1f, 16.0 / 9)
        assertTrue(crop.h < base.h && abs(crop.v - base.v) < 1e-9)
    }

    @Test fun swipesAreReadInTheHeldFrame() {
        assertEquals(10f to 0f, heldDelta(10f, 0f, 0))
        // Top of the phone to the left: moving down the screen is moving right for the photographer.
        assertEquals(10f to 0f, heldDelta(0f, 10f, 270))
        // Top of the phone to the right: moving up the screen is moving right.
        assertEquals(10f to 0f, heldDelta(0f, -10f, 90))
    }
}
