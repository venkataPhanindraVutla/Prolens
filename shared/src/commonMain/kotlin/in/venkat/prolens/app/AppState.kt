package `in`.venkat.prolens.app

import androidx.lifecycle.ViewModel
import `in`.venkat.prolens.core.model.CaptureMode
import `in`.venkat.prolens.core.model.GearState
import `in`.venkat.prolens.core.model.Location
import `in`.venkat.prolens.core.model.Recipe
import `in`.venkat.prolens.core.model.ViewfinderSettings
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.serialization.KSerializer
import kotlinx.serialization.json.Json
import `in`.venkat.prolens.core.platform.KeyValueStore
import `in`.venkat.prolens.core.platform.CameraCapabilities
import `in`.venkat.prolens.core.platform.CameraFeatures

enum class Tab(val label: String) { Viewfinder("Viewfinder"), Calculators("Calculators"), Light("Light"), Coach("Coach"), Gear("Gear") }

/**
 * App-wide state shared by every screen: the gear profile, the viewfinder setup, the shooting location
 * and the selected tab. Screens read the flows and write through the update functions.
 * Gear, viewfinder and location are saved to [store] on every change and restored on launch.
 */
class AppState(val store: KeyValueStore? = null) : ViewModel() {
    private val _tab = MutableStateFlow(Tab.Viewfinder)
    val tab: StateFlow<Tab> = _tab.asStateFlow()

    private val _gear = MutableStateFlow(load("gear", GearState.serializer()) ?: GearState())
    val gear: StateFlow<GearState> = _gear.asStateFlow()

    private val _viewfinder = MutableStateFlow(load("viewfinder", ViewfinderSettings.serializer()) ?: ViewfinderSettings())
    val viewfinder: StateFlow<ViewfinderSettings> = _viewfinder.asStateFlow()

    private val _location = MutableStateFlow(load("location", Location.serializer()) ?: Location("London", 51.5074, -0.1278, "Europe/London"))
    val location: StateFlow<Location> = _location.asStateFlow()

    /** What the phone's cameras can do, as the viewfinder found it. Empty until the camera has opened once. */
    private val _phone = MutableStateFlow<Pair<CameraFeatures, CameraCapabilities>?>(null)
    val phone: StateFlow<Pair<CameraFeatures, CameraCapabilities>?> = _phone.asStateFlow()
    fun reportPhone(features: CameraFeatures, capabilities: CameraCapabilities) {
        if (features.lenses.isNotEmpty()) _phone.value = features to capabilities
    }

    /** A short message shown over the current screen, then cleared. */
    private val _toast = MutableStateFlow<String?>(null)
    val toast: StateFlow<String?> = _toast.asStateFlow()

    fun select(tab: Tab) { _tab.value = tab }
    fun updateGear(f: (GearState) -> GearState) { _gear.update(f); save("gear", GearState.serializer(), _gear.value) }
    fun updateViewfinder(f: (ViewfinderSettings) -> ViewfinderSettings) {
        _viewfinder.update(f)
        save("viewfinder", ViewfinderSettings.serializer(), _viewfinder.value)
    }
    fun setLocation(location: Location) { _location.value = location; save("location", Location.serializer(), location) }

    private fun <T> load(key: String, serializer: KSerializer<T>): T? =
        store?.get(key)?.let { runCatching { json.decodeFromString(serializer, it) }.getOrNull() }

    private fun <T> save(key: String, serializer: KSerializer<T>, value: T) {
        store?.put(key, json.encodeToString(serializer, value))
    }
    fun showToast(message: String) { _toast.value = message }
    fun clearToast() { _toast.value = null }

    companion object {
        /** Unknown keys are ignored so saved settings survive app updates that add or drop fields. */
        val json = Json { ignoreUnknownKeys = true }
    }

    /** Shutter priority with Auto ISO, the way most pros set up a body, then switch to the viewfinder. */
    fun useRecipe(r: Recipe) {
        val a = r.apply
        updateViewfinder {
            it.copy(
                mode = CaptureMode.Photo,
                grid = a.grid, aspect = a.aspect, level = a.level,
                peaking = a.peaking || it.peaking, zebras = a.zebras || it.zebras,
                exposure = it.exposure.copy(isoAuto = true, shutterAuto = false, shutter = a.shutter, ev = a.ev),
            )
        }
        showToast("${r.name} applied")
        select(Tab.Viewfinder)
    }
}
