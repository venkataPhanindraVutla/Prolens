package `in`.venkat.prolens.features.viewfinder.modes.slomo

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.collectAsState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import `in`.venkat.prolens.core.designsystem.Pro
import `in`.venkat.prolens.core.designsystem.tabular
import `in`.venkat.prolens.features.viewfinder.modes.ModeContext
import `in`.venkat.prolens.features.viewfinder.modes.ModeUi
import `in`.venkat.prolens.features.viewfinder.modes.ShutterStyle
import `in`.venkat.prolens.features.viewfinder.turned

/** High-speed video: pick a frame rate, record, save to Movies/Prolens. */
object SloMoMode : ModeUi() {
    private val pill = Color(0x99090909)
    private val pillEdge = Color(0x1FFFFFFF)

    @Composable
    override fun PreviewLayer(ctx: ModeContext, modifier: Modifier) {
        val rec by ctx.controller.recording.collectAsState()
        val r = rec
        Box(modifier) {
            if (r != null) {
                Box(Modifier.fillMaxSize().border(2.dp, Pro.colors.destructive))
                Row(
                    Modifier.align(Alignment.TopCenter).padding(top = 12.dp).turned(ctx.angle)
                        .clip(RoundedCornerShape(percent = 50)).background(pill)
                        .border(BorderStroke(1.dp, pillEdge), RoundedCornerShape(percent = 50))
                        .padding(horizontal = 10.dp, vertical = 4.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    Box(Modifier.size(7.dp).clip(CircleShape).background(Pro.colors.destructive))
                    Text("REC ${fpsLabel(r.fps)}", color = Color(0xFFFAFAFA), style = MaterialTheme.typography.labelMedium.tabular)
                }
            } else {
                Text(
                    "Slo-mo records without sound",
                    Modifier.align(Alignment.TopCenter).padding(top = 12.dp).turned(ctx.angle)
                        .clip(RoundedCornerShape(percent = 50)).background(pill)
                        .border(BorderStroke(1.dp, pillEdge), RoundedCornerShape(percent = 50))
                        .padding(horizontal = 10.dp, vertical = 4.dp),
                    color = Color(0xFFFAFAFA),
                    style = MaterialTheme.typography.labelMedium,
                )
            }
        }
    }

    @Composable
    override fun Controls(ctx: ModeContext) {
        val rec by ctx.controller.recording.collectAsState()
        val busy = rec != null
        val rates = ctx.features.slowMotionFps
        val chosen = selectedFps(ctx.settings.slowMotionFps, rates) ?: return
        Column(Modifier.padding(bottom = 8.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.alpha(if (busy) 0.5f else 1f)) {
                rates.forEach { n ->
                    val on = n == chosen
                    val shape = RoundedCornerShape(percent = 50)
                    Box(
                        Modifier.clip(shape)
                            .background(if (on) Pro.colors.primary else pill)
                            .border(BorderStroke(1.dp, if (on) Pro.colors.primary else pillEdge), shape)
                            .clickable(enabled = !busy) { ctx.state.updateViewfinder { it.copy(slowMotionFps = n) } }
                            .padding(horizontal = 12.dp, vertical = 6.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            fpsLabel(n),
                            Modifier.turned(ctx.angle),
                            color = if (on) Pro.colors.primaryForeground else Color(0xFFFAFAFA),
                            style = MaterialTheme.typography.labelMedium.tabular,
                        )
                    }
                }
            }
            Text(
                playbackLine(chosen),
                Modifier.turned(ctx.angle),
                color = Pro.colors.mutedForeground,
                style = MaterialTheme.typography.labelSmall,
            )
        }
    }

    override fun shutterStyle(ctx: ModeContext): ShutterStyle =
        if (ctx.controller.recording.value != null) ShutterStyle.Recording else ShutterStyle.Record

    override fun onShutter(ctx: ModeContext): Boolean {
        if (ctx.controller.recording.value != null) {
            ctx.controller.stopRecording()
        } else {
            ctx.controller.startRecording { result ->
                result.fold(
                    onSuccess = { ctx.toast("Saved to $it") },
                    onFailure = { ctx.toast(it.message ?: "Could not save the video") },
                )
            }
        }
        return true
    }

    override fun onExit(ctx: ModeContext) {
        if (ctx.controller.recording.value != null) ctx.controller.stopRecording()
    }
}
