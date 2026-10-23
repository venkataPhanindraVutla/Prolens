package `in`.venkat.prolens.core.platform

import android.content.ContentValues
import android.content.Context
import android.hardware.camera2.CameraCaptureSession
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CaptureRequest
import android.hardware.camera2.CaptureResult
import android.hardware.camera2.TotalCaptureResult
import android.hardware.camera2.params.RggbChannelVector
import android.os.Build
import android.os.Environment
import android.os.SystemClock
import android.provider.MediaStore
import androidx.annotation.OptIn
import androidx.camera.camera2.interop.Camera2CameraControl
import androidx.camera.camera2.interop.Camera2CameraInfo
import androidx.camera.camera2.interop.Camera2Interop
import androidx.camera.camera2.interop.CaptureRequestOptions
import androidx.camera.camera2.interop.ExperimentalCamera2Interop
import androidx.camera.core.Camera
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageCapture
import androidx.camera.core.ImageCaptureException
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.compose.LocalLifecycleOwner
import `in`.venkat.prolens.core.model.ExposureSettings
import `in`.venkat.prolens.core.photomath.PhotoMath
import java.io.File
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlin.math.ln
import kotlin.math.pow
import kotlin.math.roundToInt

@Composable
actual fun rememberCameraController(): CameraController {
    val context = LocalContext.current
    val owner = LocalLifecycleOwner.current
    val controller = remember { AndroidCameraController(context.applicationContext) }
    DisposableEffect(owner) {
        controller.bind(owner)
        onDispose { controller.unbind() }
    }
    return controller
}

@Composable
actual fun CameraPreview(controller: CameraController, modifier: Modifier) {
    val android = controller as AndroidCameraController
    AndroidView(factory = { android.previewView(it) }, modifier = modifier)
}

/**
 * CameraX for the session, Camera2 interop for manual ISO, shutter, focus and white balance.
 * Camera2 has no half-auto mode, so shutter or ISO priority solves the auto half from the last auto meter reading.
 */
@OptIn(ExperimentalCamera2Interop::class)
class AndroidCameraController(private val context: Context) : CameraController {
    private val _capabilities = MutableStateFlow(CameraCapabilities())
    override val capabilities: StateFlow<CameraCapabilities> = _capabilities
    private val _readout = MutableStateFlow(CameraReadout())
    override val readout: StateFlow<CameraReadout> = _readout

    private var view: PreviewView? = null
    private var provider: ProcessCameraProvider? = null
    private var camera: Camera? = null
    private var imageCapture: ImageCapture? = null
    private var executor: ExecutorService? = null
    private var pending = ExposureSettings()
    private var aeOn = true
    private var lastSceneEv: Double? = null
    private var lastReadoutAt = 0L
    @Volatile private var analyzer: ((LumaFrame) -> Unit)? = null
    @Volatile private var lastFrameAt = 0L

    fun previewView(ctx: Context): PreviewView = view ?: PreviewView(ctx).apply {
        scaleType = PreviewView.ScaleType.FIT_CENTER
        view = this
        provider?.let { rebind(it) }
    }

    fun bind(owner: LifecycleOwner) {
        executor = Executors.newSingleThreadExecutor()
        val future = ProcessCameraProvider.getInstance(context)
        future.addListener({
            val p = future.get()
            provider = p
            this.owner = owner
            rebind(p)
        }, ContextCompat.getMainExecutor(context))
    }

    private var owner: LifecycleOwner? = null

