package `in`.venkat.prolens.features.viewfinder.modes.templates

import `in`.venkat.prolens.app.AppState
import `in`.venkat.prolens.core.model.AspectRatio
import `in`.venkat.prolens.core.model.ViewfinderSettings
import `in`.venkat.prolens.core.platform.KeyValueStore
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

private class FakeStore : KeyValueStore {
    val map = mutableMapOf<String, String>()
    override fun get(key: String) = map[key]
    override fun put(key: String, value: String) { map[key] = value }
}

class TemplatesTest {
    private val aspects = listOf(0.5f, 0.5625f, 0.75f, 1f, 1.333f, 1.5f, 1.778f, 2.39f)

    @Test fun templateIdsAreUnique() {
        val ids = ShotTemplates.all.map { it.id }
        assertEquals(ids.size, ids.toSet().size)
        assertEquals(12, ids.size)
    }

    @Test fun overlayPointsStayInsideTheFrame() {
        ShotTemplates.all.forEach { t ->
            aspects.forEach { a ->
                val shapes = t.overlay(a)
                assertTrue(shapes.isNotEmpty(), "${t.id} empty")
                shapes.forEach { s ->
                    s.extremes().forEach { (x, y) ->
                        assertTrue(x in 0f..1f && y in 0f..1f, "${t.id} at aspect $a has ($x, $y) outside the frame")
                    }
                }
            }
        }
    }

    @Test fun selfieSwitchesToFrontCameraAndSkipsZoom() {
        val t = assertNotNull(ShotTemplates.byId("selfie"))
        val s = t.apply(ViewfinderSettings())
        assertTrue(s.frontCamera)
        assertEquals("selfie", s.templateId)
        assertEquals(null, t.zoomFor(s))
        val h = assertNotNull(ShotTemplates.byId("headshot"))
        assertEquals(AspectRatio.FourFive, h.apply(ViewfinderSettings()).aspect)
        assertEquals(2f, h.zoomFor(h.apply(ViewfinderSettings())))
    }

    @Test fun presetJsonRoundTrips() {
        val p = Preset("p1", "Evening", ViewfinderSettings(grid = "phi", aspect = AspectRatio.Square, templateId = "food"), 2.5f)
        val text = AppState.json.encodeToString(PresetRepo.SERIALIZER, listOf(p))
        assertEquals(listOf(p), AppState.json.decodeFromString(PresetRepo.SERIALIZER, text))
    }

    @Test fun repoSavesLoadsAndDeletes() {
        val store = FakeStore()
        val repo = PresetRepo(store)
        val a = repo.save("  Street  ", ViewfinderSettings(grid = "dynamic"), 1f)
        val b = repo.save("", ViewfinderSettings(), 3f)
        assertEquals("Street", a.name)
        assertEquals("Preset 2", b.name)
        assertTrue(a.id != b.id)
        val reloaded = PresetRepo(store)
        assertEquals(listOf(a, b), reloaded.items)
        reloaded.delete(a.id)
        assertEquals(listOf(b), PresetRepo(store).items)
        val c = reloaded.save("Third", ViewfinderSettings(), 1f)
        assertTrue(c.id != b.id)
    }

    @Test fun repoWorksWithoutStoreAndWithBadJson() {
        val repo = PresetRepo(null)
        repo.save("Mem", ViewfinderSettings(), 1f)
        assertEquals(1, repo.items.size)
        val bad = FakeStore().apply { put(PresetRepo.KEY, "not json") }
        assertEquals(emptyList(), PresetRepo(bad).items)
    }
}
