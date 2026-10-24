package `in`.venkat.prolens.features.viewfinder.modes.slomo

import kotlin.test.Test
import kotlin.test.assertEquals

class SloMoMathTest {
    @Test fun factor() {
        assertEquals(4f, slowFactor(120))
        assertEquals(8f, slowFactor(240))
    }

    @Test fun label() = assertEquals("240 fps", fpsLabel(240))

    @Test fun line() {
        assertEquals("1 s of action plays as 4 s", playbackLine(120))
        assertEquals("1 s of action plays as 8 s", playbackLine(240))
        assertEquals("1 s of action plays as 1 s", playbackLine(30))
    }

    @Test fun selection() {
        assertEquals(240, selectedFps(240, listOf(120, 240)))
        assertEquals(120, selectedFps(0, listOf(120, 240)))
        assertEquals(null, selectedFps(0, emptyList()))
    }
}
