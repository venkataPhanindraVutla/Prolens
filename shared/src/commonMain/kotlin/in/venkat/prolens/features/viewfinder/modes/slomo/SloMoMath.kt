package `in`.venkat.prolens.features.viewfinder.modes.slomo

/** Playback rate the slowed clip is shown at. */
const val PLAYBACK_FPS = 30

/** How many times slower than real time the clip plays. */
fun slowFactor(fps: Int): Float = fps / PLAYBACK_FPS.toFloat()

/** Chip label for a capture rate, e.g. "240 fps". */
fun fpsLabel(fps: Int): String = "$fps fps"

/** One-line explanation under the chips, e.g. "1 s of action plays as 8 s". */
fun playbackLine(fps: Int): String {
    val secs = slowFactor(fps).let { if (it >= 1f) it.toInt().coerceAtLeast(1) else 1 }
    return "1 s of action plays as $secs s"
}

/** The rate to show as chosen: the saved one if the phone offers it, else the first. */
fun selectedFps(saved: Int, supported: List<Int>): Int? = if (saved in supported) saved else supported.firstOrNull()
