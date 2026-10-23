package `in`.venkat.prolens.features.coach

/* Copy for the Coach reference tabs, ported from the prototype. */

enum class AngleKind { Eye, High, Low, Overhead, Worm, Dutch, OverShoulder }

data class CameraAngle(val kind: AngleKind, val name: String, val effect: String, val use: String)

val ANGLES = listOf(
    CameraAngle(AngleKind.Eye, "Eye level", "Neutral and honest. The viewer meets the subject as an equal.", "Portraits, documentary, kids and pets (at their eye level)."),
    CameraAngle(AngleKind.High, "High angle", "Subject looks smaller or more vulnerable. It also slims faces.", "Showing context, flattering a face, making a scene feel tidy."),
    CameraAngle(AngleKind.Low, "Low angle", "Subject looks strong or heroic, and legs look longer.", "Athletes, fashion, anyone you want to look confident."),
    CameraAngle(AngleKind.Overhead, "Bird’s-eye, overhead", "Flattens the scene into a pattern. Graphic and a bit abstract.", "Food, flat lays, crowds, tops of buildings."),
    CameraAngle(AngleKind.Worm, "Worm’s-eye", "Dramatic scale. Everything towers over the camera.", "Architecture, trees, tall subjects, dramatic skies."),
    CameraAngle(AngleKind.Dutch, "Dutch tilt", "The horizon is rolled 10 to 30 degrees. It adds tension and energy.", "Music, action, unease. Use it rarely, and commit when you do."),
    CameraAngle(AngleKind.OverShoulder, "Over the shoulder", "The viewer stands behind one person and looks at another. It builds connection.", "Conversations, storytelling, weddings."),
)

data class ShotSize(val name: String, val description: String, val use: String)

val SHOT_SIZES = listOf(
    ShotSize("Extreme wide", "The person is tiny in a big place.", "Establishing the location."),
    ShotSize("Wide", "Whole body with lots of space around.", "Context and environment."),
    ShotSize("Full", "Head to toe.", "Fashion, full-length portraits."),
    ShotSize("Medium full", "Head to mid-thigh, sometimes called cowboy.", "Casual portraits, groups."),
    ShotSize("Medium", "Head to waist.", "Conversation, most everyday portraits."),
    ShotSize("Medium close-up", "Head to chest.", "Interviews, personality."),
    ShotSize("Close-up", "Face, shoulders at most.", "Emotion, headshots."),
    ShotSize("Extreme close-up", "Eyes or one detail.", "Intensity, texture."),
)

val POSITIONING = listOf(
    "Portraits at eye level" to "Put the lens at or just above the eyes. Below the chin is rarely kind.",
    "Full-body at waist height" to "Hold the camera around waist or chest height so the legs don’t shrink.",
    "Get down to kids and pets" to "Shoot at their eye level, not yours.",
    "Don’t crop at joints" to "Crop between wrists, elbows, knees and ankles, not through them.",
    "Leave lead room" to "Give space in the direction the subject looks or moves.",
    "Watch the headroom" to "Keep a small gap above the head, or crop the forehead on purpose. Not a gap that is just a bit too big.",
    "Keep architecture vertical" to "Hold the phone level (pitch 0 degrees) so buildings don’t lean, or tilt hard on purpose.",
)

enum class LightDirection { Front, Side, Back, Top }

data class DirectionInfo(val kind: LightDirection, val name: String, val effect: String)

val DIRECTIONS = listOf(
    DirectionInfo(LightDirection.Front, "Front light", "Flat and even. Colours show well, but there’s little depth."),
    DirectionInfo(LightDirection.Side, "Side light", "Brings out texture and shape. The go-to for landscapes and portraits with character."),
    DirectionInfo(LightDirection.Back, "Back or rim light", "A glow around the edges, or a silhouette. Expose for the face or add fill."),
    DirectionInfo(LightDirection.Top, "Top light", "Harsh at noon, with dark eye sockets. Step into shade or wait."),
)

/** A face diagram: the light dot in the 64 by 80 box, the shadow as SVG path data, and whether the head is turned. */
data class FaceSpec(val lightX: Float, val lightY: Float, val shadow: String, val shadowAlpha: Float = 0.3f, val turned: Boolean = false)

data class PortraitPattern(val name: String, val where: String, val look: String, val face: FaceSpec)

