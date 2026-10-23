package `in`.venkat.prolens.features.viewfinder

import `in`.venkat.prolens.core.model.PeakingSensitivity
import `in`.venkat.prolens.core.platform.CameraCapabilities
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

class ViewfinderHelpersTest {
    @Test fun angleNames() {
        assertEquals("Overhead", angleName(-80f))
        assertEquals("High angle", angleName(-30f))
        assertEquals("Eye level", angleName(0f))
        assertEquals("Low angle", angleName(30f))
        assertEquals("Worm's-eye", angleName(75f))
    }

    @Test fun formats() {
        assertEquals("−0.3", fmtEv(-0.3))
        assertEquals("0.0", fmtEv(0.0))
        assertEquals("+1.0", fmtEv(1.0))
        assertEquals("∞", fmtFocus(1000.0))
        assertEquals("0.25 m", fmtFocus(0.25))
        assertEquals("3 m", fmtFocus(3.0))
        assertEquals("−2.5", signed(-2.5, 1))
        assertEquals("0", signed(-0.2, 0))
    }

    @Test fun focusScale() {
        assertEquals(0, focusToPos(0.1))
        assertEquals(100, focusToPos(1000.0))
        assertEquals(1000.0, focusFromPos(100))
        assertEquals(0.1, focusFromPos(0))
        assertEquals(0, focusMinPos(0f))
        assertTrue(focusMinPos(10f) == 0)
        assertTrue(focusMinPos(2f) > 0)
    }

    @Test fun wrap() {
        assertEquals(-170.0, wrap180(190.0))
        assertEquals(170.0, wrap180(-190.0))
        assertEquals(0.0, wrap180(360.0))
    }

    @Test fun fieldOfViewFallsBack() {
        assertEquals(Fov(50.0, 66.0), fieldOfView(CameraCapabilities()))
        val f = fieldOfView(CameraCapabilities(focalLengthMm = 5f, sensorWidthMm = 8f, sensorHeightMm = 6f))
        assertTrue(f.v > f.h)
    }

    @Test fun lensFrame() {
        assertNull(lensFrameRatio(24.0, 16.0))
        assertEquals(0.5, lensFrameRatio(24.0, 48.0))
    }

    @Test fun histogramBins() {
        val h = histogram(intArrayOf(0, 3, 4, 255, 255))
        assertEquals(2, h[0]); assertEquals(1, h[1]); assertEquals(2, h[63])
    }

    @Test fun peakingFindsAnEdge() {
        val w = 8; val h = 8
        val l = IntArray(w * h) { if (it % w < 4) 0 else 255 }
        val p = peakingPixels(l, w, h, PeakingSensitivity.Medium, 0xFFEF4444)
        assertTrue(p[3 * w + 3] != 0)
        assertEquals(0, p[3 * w + 1])
        assertEquals(0, peakingPixels(IntArray(w * h) { 100 }, w, h, PeakingSensitivity.High, 0xFFEF4444).count { it != 0 })
    }

    @Test fun clipAndZebra() {
        val c = clipPixels(intArrayOf(0, 100, 255))
        assertTrue(c[0] != 0 && c[1] == 0 && c[2] != 0)
        val z = zebraPixels(IntArray(4) { 255 }, 2, 2, 95)
        assertTrue(z.any { it != 0 })
        assertEquals(0, zebraPixels(IntArray(4) { 100 }, 2, 2, 95).count { it != 0 })
    }

    @Test fun falseColourBands() {
        assertEquals(0xFF7C3AED.toInt(), falseColor(2))
        assertEquals(0xFFEF4444.toInt(), falseColor(255))
        assertEquals(0xFF16A34A.toInt(), falseColor(120))
    }

    @Test fun waveformPlacesBrightAtTop() {
        val px = waveformPixels(intArrayOf(255, 0), 2, 1)
        assertTrue(px[0] != 0)
        assertTrue(px[(WAVE_ROWS - 1) * 2 + 1] != 0)
    }
}
