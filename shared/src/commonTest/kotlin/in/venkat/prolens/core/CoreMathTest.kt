package `in`.venkat.prolens.core

import `in`.venkat.prolens.core.grids.GCircle
import `in`.venkat.prolens.core.grids.GLine
import `in`.venkat.prolens.core.grids.Grids
import `in`.venkat.prolens.core.model.Presets
import `in`.venkat.prolens.core.photomath.PhotoFormat
import `in`.venkat.prolens.core.photomath.PhotoMath
import `in`.venkat.prolens.core.sun.LightPhase
import `in`.venkat.prolens.core.sun.SunCalc
import kotlin.math.abs
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

class PhotoMathTest {
    private val ff = Presets.bodies.first { it.id == "sony-a7iv" }

    @Test fun fullFrameBasics() {
        assertEquals(1.0, PhotoMath.cropFactor(ff), 0.01)
        assertEquals(0.0288, PhotoMath.coc(ff), 0.0005)
        assertEquals(5.10, PhotoMath.pixelPitchUm(ff), 0.05)
    }

    @Test fun depthOfField50mmF8At3m() {
        val d = PhotoMath.dof(50.0, 8.0, PhotoMath.coc(ff), 3000.0)
        assertEquals(2360.0, d.near, 15.0)
        assertEquals(4120.0, d.far, 25.0)
        assertEquals(10.9, d.hyperfocal / 1000, 0.05)
    }

    @Test fun farLimitIsInfinitePastHyperfocal() {
        val h = PhotoMath.hyperfocal(24.0, 8.0, PhotoMath.coc(ff))
        assertTrue(PhotoMath.dof(24.0, 8.0, PhotoMath.coc(ff), h + 1).far.isInfinite())
    }

    @Test fun backgroundBlur85At2mBg10m() {
        assertEquals(6.26, PhotoMath.blurPctOfWidth(85.0, 1.4, 2000.0, 10000.0, ff), 0.02)
    }

    @Test fun exposureSolversRoundTrip() {
        val t = PhotoMath.shutterFor(8.0, 12.0, 400.0)
        assertEquals(12.0, PhotoMath.evAtIso(8.0, t, 400.0), 1e-9)
        assertEquals(400.0, PhotoMath.isoFor(8.0, t, 12.0), 1e-6)
        assertEquals(8.0, PhotoMath.apertureFor(t, 12.0, 400.0), 1e-9)
        assertEquals(1.0 / 125 * 1024, PhotoMath.ndShutter(1.0 / 125, 10.0), 1e-9)
    }

    @Test fun formatting() {
        assertEquals("1/250", PhotoFormat.shutter(1.0 / 250))
        assertEquals("2s", PhotoFormat.shutter(2.0))
        assertEquals("0.5s", PhotoFormat.shutter(0.5))
        assertEquals("f/2.8", PhotoFormat.aperture(2.8))
        assertEquals("f/8", PhotoFormat.aperture(8.0))
        assertEquals("2.36 m", PhotoFormat.distance(2360.0))
        assertEquals("∞", PhotoFormat.distance(Double.POSITIVE_INFINITY))
        assertEquals("+0.3 EV", PhotoFormat.ev(0.3))
    }
}

class SunCalcTest {
    /** 2026-06-21 12:00 UTC */
    private val midsummerNoonUtc = 1782043200000L

    @Test fun londonMidsummer() {
        val t = SunCalc.sunTimes(midsummerNoonUtc, 51.5074, -0.1278)
        // Sunrise ≈ 03:44 UTC, sunset ≈ 20:21 UTC.
        assertEquals((midsummerNoonUtc - (8 * 60 + 16) * 60_000L).toDouble(), t.sunrise!!.toDouble(), 3 * 60_000.0)
        assertEquals((midsummerNoonUtc + (8 * 60 + 21) * 60_000L).toDouble(), t.sunset!!.toDouble(), 3 * 60_000.0)
        val noon = SunCalc.sunPosition(t.solarNoon, 51.5074, -0.1278)
        assertEquals(61.9, noon.altitude, 0.3)
        assertTrue(abs(noon.azimuth - 180) < 1.5)
    }

    @Test fun polarCasesReturnNull() {
        assertNull(SunCalc.sunTimes(midsummerNoonUtc, 64.1466, -21.9426).astroDusk)
        val tromsoMidwinter = 1797854400000L // 2026-12-21 12:00 UTC
        assertNull(SunCalc.sunTimes(tromsoMidwinter, 69.65, 18.96).sunrise)
    }

    @Test fun phases() {
        assertEquals(LightPhase.Golden, LightPhase.of(2.0))
        assertEquals(LightPhase.Blue, LightPhase.of(-5.0))
        assertEquals(LightPhase.Night, LightPhase.of(-30.0))
    }
}

class GridsTest {
    @Test fun everyGridDrawsSomething() {
        Grids.all.forEach { assertTrue(Grids.shapes(it.id, 300f, 400f).isNotEmpty(), "${it.id} is empty") }
        assertEquals(23, Grids.all.size)
        assertEquals(Grids.all.size, Grids.all.map { it.id }.toSet().size)
    }

    @Test fun thirdsHasFourLinesAndFourPowerPoints() {
        val s = Grids.shapes("thirds", 300f, 600f)
        assertEquals(4, s.count { it is GLine })
        assertEquals(4, s.count { it is GCircle })
        assertTrue(s.filterIsInstance<GLine>().any { abs(it.x1 - 100f) < 0.01f && it.x1 == it.x2 })
    }

    @Test fun dynamicSymmetryReciprocalLandsAtHSquaredOverW() {
        val w = 300f; val h = 200f
        val lines = Grids.shapes("dynamic", w, h).filterIsInstance<GLine>()
        // From corner (W, 0) the reciprocal hits the top edge (y = H) at x = W − H²/W.
        val r = lines.first { it.x1 == w && it.y1 == 0f && it.x2 != 0f }
        assertEquals(w - h * h / w, r.x2, 0.01f)
        assertEquals(h, r.y2, 0.01f)
    }
}
