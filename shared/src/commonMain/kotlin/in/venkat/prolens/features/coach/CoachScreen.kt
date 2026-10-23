package `in`.venkat.prolens.features.coach

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import `in`.venkat.prolens.app.AppState
import `in`.venkat.prolens.app.Tab
import `in`.venkat.prolens.core.designsystem.ButtonVariant
import `in`.venkat.prolens.core.designsystem.Hairline
import `in`.venkat.prolens.core.designsystem.KvList
import `in`.venkat.prolens.core.designsystem.Pro
import `in`.venkat.prolens.core.designsystem.ProButton
import `in`.venkat.prolens.core.designsystem.ProCard
import `in`.venkat.prolens.core.designsystem.ProIcons
import `in`.venkat.prolens.core.designsystem.ProListRow
import `in`.venkat.prolens.core.designsystem.ProScreen
import `in`.venkat.prolens.core.designsystem.ProSegmented
import `in`.venkat.prolens.core.grids.Grids
import `in`.venkat.prolens.core.model.Recipe
import `in`.venkat.prolens.core.model.Recipes
import `in`.venkat.prolens.core.photomath.PhotoFormat

private enum class CoachTab(val label: String) { Recipes("Recipes"), Angles("Angles"), Lighting("Lighting"), Composition("Composition") }

@Composable
fun CoachScreen(state: AppState) {
    var tabIndex by rememberSaveable { mutableStateOf(0) }
    var recipeId by rememberSaveable { mutableStateOf<String?>(null) }
    val tab = CoachTab.entries[tabIndex]

    ProScreen("Coach") {
        ProSegmented(
            options = CoachTab.entries.map { it to it.label },
            selected = tab,
            onSelect = { tabIndex = it.ordinal; recipeId = null },
        )
        when (tab) {
            CoachTab.Recipes -> {
                val recipe = Recipes.all.firstOrNull { it.id == recipeId }
                if (recipe == null) RecipeList { recipeId = it.id }
                else RecipeDetail(recipe, onBack = { recipeId = null }, onUse = { state.useRecipe(recipe) })
            }
            CoachTab.Angles -> AnglesTab()
            CoachTab.Lighting -> LightingTab()
            CoachTab.Composition -> CompositionTab(state)
        }
    }
}

@Composable
private fun RecipeList(onOpen: (Recipe) -> Unit) {
    ProCard {
        Recipes.all.forEachIndexed { i, r ->
            ProListRow(
                title = r.name,
                subtitle = "${r.focal} · ${r.aperture} · ${r.shutter}",
                onClick = { onOpen(r) },
                trailing = { Icon(ProIcons.ChevronRight, null, tint = Pro.colors.mutedForeground, modifier = Modifier.size(16.dp)) },
            )
            if (i < Recipes.all.lastIndex) Hairline()
        }
    }
}

@Composable
private fun RecipeDetail(r: Recipe, onBack: () -> Unit, onUse: () -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Row { ProButton("Recipes", onBack, variant = ButtonVariant.Ghost, icon = ProIcons.ChevronLeft, small = true) }
        ProCard(title = r.name) {
            KvList(
                listOf(
                    "Focal length" to r.focal, "Aperture" to r.aperture, "Shutter" to r.shutter,
                    "ISO" to r.iso, "Focus" to r.focus, "Grid" to r.grid,
                ),
            )
        }
        ProCard(title = "Tips") {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                r.tips.forEach { tip ->
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        Box(Modifier.padding(top = 8.dp).size(4.dp).clip(CircleShape).background(Pro.colors.mutedForeground))
                        Text(tip, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f))
                    }
                }
            }
        }
        ProButton("Use in viewfinder", onUse, modifier = Modifier.fillMaxWidth())
        Text(
            "Applies as shutter priority with Auto ISO, holding ${PhotoFormat.shutter(r.apply.shutter)} while ISO floats.",
            style = MaterialTheme.typography.bodySmall,
        )
    }
}

