package `in`.venkat.prolens.features.viewfinder.modes.panorama

import `in`.venkat.prolens.core.platform.RgbImage
import kotlin.math.abs
import kotlin.math.sin
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class StitcherTest {
    /** A smooth but non-repeating texture. */
    private fun texture(w: Int, h: Int): RgbImage {
        val px = IntArray(w * h)
        for (y in 0 until h) for (x in 0 until w) {
            val r = (128 + 60 * sin(x * 0.045 + y * 0.02) + 50 * sin(x * 0.0113 * (1 + y * 0.003))).toInt().coerceIn(0, 255)
            val g = (128 + 70 * sin(y * 0.07 + x * 0.013) + 40 * sin((x + 2 * y) * 0.031)).toInt().coerceIn(0, 255)
            val b = (128 + 80 * sin((x - y) * 0.021) + 40 * sin(x * 0.083)).toInt().coerceIn(0, 255)
            px[y * w + x] = (0xFF shl 24) or (r shl 16) or (g shl 8) or b
        }
        return RgbImage(w, h, px)
    }

    private fun crop(src: RgbImage, x0: Int, y0: Int, w: Int, h: Int): RgbImage {
        val px = IntArray(w * h)
        for (y in 0 until h) for (x in 0 until w) px[y * w + x] = src.argb[(y0 + y) * src.width + x0 + x]
        return RgbImage(w, h, px)
    }

    @Test
    fun threeCropsStitchBackWithExpectedOffsetsAndWidth() {
        val full = texture(700, 220)
        val frames = listOf(crop(full, 0, 10, 300, 200), crop(full, 200, 10, 300, 200), crop(full, 400, 10, 300, 200))
        // True steps are 200; start the search 15 px and 12 px off.
        val placements = Stitcher.refine(frames, listOf(0.0, 215.0, 188.0))
        assertTrue(abs(placements[0].x - 0) <= 3)
        assertTrue(abs(placements[1].x - 200) <= 3, "second at ${placements[1].x}")
        assertTrue(abs(placements[2].x - 400) <= 3, "third at ${placements[2].x}")
        assertTrue(placements.all { it.y <= 3 })
        val out = Stitcher.blend(frames, placements)
        assertTrue(abs(out.width - 700) <= 3, "width ${out.width}")
    }

    @Test
    fun verticalDriftIsFoundAndCropped() {
        val full = texture(500, 240)
        val frames = listOf(crop(full, 0, 10, 300, 200), crop(full, 200, 18, 300, 200))
        val placements = Stitcher.refine(frames, listOf(0.0, 200.0))
        // The second frame shows the scene 8 px lower, so it sits 8 px lower on the canvas.
        assertTrue(abs((placements[1].y - placements[0].y) - 8) <= 3, "dy ${placements[1].y - placements[0].y}")
        val out = Stitcher.blend(frames, placements)
        assertTrue(abs(out.height - 192) <= 3, "height ${out.height}")
        assertTrue(abs(out.width - 500) <= 3)
    }

    @Test
    fun stitchedPixelsMatchSource() {
        val full = texture(500, 200)
        val frames = listOf(crop(full, 0, 0, 300, 200), crop(full, 200, 0, 300, 200))
        val out = Stitcher.blend(frames, Stitcher.refine(frames, listOf(0.0, 196.0)))
        var worst = 0
        for (x in 0 until minOf(out.width, 500) step 7) {
            val a = out.argb[100 * out.width + x]
            val b = full.argb[100 * 500 + x]
            worst = maxOf(worst, abs(((a shr 8) and 0xFF) - ((b shr 8) and 0xFF)))
        }
        assertTrue(worst <= 6, "worst diff $worst")
    }

    @Test
    fun warpKeepsCentreColumn() {
        val src = texture(301, 120)
        val f = Stitcher.focalPx(src.width, 60.0)
        val warped = Stitcher.cylindricalWarp(src, f)
        assertEquals(1, warped.width % 2)
        val cw = (warped.width - 1) / 2
        for (y in 0 until src.height) assertEquals(src.argb[y * src.width + 150], warped.argb[y * warped.width + cw])
    }

    @Test
    fun focalLengthFollowsFov() {
        assertEquals(500.0, Stitcher.focalPx(1000, 90.0), 1e-6)
    }

    @Test
    fun headingDeltaWrapsAroundNorth() {
        assertEquals(20.0, Stitcher.headingDelta(350.0, 10.0), 1e-9)
        assertEquals(-20.0, Stitcher.headingDelta(10.0, 350.0), 1e-9)
    }
}
