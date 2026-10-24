package `in`.venkat.prolens.features.viewfinder.modes.templates

import `in`.venkat.prolens.core.model.AspectRatio
import `in`.venkat.prolens.core.model.ViewfinderSettings
import kotlin.math.PI
import kotlin.math.min

/**
 * What choosing a template changes. Null leaves the current value alone.
 * [zoom] is relative to the main lens.
 */
data class TemplateSetup(
    val grid: String,
    val aspect: AspectRatio,
    val frontCamera: Boolean? = null,
    val zoom: Float? = null,
    val level: Boolean? = null,
)

class ShotTemplate(
    val id: String,
    val name: String,
    val description: String,
    val setup: TemplateSetup,
    /** The outline for a held frame of width / height [aspect]. */
    val overlay: (aspect: Float) -> List<OShape>,
) {
    fun apply(s: ViewfinderSettings): ViewfinderSettings = s.copy(
        templateId = id,
        grid = setup.grid,
        aspect = setup.aspect,
        frontCamera = setup.frontCamera ?: s.frontCamera,
        level = setup.level ?: s.level,
    )

    /** The zoom to ask for after [apply], or null when none applies (front camera, or no suggestion). */
    fun zoomFor(applied: ViewfinderSettings): Float? = if (applied.frontCamera) null else setup.zoom
}

object ShotTemplates {
    private fun frame(a: Float, f: Frame.() -> Unit): List<OShape> = Frame(a).apply(f).out

