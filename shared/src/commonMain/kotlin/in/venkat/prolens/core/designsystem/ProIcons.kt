package `in`.venkat.prolens.core.designsystem

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.addPathNodes
import androidx.compose.ui.unit.dp

/** Lucide-style line icons (24 viewport, 2px stroke), the same set as the prototype. Tint with Icon(tint = …). */
object ProIcons {
    private fun icon(name: String, vararg paths: String): ImageVector =
        ImageVector.Builder(name, 24.dp, 24.dp, 24f, 24f).apply {
            paths.forEach {
                addPath(
                    pathData = addPathNodes(it),
                    stroke = SolidColor(Color.Black),
                    strokeLineWidth = 2f,
                    strokeLineCap = StrokeCap.Round,
                    strokeLineJoin = StrokeJoin.Round,
                )
            }
        }.build()

    private fun circle(cx: Float, cy: Float, r: Float) = "M${cx - r} ${cy}a$r $r 0 1 0 ${2 * r} 0a$r $r 0 1 0 ${-2 * r} 0"

    val Camera by lazy { icon("camera", "M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z", circle(12f, 13f, 3f)) }
    val Calculator by lazy { icon("calculator", "M6 2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z", "M8 6h8M16 14v4M16 10h.01M12 10h.01M8 10h.01M12 14h.01M8 14h.01M12 18h.01M8 18h.01") }
    val Sun by lazy { icon("sun", circle(12f, 12f, 4f), "M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41") }
    val Book by lazy { icon("book", "M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z", "M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z") }
    val Aperture by lazy { icon("aperture", circle(12f, 12f, 10f), "M14.31 8l5.74 9.94M9.69 8h11.48M7.38 12l5.74-9.94M9.69 16L3.95 6.06M14.31 16H2.83M16.62 12l-5.74 9.94") }
    val Grid by lazy { icon("grid", "M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z", "M3 9h18M3 15h18M9 3v18M15 3v18") }
    val Level by lazy { icon("level", "M2 12h7M15 12h7", circle(12f, 12f, 3f)) }
    val Histogram by lazy { icon("histogram", "M3 3v18h18", "M7 16v-3M11 16V8M15 16v-6M19 16V7") }
    val Focus by lazy { icon("focus", circle(12f, 12f, 3f), "M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2") }
    val Zebra by lazy { icon("zebra", "M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z", "M3 13L13 3M3 21L21 3M11 21l10-10") }
    val Sliders by lazy { icon("sliders", "M20 7h-9M14 17H5", circle(17f, 17f, 3f), circle(7f, 7f, 3f)) }
    val Timer by lazy { icon("timer", "M10 2h4M12 14l3-3", circle(12f, 14f, 8f)) }
    val Image by lazy { icon("image", "M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z", circle(9f, 9f, 2f), "M21 15l-3.09-3.09a2 2 0 0 0-2.82 0L6 21") }
    val ChevronRight by lazy { icon("chevronRight", "M9 18l6-6-6-6") }
    val ChevronLeft by lazy { icon("chevronLeft", "M15 18l-6-6 6-6") }
    val Close by lazy { icon("close", "M18 6L6 18M6 6l12 12") }
    val Check by lazy { icon("check", "M20 6L9 17l-5-5") }
    val Plus by lazy { icon("plus", "M5 12h14M12 5v14") }
    val Trash by lazy { icon("trash", "M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2") }
    val MapPin by lazy { icon("mapPin", "M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z", circle(12f, 10f, 3f)) }
    val Moon by lazy { icon("moon", "M12 3a6 6 0 0 0 9 9a9 9 0 1 1-9-9z") }
    val Compass by lazy { icon("compass", circle(12f, 12f, 10f), "M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36z") }
    val Apps by lazy { icon("apps", "M5 4h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z", "M15 4h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z", "M5 14h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1z", "M15 14h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1z") }
    val Layers by lazy { icon("layers", "M12 2l10 5-10 5L2 7z", "M2 17l10 5 10-5M2 12l10 5 10-5") }
}