    private fun rebind(p: ProcessCameraProvider) {
        val owner = owner ?: return
        val pv = view ?: return
        p.unbindAll()
        val previewBuilder = Preview.Builder()
        Camera2Interop.Extender(previewBuilder).setSessionCaptureCallback(object : CameraCaptureSession.CaptureCallback() {
            override fun onCaptureCompleted(session: CameraCaptureSession, request: CaptureRequest, result: TotalCaptureResult) = onResult(result)
        })
        val preview = previewBuilder.build().also { it.surfaceProvider = pv.surfaceProvider }
        val analysis = ImageAnalysis.Builder()
            .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
            .setOutputImageFormat(ImageAnalysis.OUTPUT_IMAGE_FORMAT_YUV_420_888)
            .build()
        analysis.setAnalyzer(executor ?: return) { proxy -> analyze(proxy) }
        val capture = ImageCapture.Builder().setCaptureMode(ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY).build()
        imageCapture = capture
        val cam = runCatching { p.bindToLifecycle(owner, CameraSelector.DEFAULT_BACK_CAMERA, preview, analysis, capture) }.getOrNull() ?: return
        camera = cam
        _capabilities.value = readCapabilities(cam)
        apply(pending)
    }

    fun unbind() {
        provider?.unbindAll()
        camera = null
        executor?.shutdown()
        executor = null
    }

    private fun readCapabilities(cam: Camera): CameraCapabilities {
        val info = Camera2CameraInfo.from(cam.cameraInfo)
        fun <T : Any> ch(key: CameraCharacteristics.Key<T>): T? = runCatching { info.getCameraCharacteristic(key) }.getOrNull()
        val caps = ch(CameraCharacteristics.REQUEST_AVAILABLE_CAPABILITIES) ?: IntArray(0)
        val iso = ch(CameraCharacteristics.SENSOR_INFO_SENSITIVITY_RANGE)
        val exp = ch(CameraCharacteristics.SENSOR_INFO_EXPOSURE_TIME_RANGE)
        val size = ch(CameraCharacteristics.SENSOR_INFO_PHYSICAL_SIZE)
        val active = ch(CameraCharacteristics.SENSOR_INFO_ACTIVE_ARRAY_SIZE)
        val ev = cam.cameraInfo.exposureState
        return CameraCapabilities(
            manualSensor = CameraCharacteristics.REQUEST_AVAILABLE_CAPABILITIES_MANUAL_SENSOR in caps,
            isoRange = iso?.let { it.lower..it.upper },
            exposureRange = exp?.let { it.lower / 1e9..it.upper / 1e9 },
            minFocusDiopters = ch(CameraCharacteristics.LENS_INFO_MINIMUM_FOCUS_DISTANCE) ?: 0f,
            focusCalibrated = ch(CameraCharacteristics.LENS_INFO_FOCUS_DISTANCE_CALIBRATION) ==
                CameraCharacteristics.LENS_INFO_FOCUS_DISTANCE_CALIBRATION_CALIBRATED,
            focalLengthMm = ch(CameraCharacteristics.LENS_INFO_AVAILABLE_FOCAL_LENGTHS)?.firstOrNull(),
            apertures = ch(CameraCharacteristics.LENS_INFO_AVAILABLE_APERTURES)?.toList().orEmpty(),
            sensorWidthMm = size?.width,
            sensorHeightMm = size?.height,
            evRange = ev.exposureCompensationRange.let { it.lower..it.upper },
            evStep = ev.exposureCompensationStep.toFloat(),
            previewAspect = active?.let { minOf(it.width(), it.height()).toFloat() / maxOf(it.width(), it.height()) } ?: (3f / 4f),
        )
    }

    private fun onResult(r: TotalCaptureResult) {
        val iso = r.get(CaptureResult.SENSOR_SENSITIVITY)
        val t = r.get(CaptureResult.SENSOR_EXPOSURE_TIME)?.let { it / 1e9 }
        val n = (r.get(CaptureResult.LENS_APERTURE) ?: _capabilities.value.apertures.firstOrNull() ?: 1.8f).toDouble()
        if (aeOn && iso != null && t != null && t > 0) lastSceneEv = PhotoMath.evAtIso(n, t, iso.toDouble())
        val now = SystemClock.elapsedRealtime()
        if (now - lastReadoutAt < 250) return
        lastReadoutAt = now
        _readout.value = CameraReadout(iso, t, r.get(CaptureResult.LENS_FOCUS_DISTANCE))
    }

