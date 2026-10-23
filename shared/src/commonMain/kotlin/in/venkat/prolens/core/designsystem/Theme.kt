package `in`.venkat.prolens.core.designsystem

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.jetbrains.compose.resources.Font
import prolens.shared.generated.resources.Res
import prolens.shared.generated.resources.geist_bold
import prolens.shared.generated.resources.geist_medium
import prolens.shared.generated.resources.geist_regular
import prolens.shared.generated.resources.geist_semibold

/** shadcn/ui zinc tokens, dark. A camera app lives in the dark, so this is the only scheme for now. */
@Immutable
data class ProColors(
    val background: Color = Color(0xFF09090B),
    val foreground: Color = Color(0xFFFAFAFA),
    val card: Color = Color(0xFF18181B),
    val muted: Color = Color(0xFF27272A),
    val mutedForeground: Color = Color(0xFFA1A1AA),
    val border: Color = Color(0xFF27272A),
    val input: Color = Color(0xFF3F3F46),
    val primary: Color = Color(0xFFFAFAFA),
    val primaryForeground: Color = Color(0xFF18181B),
    val ring: Color = Color(0xFF52525B),
    val success: Color = Color(0xFF22C55E),
    val warning: Color = Color(0xFFF59E0B),
    val destructive: Color = Color(0xFFEF4444),
)

@Immutable
data class ProShapes(
    val radius: androidx.compose.ui.unit.Dp = 8.dp,
    val radiusLg: androidx.compose.ui.unit.Dp = 12.dp,
)

val LocalProColors = staticCompositionLocalOf { ProColors() }
val LocalProShapes = staticCompositionLocalOf { ProShapes() }

object Pro {
    val colors: ProColors @Composable get() = LocalProColors.current
    val shapes: ProShapes @Composable get() = LocalProShapes.current
}

@Composable
fun geistFamily(): FontFamily = FontFamily(
    Font(Res.font.geist_regular, FontWeight.Normal),
    Font(Res.font.geist_medium, FontWeight.Medium),
    Font(Res.font.geist_semibold, FontWeight.SemiBold),
    Font(Res.font.geist_bold, FontWeight.Bold),
)

@Composable
fun ProlensTheme(content: @Composable () -> Unit) {
    val c = ProColors()
    val geist = geistFamily()
    val base = TextStyle(fontFamily = geist, color = c.foreground)
    val typography = Typography(
        headlineSmall = base.copy(fontSize = 22.sp, lineHeight = 28.sp, fontWeight = FontWeight.SemiBold, letterSpacing = (-0.4).sp),
        titleLarge = base.copy(fontSize = 20.sp, lineHeight = 26.sp, fontWeight = FontWeight.SemiBold, letterSpacing = (-0.2).sp),
        titleMedium = base.copy(fontSize = 15.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold),
        titleSmall = base.copy(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.Medium),
        bodyLarge = base.copy(fontSize = 15.sp, lineHeight = 22.sp),
        bodyMedium = base.copy(fontSize = 14.sp, lineHeight = 20.sp),
        bodySmall = base.copy(fontSize = 13.sp, lineHeight = 18.sp, color = c.mutedForeground),
        labelLarge = base.copy(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.Medium),
        labelMedium = base.copy(fontSize = 13.sp, lineHeight = 18.sp, fontWeight = FontWeight.Medium),
        labelSmall = base.copy(fontSize = 11.sp, lineHeight = 14.sp, color = c.mutedForeground),
    )
    val scheme = darkColorScheme(
        primary = c.primary, onPrimary = c.primaryForeground,
        secondary = c.muted, onSecondary = c.foreground,
        background = c.background, onBackground = c.foreground,
        surface = c.background, onSurface = c.foreground,
        surfaceVariant = c.muted, onSurfaceVariant = c.mutedForeground,
        surfaceContainer = c.card, surfaceContainerHigh = c.card, surfaceContainerHighest = c.muted,
        outline = c.input, outlineVariant = c.border, error = c.destructive,
    )
    androidx.compose.runtime.CompositionLocalProvider(LocalProColors provides c, LocalProShapes provides ProShapes()) {
        MaterialTheme(colorScheme = scheme, typography = typography, content = content)
    }
}
