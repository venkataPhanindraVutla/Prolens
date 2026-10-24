package `in`.venkat.prolens.features.viewfinder.modes.closeup

import `in`.venkat.prolens.core.model.CaptureMode
import `in`.venkat.prolens.core.platform.RgbImage
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class CloseUpTest {
    private val w = 96
    private val h = 64

    private fun texture(): IntArray {
        var seed = 12345
        return IntArray(w * h) {
            seed = seed * 1103515245 + 12345
            (seed ushr 16) and 255
        }
    }

    private fun blur(src: IntArray, x0: Int, x1: Int): IntArray {
        val out = src.copyOf()
        repeat(3) {
            val prev = out.copyOf()
            for (y in 1 until h - 1) for (x in maxOf(x0, 1) until minOf(x1, w - 1)) {
                var s = 0
                for (dy in -1..1) for (dx in -1..1) s += prev[(y + dy) * w + x + dx]
                out[y * w + x] = s / 9
            }
        }
        return out
    }

    private fun image(luma: IntArray) = RgbImage(w, h, IntArray(w * h) { val v = luma[it]; (0xFF shl 24) or (v shl 16) or (v shl 8) or v })

    private fun energy(img: RgbImage, x0: Int, x1: Int): Double {
        val e = FocusStacker.laplacianEnergy(FocusStacker.luma(img), w, h)
        var sum = 0.0
        var n = 0
        for (y in 8 until h - 8) for (x in x0 until x1) { sum += e[y * w + x]; n++ }
        return sum / n
    }

    @Test
    fun mergeIsSharpInBothHalves() {
        val base = texture()
        val a = image(blur(base, w / 2, w))
        val b = image(blur(base, 0, w / 2))
        val merged = FocusStacker.merge(listOf(a, b))
        // Stay clear of the seam and the image edge.
        val left = 8 until w / 2 - 8
        val right = w / 2 + 8 until w - 8
        for (r in listOf(left, right)) {
            val best = maxOf(energy(a, r.first, r.last), energy(b, r.first, r.last))
            val worst = minOf(energy(a, r.first, r.last), energy(b, r.first, r.last))
            val got = energy(merged, r.first, r.last)
            assertTrue(got >= 0.9 * best, "merged $got vs sharpest $best")
            assertTrue(got > 2 * worst, "merged $got vs blurred $worst")
        }
    }

    @Test
    fun findsKnownShift() {
        val base = texture()
        // img(x, y) = ref(x - 4, y), so the first frame's pixel at x sits at x + 4 in img.
        val moved = IntArray(w * h) { i -> val x = i % w; if (x >= 4) base[i - 4] else base[i] }
        val s = FocusStacker.findShift(base, moved, w, h)
        assertEquals(FocusStacker.Shift(4, 0), s)
        val moved2 = IntArray(w * h) { i -> val y = i / w; if (y >= 3) base[i - 3 * w] else base[i] }
        assertEquals(FocusStacker.Shift(0, 3), FocusStacker.findShift(base, moved2, w, h))
    }

    @Test
    fun guidanceText() {
        assertEquals("Macro: 3.3 to 50 cm from the subject", CloseUpMath.guidance(CaptureMode.Macro, 30f))
        assertEquals("Micro: 10 to 50 cm from the subject", CloseUpMath.guidance(CaptureMode.Micro, 10f))
        assertEquals("Fixed-focus macro lens: move the phone until it's sharp", CloseUpMath.guidance(CaptureMode.Macro, 0f))
        val steps = CloseUpMath.stackFocus(0.1, 5)
        assertEquals(5, steps.size)
        assertEquals(0.1, steps.first(), 1e-9)
        assertEquals(0.5, steps.last(), 1e-9)
    }
}

class StackMemoryTest {
    @Test fun biggerStacksUseSmallerFrames() {
        val bytes = { n: Int -> val side = CloseUpMath.stackFrameSize(n).toLong(); n * side * side * 3 / 4 * 4 }
        listOf(5, 8, 12).forEach { assertTrue(bytes(it) < 130_000_000L, "$it frames use ${bytes(it)} bytes") }
    }
}
