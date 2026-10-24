package `in`.venkat.prolens.features.viewfinder

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
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import `in`.venkat.prolens.app.Tab
import `in`.venkat.prolens.core.designsystem.ButtonVariant
import `in`.venkat.prolens.core.designsystem.Pro
import `in`.venkat.prolens.core.designsystem.ProButton
import `in`.venkat.prolens.core.designsystem.ProIcons

private class ToolCard(val tab: Tab, val icon: ImageVector, val blurb: String)

private val Cards = listOf(
    ToolCard(Tab.Calculators, ProIcons.Calculator, "Depth of field, blur, exposure, ND, astro, field of view and flash."),
    ToolCard(Tab.Light, ProIcons.Sun, "Golden and blue hour, the sun's path and direction, and the moon."),
    ToolCard(Tab.Coach, ProIcons.Book, "Genre recipes, camera angles, lighting patterns and composition."),
    ToolCard(Tab.Gear, ProIcons.Aperture, "Your bodies and lenses, and what this phone's cameras can do."),
)

/** The rest of Prolens, one tap from the viewfinder. */
@Composable
internal fun ToolkitPage(onOpen: (Tab) -> Unit, onClose: () -> Unit) {
    val c = Pro.colors
    Column(
        Modifier.fillMaxSize().background(c.background).statusBarsPadding().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Text("Toolkit", style = MaterialTheme.typography.headlineSmall, modifier = Modifier.weight(1f))
            ProButton("Back to camera", onClose, variant = ButtonVariant.Ghost, icon = ProIcons.Camera, small = true)
        }
        Cards.chunked(2).forEach { row ->
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                row.forEach { card ->
                    val shape = RoundedCornerShape(Pro.shapes.radiusLg)
                    Column(
                        Modifier
                            .weight(1f)
                            .height(168.dp)
                            .clip(shape)
                            .background(c.card)
                            .border(1.dp, c.border, shape)
                            .clickable(role = Role.Button) { onOpen(card.tab) }
                            .padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Box(Modifier.size(36.dp).clip(RoundedCornerShape(Pro.shapes.radius)).background(c.muted), contentAlignment = Alignment.Center) {
                            Icon(card.icon, null, tint = c.foreground, modifier = Modifier.size(20.dp))
                        }
                        Text(card.tab.label, style = MaterialTheme.typography.titleMedium)
                        Text(card.blurb, style = MaterialTheme.typography.bodySmall)
                    }
                }
            }
        }
    }
}
