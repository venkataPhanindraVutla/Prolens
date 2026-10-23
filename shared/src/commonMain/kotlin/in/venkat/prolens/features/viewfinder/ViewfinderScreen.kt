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
import androidx.compose.foundation.layout.statusBarsPadding
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

    val lens = remember(gear, caps) { lensInfo(gear, caps) }
    val fov = remember(caps) { fieldOfView(caps) }

    /* Capture: timer, then steady shot, then the shutter. Tapping again before the photo is taken cancels. */
    var phase by remember { mutableStateOf(Phase.Idle) }
    var countdown by remember { mutableIntStateOf(0) }
    var flash by remember { mutableStateOf(false) }
    var saved by rememberSaveable { mutableIntStateOf(0) }
    var job by remember { mutableStateOf<Job?>(null) }
    val flashAlpha by animateFloatAsState(if (flash) 0.9f else 0f, tween(if (flash) 30 else 120))

    fun shoot() {
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

    Column(Modifier.fillMaxSize().statusBarsPadding()) {
        ToolRow(
            gridOn = settings.grid != "none" || settings.grid2 != "none",
            level = settings.level, histogram = settings.histogram, peaking = settings.peaking, zebras = settings.zebras,
            onGrid = { sheet = Sheet.Grid },
            onLevel = { state.updateViewfinder { it.copy(level = !it.level) } },
            onHistogram = { state.updateViewfinder { it.copy(histogram = !it.histogram) } },
            onPeaking = { state.updateViewfinder { it.copy(peaking = !it.peaking) } },
            onZebras = { state.updateViewfinder { it.copy(zebras = !it.zebras) } },
            onTools = { sheet = Sheet.Tools },
        )

        BoxWithConstraints(Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) {
            val aspect = caps.previewAspect.coerceIn(0.2f, 5f)
            var w = maxWidth
            var h = w / aspect
            if (h > maxHeight) { h = maxHeight; w = h * aspect }
            Box(Modifier.size(w, h).clipToBounds()) {
                CameraPreview(controller, Modifier.fillMaxSize())
                PreviewOverlay(settings, analysis, blink, orientation, lens, fov, sunPoints, sunNow, Modifier.fillMaxSize())
                OverlayChips(settings, orientation, lens, phase == Phase.Holding, Modifier.align(Alignment.TopEnd).padding(8.dp))
                if (settings.falseColor) FalseColorLegend(Modifier.align(Alignment.BottomEnd).padding(8.dp))
                if (countdown > 0) {
                    Text(
                        "$countdown", Modifier.align(Alignment.Center),
                        style = MaterialTheme.typography.headlineSmall.copy(fontSize = 96.sp, lineHeight = 100.sp).tabular,
                    )
                }
                if (flashAlpha > 0f) Box(Modifier.fillMaxSize().background(Color.White.copy(alpha = flashAlpha)))
            }
        }

        HudRow(settings.exposure, readout, caps) { sheet = Sheet.Value(it) }
        CaptureRow(
            timerSeconds = settings.timerSeconds, active = phase != Phase.Idle, saved = saved,
            onShutter = ::shoot,
            onTimer = { state.updateViewfinder { it.copy(timerSeconds = when (it.timerSeconds) { 0 -> 2; 2 -> 10; else -> 0 }) } },
            onLast = { state.showToast(if (saved > 0) "$saved saved this session" else "No captures yet") },
        )
    }

    when (val s = sheet) {
        null -> {}
        Sheet.Grid -> GridSheet(settings, { f -> state.updateViewfinder(f) }) { sheet = null }
        Sheet.Tools -> ToolsSheet(settings, { f -> state.updateViewfinder(f) }) { sheet = null }
        is Sheet.Value -> ValueSheet(s.field, settings.exposure, caps, { f -> state.updateViewfinder { it.copy(exposure = f(it.exposure)) } }) { sheet = null }
    }
}

/** Returns once the phone has been still for 300 ms. Without a gyro it just waits a moment. */
internal suspend fun awaitSteady(read: () -> DeviceOrientation) {
    if (!read().available) { delay(600); return }
    var still = 0L
    while (still < 300) {
        delay(50)
        still = if (read().motion < 0.02f) still + 50 else 0
    }
}