    val all: List<ShotTemplate> = listOf(
        ShotTemplate(
            "headshot", "Headshot", "Head and shoulders, eyes on the upper third",
            TemplateSetup("thirds", AspectRatio.FourFive, zoom = 2f),
        ) { a ->
            frame(a) {
                val hh = 0.42f * m
                val top = 1f / 3 - hh * 0.45f
                eyeLine(1f / 3)
                bust(0.5f, top, hh, 0.98f, 2.2f)
            }
        },
        ShotTemplate(
            "half-body", "Half-body portrait", "Head to waist with room above the head",
            TemplateSetup("thirds", AspectRatio.FourFive, zoom = 1.5f),
        ) { a ->
            frame(a) {
                val hh = 0.24f * m
                val top = 0.12f
                eyeLine(top + hh * 0.45f)
                bust(0.5f, top, hh, 0.98f, 2.4f)
            }
        },
        ShotTemplate(
            "full-body", "Full-body portrait", "Head to feet with a margin below the shoes",
            TemplateSetup("center", AspectRatio.ThreeTwo, zoom = 1f, level = true),
        ) { a ->
            frame(a) {
                val hh = 0.115f
                val top = 0.05f
                head(0.5f, top, hh)
                val chin = top + hh
                val shoulder = chin + hh * 0.35f
                val hip = top + hh * 4f
                val foot = 0.9f
                val sw = x(hh * 1.1f)
                val hw = x(hh * 0.8f)
                poly(listOf(0.5f - sw to shoulder, 0.5f - hw to hip, 0.5f - x(hh * 0.7f) to foot))
                poly(listOf(0.5f + sw to shoulder, 0.5f + hw to hip, 0.5f + x(hh * 0.7f) to foot))
                line(0.5f - hw, hip, 0.5f + hw, hip)
                line(0.5f, hip, 0.5f, foot)
                line(0.5f - sw, shoulder, 0.5f + sw, shoulder)
                line(0.5f, chin, 0.5f, shoulder)
                line(0.12f, 0.95f, 0.88f, 0.95f, dashed = true)
            }
        },
        ShotTemplate(
            "couple", "Couple", "Two people close together, heads at similar height",
            TemplateSetup("thirds", AspectRatio.FourFive, zoom = 1f),
        ) { a ->
            frame(a) {
                val hh = 0.2f * m
                val spread = x(hh * 1.05f)
                bust(0.5f - spread, 0.24f, hh, 0.98f, 2.0f)
                bust(0.5f + spread, 0.27f, hh, 0.98f, 2.0f)
            }
        },
        ShotTemplate(
            "group", "Group", "A pyramid of heads, tallest at the back",
            TemplateSetup("pyramid", AspectRatio.ThreeTwo, zoom = 1f),
        ) { a ->
            frame(a) {
                val hh = 0.12f * m
                val step = x(hh * 1.4f)
                head(0.5f, 0.22f, hh)
                head(0.5f - step, 0.32f, hh)
                head(0.5f + step, 0.32f, hh)
                head(0.5f - 2 * step, 0.44f, hh)
                head(0.5f + 2 * step, 0.44f, hh)
                poly(listOf(0.5f - 2 * step - x(hh * 0.6f) to 0.7f, 0.5f to 0.16f, 0.5f + 2 * step + x(hh * 0.6f) to 0.7f), dashed = true)
            }
        },
        ShotTemplate(
            "selfie", "Selfie", "Face centred, front camera",
            TemplateSetup("center", AspectRatio.FourFive, frontCamera = true),
        ) { a ->
            frame(a) {
                val hh = 0.5f * m
                val top = 0.14f
                eyeLine(top + hh * 0.45f)
                head(0.5f, top, hh)
                poly(arc(0.5f, top + hh + 0.12f * m, 0.45f * m, 0.14f * m, PI, 2 * PI, 20))
            }
        },
        ShotTemplate(
            "product", "Product", "Centred subject, a soft shadow and a clean backdrop seam",
            TemplateSetup("center", AspectRatio.Square, zoom = 2f, level = true),
        ) { a ->
            frame(a) {
                val bw = x(0.5f * m)
                val bh = 0.4f * m
                val cy = 0.5f
                rect(0.5f - bw / 2, cy - bh / 2, 0.5f + bw / 2, cy + bh / 2)
                oval(0.5f, cy + bh / 2 + 0.02f, bw * a / 2 * 1.1f, 0.02f, dashed = true)
                eyeLine(cy - bh / 2 - 0.08f)
            }
        },
        ShotTemplate(
            "food", "Food top-down", "Plate in the middle with cutlery either side",
            TemplateSetup("center", AspectRatio.Square, zoom = 1f, level = true),
        ) { a ->
            frame(a) {
                val r = 0.36f * m
                circle(0.5f, 0.5f, r)
                circle(0.5f, 0.5f, r * 0.72f, dashed = true)
                val fx = x(r + 0.08f * m)
                val len = 0.26f * m
                line(0.5f - fx, 0.5f - len, 0.5f - fx, 0.5f + len)
                for (i in -1..1) {
                    val tx = 0.5f - fx + x(0.02f * m) * i
                    line(tx, 0.5f - len, tx, 0.5f - len - 0.05f * m)
                }
                poly(listOf(0.5f + fx to 0.5f - len, 0.5f + fx + x(0.03f * m) to 0.5f - len * 0.4f, 0.5f + fx to 0.5f + len))
            }
        },
        ShotTemplate(
            "flat-lay", "Flat lay", "Square layout with an even margin, shot from above",
            TemplateSetup("fine", AspectRatio.Square, zoom = 1f, level = true),
        ) { a ->
            frame(a) {
                val mx = 0.07f
                val my = 0.07f
                rect(mx, my, 1f - mx, 1f - my)
                for (i in 1..3) {
                    val f = i / 4f
                    line(mx + (1 - 2 * mx) * f, my, mx + (1 - 2 * mx) * f, 1f - my, dashed = true)
                    line(mx, my + (1 - 2 * my) * f, 1f - mx, my + (1 - 2 * my) * f, dashed = true)
                }
            }
        },
        ShotTemplate(
            "real-estate", "Real estate", "Wide, verticals kept straight, horizon at mid height",
            TemplateSetup("center", AspectRatio.ThreeTwo, zoom = 0.5f, level = true),
        ) { a ->
            frame(a) {
                line(0.5f, 0.05f, 0.5f, 0.95f, dashed = true)
                line(0.16f, 0f, 0.16f, 1f)
                line(0.84f, 0f, 0.84f, 1f)
                line(0.04f, 0.5f, 0.96f, 0.5f)
                line(0.46f, 0.5f, 0.54f, 0.5f)
            }
        },
        ShotTemplate(
            "landscape", "Landscape", "Horizon on a third with a foreground zone",
            TemplateSetup("thirds", AspectRatio.ThreeTwo, zoom = 1f, level = true),
        ) { a ->
            frame(a) {
                line(0f, 2f / 3, 1f, 2f / 3)
                rect(0.03f, 0.78f, 0.97f, 0.97f, dashed = true)
            }
        },
        ShotTemplate(
            "street", "Street", "A figure on a dynamic symmetry crossing",
            TemplateSetup("dynamic", AspectRatio.ThreeTwo, zoom = 1f),
        ) { a ->
            frame(a) {
                val t = a * a / (a * a + 1)
                circle(t, t, 0.025f * m, dashed = true)
                val k = min(1f, (0.97f - t) / 0.26f)
                val hh = 0.07f * k
                val top = t - 0.1f * k
                head(t, top, hh)
                val chin = top + hh
                val hip = chin + 0.13f * k
                line(t, chin, t, hip)
                line(t - x(0.05f * k), chin + 0.03f * k, t + x(0.05f * k), chin + 0.03f * k)
                line(t, hip, t - x(0.04f * k), hip + 0.16f * k)
                line(t, hip, t + x(0.04f * k), hip + 0.16f * k)
            }
        },
    )

    fun byId(id: String?): ShotTemplate? = all.firstOrNull { it.id == id }
}