val PATTERNS = listOf(
    PortraitPattern("Butterfly", "Above and in front of the face.", "Small shadow under the nose and chin. Glamour.",
        FaceSpec(32f, 5f, "M26 48Q32 52 38 48Q32 45 26 48ZM8 64Q32 80 56 64V80H8Z")),
    PortraitPattern("Loop", "30 to 45 degrees to the side, a little above.", "A small loop of shadow from the nose onto the cheek. The default flattering light.",
        FaceSpec(8f, 14f, "M35 45Q43 45 45 51Q39 51 35 48ZM48 22Q53 40 45 64L60 70V16Z", 0.28f)),
    PortraitPattern("Rembrandt", "45 degrees to the side and high.", "A small triangle of light on the shadowed cheek. Dramatic.",
        FaceSpec(7f, 8f, "M32 0H64V80H32ZM37 37L49 35L41 52Z")),
    PortraitPattern("Split", "Straight to the side, 90 degrees.", "Half the face in light and half in shadow. Moody.",
        FaceSpec(4f, 40f, "M32 0H64V80H32Z")),
    PortraitPattern("Broad", "Light falls on the side of the face that turns toward the camera.", "Makes a face look wider and fuller.",
        FaceSpec(5f, 26f, "M42 0H64V80H42Z", turned = true)),
    PortraitPattern("Short", "Light falls on the side turned away from the camera.", "Slims the face and adds shape. Most portrait photographers default to it.",
        FaceSpec(60f, 26f, "M0 0H42V80H0Z", turned = true)),
)

val HARD_SOFT = listOf(
    "Hard light" to "A small or distant source, like the midday sun. Crisp shadows, strong texture, unforgiving on skin.",
    "Soft light" to "A big or close source. Overcast sky works like a giant softbox. Open shade is a portrait favourite.",
    "Make light softer" to "Move the source closer, make it bigger, or bounce it off a wall.",
)

val FLASH = listOf(
    "Guide number" to "GN is distance times f-number at ISO 100. A GN 40 flash at f/8 reaches 5 m.",
    "Inverse square law" to "Double the distance and you get a quarter of the light, which is 2 stops less.",
    "Sync speed" to "About 1/200 to 1/250 s. Faster needs high-speed sync, and that costs power.",
)

data class Principle(val name: String, val description: String, val tryThis: String)

val COMPOSITION = listOf(
    Principle("Leading lines", "Roads, rails and shadows pull the eye through the frame toward the subject.", "Crouch until a line starts at your feet and ends at the subject."),
    Principle("Frame within a frame", "A doorway, window or branches around the subject add depth and focus.", "Stand back and shoot through an opening, then check the edges."),
    Principle("Negative space", "Empty area around a subject gives it room and makes it feel isolated or calm.", "Place the subject on a third and leave the rest of the frame empty."),
    Principle("Symmetry and patterns", "Mirror-like balance and repetition feel orderly. Breaking one element makes it the focus.", "Centre yourself on the axis, then look for the one thing that doesn’t match."),
    Principle("Figure and ground", "The subject must separate from the background by tone, colour or sharpness.", "Shift a step sideways until the subject stops blending into what’s behind."),
    Principle("Layering", "Foreground, middle ground and background give a flat photo depth.", "Add something close to the lens, even if it’s a blurred leaf."),
    Principle("Odd numbers", "Groups of three or five feel more natural than pairs or fours.", "Shoot a cluster and drop or add one subject until the count is odd."),
    Principle("Fill the frame", "Getting close removes distractions and shows detail.", "Take one step closer than feels comfortable, then another."),
    Principle("Juxtaposition", "Two contrasting things in one frame tell a story: old and new, big and small.", "Wait until the second element enters the frame."),
    Principle("Colour harmony", "Complementary colours pop. Analogous colours feel calm.", "Pick the dominant colour and frame out anything that fights it."),
    Principle("Balance", "A heavy element on one side needs a lighter one on the other. Formal balance is symmetrical, informal is not.", "Put a small bright object opposite a large dark one."),
    Principle("Simplicity", "Fewer elements make a stronger photo.", "Check each edge of the frame and remove anything that isn’t helping."),
    Principle("Decisive moment", "The split second when shapes, light and gesture line up.", "Frame the background first and wait for the subject to step in. Use burst mode."),
)

/** Subject and the grid id that suits it. Names come from Grids.spec(id). */
val GRID_PICKS = listOf(
    "Portraits and headshots" to "phi",
    "Landscapes and horizons" to "thirds",
    "Waterfalls, shells, staircases" to "spiral",
    "Street and documentary" to "dynamic",
    "Eyes, hands and small details" to "diagonal",
    "Action and movement" to "triangles",
    "Architecture and reflections" to "center",
    "Products and flat lays" to "fine",
    "Group portraits" to "pyramid",
    "Patterns, roofs and tiles" to "triGrid",
    "Corridors, roads and tracks" to "onePoint",
    "Buildings from a corner" to "twoPoint",
    "Tall buildings looking up" to "threePoint",
    "Wide panoramic frames" to "rabatment",
    "Social posts and video" to "safe",
)