    override fun apply(exposure: ExposureSettings) {
        pending = exposure
        val cam = camera ?: return
        val caps = _capabilities.value
        val c2 = Camera2CameraControl.from(cam.cameraControl)
        val o = CaptureRequestOptions.Builder()
        val n = (caps.apertures.firstOrNull() ?: 1.8f).toDouble()

        val manualExposure = caps.manualSensor && (!exposure.isoAuto || !exposure.shutterAuto)
        aeOn = !manualExposure
        if (manualExposure) {
            val target = (lastSceneEv ?: 10.0) - exposure.ev
            var t = if (!exposure.shutterAuto) exposure.shutter else PhotoMath.shutterFor(n, target, exposure.iso.toDouble())
            var iso = if (!exposure.isoAuto) exposure.iso.toDouble() else PhotoMath.isoFor(n, t, target)
            caps.exposureRange?.let { t = t.coerceIn(it.start, it.endInclusive) }
            caps.isoRange?.let { iso = iso.coerceIn(it.first.toDouble(), it.last.toDouble()) }
            o.setCaptureRequestOption(CaptureRequest.CONTROL_AE_MODE, CaptureRequest.CONTROL_AE_MODE_OFF)
            o.setCaptureRequestOption(CaptureRequest.SENSOR_SENSITIVITY, iso.roundToInt())
            o.setCaptureRequestOption(CaptureRequest.SENSOR_EXPOSURE_TIME, (t * 1e9).toLong())
        } else {
            o.setCaptureRequestOption(CaptureRequest.CONTROL_AE_MODE, CaptureRequest.CONTROL_AE_MODE_ON)
            if (caps.evStep > 0) {
                val idx = (exposure.ev / caps.evStep).roundToInt().coerceIn(caps.evRange.first, caps.evRange.last)
                cam.cameraControl.setExposureCompensationIndex(idx)
            }
        }

        if (!exposure.focusAuto && caps.minFocusDiopters > 0f) {
            o.setCaptureRequestOption(CaptureRequest.CONTROL_AF_MODE, CaptureRequest.CONTROL_AF_MODE_OFF)
            o.setCaptureRequestOption(CaptureRequest.LENS_FOCUS_DISTANCE, (1f / exposure.focusM.toFloat()).coerceIn(0f, caps.minFocusDiopters))
        } else {
            o.setCaptureRequestOption(CaptureRequest.CONTROL_AF_MODE, CaptureRequest.CONTROL_AF_MODE_CONTINUOUS_PICTURE)
        }

        if (!exposure.wbAuto) {
            o.setCaptureRequestOption(CaptureRequest.CONTROL_AWB_MODE, CaptureRequest.CONTROL_AWB_MODE_OFF)
            o.setCaptureRequestOption(CaptureRequest.COLOR_CORRECTION_MODE, CaptureRequest.COLOR_CORRECTION_MODE_TRANSFORM_MATRIX)
            o.setCaptureRequestOption(CaptureRequest.COLOR_CORRECTION_GAINS, wbGains(exposure.wbKelvin, exposure.tint))
        } else {
            o.setCaptureRequestOption(CaptureRequest.CONTROL_AWB_MODE, CaptureRequest.CONTROL_AWB_MODE_AUTO)
        }
        c2.setCaptureRequestOptions(o.build())
    }

    override fun setAnalyzer(analyzer: ((LumaFrame) -> Unit)?) { this.analyzer = analyzer }