@Composable
private fun AnglesTab() {
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        ProCard(title = "Camera angles", description = "Where the camera sits changes how the subject feels.") {
            ANGLES.forEachIndexed { i, a ->
                FigureItem(figure = { AngleDiagram(a.kind) }, name = a.name) {
                    Text(a.effect, style = MaterialTheme.typography.bodySmall)
                    LabelledText("Use it for: ", a.use)
                }
                if (i < ANGLES.lastIndex) Hairline()
            }
        }
        ProCard(title = "Shot sizes", description = "How much of the person is in the frame.") {
            Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) { ShotSizesDiagram() }
            NamedRows(SHOT_SIZES.map { it.name to "${it.description} ${it.use}" })
        }
        ProCard(title = "Positioning rules") { NamedRows(POSITIONING) }
    }
}

@Composable
private fun LightingTab() {
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        ProCard(title = "Light direction", description = "Where the light comes from, seen from above. The camera is at the bottom.") {
            DIRECTIONS.forEachIndexed { i, d ->
                FigureItem(figure = { LightDirectionDiagram(d.kind) }, name = d.name) {
                    Text(d.effect, style = MaterialTheme.typography.bodySmall)
                }
                if (i < DIRECTIONS.lastIndex) Hairline()
            }
        }
        ProCard(title = "Portrait patterns", description = "Named by the shadow the nose throws. The dot is the light.") {
            PATTERNS.forEachIndexed { i, p ->
                FigureItem(figure = { FaceDiagram(p.face) }, name = p.name) {
                    LabelledText("Light: ", p.where)
                    Text(p.look, style = MaterialTheme.typography.bodySmall)
                }
                if (i < PATTERNS.lastIndex) Hairline()
            }
        }
        ProCard(title = "Hard and soft light") { NamedRows(HARD_SOFT) }
        ProCard(title = "Flash basics") { NamedRows(FLASH) }
    }
}

@Composable
private fun CompositionTab(state: AppState) {
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        ProCard(title = "Composition principles", description = "Guides, not laws. Try one at a time.") {
            COMPOSITION.forEachIndexed { i, p ->
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(p.name, style = MaterialTheme.typography.titleSmall)
                    Text(p.description, style = MaterialTheme.typography.bodySmall)
                    LabelledText("Try this: ", p.tryThis)
                }
                if (i < COMPOSITION.lastIndex) Hairline()
            }
        }
        ProCard(title = "Which grid should I use?", description = "Pick by subject. The viewfinder switches to it.") {
            GRID_PICKS.forEachIndexed { i, (subject, id) ->
                val name = Grids.spec(id)?.name ?: id
                ProListRow(
                    title = subject,
                    subtitle = name,
                    contentPadding = androidx.compose.foundation.layout.PaddingValues(vertical = 10.dp),
                    onClick = {
                        state.updateViewfinder { it.copy(grid = id) }
                        state.showToast("$name grid on")
                        state.select(Tab.Viewfinder)
                    },
                    trailing = { Icon(ProIcons.ChevronRight, null, tint = Pro.colors.mutedForeground, modifier = Modifier.size(16.dp)) },
                )
                if (i < GRID_PICKS.lastIndex) Hairline()
            }
        }
    }
}

/** A diagram on the left, a name and lines of text on the right. */
@Composable
private fun FigureItem(figure: @Composable () -> Unit, name: String, body: @Composable () -> Unit) {
    Row(horizontalArrangement = Arrangement.spacedBy(14.dp)) {
        Box { figure() }
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(name, style = MaterialTheme.typography.titleSmall)
            body()
        }
    }
}

@Composable
private fun LabelledText(label: String, text: String) {
    val c = Pro.colors
    Text(
        buildAnnotatedString {
            withStyle(SpanStyle(fontWeight = FontWeight.Medium, color = c.foreground)) { append(label) }
            append(text)
        },
        style = MaterialTheme.typography.bodySmall,
    )
}

/** Name and text rows separated by hairlines. */
@Composable
private fun NamedRows(rows: List<Pair<String, String>>) {
    Column {
        rows.forEachIndexed { i, (n, t) ->
            Column(Modifier.padding(vertical = 8.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(n, style = MaterialTheme.typography.titleSmall)
                Text(t, style = MaterialTheme.typography.bodySmall)
            }
            if (i < rows.lastIndex) Hairline()
        }
    }
}
