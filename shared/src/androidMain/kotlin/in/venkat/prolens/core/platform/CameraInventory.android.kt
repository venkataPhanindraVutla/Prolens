package `in`.venkat.prolens.core.platform

import android.content.Context
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraManager
import android.os.Build
import kotlin.math.abs
import kotlin.math.hypot

/**
 * Every camera the phone lets apps use, worked out from Camera2 so it holds on any model:
 * the logical back camera (often main + ultra-wide + tele behind one id), separate back cameras,
 * physical lenses inside the logical camera, and the front camera.
 */
internal class CameraInventory(
    val primaryBackId: String?,
    /** Zoom range of the primary back camera, relative to its own 1× (the main lens). */
    val primaryZoom: ClosedFloatingPointRange<Float>,
    val lenses: List<CameraLens>,
    /** Lenses that can't be reached by zooming the primary camera and need their own session. */
    val separate: Map<String, SeparateLens>,
    val frontId: String?,
    val closeFocusLensId: String?,
    private val primaryPhysical: Set<String>,
) {
    /** How to open a lens on its own: as a top-level camera id, or as a physical lens of the primary logical camera. */
    data class SeparateLens(val cameraId: String, val physicalOf: String?)

    val ultraWide: CameraLens? get() = lenses.firstOrNull { it.role == LensRole.UltraWide }

    /** How to open [lensId] on its own; null means it's the primary camera itself. */
    fun openAs(lensId: String): SeparateLens? = when {
        lensId == primaryBackId -> null
        lensId in separate -> separate.getValue(lensId)
        lensId in primaryPhysical -> SeparateLens(lensId, primaryBackId)
        else -> SeparateLens(lensId, null)
    }

    companion object {
        fun read(context: Context): CameraInventory {
            val manager = context.getSystemService(Context.CAMERA_SERVICE) as CameraManager
            val ids = runCatching { manager.cameraIdList.toList() }.getOrDefault(emptyList())
            fun chars(id: String) = runCatching { manager.getCameraCharacteristics(id) }.getOrNull()

            class Info(val id: String, val c: CameraCharacteristics) {
                val facing = c.get(CameraCharacteristics.LENS_FACING)
                val focal = c.get(CameraCharacteristics.LENS_INFO_AVAILABLE_FOCAL_LENGTHS)?.minOrNull()
                val size = c.get(CameraCharacteristics.SENSOR_INFO_PHYSICAL_SIZE)
                val pixels = c.get(CameraCharacteristics.SENSOR_INFO_PIXEL_ARRAY_SIZE)
                val minFocus = c.get(CameraCharacteristics.LENS_INFO_MINIMUM_FOCUS_DISTANCE) ?: 0f
                val zoom = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) c.get(CameraCharacteristics.CONTROL_ZOOM_RATIO_RANGE) else null
                val physical: Set<String> = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) c.physicalCameraIds else emptySet()
                val eq: Float? get() {
                    val f = focal ?: return null
                    val s = size ?: return null
                    return f * 43.267f / hypot(s.width, s.height)
                }
                val megapixels: Float? get() = pixels?.let { it.width * it.height / 1e6f }
            }

            val top = ids.mapNotNull { id -> chars(id)?.let { Info(id, it) } }
            val backs = top.filter { it.facing == CameraCharacteristics.LENS_FACING_BACK }
            // The primary back camera is the one reaching widest: on multi-camera phones, the logical camera with the ultra-wide.
            val primary = backs.sortedWith(compareBy<Info> { it.zoom?.lower ?: 1f }.thenByDescending { it.zoom?.upper ?: 1f }).firstOrNull()
            val mainEq = primary?.eq ?: 24f
            val primaryZoom = (primary?.zoom?.lower ?: 1f)..(primary?.zoom?.upper ?: 1f)

            fun role(i: Info, eq: Float?): LensRole {
                val tinySensor = (i.megapixels ?: 99f) <= 2.5f
                return when {
                    i.minFocus >= 20f || (i.minFocus == 0f && tinySensor) -> LensRole.Macro
                    eq == null -> LensRole.Wide
                    eq < mainEq * 0.8f -> LensRole.UltraWide
                    eq > mainEq * 1.5f -> LensRole.Tele
                    else -> LensRole.Wide
                }
            }

            val lenses = mutableListOf<CameraLens>()
            val separate = mutableMapOf<String, SeparateLens>()
            fun add(i: Info, separateLens: SeparateLens?) {
                val eq = i.eq
                val rel = eq?.let { it / mainEq } ?: 1f
                val r = role(i, eq)
                // One entry per distinct lens: phones list the same lens under several ids.
                if (lenses.any { it.role == r && abs(it.relativeZoom - rel) < 0.08f }) return
                val lens = CameraLens(i.id, r, eq, rel, i.minFocus, i.megapixels)
                lenses += lens
                if (separateLens != null) separate[i.id] = separateLens
            }

            if (primary != null) {
                lenses += CameraLens(primary.id, LensRole.Wide, primary.eq, 1f, primary.minFocus, primary.megapixels)
                // Lenses inside the logical camera: reachable by zoom when the zoom range covers them, otherwise opened physically.
                primary.physical.mapNotNull { pid -> chars(pid)?.let { Info(pid, it) } }.forEach { p ->
                    val rel = (p.eq ?: mainEq) / mainEq
                    val reachable = rel >= primaryZoom.start - 0.05f && rel <= primaryZoom.endInclusive + 0.05f
                    add(p, if (reachable && role(p, p.eq) != LensRole.Macro) null else SeparateLens(p.id, physicalOf = primary.id))
                }
            }
            backs.filter { it.id != primary?.id && it.id !in (primary?.physical ?: emptySet()) }.forEach { add(it, SeparateLens(it.id, null)) }

            val front = top.firstOrNull { it.facing == CameraCharacteristics.LENS_FACING_FRONT }
            front?.let { lenses += CameraLens(it.id, LensRole.Front, it.eq, 1f, it.minFocus, it.megapixels) }

            val backLenses = lenses.filter { it.role != LensRole.Front }
            val close = backLenses.firstOrNull { it.role == LensRole.Macro } ?: backLenses.maxByOrNull { it.minFocusDiopters }

            return CameraInventory(primary?.id, primaryZoom, lenses, separate, front?.id, close?.id, primary?.physical ?: emptySet())
        }
    }
}
