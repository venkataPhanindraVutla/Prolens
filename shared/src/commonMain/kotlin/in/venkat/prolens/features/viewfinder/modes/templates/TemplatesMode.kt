package `in`.venkat.prolens.features.viewfinder.modes.templates

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.graphics.drawscope.translate
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import `in`.venkat.prolens.core.designsystem.ButtonVariant
import `in`.venkat.prolens.core.designsystem.OverlayChip
import `in`.venkat.prolens.core.designsystem.Pro
import `in`.venkat.prolens.core.designsystem.ProButton
import `in`.venkat.prolens.core.designsystem.ProIcons
import `in`.venkat.prolens.core.designsystem.ProListRow
import `in`.venkat.prolens.core.designsystem.ProSegmented
import `in`.venkat.prolens.core.designsystem.ProTextField
import `in`.venkat.prolens.core.platform.Hold
import `in`.venkat.prolens.core.platform.KeyValueStore
import `in`.venkat.prolens.features.viewfinder.ProSheet
import `in`.venkat.prolens.features.viewfinder.modes.ModeContext
import `in`.venkat.prolens.features.viewfinder.modes.ModeUi

/** Shot templates (an outline over the preview plus the settings that suit the shot) and my presets. */
object TemplatesMode : ModeUi() {
    private var overlayOn by mutableStateOf(true)
    private var sheetOpen by mutableStateOf(false)
    private var repo: PresetRepo? = null
    private var repoStore: KeyValueStore? = null

    private fun repoFor(store: KeyValueStore?): PresetRepo {
        val r = repo
        if (r != null && repoStore === store) return r
        return PresetRepo(store).also { repo = it; repoStore = store }
    }

    override fun onEnter(ctx: ModeContext) { overlayOn = true }

    /** The outline goes; templateId stays in the settings so it comes back on return. */
    override fun onExit(ctx: ModeContext) {
        overlayOn = false
        sheetOpen = false
    }

    override fun onShutter(ctx: ModeContext): Boolean = false

    private fun applyTemplate(ctx: ModeContext, t: ShotTemplate) {
        val next = t.apply(ctx.settings)
        ctx.state.updateViewfinder { t.apply(it) }
        t.zoomFor(next)?.let { setZoomWithin(ctx, it) }
    }

    private fun setZoomWithin(ctx: ModeContext, ratio: Float) {
        val z = ctx.zoom
        ctx.controller.setZoom(if (z.max > z.min) ratio.coerceIn(z.min, z.max) else ratio)
    }

    private fun applyPreset(ctx: ModeContext, p: Preset) {
        ctx.state.updateViewfinder { p.settings.copy(mode = it.mode) }
        ctx.controller.setZoom(p.zoom)
    }

    /* ---------- Preview ---------- */

    @Composable
    override fun PreviewLayer(ctx: ModeContext, modifier: Modifier) {
        val template = ShotTemplates.byId(ctx.settings.templateId)
        if (!overlayOn || template == null) return
        val landscape = Hold.isLandscape(ctx.hold)
        Canvas(modifier) {
            if (size.width <= 0f || size.height <= 0f) return@Canvas
            val fw = if (landscape) size.height else size.width
            val fh = if (landscape) size.width else size.height
            val shapes = template.overlay(fw / fh)
            rotate(ctx.angle.value, pivot = center) {
                translate((size.width - fw) / 2, (size.height - fh) / 2) {
                    drawShapes(shapes, fw, fh)
                }
            }
        }
    }

    private fun DrawScope.drawShapes(shapes: List<OShape>, w: Float, h: Float) {
        val under = Color(0x66000000)
        val over = Color.White.copy(alpha = 0.6f)
        val dash = PathEffect.dashPathEffect(floatArrayOf(10.dp.toPx(), 8.dp.toPx()))
        shapes.forEach { s ->
            val effect = if (s.dashed) dash else null
            drawShape(s, w, h, under, Stroke(3.5.dp.toPx(), cap = androidx.compose.ui.graphics.StrokeCap.Round, pathEffect = effect))
            drawShape(s, w, h, over, Stroke(1.5.dp.toPx(), cap = androidx.compose.ui.graphics.StrokeCap.Round, pathEffect = effect))
        }
    }

