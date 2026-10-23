package `in`.venkat.prolens.app

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.saveable.rememberSaveableStateHolder
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import `in`.venkat.prolens.core.designsystem.Pro
import `in`.venkat.prolens.core.designsystem.ProIcons
import `in`.venkat.prolens.features.calculators.CalculatorsScreen
import `in`.venkat.prolens.features.coach.CoachScreen
import `in`.venkat.prolens.features.gear.GearScreen
import `in`.venkat.prolens.features.light.LightScreen
import `in`.venkat.prolens.features.viewfinder.ViewfinderScreen
import kotlinx.coroutines.delay

@Composable
fun AppShell(state: AppState = viewModel { AppState() }) {
    val tab by state.tab.collectAsStateWithLifecycle()
    val toast by state.toast.collectAsStateWithLifecycle()
    val saveable = rememberSaveableStateHolder()

    Column(Modifier.fillMaxSize().background(Pro.colors.background)) {
        Box(Modifier.weight(1f).fillMaxWidth()) {
            saveable.SaveableStateProvider(tab.name) {
                when (tab) {
                    Tab.Viewfinder -> ViewfinderScreen(state)
                    Tab.Calculators -> CalculatorsScreen(state)
                    Tab.Light -> LightScreen(state)
                    Tab.Coach -> CoachScreen(state)
                    Tab.Gear -> GearScreen(state)
                }
            }
            toast?.let { msg ->
                LaunchedEffect(msg) { delay(1800); state.clearToast() }
                Text(
                    msg,
                    modifier = Modifier
                        .align(if (tab == Tab.Viewfinder) Alignment.TopCenter else Alignment.BottomCenter)
                        .padding(top = 96.dp, bottom = 16.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .background(Pro.colors.card)
                        .border(1.dp, Pro.colors.border, RoundedCornerShape(8.dp))
                        .padding(horizontal = 14.dp, vertical = 8.dp),
                    style = MaterialTheme.typography.bodyMedium,
                )
            }
        }
        // The viewfinder is full screen; it has its own button for the other screens.
        if (tab != Tab.Viewfinder) TabBar(tab, state::select)
    }
}

@Composable
private fun TabBar(current: Tab, onSelect: (Tab) -> Unit) {
    val c = Pro.colors
    Column(Modifier.fillMaxWidth().background(c.background)) {
        Box(Modifier.fillMaxWidth().height(1.dp).background(c.border))
        Row(Modifier.fillMaxWidth().navigationBarsPadding().padding(horizontal = 4.dp, vertical = 6.dp)) {
            Tab.entries.forEach { t ->
                val on = t == current
                Column(
                    Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(8.dp))
                        .clickable(role = Role.Tab) { onSelect(t) }
                        .padding(vertical = 6.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(2.dp),
                ) {
                    Icon(t.icon, contentDescription = null, tint = if (on) c.foreground else c.mutedForeground, modifier = Modifier.size(20.dp))
                    Text(t.label, style = MaterialTheme.typography.labelSmall.copy(color = if (on) c.foreground else c.mutedForeground))
                }
            }
        }
    }
}

private val Tab.icon: ImageVector
    get() = when (this) {
        Tab.Viewfinder -> ProIcons.Camera
        Tab.Calculators -> ProIcons.Calculator
        Tab.Light -> ProIcons.Sun
        Tab.Coach -> ProIcons.Book
        Tab.Gear -> ProIcons.Aperture
    }
