package `in`.venkat.prolens.features.gear

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertIs
import kotlin.test.assertTrue

class GearValidationTest {
    @Test
    fun validBodyIsCustomWithCropInFormat() {
        val r = assertIs<Validated.Ok<*>>(validateBody("custom-1", " Test ", "35.9", "23.9", "24", ""))
        val body = r.item as `in`.venkat.prolens.core.model.Body
        assertEquals("Test", body.name)
        assertEquals("Custom (1×)", body.format)
        assertEquals(0.0, body.ibisStops)
        assertTrue(body.custom)
    }

    @Test
    fun bodyErrors() {
        fun err(n: String, w: String, h: String, mp: String, s: String) = (validateBody("x", n, w, h, mp, s) as Validated.Error).message
        assertEquals("Enter a name for the body.", err("", "35", "24", "24", ""))
        assertEquals("Sensor width must be between 3 and 60 mm.", err("a", "", "24", "24", ""))
        assertEquals("Sensor width must be at least the height.", err("a", "20", "24", "24", ""))
        assertEquals("Megapixels must be between 1 and 200.", err("a", "36", "24", "0", ""))
        assertEquals("Stabilisation must be between 0 and 10 stops.", err("a", "36", "24", "24", "11"))
    }

    @Test
    fun lensValidation() {
        assertIs<Validated.Ok<*>>(validateLens("x", "35mm", "35", "35", "1.8"))
        assertEquals("Max focal length must be at least the min.", (validateLens("x", "a", "70", "24", "2.8") as Validated.Error).message)
        assertEquals("Max aperture must be between f/0.7 and f/32.", (validateLens("x", "a", "24", "70", "") as Validated.Error).message)
    }
}
