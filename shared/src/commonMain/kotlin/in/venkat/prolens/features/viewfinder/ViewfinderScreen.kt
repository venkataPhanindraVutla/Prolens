package `in`.venkat.prolens.features.viewfinder

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.WindowInsetsSides
import androidx.compose.foundation.layout.displayCutout
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.only
import androidx.compose.foundation.layout.plus
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableLongStateOf
import `in`.venkat.prolens.app.Tab
import `in`.venkat.prolens.core.model.CaptureMode
import `in`.venkat.prolens.features.viewfinder.modes.ModeContext
import `in`.venkat.prolens.features.viewfinder.modes.availableModes
import `in`.venkat.prolens.features.viewfinder.modes.modeUi
import androidx.compose.runtime.rememberUpdatedState
import `in`.venkat.prolens.core.designsystem.OverlayChip
import androidx.compose.ui.platform.LocalDensity
import `in`.venkat.prolens.core.platform.Hold
import `in`.venkat.prolens.core.platform.ImmersiveMode
import `in`.venkat.prolens.core.platform.rememberHold
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import `in`.venkat.prolens.app.AppState
import `in`.venkat.prolens.core.designsystem.Pro
import `in`.venkat.prolens.core.designsystem.ProButton
import `in`.venkat.prolens.core.designsystem.tabular
import `in`.venkat.prolens.core.platform.AppPermission
import `in`.venkat.prolens.core.platform.CameraPreview
import `in`.venkat.prolens.core.platform.DeviceOrientation
import `in`.venkat.prolens.core.platform.LumaFrame
import `in`.venkat.prolens.core.platform.rememberCameraController
import `in`.venkat.prolens.core.platform.rememberDeviceOrientation
import `in`.venkat.prolens.core.platform.rememberPermission
import `in`.venkat.prolens.core.sun.SkyPosition
import `in`.venkat.prolens.core.sun.SunCalc
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private enum class Phase { Idle, Counting, Holding, Saving }

private sealed interface Sheet {
    data object Grid : Sheet
    data object Tools : Sheet
    data class Value(val field: HudField) : Sheet
}

@Composable
fun ViewfinderScreen(state: AppState) {
    val camera = rememberPermission(AppPermission.Camera)
    Box(Modifier.fillMaxSize().background(Color.Black)) {
        if (camera.granted) Viewfinder(state) else PermissionPrompt(camera::request)
    }
}

@Composable
private fun PermissionPrompt(onAllow: () -> Unit) {
    Column(
        Modifier.fillMaxSize().padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp, Alignment.CenterVertically),
    ) {
        Text("Prolens needs the camera to show the viewfinder.", style = MaterialTheme.typography.bodyLarge, textAlign = TextAlign.Center)
        ProButton("Allow camera", onAllow)
    }
}

