package `in`.venkat.prolens.features.viewfinder.modes.templates

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import `in`.venkat.prolens.app.AppState
import `in`.venkat.prolens.core.model.ViewfinderSettings
import `in`.venkat.prolens.core.platform.KeyValueStore
import kotlinx.serialization.Serializable
import kotlinx.serialization.builtins.ListSerializer

/** A saved setup: every viewfinder setting plus the zoom ratio it was taken at. */
@Serializable
data class Preset(val id: String, val name: String, val settings: ViewfinderSettings, val zoom: Float)

/**
 * The saved presets, kept as JSON under [KEY] in [store]. With no store they live in memory only.
 * [items] is observable, so lists redraw when it changes.
 */
class PresetRepo(private val store: KeyValueStore?) {
    var items: List<Preset> by mutableStateOf(load())
        private set

    private fun load(): List<Preset> =
        store?.get(KEY)?.let { runCatching { AppState.json.decodeFromString(SERIALIZER, it) }.getOrNull() } ?: emptyList()

    private fun commit(next: List<Preset>) {
        items = next
        store?.put(KEY, AppState.json.encodeToString(SERIALIZER, next))
    }

    fun save(name: String, settings: ViewfinderSettings, zoom: Float): Preset {
        val nextId = "p" + ((items.maxOfOrNull { it.id.removePrefix("p").toIntOrNull() ?: 0 } ?: 0) + 1)
        val label = name.trim().ifEmpty { "Preset ${items.size + 1}" }
        val preset = Preset(nextId, label, settings, zoom)
        commit(items + preset)
        return preset
    }

    fun delete(id: String) = commit(items.filterNot { it.id == id })

    companion object {
        const val KEY = "presets"
        val SERIALIZER = ListSerializer(Preset.serializer())
    }
}