    /** Downsamples the Y plane to ~160 px wide, rotated upright like the preview, at most ~8 fps. */
    private fun analyze(proxy: ImageProxy) {
        try {
            val a = analyzer ?: return
            val now = SystemClock.elapsedRealtime()
            if (now - lastFrameAt < 120) return
            lastFrameAt = now
            val plane = proxy.planes[0]
            val buf = plane.buffer
            val rs = plane.rowStride; val ps = plane.pixelStride
            val sw = proxy.width; val sh = proxy.height
            val rot = proxy.imageInfo.rotationDegrees
            val upW = if (rot % 180 == 0) sw else sh
            val upH = if (rot % 180 == 0) sh else sw
            val step = maxOf(1, upW / 160)
            val ow = upW / step; val oh = upH / step
            val out = ByteArray(ow * oh)
            for (oy in 0 until oh) for (ox in 0 until ow) {
                val ux = ox * step; val uy = oy * step
                val sx: Int; val sy: Int
                when (rot) {
                    90 -> { sx = uy; sy = sh - 1 - ux }
                    180 -> { sx = sw - 1 - ux; sy = sh - 1 - uy }
                    270 -> { sx = sw - 1 - uy; sy = ux }
                    else -> { sx = ux; sy = uy }
                }
                out[oy * ow + ox] = buf.get(sy * rs + sx * ps)
            }
            a(LumaFrame(ow, oh, out))
        } finally {
            proxy.close()
        }
    }

    override fun capture(onResult: (Result<String>) -> Unit) {
        val ic = imageCapture ?: return onResult(Result.failure(IllegalStateException("The camera isn't ready yet.")))
        val name = "Prolens_${System.currentTimeMillis()}"
        val (options, shownAs) = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val values = ContentValues().apply {
                put(MediaStore.MediaColumns.DISPLAY_NAME, name)
                put(MediaStore.MediaColumns.MIME_TYPE, "image/jpeg")
                put(MediaStore.MediaColumns.RELATIVE_PATH, "Pictures/Prolens")
            }
            ImageCapture.OutputFileOptions.Builder(context.contentResolver, MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values).build() to "Pictures/Prolens/$name.jpg"
        } else {
            val dir = context.getExternalFilesDir(Environment.DIRECTORY_PICTURES) ?: context.filesDir
            val file = File(dir, "$name.jpg")
            ImageCapture.OutputFileOptions.Builder(file).build() to file.absolutePath
        }
        ic.takePicture(options, ContextCompat.getMainExecutor(context), object : ImageCapture.OnImageSavedCallback {
            override fun onImageSaved(output: ImageCapture.OutputFileResults) = onResult(Result.success(shownAs))
            override fun onError(exception: ImageCaptureException) = onResult(Result.failure(exception))
        })
    }

    /** Daylight-relative channel gains for a light of [kelvin], with a green–magenta [tint] (−50..50). */
    private fun wbGains(kelvin: Int, tint: Int): RggbChannelVector {
        val (r, g, b) = kelvinToRgb(kelvin.toDouble())
        val (r0, g0, b0) = kelvinToRgb(5500.0)
        val gr = ((g / r) / (g0 / r0)).toFloat() * 2f
        val gb = ((g / b) / (g0 / b0)).toFloat() * 2f
        val gg = (1f - tint / 100f * 0.3f).coerceIn(0.5f, 1.5f)
        return RggbChannelVector(gr, gg, gg, gb)
    }

    /** Tanner Helland's blackbody approximation, channels 0..1. */
    private fun kelvinToRgb(k: Double): Triple<Double, Double, Double> {
        val t = k / 100
        val r = if (t <= 66) 255.0 else 329.698727446 * (t - 60).pow(-0.1332047592)
        val g = if (t <= 66) 99.4708025861 * ln(t) - 161.1195681661 else 288.1221695283 * (t - 60).pow(-0.0755148492)
        val b = if (t >= 66) 255.0 else if (t <= 19) 0.0 else 138.5177312231 * ln(t - 10) - 305.0447927307
        fun c(v: Double) = (v.coerceIn(1.0, 255.0)) / 255.0
        return Triple(c(r), c(g), c(b))
    }
}