    private fun DrawScope.drawShape(s: OShape, w: Float, h: Float, color: Color, stroke: Stroke) {
        when (s) {
            is OLine -> drawLine(color, Offset(s.x1 * w, s.y1 * h), Offset(s.x2 * w, s.y2 * h), stroke.width, stroke.cap, stroke.pathEffect)
            is OPoly -> {
                if (s.points.size < 2) return
                val path = Path().apply {
                    moveTo(s.points[0].first * w, s.points[0].second * h)
                    for (i in 1 until s.points.size) lineTo(s.points[i].first * w, s.points[i].second * h)
                    if (s.closed) close()
                }
                drawPath(path, color, style = stroke)
            }
            is OOval -> drawOval(
                color, Offset((s.cx - s.rx) * w, (s.cy - s.ry) * h), Size(s.rx * 2 * w, s.ry * 2 * h), style = stroke,
            )
        }
    }

    /* ---------- Controls ---------- */

    @Composable
    override fun Controls(ctx: ModeContext) {
        val name = ShotTemplates.byId(ctx.settings.templateId)?.name ?: "Choose a template"
        Box(Modifier.fillMaxWidth().padding(bottom = 4.dp), contentAlignment = Alignment.Center) {
            OverlayChip(
                name,
                modifier = Modifier
                    .graphicsLayer { rotationZ = ctx.angle.value }
                    .clickable(role = Role.Button) { sheetOpen = true },
            )
        }
        if (sheetOpen) TemplateSheet(ctx)
    }

    @Composable
    private fun TemplateSheet(ctx: ModeContext) {
        var tab by remember { mutableStateOf(0) }
        ProSheet("Templates", onDismiss = { sheetOpen = false }) {
            ProSegmented(listOf(0 to "Shot templates", 1 to "My presets"), tab, { tab = it })
            if (tab == 0) ShotList(ctx) else PresetList(ctx)
        }
    }

    @Composable
    private fun ShotList(ctx: ModeContext) {
        val current = ctx.settings.templateId
        Column {
            ShotTemplates.all.forEach { t ->
                ProListRow(
                    t.name, t.description,
                    onClick = { applyTemplate(ctx, t); sheetOpen = false },
                    trailing = {
                        if (t.id == current) Icon(ProIcons.Check, "Selected", tint = Pro.colors.foreground, modifier = Modifier.size(18.dp))
                    },
                )
            }
        }
        if (current != null) {
            ProButton("Remove template", { ctx.state.updateViewfinder { it.copy(templateId = null) }; sheetOpen = false },
                variant = ButtonVariant.Outline, small = true)
        }
    }

    @Composable
    private fun PresetList(ctx: ModeContext) {
        val presets = repoFor(ctx.state.store)
        var name by remember { mutableStateOf("") }
        ProTextField(name, { name = it }, "Name", placeholder = "Evening street")
        ProButton(
            "Save current setup",
            {
                val p = presets.save(name, ctx.settings, ctx.zoom.ratio)
                name = ""
                ctx.toast("Saved ${p.name}")
            },
            modifier = Modifier.fillMaxWidth(),
        )
        if (presets.items.isEmpty()) {
            Text("No presets yet. Set up the grid, zoom and tools, then save them here.", style = MaterialTheme.typography.bodySmall)
        }
        Column(verticalArrangement = Arrangement.spacedBy(0.dp)) {
            presets.items.forEach { p ->
                ProListRow(
                    p.name, "${formatZoom(p.zoom)}, grid ${p.settings.grid}",
                    onClick = { applyPreset(ctx, p); sheetOpen = false },
                    trailing = {
                        Icon(
                            ProIcons.Trash, "Delete preset", tint = Pro.colors.mutedForeground,
                            modifier = Modifier.size(36.dp).clickable(role = Role.Button) { presets.delete(p.id) }.padding(9.dp),
                        )
                    },
                )
            }
        }
    }

    private fun formatZoom(z: Float): String {
        val tenth = kotlin.math.round(z * 10).toInt()
        return "${tenth / 10}.${tenth % 10}x"
    }
}
