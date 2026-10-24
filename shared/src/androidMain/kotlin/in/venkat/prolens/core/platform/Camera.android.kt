package `in`.venkat.prolens.core.platform

import android.content.ContentValues
import android.graphics.Bitmap
import android.graphics.Matrix
import android.util.Range
import androidx.camera.core.DynamicRange
import androidx.camera.extensions.ExtensionMode
import androidx.camera.extensions.ExtensionsManager
import androidx.camera.video.HighSpeedVideoSessionConfig
import androidx.camera.video.MediaStoreOutputOptions
import androidx.camera.video.Quality
import androidx.camera.video.QualitySelector
import androidx.camera.video.Recorder
import androidx.camera.video.VideoCapture
import androidx.camera.video.VideoRecordEvent
import `in`.venkat.prolens.core.model.CaptureMode
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
import androidx.camera.core.CameraInfo
import android.util.Log
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageCapture
import androidx.camera.core.ImageCaptureException
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.core.FocusMeteringAction
import java.util.concurrent.TimeUnit
import androidx.camera.core.UseCaseGroup
import androidx.camera.core.ViewPort
import android.util.Rational
import android.view.Surface
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
 *
 * Lenses and modes adapt to the phone: [CameraInventory] lists what the phone exposes, and each rebind opens
 * the camera the current mode and zoom need, falling back to the primary camera if a lens can't be opened.
 */
@OptIn(ExperimentalCamera2Interop::class)
class AndroidCameraController(private val context: Context) : CameraController {
    private val _capabilities = MutableStateFlow(CameraCapabilities())
    override val capabilities: StateFlow<CameraCapabilities> = _capabilities
    private val _readout = MutableStateFlow(CameraReadout())
    override val readout: StateFlow<CameraReadout> = _readout
    private val _zoom = MutableStateFlow(ZoomState())
    override val zoom: StateFlow<ZoomState> = _zoom
    private val _features = MutableStateFlow(CameraFeatures())
    override val features: StateFlow<CameraFeatures> = _features
    private val _recording = MutableStateFlow<Recording?>(null)
    override val recording: StateFlow<Recording?> = _recording

    private var inventory: CameraInventory? = null
    private var extensions: ExtensionsManager? = null
    private var front = false
    private var mode = CaptureMode.Photo
    private var slowFps = 0
    private var boundLensId: String? = null
    /** Field of view of the bound lens against the main back lens, so zoom can be shown relative to the main lens. */
    private var boundRel = 1f
    /** The zoom the photographer asked for, relative to the main back lens. */
    private var wantZoom = 1f
    private var recorder: Recorder? = null
    private var videoCapture: VideoCapture<Recorder>? = null
    private var activeRecording: androidx.camera.video.Recording? = null
    private val main get() = ContextCompat.getMainExecutor(context)

