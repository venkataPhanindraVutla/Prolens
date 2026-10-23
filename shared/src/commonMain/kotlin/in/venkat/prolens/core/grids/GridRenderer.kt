package `in`.venkat.prolens.core.grids

import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.clipRect
import androidx.compose.ui.graphics.drawscope.scale
import androidx.compose.ui.graphics.drawscope.translate

/**
 * Draws grid [id] inside [frame], clipped to it. [orient] bit 1 flips X, bit 2 flips Y.
 * Each stroke gets a faint dark under-stroke so lines read on bright and dark scenes.
 */
fun DrawScope.drawGrid(
    id: String,
    frame: Rect,
    color: Color = Color.White,
    opacity: Float = 0.7f,
    strokeWidth: Float = 1.5f,
    orient: Int = 0,
) {
    if (id == "none" || frame.width < 2f || frame.height < 2f) return
    val shapes = Grids.shapes(id, frame.width, frame.height)
    clipRect(frame.left, frame.top, frame.right, frame.bottom) {
        translate(frame.left, frame.top) {
            scale(
                scaleX = if (orient and 1 != 0) -1f else 1f,
                scaleY = if (orient and 2 != 0) -1f else 1f,
                pivot = Offset(frame.width / 2, frame.height / 2),
            ) {
                shapes.forEach { drawShape(it, Color.Black.copy(alpha = 0.35f * opacity * it.alpha), strokeWidth + 1.5f) }
                shapes.forEach { drawShape(it, color.copy(alpha = opacity * it.alpha), strokeWidth) }
            }
        }
    }
}

private fun DrawScope.drawShape(s: GridShape, c: Color, w: Float) {
    val dash = if (s.dashed) PathEffect.dashPathEffect(floatArrayOf(10f, 8f)) else null
    val stroke = Stroke(width = w, cap = StrokeCap.Round, join = StrokeJoin.Round, pathEffect = dash)
    when (s) {
        is GLine -> drawLine(c, Offset(s.x1, s.y1), Offset(s.x2, s.y2), strokeWidth = w, cap = StrokeCap.Round, pathEffect = dash)
        is GCircle -> drawCircle(c, s.r, Offset(s.cx, s.cy), style = stroke)
        is GRect -> drawRect(c, Offset(s.x, s.y), Size(s.w, s.h), style = stroke)
        is GPoly -> {
            if (s.points.size < 2) return
            val p = Path().apply {
                moveTo(s.points[0].first, s.points[0].second)
                for (i in 1 until s.points.size) lineTo(s.points[i].first, s.points[i].second)
                if (s.closed) close()
            }
            drawPath(p, c, style = stroke)
        }
    }
}