@Composable
private fun Viewfinder(state: AppState) {
    val settings by state.viewfinder.collectAsStateWithLifecycle()
    val gear by state.gear.collectAsStateWithLifecycle()
    val location by state.location.collectAsStateWithLifecycle()
    val controller = rememberCameraController()
    val caps by controller.capabilities.collectAsStateWithLifecycle()
    val readout by controller.readout.collectAsStateWithLifecycle()
    val scope = rememberCoroutineScope()

    val hold by rememberHold()
    val angle = rememberUiAngle(hold)
    ImmersiveMode()
    LaunchedEffect(hold) { controller.setHold(hold) }
    LaunchedEffect(settings.aspect) { controller.setAspect(settings.aspect.sensorRatio) }

    val needsSensors = settings.level || settings.angleLabel || settings.sunPath || settings.groundGrid || settings.steadyShot
    val orientation = rememberDeviceOrientation(needsSensors)

    LaunchedEffect(settings.exposure) { controller.apply(settings.exposure) }

    /* Luma analysis runs only while a tool needs it. */
    val config = AnalysisConfig(
        histogram = settings.histogram, clipping = settings.clipping,
        peaking = settings.peaking, peakingColor = settings.peakingColor, sensitivity = settings.peakingSensitivity,
        zebras = settings.zebras, zebraLevel = settings.zebraLevel,
        falseColor = settings.falseColor, waveform = settings.waveform,
    )
    val analysis = remember { mutableStateOf<AnalysisResult?>(null) }
    val frames = remember(config) { Channel<LumaFrame>(Channel.CONFLATED) }
    DisposableEffect(frames) {
        if (config.active) controller.setAnalyzer { frames.trySend(it) }
        onDispose {
            controller.setAnalyzer(null)
            frames.close()
        }
    }
    LaunchedEffect(frames) {
        if (!config.active) { analysis.value = null; return@LaunchedEffect }
        for (f in frames) analysis.value = withContext(Dispatchers.Default) { analyse(f, config) }
    }

    val blink = remember { mutableStateOf(true) }
    LaunchedEffect(settings.clipping) {
        blink.value = true
        if (!settings.clipping) return@LaunchedEffect
        while (true) { delay(500); blink.value = !blink.value }
    }

    val sunNow = remember { mutableStateOf<SkyPosition?>(null) }
    val sunPoints = remember(settings.sunPath, location) { if (settings.sunPath) sunTrack(location, nowMs()) else emptyList() }
    LaunchedEffect(settings.sunPath, location) {
        if (!settings.sunPath) return@LaunchedEffect
        while (true) {
            sunNow.value = SunCalc.sunPosition(nowMs(), location.lat, location.lon)
            delay(30_000)
        }
    }

    val zoom by controller.zoom.collectAsStateWithLifecycle()
    val features by controller.features.collectAsStateWithLifecycle()
    val recording by controller.recording.collectAsStateWithLifecycle()
    val modes = remember(features) { availableModes(features) }
    val mode = if (settings.mode in modes) settings.mode else CaptureMode.Photo
    val ui = modeUi(mode)
    val ctx = ModeContext(state, controller, settings, features, caps, zoom, orientation, hold, angle, scope)
    val currentCtx by rememberUpdatedState(ctx)
    var toolkit by remember { mutableStateOf(false) }

    /* Binding: front or back, then the session the mode needs. Leaving a mode undoes what entering it set. */
    LaunchedEffect(settings.frontCamera) { controller.setFront(settings.frontCamera) }
    var entered by remember { mutableStateOf<CaptureMode?>(null) }
    LaunchedEffect(mode, settings.slowMotionFps, features.slowMotionFps) {
        val fps = settings.slowMotionFps.takeIf { it in features.slowMotionFps } ?: features.slowMotionFps.firstOrNull() ?: 0
        controller.setMode(mode, if (mode == CaptureMode.SloMo) fps else 0)
        if (entered != mode) {
            entered?.let { modeUi(it).onExit(currentCtx) }
            modeUi(mode).onEnter(currentCtx)
            entered = mode
        }
    }
    val lens = remember(gear, caps, zoom.ratio) { lensInfo(gear, caps, zoom.ratio) }
    val fov = remember(caps, zoom.ratio, settings.aspect) { zoomedFov(fieldOfView(caps), zoom.ratio, settings.aspect.sensorRatio) }
    var pinchZoom by remember { mutableFloatStateOf(1f) }
    var focus by remember { mutableStateOf<FocusMark?>(null) }
    var marks by remember { mutableLongStateOf(0L) }
    var hudVisible by rememberSaveable { mutableStateOf(true) }

    /* Capture: timer, then steady shot, then the shutter. Tapping again before the photo is taken cancels. */
    var phase by remember { mutableStateOf(Phase.Idle) }
    var countdown by remember { mutableIntStateOf(0) }
    var flash by remember { mutableStateOf(false) }
    var saved by rememberSaveable { mutableIntStateOf(0) }
    var job by remember { mutableStateOf<Job?>(null) }
    val flashAlpha by animateFloatAsState(if (flash) 0.9f else 0f, tween(if (flash) 30 else 120))

    fun shoot() {
        if (phase == Phase.Idle && ui.onShutter(ctx)) return
        when (phase) {
            Phase.Saving -> return
            Phase.Idle -> {}
            else -> { job?.cancel(); job = null; phase = Phase.Idle; countdown = 0; return }
        }
        job = scope.launch {
            phase = Phase.Counting
            for (i in settings.timerSeconds downTo 1) { countdown = i; delay(1000) }
            countdown = 0
            if (settings.steadyShot) { phase = Phase.Holding; awaitSteady { orientation.value } }
            phase = Phase.Saving
            flash = true
            launch { delay(100); flash = false }
            controller.capture { result ->
                result.onSuccess { saved++; state.showToast("Saved to $it") }
                    .onFailure { state.showToast(it.message ?: "The photo couldn't be saved") }
                phase = Phase.Idle
            }
        }
    }

    var sheet by remember { mutableStateOf<Sheet?>(null) }

    /* Full screen: the preview is cropped to the chosen ratio and centred; the controls float on translucent strips.
       The layout never moves with the phone; icons, values and the held layer turn instead. */
    val density = LocalDensity.current
    var topStrip by remember { mutableIntStateOf(0) }
    var bottomStrip by remember { mutableIntStateOf(0) }
    BoxWithConstraints(Modifier.fillMaxSize().background(Color.Black)) {
        val aspect = when (mode) {
            CaptureMode.SloMo -> 9f / 16f
            else -> settings.aspect.portraitRatio?.toFloat() ?: caps.previewAspect
        }.coerceIn(0.2f, 5f)
        var w = maxWidth
        var h = w / aspect
        if (h > maxHeight) { h = maxHeight; w = h * aspect }
        val gap = (maxHeight - h) / 2
        val coverTop = (with(density) { topStrip.toDp() } - gap).coerceAtLeast(0.dp)
        val coverBottom = (with(density) { bottomStrip.toDp() } - gap).coerceAtLeast(0.dp)

        Box(
            Modifier
                .align(Alignment.Center)
                .size(w, h)
                .clipToBounds()
                .previewGestures(
                    hold = hold,
                    onTap = { p, u ->
                        if (focus?.locked == true) controller.unlockFocus()
                        controller.focusAt(u.x, u.y, lock = false)
                        focus = FocusMark(p.x, p.y, locked = false, id = ++marks)
                    },
                    onHold = { p, u ->
                        controller.focusAt(u.x, u.y, lock = true)
                        focus = FocusMark(p.x, p.y, locked = true, id = ++marks)
                    },
                    onPinchStart = { pinchZoom = controller.zoom.value.ratio },
                    onPinch = { z ->
                        pinchZoom = (pinchZoom * z).coerceIn(zoom.min, zoom.max)
                        controller.setZoom(pinchZoom)
                    },
                    onSwipeSideways = { next ->
                        val i = modes.indexOf(mode) + if (next) 1 else -1
                        modes.getOrNull(i)?.let { m -> state.updateViewfinder { it.copy(mode = m) } }
                    },
                    onSwipeUpDown = {
                        hudVisible = !hudVisible
                        if (!hudVisible) state.showToast("Swipe up or down to bring the controls back")
                    },
                ),
        ) {
            CameraPreview(controller, Modifier.fillMaxSize())
            PreviewOverlay(settings, analysis, blink, orientation, lens, fov, sunPoints, sunNow, hold, Modifier.fillMaxSize())
            ui.PreviewLayer(ctx, Modifier.fillMaxSize())
            Box(Modifier.fillMaxSize().padding(top = coverTop, bottom = coverBottom)) {
                HeldLayer(hold, angle, Modifier.fillMaxSize()) {
                    if (hudVisible) {
                        if (settings.histogram) HistogramPanel(analysis, Modifier.align(Alignment.TopStart))
                        OverlayChips(settings, orientation, lens, phase == Phase.Holding, hold, Modifier.align(Alignment.TopEnd).padding(8.dp))
                        if (settings.waveform) WaveformPanel(analysis, Modifier.align(Alignment.BottomStart))
                        if (settings.falseColor) FalseColorLegend(Modifier.align(Alignment.BottomEnd).padding(8.dp))
                    }
                    if (focus?.locked == true) {
                        OverlayChip("Focus and exposure locked", Color(0xFFFACC15), Modifier.align(Alignment.TopCenter).padding(top = 8.dp))
                    }
                    if (countdown > 0) {
                        Text(
                            "$countdown", Modifier.align(Alignment.Center),
                            style = MaterialTheme.typography.headlineSmall.copy(fontSize = 96.sp, lineHeight = 100.sp).tabular,
                        )
                    }
                }
            }
            focus?.let { FocusSquare(it) }
            if (flashAlpha > 0f) Box(Modifier.fillMaxSize().background(Color.White.copy(alpha = flashAlpha)))
        }

        AnimatedVisibility(
            hudVisible,
            Modifier.align(Alignment.TopCenter).onSizeChanged { topStrip = it.height },
            enter = fadeIn(), exit = fadeOut(),
        ) {
            ToolRow(
                gridOn = settings.grid != "none" || settings.grid2 != "none",
                level = settings.level, histogram = settings.histogram, peaking = settings.peaking, zebras = settings.zebras,
                timerSeconds = settings.timerSeconds, angle = angle,
                onGrid = { sheet = Sheet.Grid },
                onLevel = { state.updateViewfinder { it.copy(level = !it.level) } },
                onHistogram = { state.updateViewfinder { it.copy(histogram = !it.histogram) } },
                onPeaking = { state.updateViewfinder { it.copy(peaking = !it.peaking) } },
                onZebras = { state.updateViewfinder { it.copy(zebras = !it.zebras) } },
                onTimer = { state.updateViewfinder { it.copy(timerSeconds = when (it.timerSeconds) { 0 -> 2; 2 -> 10; else -> 0 }) } },
                onTools = { sheet = Sheet.Tools },
                onToolkit = { toolkit = true },
                modifier = Modifier
                    .background(Strip)
                    .windowInsetsPadding(WindowInsets.displayCutout.only(WindowInsetsSides.Top + WindowInsetsSides.Horizontal)),
            )
        }

        /* Bottom: lens chips float over the preview; HUD, mode strip and shutter sit on the strip. */
        Column(Modifier.align(Alignment.BottomCenter).onSizeChanged { bottomStrip = it.height }) {
            ui.Controls(ctx)
            ZoomBar(zoom, angle, controller::setZoom)
            Column(Modifier.background(Strip).navigationBarsPadding()) {
                AnimatedVisibility(hudVisible, enter = fadeIn(), exit = fadeOut()) {
                    HudRow(settings.exposure, readout, caps, zoom.ratio, angle) { sheet = Sheet.Value(it) }
                }
                ModeStrip(modes, mode, { m -> state.updateViewfinder { it.copy(mode = m) } })
                CaptureRow(
                    shutter = ui.shutterStyle(ctx), active = phase != Phase.Idle, saved = saved,
                    canFlip = features.hasFront, front = settings.frontCamera, recordingMs = recording?.elapsedMs, angle = angle,
                    onShutter = ::shoot,
                    onFlip = { state.updateViewfinder { it.copy(frontCamera = !it.frontCamera) } },
                    onLast = { state.showToast(if (saved > 0) "$saved saved this session" else "No captures yet") },
                )
            }
        }
    }

    if (toolkit) ToolkitPage(onOpen = { toolkit = false; state.select(it) }, onClose = { toolkit = false })

    when (val s = sheet) {
        null -> {}
        Sheet.Grid -> GridSheet(settings, Hold.isLandscape(hold), { f -> state.updateViewfinder(f) }) { sheet = null }
        Sheet.Tools -> ToolsSheet(settings, { f -> state.updateViewfinder(f) }) { sheet = null }
        is Sheet.Value -> ValueSheet(s.field, settings.exposure, caps, { f -> state.updateViewfinder { it.copy(exposure = f(it.exposure)) } }) { sheet = null }
    }
}

private val Strip = Color.Black.copy(alpha = 0.35f)

/** Returns once the phone has been still for 300 ms. Without a gyro it just waits a moment. */
internal suspend fun awaitSteady(read: () -> DeviceOrientation) {
    if (!read().available) { delay(600); return }
    var still = 0L
    while (still < 300) {
        delay(50)
        still = if (read().motion < 0.02f) still + 50 else 0
    }
}
