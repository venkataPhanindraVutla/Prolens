package `in`.venkat.prolens.features.viewfinder

import androidx.compose.ui.graphics.BlendMode
import androidx.compose.ui.graphics.Canvas
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.Paint
import `in`.venkat.prolens.core.model.PeakingSensitivity
import `in`.venkat.prolens.core.platform.LumaFrame
import kotlin.math.abs
import kotlin.math.min

/** Which analysis outputs to build. Equal configs mean the analyzer keeps running unchanged. */
internal data class AnalysisConfig(
    val histogram: Boolean = false,
    val clipping: Boolean = false,
    val peaking: Boolean = false,
    val peakingColor: Long = 0xFFEF4444,
    val sensitivity: PeakingSensitivity = PeakingSensitivity.Medium,
    val zebras: Boolean = false,
    val zebraLevel: Int = 95,
    val falseColor: Boolean = false,
    val waveform: Boolean = false,
) {
    val active: Boolean get() = histogram || clipping || peaking || zebras || falseColor || waveform
}

/** Small overlay bitmaps at analysis resolution, to be scaled up over the preview. */
internal class AnalysisResult(
    val histogram: IntArray,
    val peaking: ImageBitmap?,
    val zebras: ImageBitmap?,
    val clipping: ImageBitmap?,
    val falseColor: ImageBitmap?,
    val waveform: ImageBitmap?,
)

internal const val HIST_BINS = 64
internal const val WAVE_ROWS = 64
internal const val ZEBRA_SCALE = 2

internal fun analyse(frame: LumaFrame, cfg: AnalysisConfig): AnalysisResult {
    val w = frame.width
    val h = frame.height
    val l = IntArray(w * h) { frame.data[it].toInt() and 0xFF }
    return AnalysisResult(
        histogram = histogram(l),
        peaking = if (cfg.peaking) renderBitmap(peakingPixels(l, w, h, cfg.sensitivity, cfg.peakingColor), w, h) else null,
        zebras = if (cfg.zebras) renderBitmap(zebraPixels(l, w, h, cfg.zebraLevel), w * ZEBRA_SCALE, h * ZEBRA_SCALE) else null,
        clipping = if (cfg.clipping) renderBitmap(clipPixels(l), w, h) else null,
        falseColor = if (cfg.falseColor) renderBitmap(falseColorPixels(l), w, h) else null,
        waveform = if (cfg.waveform) renderBitmap(waveformPixels(l, w, h), w, WAVE_ROWS) else null,
    )
}

internal fun histogram(l: IntArray): IntArray {
    val bins = IntArray(HIST_BINS)
    for (v in l) bins[min(HIST_BINS - 1, v shr 2)]++
    return bins
}

private fun argb(a: Int, r: Int, g: Int, b: Int) = (a shl 24) or (r shl 16) or (g shl 8) or b

internal fun sobelThreshold(s: PeakingSensitivity) = when (s) {
    PeakingSensitivity.Low -> 360
    PeakingSensitivity.Medium -> 240
    PeakingSensitivity.High -> 140
}

/** Sobel edge strength |gx| + |gy| over the luma plane, painted where it beats the sensitivity threshold. */
internal fun peakingPixels(l: IntArray, w: Int, h: Int, sens: PeakingSensitivity, color: Long): IntArray {
    val out = IntArray(w * h)
    val thr = sobelThreshold(sens)
    val c = (color.toInt() and 0x00FFFFFF) or (235 shl 24)
    for (y in 1 until h - 1) for (x in 1 until w - 1) {
        val i = y * w + x
        val gx = -l[i - w - 1] - 2 * l[i - 1] - l[i + w - 1] + l[i - w + 1] + 2 * l[i + 1] + l[i + w + 1]
        val gy = -l[i - w - 1] - 2 * l[i - w] - l[i - w + 1] + l[i + w - 1] + 2 * l[i + w] + l[i + w + 1]
        if (abs(gx) + abs(gy) > thr) out[i] = c
    }
    return out
}

/** Diagonal white stripes, at [ZEBRA_SCALE] times the analysis size, over luma at or above [levelPct]. */
internal fun zebraPixels(l: IntArray, w: Int, h: Int, levelPct: Int): IntArray {
    val lvl = levelPct / 100f * 255f
    val zw = w * ZEBRA_SCALE
    val zh = h * ZEBRA_SCALE
    val out = IntArray(zw * zh)
    val stripe = argb(204, 255, 255, 255)
    for (y in 0 until zh) for (x in 0 until zw) {
        if (((x + y) / 3) % 2 == 0 && l[(y / ZEBRA_SCALE) * w + x / ZEBRA_SCALE] >= lvl) out[y * zw + x] = stripe
    }
    return out
}

/** Red above 250, blue below 5. */
internal fun clipPixels(l: IntArray): IntArray = IntArray(l.size) {
    when {
        l[it] > 250 -> argb(210, 239, 68, 68)
        l[it] < 5 -> argb(210, 59, 130, 246)
        else -> 0
    }
}

private val FC_STOPS = intArrayOf(3, 10, 20, 40, 48, 52, 58, 90, 97, 101)
private val FC_COLORS = longArrayOf(0x7C3AED, 0x2563EB, 0x0D9488, -1, 0x16A34A, -1, 0xF472B6, -1, 0xFACC15, 0xEF4444)

/** Opaque ARGB for a luma value 0..255 using the prototype's exposure key; grey bands keep the scene's brightness. */
internal fun falseColor(l: Int): Int {
    val pct = l / 255f * 100f
    for (i in FC_STOPS.indices) if (pct < FC_STOPS[i]) {
        val c = FC_COLORS[i]
        if (c >= 0) return 0xFF000000.toInt() or c.toInt()
        val g = (l * 0.8f).toInt()
        return argb(255, g, g, g)
    }
    return argb(255, 239, 68, 68)
}

private val FALSE_COLOR_LUT = IntArray(256) { falseColor(it) }

internal fun falseColorPixels(l: IntArray): IntArray = IntArray(l.size) { FALSE_COLOR_LUT[l[it]] }

/** Brightness by column: row 0 is the brightest. Cell opacity grows with how many pixels land there. */
internal fun waveformPixels(l: IntArray, w: Int, h: Int): IntArray {
    val acc = IntArray(w * WAVE_ROWS)
    for (y in 0 until h) for (x in 0 until w) {
        val row = WAVE_ROWS - 1 - min(WAVE_ROWS - 1, l[y * w + x] * WAVE_ROWS / 256)
        acc[row * w + x]++
    }
    return IntArray(acc.size) { if (acc[it] == 0) 0 else argb(min(255, 60 + acc[it] * 40), 134, 239, 172) }
}

/** Paints ARGB pixels into a bitmap as horizontal runs, which is cheap for the sparse masks used here. */
internal fun renderBitmap(px: IntArray, w: Int, h: Int): ImageBitmap {
    val bmp = ImageBitmap(w, h)
    val canvas = Canvas(bmp)
    val paint = Paint().apply { isAntiAlias = false; blendMode = BlendMode.Src }
    for (y in 0 until h) {
        var x = 0
        while (x < w) {
            val c = px[y * w + x]
            var e = x + 1
            while (e < w && px[y * w + e] == c) e++
            if (c ushr 24 != 0) {
                paint.color = Color(c)
                canvas.drawRect(x.toFloat(), y.toFloat(), e.toFloat(), (y + 1).toFloat(), paint)
            }
            x = e
        }
    }
    return bmp
}
