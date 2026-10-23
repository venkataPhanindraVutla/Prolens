package `in`.venkat.prolens.app

import androidx.lifecycle.ViewModel
import `in`.venkat.prolens.core.model.GearState
import `in`.venkat.prolens.core.model.Location
import `in`.venkat.prolens.core.model.Recipe
import `in`.venkat.prolens.core.model.ViewfinderSettings
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

enum class Tab(val label: String) { Viewfinder("Viewfinder"), Calculators("Calculators"), Light("Light"), Coach("Coach"), Gear("Gear") }

/**
 * App-wide state shared by every screen: the gear profile, the viewfinder setup, the shooting location
 * and the selected tab. Screens read the flows and write through the update functions.
 */
class AppState : ViewModel() {
    private val _tab = MutableStateFlow(Tab.Viewfinder)
    val tab: StateFlow<Tab> = _tab.asStateFlow()

    private val _gear = MutableStateFlow(GearState())
    val gear: StateFlow<GearState> = _gear.asStateFlow()

    private val _viewfinder = MutableStateFlow(ViewfinderSettings())
    val viewfinder: StateFlow<ViewfinderSettings> = _viewfinder.asStateFlow()

    private val _location = MutableStateFlow(Location("London", 51.5074, -0.1278, "Europe/London"))
    val location: StateFlow<Location> = _location.asStateFlow()

    /** A short message shown over the current screen, then cleared. */
    private val _toast = MutableStateFlow<String?>(null)
    val toast: StateFlow<String?> = _toast.asStateFlow()

    fun select(tab: Tab) { _tab.value = tab }
    fun updateGear(f: (GearState) -> GearState) = _gear.update(f)
    fun updateViewfinder(f: (ViewfinderSettings) -> ViewfinderSettings) = _viewfinder.update(f)
    fun setLocation(location: Location) { _location.value = location }
    fun showToast(message: String) { _toast.value = message }
    fun clearToast() { _toast.value = null }

    /** Shutter priority with Auto ISO, the way most pros set up a body, then switch to the viewfinder. */
    fun useRecipe(r: Recipe) {
        val a = r.apply
        _viewfinder.update {
            it.copy(
                grid = a.grid, aspect = a.aspect, level = a.level,
                peaking = a.peaking || it.peaking, zebras = a.zebras || it.zebras,
                exposure = it.exposure.copy(isoAuto = true, shutterAuto = false, shutter = a.shutter, ev = a.ev),
            )
        }
        showToast("${r.name} applied")
        select(Tab.Viewfinder)
    }
}