    private var view: PreviewView? = null
    private var provider: ProcessCameraProvider? = null
    private var camera: Camera? = null
    private var imageCapture: ImageCapture? = null
    private var executor: ExecutorService? = null
    private var pending = ExposureSettings()
    private var aeOn = true
    private var lastSceneEv: Double? = null
    private var lastReadoutAt = 0L
    private var hold = 0
    private var sensorRatio: Double? = null
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
            inventory = CameraInventory.read(context)
            val ext = ExtensionsManager.getInstanceAsync(context, p)
            ext.addListener({
                extensions = runCatching { ext.get() }.getOrNull()
                _features.value = readFeatures(p)
                rebind(p)
            }, main)
        }, main)
    }

    private var owner: LifecycleOwner? = null

    private val photoLike get() = mode != CaptureMode.SloMo && mode != CaptureMode.Night && mode != CaptureMode.Macro && mode != CaptureMode.Micro

    /** The lens this mode and zoom need. */
    private fun targetLens(): String? {
        val inv = inventory ?: return null
        return when {
            front -> inv.frontId
            mode == CaptureMode.Macro || mode == CaptureMode.Micro -> inv.closeFocusLensId ?: inv.primaryBackId
            !photoLike -> inv.primaryBackId
            else -> inv.ultraWide?.takeIf { it.id in inv.separate && wantZoom < inv.primaryZoom.start - 0.02f }?.id ?: inv.primaryBackId
        }
    }

    private fun relOf(lensId: String?): Float {
        val inv = inventory ?: return 1f
        if (lensId == null || lensId == inv.primaryBackId || lensId == inv.frontId) return 1f
        return inv.lenses.firstOrNull { it.id == lensId }?.relativeZoom ?: 1f
    }

    private fun selectorFor(p: ProcessCameraProvider, lensId: String?): CameraSelector {
        val inv = inventory
        fun byId(id: String) = p.availableCameraInfos.firstOrNull { Camera2CameraInfo.from(it).cameraId == id }?.cameraSelector
        if (front) return inv?.frontId?.let(::byId) ?: CameraSelector.DEFAULT_FRONT_CAMERA
        val id = lensId ?: return CameraSelector.DEFAULT_BACK_CAMERA
        val open = inv?.openAs(id)
        return when {
            open == null -> byId(id) ?: CameraSelector.DEFAULT_BACK_CAMERA
            open.physicalOf != null -> CameraSelector.Builder()
                .addCameraFilter { infos -> infos.filter { Camera2CameraInfo.from(it).cameraId == open.physicalOf } }
                .setPhysicalCameraId(open.cameraId)
                .build()
            else -> byId(open.cameraId) ?: CameraSelector.DEFAULT_BACK_CAMERA
        }
    }

    private fun rebind(p: ProcessCameraProvider) {
        val owner = owner ?: return
        val pv = view ?: return
        stopRecording()
        p.unbindAll()
        imageCapture = null
        videoCapture = null
        val previewBuilder = Preview.Builder()
        Camera2Interop.Extender(previewBuilder).setSessionCaptureCallback(object : CameraCaptureSession.CaptureCallback() {
            override fun onCaptureCompleted(session: CameraCaptureSession, request: CaptureRequest, result: TotalCaptureResult) = onResult(result)
        })
        val preview = previewBuilder.build().also { it.surfaceProvider = pv.surfaceProvider }

        var lensId = targetLens()
        var cam = if (mode == CaptureMode.SloMo && !front && slowFps > 0) bindSlowMotion(p, owner, selectorFor(p, lensId), preview)
            else bindPhoto(p, owner, selectorFor(p, lensId), preview)
        if (cam == null && lensId != inventory?.primaryBackId && !front) {
            // Some phones list a lens but won't open it for apps: fall back to the primary camera.
            Log.w("Prolens", "Couldn't open lens $lensId, using the primary camera")
            lensId = inventory?.primaryBackId
            cam = bindPhoto(p, owner, selectorFor(p, lensId), preview)
        }
        cam ?: return
        boundLensId = lensId
        boundRel = relOf(lensId)
        camera?.cameraInfo?.zoomState?.removeObservers(owner)
        camera = cam
        _capabilities.value = readCapabilities(cam)
        cam.cameraInfo.zoomState.observe(owner) { z -> publishZoom(z.minZoomRatio, z.maxZoomRatio, z.zoomRatio) }
        val z = cam.cameraInfo.zoomState.value
        cam.cameraControl.setZoomRatio((wantZoom / boundRel).coerceIn(z?.minZoomRatio ?: 1f, z?.maxZoomRatio ?: 1f))
        apply(pending)
    }

    private fun bindPhoto(p: ProcessCameraProvider, owner: LifecycleOwner, base: CameraSelector, preview: Preview): Camera? {
        var selector = base
        var withAnalysis = true
        val ext = extensions
        if (mode == CaptureMode.Night && !front && ext != null && runCatching { ext.isExtensionAvailable(base, ExtensionMode.NIGHT) }.getOrDefault(false)) {
            selector = ext.getExtensionEnabledCameraSelector(base, ExtensionMode.NIGHT)
            withAnalysis = runCatching { ext.isImageAnalysisSupported(base, ExtensionMode.NIGHT) }.getOrDefault(false)
        }
        val capture = ImageCapture.Builder()
            .setCaptureMode(ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY)
            .setTargetRotation(surfaceRotation(hold))
            .build()
        // The screen is locked portrait, so the crop is set upright; a sideways hold only turns the saved photo.
        val group = UseCaseGroup.Builder().addUseCase(preview).addUseCase(capture)
        if (withAnalysis) {
            val analysis = ImageAnalysis.Builder()
                .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                .setOutputImageFormat(ImageAnalysis.OUTPUT_IMAGE_FORMAT_YUV_420_888)
                .build()
            executor?.let { e -> analysis.setAnalyzer(e) { proxy -> analyze(proxy) } }
            group.addUseCase(analysis)
        }
        sensorRatio?.let { r -> group.setViewPort(ViewPort.Builder(Rational(1000, (1000 * r).roundToInt()), Surface.ROTATION_0).build()) }
        val cam = runCatching { p.bindToLifecycle(owner, selector, group.build()) }
            .onFailure { Log.w("Prolens", "Photo session failed", it) }.getOrNull()
        if (cam != null) imageCapture = capture
        return cam
    }

    /** High-speed video for slo-mo. No audio, so no microphone permission is needed. */
    private fun bindSlowMotion(p: ProcessCameraProvider, owner: LifecycleOwner, selector: CameraSelector, preview: Preview): Camera? = runCatching {
        val info = p.getCameraInfo(selector)
        val qualities = Recorder.getHighSpeedVideoCapabilities(info)?.getSupportedQualities(DynamicRange.SDR).orEmpty()
        val quality = qualities.firstOrNull { it == Quality.HD } ?: qualities.first()
        val rec = Recorder.Builder().setQualitySelector(QualitySelector.from(quality)).build()
        val vc = VideoCapture.withOutput(rec).also { it.targetRotation = surfaceRotation(hold) }
        val config = HighSpeedVideoSessionConfig.Builder(vc)
            .setPreview(preview)
            .setSlowMotionEnabled(true)
            .setFrameRateRange(Range(slowFps, slowFps))
            .build()
        val cam = p.bindToLifecycle(owner, selector, config)
        recorder = rec
        videoCapture = vc
        cam
    }.onFailure { Log.w("Prolens", "Slo-mo session failed", it) }.getOrNull()

    /** Publishes zoom relative to the main back lens, spanning the ultra-wide when it's a separate camera. */
    private fun publishZoom(min: Float, max: Float, ratio: Float) {
        val inv = inventory
        if (front || inv == null || !photoLike) {
            _zoom.value = ZoomState(min * boundRel, max * boundRel, ratio * boundRel)
            return
        }
        val uwRel = inv.ultraWide?.takeIf { it.id in inv.separate }?.relativeZoom
        val lo = minOf(inv.primaryZoom.start, uwRel ?: inv.primaryZoom.start)
        _zoom.value = ZoomState(lo, inv.primaryZoom.endInclusive, ratio * boundRel)
    }

    private fun readFeatures(p: ProcessCameraProvider): CameraFeatures {
        val inv = inventory ?: return CameraFeatures()
        val base = selectorFor(p, inv.primaryBackId)
        val ext = extensions
        fun has(m: Int) = ext != null && runCatching { ext.isExtensionAvailable(base, m) }.getOrDefault(false)
        val fps = runCatching {
            val info = p.getCameraInfo(base)
            val q = Recorder.getHighSpeedVideoCapabilities(info)?.getSupportedQualities(DynamicRange.SDR)?.firstOrNull()
                ?: return@runCatching emptyList<Int>()
            val vc = VideoCapture.withOutput(Recorder.Builder().setQualitySelector(QualitySelector.from(q)).build())
            info.getSupportedFrameRateRanges(HighSpeedVideoSessionConfig(vc, Preview.Builder().build()))
                .map { it.upper }.filter { it >= 120 }.distinct().sorted()
        }.getOrDefault(emptyList())
        Log.i("Prolens", "Lenses ${inv.lenses.map { "${it.role}:${it.id}@${it.relativeZoom}" }}, slo-mo $fps, night ${has(ExtensionMode.NIGHT)}")
        return CameraFeatures(
            lenses = inv.lenses,
            nightExtension = has(ExtensionMode.NIGHT),
            hdrExtension = has(ExtensionMode.HDR),
            bokehExtension = has(ExtensionMode.BOKEH),
            slowMotionFps = fps,
            closeFocusLensId = inv.closeFocusLensId,
        )
    }

    fun unbind() {
        stopRecording()
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
            // Auto exposure stays with CameraX, so tap-to-meter and AE lock keep working.
            if (caps.evStep > 0) {
                val idx = (exposure.ev / caps.evStep).roundToInt().coerceIn(caps.evRange.first, caps.evRange.last)
                cam.cameraControl.setExposureCompensationIndex(idx)
            }
        }

        // Auto focus and white balance stay with CameraX (continuous AF, tap-to-focus); only manual values are forced.
        if (!exposure.focusAuto && caps.minFocusDiopters > 0f) {
            o.setCaptureRequestOption(CaptureRequest.CONTROL_AF_MODE, CaptureRequest.CONTROL_AF_MODE_OFF)
            o.setCaptureRequestOption(CaptureRequest.LENS_FOCUS_DISTANCE, (1f / exposure.focusM.toFloat()).coerceIn(0f, caps.minFocusDiopters))
        }
        if (!exposure.wbAuto) {
            o.setCaptureRequestOption(CaptureRequest.CONTROL_AWB_MODE, CaptureRequest.CONTROL_AWB_MODE_OFF)
            o.setCaptureRequestOption(CaptureRequest.COLOR_CORRECTION_MODE, CaptureRequest.COLOR_CORRECTION_MODE_TRANSFORM_MATRIX)
            o.setCaptureRequestOption(CaptureRequest.COLOR_CORRECTION_GAINS, wbGains(exposure.wbKelvin, exposure.tint))
        }
        c2.setCaptureRequestOptions(o.build())
    }

    override fun setAnalyzer(analyzer: ((LumaFrame) -> Unit)?) { this.analyzer = analyzer }

    override fun setZoom(ratio: Float) {
        val cam = camera ?: return
        val z = _zoom.value
        wantZoom = ratio.coerceIn(z.min, z.max)
        if (photoLike && !front && targetLens() != boundLensId) {
            provider?.let { rebind(it) }
            return
        }
        val own = cam.cameraInfo.zoomState.value
        cam.cameraControl.setZoomRatio((wantZoom / boundRel).coerceIn(own?.minZoomRatio ?: 1f, own?.maxZoomRatio ?: 1f))
    }

    override fun setFront(front: Boolean) {
        if (front == this.front) return
        this.front = front
        wantZoom = 1f
        provider?.let { rebind(it) }
    }

    override fun setMode(mode: CaptureMode, slowMotionFps: Int) {
        if (mode == this.mode && slowMotionFps == slowFps) return
        val lensChanges = (mode == CaptureMode.Macro || mode == CaptureMode.Micro) != (this.mode == CaptureMode.Macro || this.mode == CaptureMode.Micro)
        this.mode = mode
        slowFps = slowMotionFps
        if (lensChanges) wantZoom = 1f
        provider?.let { rebind(it) }
    }

    override fun captureFrame(maxLongSide: Int, onResult: (Result<RgbImage>) -> Unit) {
        val ic = imageCapture ?: return onResult(Result.failure(IllegalStateException("The camera isn't ready yet.")))
        val ex = executor ?: return onResult(Result.failure(IllegalStateException("The camera isn't ready yet.")))
        ic.takePicture(ex, object : ImageCapture.OnImageCapturedCallback() {
            override fun onCaptureSuccess(image: ImageProxy) {
                val result = runCatching {
                    val crop = image.cropRect
                    var bmp = image.toBitmap()
                    if (bmp.width == image.width && bmp.height == image.height && (crop.width() != bmp.width || crop.height() != bmp.height)) {
                        bmp = Bitmap.createBitmap(bmp, crop.left, crop.top, crop.width(), crop.height())
                    }
                    val scale = minOf(1f, maxLongSide.toFloat() / maxOf(bmp.width, bmp.height))
                    val m = Matrix().apply { postScale(scale, scale); postRotate(image.imageInfo.rotationDegrees.toFloat()) }
                    val out = Bitmap.createBitmap(bmp, 0, 0, bmp.width, bmp.height, m, true)
                    val px = IntArray(out.width * out.height)
                    out.getPixels(px, 0, out.width, 0, 0, out.width, out.height)
                    RgbImage(out.width, out.height, px)
                }
                image.close()
                main.execute { onResult(result) }
            }
            override fun onError(exception: ImageCaptureException) { main.execute { onResult(Result.failure(exception)) } }
        })
    }

    override fun saveImage(image: RgbImage, name: String, onResult: (Result<String>) -> Unit) {
        val ex = executor ?: return onResult(Result.failure(IllegalStateException("The camera isn't ready yet.")))
        ex.execute {
            val result = runCatching {
                val bmp = Bitmap.createBitmap(image.argb, image.width, image.height, Bitmap.Config.ARGB_8888)
                val file = "${name}_${System.currentTimeMillis()}"
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    val values = ContentValues().apply {
                        put(MediaStore.MediaColumns.DISPLAY_NAME, file)
                        put(MediaStore.MediaColumns.MIME_TYPE, "image/jpeg")
                        put(MediaStore.MediaColumns.RELATIVE_PATH, "Pictures/Prolens")
                    }
                    val uri = context.contentResolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values)
                        ?: error("The photo library refused the file.")
                    context.contentResolver.openOutputStream(uri)?.use { bmp.compress(Bitmap.CompressFormat.JPEG, 92, it) }
                    "Pictures/Prolens/$file.jpg"
                } else {
                    val dir = context.getExternalFilesDir(Environment.DIRECTORY_PICTURES) ?: context.filesDir
                    val f = File(dir, "$file.jpg")
                    f.outputStream().use { bmp.compress(Bitmap.CompressFormat.JPEG, 92, it) }
                    f.absolutePath
                }
            }
            main.execute { onResult(result) }
        }
    }

    override fun startRecording(onSaved: (Result<String>) -> Unit) {
        val rec = recorder ?: return onSaved(Result.failure(IllegalStateException("Slo-mo isn't ready on this camera.")))
        if (activeRecording != null) return
        val name = "Prolens_slomo_${System.currentTimeMillis()}"
        val values = ContentValues().apply {
            put(MediaStore.MediaColumns.DISPLAY_NAME, name)
            put(MediaStore.MediaColumns.MIME_TYPE, "video/mp4")
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) put(MediaStore.MediaColumns.RELATIVE_PATH, "Movies/Prolens")
        }
        val output = MediaStoreOutputOptions.Builder(context.contentResolver, MediaStore.Video.Media.EXTERNAL_CONTENT_URI)
            .setContentValues(values).build()
        val fps = slowFps
        activeRecording = rec.prepareRecording(context, output).start(main) { e ->
            when (e) {
                is VideoRecordEvent.Status -> _recording.value = Recording(e.recordingStats.recordedDurationNanos / 1_000_000, fps)
                is VideoRecordEvent.Finalize -> {
                    activeRecording = null
                    _recording.value = null
                    if (e.hasError()) onSaved(Result.failure(IllegalStateException("The video couldn't be saved (error ${e.error}).")))
                    else onSaved(Result.success("Movies/Prolens/$name.mp4"))
                }
                else -> {}
            }
        }
        _recording.value = Recording(0, fps)
    }

    override fun stopRecording() {
        activeRecording?.stop()
        activeRecording = null
    }

    override fun focusAt(x: Float, y: Float, lock: Boolean) {
        val cam = camera ?: return
        val pv = view ?: return
        val manualExposure = _capabilities.value.manualSensor && (!pending.isoAuto || !pending.shutterAuto)
        val manualFocus = !pending.focusAuto && _capabilities.value.minFocusDiopters > 0f
        var flags = 0
        if (!manualFocus) flags = flags or FocusMeteringAction.FLAG_AF
        if (!manualExposure) flags = flags or FocusMeteringAction.FLAG_AE
        if (flags == 0) return
        val point = pv.meteringPointFactory.createPoint(x * pv.width, y * pv.height)
        val action = FocusMeteringAction.Builder(point, flags).apply {
            if (lock) disableAutoCancel() else setAutoCancelDuration(4, TimeUnit.SECONDS)
        }.build()
        cam.cameraControl.startFocusAndMetering(action)
    }

    override fun unlockFocus() {
        camera?.cameraControl?.cancelFocusAndMetering()
    }

    override fun setHold(hold: Int) {
        this.hold = hold
        imageCapture?.targetRotation = surfaceRotation(hold)
        videoCapture?.targetRotation = surfaceRotation(hold)
    }

    override fun setAspect(sensorRatio: Double?) {
        if (sensorRatio == this.sensorRatio) return
        this.sensorRatio = sensorRatio
        provider?.let { rebind(it) }
    }

    /** CameraX's target rotation for a hold: turning the phone clockwise is a counter-clockwise display rotation. */
    private fun surfaceRotation(hold: Int) = when (hold) {
        90 -> Surface.ROTATION_270
        180 -> Surface.ROTATION_180
        270 -> Surface.ROTATION_90
        else -> Surface.ROTATION_0
    }

    /** Downsamples the cropped Y plane to ~160 px wide, rotated upright like the preview, at most ~8 fps. */
    private fun analyze(proxy: ImageProxy) {
        try {
            val a = analyzer ?: return
            val now = SystemClock.elapsedRealtime()
            if (now - lastFrameAt < 120) return
            lastFrameAt = now
            val plane = proxy.planes[0]
            val buf = plane.buffer
            val rs = plane.rowStride; val ps = plane.pixelStride
            val crop = proxy.cropRect
            val cx = crop.left; val cy = crop.top
            val sw = crop.width(); val sh = crop.height()
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
                out[oy * ow + ox] = buf.get((cy + sy) * rs + (cx + sx) * ps)
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
