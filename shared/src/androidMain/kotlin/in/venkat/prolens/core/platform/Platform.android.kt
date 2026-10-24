package `in`.venkat.prolens.core.platform

import android.Manifest
import android.app.Activity
import android.content.ContextWrapper
import android.view.OrientationEventListener
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.location.LocationManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.State
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import androidx.core.content.ContextCompat
import kotlin.math.PI
import kotlin.math.asin
import kotlin.math.atan2
import kotlin.math.sqrt

/* ---------- Motion sensors ---------- */

@Composable
actual fun rememberDeviceOrientation(enabled: Boolean): State<DeviceOrientation> {
    val context = LocalContext.current
    val state = remember { mutableStateOf(DeviceOrientation()) }
    DisposableEffect(enabled) {
        val sm = context.getSystemService(Context.SENSOR_SERVICE) as SensorManager
        val rotation = sm.getDefaultSensor(Sensor.TYPE_ROTATION_VECTOR)
        val gyro = sm.getDefaultSensor(Sensor.TYPE_GYROSCOPE)
        if (!enabled || rotation == null) {
            state.value = state.value.copy(available = false)
            return@DisposableEffect onDispose { }
        }
        val r = FloatArray(9)
        var motion = 0f
        val listener = object : SensorEventListener {
            override fun onSensorChanged(e: SensorEvent) {
                if (e.sensor.type == Sensor.TYPE_GYROSCOPE) {
                    motion = sqrt(e.values[0] * e.values[0] + e.values[1] * e.values[1] + e.values[2] * e.values[2])
                    return
                }
                SensorManager.getRotationMatrixFromVector(r, e.values)
                // World frame is east-north-up. The back camera looks along device −Z, device Y is screen-up.
                val pitch = deg(asin((-r[8]).coerceIn(-1f, 1f)))
                val roll = deg(atan2(-r[6], r[7]))
                val heading = (deg(atan2(-r[2], -r[5])) + 360f) % 360f
                val prev = state.value
                val a = 0.15f
                state.value = DeviceOrientation(
                    roll = if (prev.available) prev.roll + a * wrap180(roll - prev.roll) else roll,
                    pitch = if (prev.available) prev.pitch + a * (pitch - prev.pitch) else pitch,
                    heading = if (prev.available) (prev.heading + a * wrap180(heading - prev.heading) + 360f) % 360f else heading,
                    available = true,
                    motion = motion,
                )
            }
            override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}
        }
        sm.registerListener(listener, rotation, SensorManager.SENSOR_DELAY_GAME)
        gyro?.let { sm.registerListener(listener, it, SensorManager.SENSOR_DELAY_GAME) }
        onDispose { sm.unregisterListener(listener) }
    }
    return state
}

private fun deg(rad: Float) = (rad * 180.0 / PI).toFloat()
private fun wrap180(d: Float) = ((d + 540f) % 360f) - 180f

@Composable
actual fun rememberHold(): State<Int> {
    val context = LocalContext.current
    val hold = remember { mutableStateOf(0) }
    DisposableEffect(Unit) {
        val listener = object : OrientationEventListener(context, SensorManager.SENSOR_DELAY_UI) {
            override fun onOrientationChanged(orientation: Int) {
                val next = Hold.snap(orientation, hold.value)
                if (next != hold.value) hold.value = next
            }
        }
        if (listener.canDetectOrientation()) listener.enable()
        onDispose { listener.disable() }
    }
    return hold
}

@Composable
actual fun ImmersiveMode() {
    val activity = LocalContext.current.findActivity() ?: return
    DisposableEffect(activity) {
        val controller = WindowCompat.getInsetsController(activity.window, activity.window.decorView)
        controller.systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        controller.hide(WindowInsetsCompat.Type.systemBars())
        onDispose { controller.show(WindowInsetsCompat.Type.systemBars()) }
    }
}

private tailrec fun Context.findActivity(): Activity? = when (this) {
    is Activity -> this
    is ContextWrapper -> baseContext.findActivity()
    else -> null
}

@Composable
actual fun rememberKeyValueStore(): KeyValueStore {
    val context = LocalContext.current.applicationContext
    return remember {
        val prefs = context.getSharedPreferences("prolens", Context.MODE_PRIVATE)
        object : KeyValueStore {
            override fun get(key: String): String? = prefs.getString(key, null)
            override fun put(key: String, value: String) = prefs.edit().putString(key, value).apply()
        }
    }
}

/* ---------- Permissions ---------- */

@Composable
actual fun rememberPermission(permission: AppPermission): PermissionHandle {
    val context = LocalContext.current
    val name = when (permission) {
        AppPermission.Camera -> Manifest.permission.CAMERA
        AppPermission.Location -> Manifest.permission.ACCESS_COARSE_LOCATION
    }
    var granted by remember { mutableStateOf(ContextCompat.checkSelfPermission(context, name) == PackageManager.PERMISSION_GRANTED) }
    var denied by remember { mutableStateOf(false) }
    val launcher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted = it; denied = !it }
    return remember(granted, denied) {
        object : PermissionHandle {
            override val granted: Boolean = granted
            override val denied: Boolean = denied
            override fun request() = launcher.launch(name)
        }
    }
}

/* ---------- Location ---------- */

@Composable
actual fun rememberLocationRequester(): LocationRequester {
    val context = LocalContext.current
    return remember {
        object : LocationRequester {
            @SuppressLint("MissingPermission")
            override fun request(onResult: (GeoPoint?) -> Unit) {
                val ok = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
                if (!ok) { onResult(null); return }
                val lm = context.getSystemService(Context.LOCATION_SERVICE) as LocationManager
                val best = lm.getProviders(true).mapNotNull { runCatching { lm.getLastKnownLocation(it) }.getOrNull() }.maxByOrNull { it.time }
                onResult(best?.let { GeoPoint(it.latitude, it.longitude) })
            }
        }
    }
}
