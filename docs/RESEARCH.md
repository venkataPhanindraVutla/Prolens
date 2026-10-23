# Pro Photography Toolkit: research and feature set

A single reference for building a photographer's assistant tool. Part A is what
professionals actually use. Part B turns that into a prioritised feature set.
Part C covers the math and the Android APIs needed to build it.

---

# Part A: What professionals use

## A1. Composition grids and overlays

Every overlay needs the same controls: on/off, opacity, line colour (or auto
colour that contrasts with the scene), line width, and flip/rotate for
asymmetric grids. Most pros use one or two at a time, never all at once.

| Overlay | What it is | Geometry (frame W × H) | Best for |
|---|---|---|---|
| **Rule of thirds** | 2 vertical + 2 horizontal lines; subjects sit on lines or the 4 crossings ("power points") | Lines at 1/3 and 2/3 | Everything; the default |
| **Phi grid** (golden section) | Like thirds, but the centre band is narrower | Lines at 0.382 and 0.618 (ratio 1 : 0.618 : 1) | Calmer, more "classical" placement |
| **Golden spiral** (Fibonacci) | Log spiral that winds into one "eye" point; the curve acts as a leading line | r = a·e^(bθ), b = ln(φ)/(π/2); eye at the phi-grid crossing. 4 orientations × 2 flips | Landscapes, curved subjects, portraits with flowing lines |
| **Golden triangles** | One main diagonal, plus a perpendicular dropped onto it from each of the other two corners | Foot of the perpendicular from corner P onto diagonal AB: A + ((P−A)·d / \|d\|²)·d, with d = B−A | Diagonal energy, triangular subjects, movement |
| **Diagonal method** (Edwin Westhoff) | 45° lines from each of the 4 corners. Westhoff found that key details often sit on these lines | Lines y = ±x from each corner, clipped to the frame | Placing eyes, hands and key details |
| **Dynamic symmetry** (Jay Hambidge) | Both main diagonals plus "reciprocals": lines from a corner that cross a diagonal at 90° | A reciprocal meets the far long side at H²/W from the corner where the diagonal ends | Street, documentary, painterly layouts (Alex Webb–style) |
| **Harmonic armature** (14-line) | 2 main diagonals + 8 lines from each corner to the midpoints of the two far sides + 4 lines joining the side midpoints (a rhombus) | All from corners and midpoints | Classic painting-style composition |
| **Centre cross / symmetry** | Centre lines plus a centre marker | W/2, H/2 | Symmetry, architecture, reflections |
| **Square / quadrant grid** | N×N fine grid (4×4, 6×6) | Even divisions | Product shots, flat lays, alignment |
| **Thirds + diagonals** | Thirds with both main diagonals | Lines at 1/3, 2/3, plus corner to corner | Leading lines through a power point |
| **Rabatment** | Fold each short side onto the long side to make two squares | Vertical lines at x = H and x = W − H (landscape) | Wide frames; figures on the square's edge |
| **Golden spiral, true ratio** | Spiral kept at exactly 1.618, not stretched | Largest golden rectangle centred in the frame | Checking against the exact proportion |
| **Golden rectangles** | The nested golden squares without the spiral | Spiral dividers only | Straight-edged, graphic frames |
| **Double golden triangles** | Both diagonals, each with perpendiculars from the opposite corners | 2 diagonals + 4 perpendicular feet | Scenes with lines running both ways |
| **Pyramid** | Apex at top centre, base on the bottom corners, split into four | Triangle + midpoint triangle; flip for an inverted V | Group portraits, mountains, stability |
| **Triangle grid** | Lattice of equilateral triangles | Line families at 0°, 60°, 120°, spacing s·√3/2 | Patterns, roofs, tiles |
| **Diagonal cross** | Baroque (↗) and sinister (↘) diagonals | Corner to corner | Roads and rivers running corner to corner |
| **Diagonal grid** | Square grid rotated 45° | Line families at 45° and 135° | Repeating diagonals: stairs, fences, fields |
| **One-, two- and three-point perspective** | Vanishing-point fans, with straight or converging verticals | VP at the centre; or two VPs on the horizon outside the frame; plus a third VP above | Corridors; corners of buildings; tall buildings looking up |
| **Isometric 3D grid** | Isometric drawing grid | Line families at 30°, 150° and 90°, same spacing | Boxes and buildings drawn in 3D without vanishing points |
| **Aspect-ratio frame guides** | Masks for the final crop | 1:1, 4:5, 3:2, 4:3, 16:9, 9:16, 2.39:1 (cinema), 65:24 (XPan) | Shooting for Instagram, stories, print or a cinematic look |
| **Safe areas** | Inner margins for title/action-safe and for social-app UI | 90% / 80% boxes; story UI zones | Social and video deliverables |

**3D and perspective grids.** These are the "3D grid" ideas:

| Overlay | What it is | How it works |
|---|---|---|
| **Ground-plane grid** | A floor grid drawn in perspective that stays locked to the real horizontal plane as you tilt the phone | Device rotation (gravity sensor) plus camera intrinsics → project a grid on the plane y = −camera height |
| **1-, 2- and 3-point perspective guides** | Lines converging to vanishing points | User drags the vanishing points, or they come from the device pitch (vertical VP) and the horizon line |
| **Vertical-convergence guide** | Shows how much the verticals lean because of pitch | Uses pitch angle; for architecture |
| **Leading-line tool** | User draws lines that stay on screen | Manual |

**The golden spiral on non-golden frames.** A true golden rectangle is 1.618:1,
but 3:2 is 1.5 and 16:9 is 1.78. Lightroom stretches the spiral to fit the
frame. Offer both "stretch to frame" and "true spiral, anchored at the phi
point."

## A2. Level, gravity and inclination

These are the "gravity balance inclination" tools. They are some of the most
used features in any pro camera.

| Tool | What it measures | Why pros care |
|---|---|---|
| **Horizon level (roll)** | Rotation around the lens axis | Crooked horizons are the most common amateur mistake. Turn green at 0° ±0.3°, with a haptic tick when it's level |
| **Pitch level (tilt)** | Pointing up or down | Keeps building verticals parallel (no "falling backwards" buildings) |
| **Top-down / flat-lay mode** | Phone pointing straight down | Food, product and document shots. A bubble-level crosshair |
| **Dual-axis readout** | Roll and pitch in degrees | Repeatable angles; matching a series |
| **Dutch-angle mode** | A deliberate tilt to a set angle (e.g. 15°) | Tension and unease in a frame; holds the same tilt across shots |
| **Compass heading** | Which way the lens points (azimuth) | Lining up with the sun, moon or Milky Way |
| **Steady-shot trigger** | Waits until the gyro shows no movement, then fires | Sharp handheld shots at slow shutter speeds |
| **Visual balance ("visual weight")** | Where the image's "centre of mass" sits | Bright areas, faces, saturated colour and high contrast carry visual weight. A balanced frame places it deliberately: centred (formal) or offset against negative space (informal) |

## A3. Exposure: the exposure triangle

**Shooting modes:** P (program), A/Av (aperture priority, used most by pros),
S/Tv (shutter priority), M (manual), and Auto-ISO with a minimum shutter speed.

### Shutter speed

| Rule or situation | Value |
|---|---|
| Handheld minimum (reciprocal rule) | 1 / (focal length × crop factor), then halve it for each stop of stabilisation |
| Freeze people walking | 1/250 s |
| Kids and pets | 1/500 s |
| Sports | 1/1000 s and faster |
| Birds in flight | 1/2000–1/4000 s |
| Panning (motion blur in the background) | 1/15–1/60 s |
| Silky water | 1/2–2 s (often with an ND filter) |
| Smooth clouds or sea | 30 s – 3 min (ND 6–10 stops) |
| Fireworks | 2–8 s, f/8–f/11, ISO 100 |
| Stars as points | 500 rule: 500 / (focal × crop). Better is the NPF rule: t = (35·N + 30·p) / f, where p = pixel pitch in µm |
| Star trails | 30 s frames stacked, or bulb mode for minutes to hours |

### Aperture

| f-number | Effect |
|---|---|
| f/1.2–f/2 | Very shallow depth of field, strong background blur, good in low light |
| f/2.8–f/4 | Portraits with some context, events |
| f/5.6–f/8 | The lens "sweet spot": sharpest, used for travel and street |
| f/8–f/11 | Landscapes with front-to-back sharpness |
| f/16–f/22 | Sunstars and maximum depth, but diffraction softens the image |

**Diffraction limit:** sharpness starts dropping at about f-number ≈ 1.5 × pixel
pitch in µm. For a 45 MP full-frame sensor (about 4.3 µm) that's roughly f/6.5.
For a 24 MP full-frame sensor (about 6 µm) it's roughly f/9.

### ISO

Use base ISO (100, sometimes 64) for the cleanest files. Raise it before you
accept a blurry shot. Many modern sensors have a second native ISO (dual gain)
where noise drops again.

### Exposure helpers

| Tool | What it does |
|---|---|
| **Exposure compensation** | ±3 to ±5 EV in 1/3 steps |
| **Bracketing (AEB)** | 3, 5 or 7 frames at ±1 or ±2 EV, for HDR |
| **Metering modes** | Matrix/evaluative, centre-weighted, spot, highlight-weighted |
| **ETTR** (expose to the right) | Push exposure as bright as possible without clipping, to get the cleanest RAW |
| **Sunny 16** | In full sun, f/16 at 1/ISO. Use f/11 for light overcast, f/8 for overcast, f/5.6 for heavy overcast, f/4 for open shade or sunset |
| **EV math** | EV₁₀₀ = log₂(N² / t). Typical scenes: full sun ≈ 15, overcast ≈ 12–13, bright interior ≈ 8, night street ≈ 5, full-moon landscape ≈ −3 |
| **Equivalent exposures** | Trade a stop of aperture for a stop of shutter or ISO and keep the same brightness |
| **ND filter math** | New shutter = old shutter × 2^stops. ND8 = 3 stops, ND64 = 6, ND1000 = 10 |

### Exposure monitoring tools

| Tool | What it shows |
|---|---|
| **Live histogram** | Luma and RGB channels |
| **Highlight and shadow clipping warnings** | "Blinkies" on blown and crushed areas |
| **Zebras** | Stripes over areas above a set level. Use 95–100% for clipping and about 70% for skin on lighter tones |
| **False colour** | Maps brightness to a colour scale. Blackmagic marks correct exposure for lighter skin in pink and for darker skin in green |
| **Waveform** | Brightness for each column of the frame. A video standard that is very useful for stills |
| **Spot meter readout** | EV at a point you tap |

## A4. Focus

| Feature | What it is |
|---|---|
| **AF-S / One-shot** | Locks focus once. For still subjects |
| **AF-C / Servo** | Keeps tracking a moving subject |
| **Manual focus** | A focus ring or slider with a distance readout |
| **AF area modes** | Single point, zone, wide, and tracking |
| **Subject detection** | Eye, face, body, animal, bird and vehicle detection. This is now the main thing pros rely on |
| **Back-button focus** | Separates focusing from the shutter button |
| **Split AE/AF points** | Tap once to focus, drag a second point for exposure |
| **Focus peaking** | Colours the in-focus edges (red, yellow, cyan or white; low/medium/high sensitivity) |
| **Focus loupe** | Magnifies part of the frame while focusing |
| **Hyperfocal focusing** | Focus at distance H; everything from H/2 to infinity is acceptably sharp |
| **Focus bracketing / stacking** | Shots at stepped focus distances, merged later. Used for macro, product and landscape |
| **Rack focus** | A smooth pull between two saved distances. Mostly a video technique |

## A5. Focal length, lenses and perspective

| Focal length (full-frame) | Character | Typical use |
|---|---|---|
| 8–16 mm | Ultra-wide or fisheye; strong distortion at the edges | Interiors, astro, dramatic landscapes |
| 16–24 mm | Wide; exaggerates depth | Landscape, architecture, real estate |
| 28–35 mm | Natural wide; "you are there" feel | Street, documentary, environmental portraits |
| 40–50 mm | "Normal," close to how the eye sees | General use, street, half-body portraits |
| 85 mm | Flattering portrait lens | Headshots and portraits |
| 105–135 mm | Strong compression, creamy blur | Tight portraits, details, weddings |
| 70–200 mm | Versatile telephoto | Events, sports, landscape compression |
| 300–600 mm+ | Super-telephoto | Wildlife, birds, field sports |
| 90–105 mm macro (1:1) | Life-size reproduction | Insects, products, rings |

**Key facts the tool should teach and calculate:**

- **Crop factor and equivalent focal length.** Full frame = 1.0×, APS-C =
  1.5× (Canon 1.6×), Micro Four Thirds = 2.0×, 1-inch ≈ 2.7×. A phone's main
  camera is usually about 24 mm equivalent. Formula: equivalent focal length =
  f × 43.27 / sensor diagonal (mm).
- **Field of view.** FOV = 2·atan(d / 2f), where d is the sensor width,
  height or diagonal.
- **Perspective comes from distance, not focal length.** "Compression" happens
  because you stand further back. Wide lenses close to a face make the nose
  look bigger. For headshots, stand about 1.5–3 m away (85–135 mm).
- **Equivalent aperture.** For depth of field on smaller sensors, multiply the
  f-number by the crop factor too (f/1.8 on M43 looks like f/3.6 on full frame).

## A6. Depth of field and background blur

**What decides background blur, in order of impact:** subject distance (closer
means more blur), focal length (longer means more), aperture (wider means
more), subject-to-background distance (further means more), and sensor size
(bigger means more for the same framing).

**Formulas** (f = focal length, N = f-number, c = circle of confusion, s =
subject distance):

- Circle of confusion c ≈ sensor diagonal / 1500. Full frame ≈ 0.030 mm,
  APS-C ≈ 0.020 mm, M43 ≈ 0.015 mm.
- Hyperfocal distance H = f² / (N·c) + f
- Near limit = s·(H − f) / (H + s − 2f)
- Far limit = s·(H − f) / (H − s), or infinity when s ≥ H
- **Background blur disc** (how blurred the background actually looks):
  b = (f·m / N) · (x_d / (s + x_d)), where m = f / (s − f) and x_d = distance
  from the subject to the background. Show it as a % of frame width. That
  number is more useful than "DoF in metres" for portraits.

**Bokeh quality:** the number and shape of aperture blades (rounded blades give
round highlights), cat's-eye shapes at the frame edges, and "onion rings" from
aspherical elements.

**On a phone:** real optical blur is small, so blur is computed from a depth map
or a subject mask. Let the user set a simulated f-number (f/1.4–f/16) and the
focus point, then render the blur, ideally after capture so the edit can be
undone.

## A7. White balance and colour

| Light source | Approximate Kelvin |
|---|---|
| Candle | 1,900 K |
| Tungsten bulb | 2,700–3,200 K |
| Sunrise or sunset | 3,000–3,500 K |
| Fluorescent | 4,000 K |
| Daylight (midday) | 5,200–5,600 K |
| Flash | 5,500–6,000 K |
| Cloudy | 6,500 K |
| Shade | 7,500 K |
| Clear blue sky | 10,000 K |

Other colour tools: **tint** (green/magenta), **custom WB** from a grey card,
**WB lock**, **RAW (DNG) + JPEG**, colour space (sRGB for web, Adobe RGB or P3
for print), and picture profiles or LUTs for previewing a look.

## A8. Light: sun flow and natural light

### Sun and moon timing

These are computed from GPS and date with the NOAA solar algorithm. It works
offline.

| Phase | Sun elevation | Light |
|---|---|---|
| Golden hour | −4° to +6° | Warm, soft, long shadows |
| Blue hour | −6° to −4° | Deep blue sky, city lights balance with the sky |
| Civil twilight | 0° to −6° | Bright enough to shoot without lights |
| Nautical twilight | −6° to −12° | Horizon still visible; good for cityscapes |
| Astronomical twilight | −12° to −18° | Below −18°, the sky is fully dark for astro |

### Planning tools

| Tool | What it does |
|---|---|
| **Sun path in AR** | Draws today's sun arc and the sunrise/sunset points over the live camera view. PhotoPills' signature feature |
| **Sun and moon on a map** | Direction lines on a map, with a time slider |
| **Light-direction indicator** | "Sun is 40° left of the lens → side light," using compass + sun azimuth |
| **Shadow length** | Shadow = object height / tan(sun elevation) |
| **Moon** | Phase, illumination %, rise and set times, position |
| **Milky Way** | When the galactic core is visible and where it is (seasonal; best around new moon) |
| **Countdown widget** | "Golden hour starts in 42 min" |

### Light direction and quality

| Direction | Effect |
|---|---|
| Front light | Flat, shows colour; little depth |
| Side light (45–90°) | Texture, shape and drama. Landscapes and portraits |
| Back or rim light | Glow and silhouettes; needs fill or exposure for the face |
| Top light (noon) | Harsh, with eye-socket shadows. Find shade |

**Hard vs soft light:** a small, distant source gives hard light; a big, close
source gives soft light. Overcast sky works like a giant softbox. Open shade is
a portrait favourite.

### Portrait lighting patterns

| Pattern | Light placement | Look |
|---|---|---|
| Butterfly (Paramount) | Above, in front | Glamour |
| Loop | 30–45° to the side, slightly above | The default flattering light |
| Rembrandt | 45°, high; a triangle of light on the far cheek | Dramatic |
| Split | 90° | Moody; half the face lit |
| Broad vs short | Lit side faces the camera vs faces away | Short lighting slims a face |

### Flash basics

- Guide number: GN = distance × f-number (at ISO 100).
- Inverse square law: double the distance and you get ¼ of the light, which is
  −2 stops.
- Sync speed is about 1/200–1/250 s. Faster needs HSS (high-speed sync).

## A9. Camera angles and positioning

| Angle | Camera position | Effect |
|---|---|---|
| Eye level | At the subject's eyes | Neutral, honest |
| High angle | Above, looking down | Subject looks smaller or vulnerable; slims faces |
| Low angle | Below, looking up | Subject looks powerful or heroic; makes legs look longer |
| Bird's-eye / overhead | Directly above (−90° pitch) | Patterns, flat lays, food |
| Worm's-eye | On the ground, looking up | Drama, scale, architecture |
| Dutch tilt | Rolled 10–30° | Tension, energy |
| Over-the-shoulder | Behind one subject | Connection, storytelling |

The tool can show the angle from pitch automatically: "Low angle +18°."

**Shot sizes:** extreme wide, wide, full (head to toe), medium-full or "cowboy"
(mid-thigh), medium (waist), medium close-up (chest), close-up (face), and
extreme close-up (eyes or detail).

**Positioning rules pros follow:**

- Portraits: put the lens at or slightly above eye level. For full-body shots,
  put it around waist or chest height so legs aren't shortened.
- Children and pets: get down to their eye level.
- Don't crop at joints (wrists, elbows, knees, ankles). Crop between them.
- **Lead room and nose room:** leave space in the direction the subject is
  looking or moving.
- **Headroom:** keep a small gap above the head, or crop the forehead
  deliberately in a tight close-up. Never leave a gap that is "just a bit."
- Architecture: keep the sensor vertical (pitch 0°) to keep verticals straight,
  or tilt hard on purpose.
- Foreground, middle ground and background: add a foreground element for depth
  in landscapes.

## A10. Composition principles (for the coach and library)

Leading lines, frame within a frame, negative space, symmetry and patterns (and
breaking them), figure–ground contrast, layering, odd numbers of subjects, fill
the frame, juxtaposition, colour harmony (complementary, analogous), formal vs
informal balance, simplicity (remove distractions and check the edges of the
frame), and the decisive moment.

## A11. Capture modes and stability

| Mode | Use |
|---|---|
| Self-timer (2 s / 10 s) | Avoids shake when you press the shutter |
| Burst | Action; choosing the best expression |
| Interval / time-lapse | Clouds, crowds, star trails |
| Bulb or long exposure | Night shots, light trails |
| Long-exposure simulation by stacking frames | Silky water without an ND filter (phone) |
| Exposure bracketing / HDR | High-contrast scenes |
| Focus bracketing | Macro and product |
| Panorama guide | Even overlap (30%) and level rotation |
| Night / astro | Stacked multi-second frames |
| Remote shutter | Volume button, Bluetooth, or a smartwatch |

## A12. Genre cheat sheets (starting points)

| Genre | Focal (FF eq.) | Aperture | Shutter | ISO | AF | Grid / tool |
|---|---|---|---|---|---|---|
| Headshot | 85–135 mm | f/1.8–f/2.8 | 1/200+ | 100–400 | AF-S, eye AF | Thirds, eye on the top line |
| Environmental portrait | 35 mm | f/2.8–f/4 | 1/200 | Auto | Eye AF | Phi grid |
| Landscape | 16–35 mm | f/8–f/11 | Tripod, any | 100 | Manual, hyperfocal | Level, thirds, horizon on a third |
| Street | 28–35 mm | f/8 | 1/500 | Auto | Zone focus at 3 m | Dynamic symmetry |
| Sports | 70–400 mm | f/2.8–f/4 | 1/1000+ | Auto | AF-C, tracking | Lead room |
| Wildlife / birds | 400–600 mm | Wide open | 1/2000+ | Auto | AF-C, animal eye | Thirds |
| Astro | 14–24 mm | f/1.4–f/2.8 | NPF rule | 1600–6400 | Manual at infinity | Level, Milky Way AR |
| Macro | 90–105 mm | f/8–f/16 | 1/200 + flash | 100–400 | Manual, focus stack | Centre / peaking |
| Architecture | 16–24 mm (tilt-shift) | f/8 | Tripod | 100 | AF-S | Pitch level, centre cross |
| Food (top-down) | 50–100 mm | f/4–f/8 | 1/125 | 100–400 | AF-S | Top-down level, square grid |
| Product | 50–100 mm | f/8–f/11 | Flash sync | 100 | Manual, stack | Fine grid |
| Night city | 24–50 mm | f/8 | 2–30 s | 100 | Manual | Blue-hour timer |
| Waterfall | 24–70 mm | f/11 | 0.5–2 s | 100 | AF-S | ND calculator |
| Concert | 24–200 mm | f/2.8 | 1/250 | 3200–12800 | AF-C | Zebras/histogram for stage light |
| Real estate | 14–20 mm | f/8 | Bracket | 100 | AF-S | Pitch level, HDR bracketing |

---

# Part B: The feature set

The tool has five parts:

1. **Pro Viewfinder** (live camera): overlays, levels, meters, manual controls
2. **Calculators**: depth of field, blur, exposure, ND, astro, flash, FOV
3. **Light Planner**: sun and moon times, AR paths, golden/blue hour
4. **Coach and Library**: genre recipes, angles, lighting patterns, composition lessons
5. **My Gear**: the friend's camera bodies and lenses. Every calculator and the
   virtual lens frames use these

**Key design choice: virtual lens frames.** Your friend shoots with a real
camera. The most useful thing a phone can do is act as a **director's
viewfinder**. He picks "Sony A7 IV + 85 mm" from My Gear, and the phone shows
exactly that framing (a 3:2 frame, scaled to that field of view) with all the
grids, levels and sun tools. He can scout and compose without changing lenses.
Artemis and Viewfinder-style apps do this, and cinematographers use them
heavily.

## B1. Priority tiers

### v1: core

**Viewfinder**
- [ ] Overlays: thirds, phi, golden spiral (4 orientations + flip, stretch or
      true), golden triangles (2 orientations), diagonal method, dynamic
      symmetry, centre cross, fine grid. Opacity, colour and width settings;
      combine up to 2
- [ ] Aspect-ratio frame guides (1:1, 4:5, 3:2, 4:3, 16:9, 9:16, 2.39:1)
- [ ] Horizon level (roll) + pitch level + top-down bubble, with degree
      readout and haptic snap
- [ ] Live histogram (luma/RGB) + highlight and shadow clipping warnings
- [ ] Focus peaking (colour + sensitivity) + focus loupe
- [ ] Manual controls: ISO, shutter, focus distance, WB (Kelvin + tint), EV
      compensation, with Auto ↔ Manual toggles for each
- [ ] Split focus and exposure tap points; AE/AF lock
- [ ] RAW (DNG) + JPEG capture, 2 s / 10 s timer, volume-button shutter
- [ ] Shooting-info HUD (ISO · shutter · f-number · focal eq. · WB · EV)

**Calculators**
- [ ] DoF + hyperfocal (near, far, total; uses My Gear sensor size)
- [ ] Background blur (blur disc as % of frame) with a visual preview slider
- [ ] Exposure: EV, equivalent exposure, Sunny 16, ND filter time
- [ ] Shutter rules: handheld minimum (with stabilisation stops), motion-freeze
      table
- [ ] Astro: 500 rule and NPF rule
- [ ] FOV and crop-factor converter

**Light**
- [ ] Today at this location: sunrise, sunset, golden hour, blue hour, twilights
- [ ] Sun azimuth and elevation now; compass arrow to the sun

**Coach and gear**
- [ ] Genre recipe cards (table A12) that can be applied to the viewfinder
      (setting the grid, level and suggested settings)
- [ ] My Gear: bodies (sensor size, MP → pixel pitch) and lenses (focal range,
      max aperture)

### v2: pro

- [ ] **Virtual lens frames** from My Gear (the director's viewfinder)
- [ ] Sun and moon path in AR, with a time scrubber
- [ ] Light-direction indicator (front, side or back light relative to the lens)
- [ ] Zebras, false colour, waveform; spot-meter EV readout
- [ ] 3D ground-plane grid + vertical-convergence guide + perspective vanishing
      point tool
- [ ] Angle label from pitch (eye level, low, high, overhead) + Dutch-angle lock
- [ ] Bracketing (AEB 3/5/7), focus bracketing, intervalometer
- [ ] Steady-shot (fires when the gyro is still)
- [ ] Shadow length, moon phase, Milky Way core visibility
- [ ] Shot list / session notes with location, time and settings attached
- [ ] Map planner (sun and moon direction lines over a map)

### v3: smart

- [ ] Visual balance meter: computes the image's visual-weight centroid
      (brightness, contrast, saturation, faces) and shows it against the centre
      and thirds
- [ ] Auto horizon detection from the image (line detection), not just the sensor
- [ ] Subject-aware grid snapping ("eye is 4% off the power point")
- [ ] AI photo critique after capture (composition, exposure and focus notes)
- [ ] Simulated background blur with an adjustable f-number after capture
- [ ] Weather and cloud cover for sunset quality (needs a weather API)

---

# Part C: Build notes (Android, Kotlin)

## C1. Camera stack

Use **CameraX** for preview and capture lifecycle, and **Camera2Interop** for
manual control. Before showing each control, check whether the device supports
it.

| Need | Camera2 key / API | Notes |
|---|---|---|
| Is manual control available? | `REQUEST_AVAILABLE_CAPABILITIES` contains `MANUAL_SENSOR`, `MANUAL_POST_PROCESSING`, `RAW` | Check per camera ID. Hide controls the device doesn't support |
| Hardware level | `INFO_SUPPORTED_HARDWARE_LEVEL` (`FULL` / `LEVEL_3`) | `LIMITED` devices often lack manual exposure |
| ISO | `SENSOR_SENSITIVITY`; range from `SENSOR_INFO_SENSITIVITY_RANGE` | Requires `CONTROL_AE_MODE_OFF` |
| Shutter | `SENSOR_EXPOSURE_TIME` (ns); range from `SENSOR_INFO_EXPOSURE_TIME_RANGE` | Same |
| Focus distance | `LENS_FOCUS_DISTANCE` (diopters, 1/m); `LENS_INFO_MINIMUM_FOCUS_DISTANCE` | Only true metres when `LENS_INFO_FOCUS_DISTANCE_CALIBRATION` is `CALIBRATED` |
| Aperture | `LENS_INFO_AVAILABLE_APERTURES` | Usually fixed on phones; a few have 2 positions |
| Focal length | `LENS_INFO_AVAILABLE_FOCAL_LENGTHS` + `SENSOR_INFO_PHYSICAL_SIZE` | Gives true 35 mm equivalent and FOV |
| Intrinsics (for 3D grid / AR) | `LENS_INTRINSIC_CALIBRATION` (fx, fy, cx, cy) | Fall back to focal length / pixel size |
| White balance | `CONTROL_AWB_MODE_OFF` + `COLOR_CORRECTION_GAINS` / `TRANSFORM` | Convert Kelvin to RGB gains yourself |
| EV compensation | `CONTROL_AE_EXPOSURE_COMPENSATION` (+ step size) | Works on most devices |
| AE/AF regions | `CONTROL_AF_REGIONS`, `CONTROL_AE_REGIONS` | Used for split focus and exposure points |
| RAW | `ImageFormat.RAW_SENSOR` + `DngCreator` | DNG with metadata |
| Multi-camera | `getPhysicalCameraIds()` (logical cameras) | Ultra-wide, main and tele for virtual lens frames |
| Vendor blur/night modes | CameraX Extensions (`BOKEH`, `NIGHT`, `HDR`) | Optional; varies by device |

**Reference implementation:** Open Camera (open-source Android app) covers most
manual controls. Its code is GPL, so read it to learn from, but don't copy it
into a closed-source app.

## C2. Live analysis (histogram, peaking, zebras, false colour, waveform)

- Use a CameraX `ImageAnalysis` stream with `YUV_420_888`. The Y plane gives
  brightness directly.
- **Histogram:** 256 bins from the Y plane. Downsample to about 320 px wide,
  update at 10–15 fps.
- **Focus peaking:** a Sobel or Laplacian on Y, then a threshold based on
  sensitivity, then colour the edge pixels in the overlay. Do this on the GPU
  (an OpenGL ES fragment shader on the preview texture, or an AGSL
  `RuntimeShader` on API 33+). The CPU is too slow at full frame rate.
- **Zebras / false colour:** the same shader pass: threshold or remap Y with a
  palette LUT.
- **Waveform:** per-column Y histogram drawn as a dot cloud. GPU or a downsampled
  CPU pass.

## C3. Sensors (levels, compass, AR)

- `TYPE_ROTATION_VECTOR` gives the full orientation (`getRotationMatrix` →
  `getOrientation`). Use `TYPE_GRAVITY` for a clean roll and pitch. Low-pass
  filter both (α ≈ 0.1–0.2) to stop the level jittering.
- Remap the axes for the screen orientation (`remapCoordinateSystem`), because
  a camera app often locks to portrait.
- **Roll** = rotation around the camera's optical axis. **Pitch** = the angle
  between the optical axis and the horizon.
- **Steady-shot:** fire when the `TYPE_GYROSCOPE` magnitude stays below about
  0.02 rad/s for 300 ms.
- **Compass:** the rotation vector's azimuth + `GeomagneticField` declination
  for true north. Ask the user to calibrate (figure-8) when accuracy is low.

## C4. Sun and moon math

- Use the NOAA solar position algorithm, or port **SunCalc** (BSD-licensed,
  small; gives sun and moon position, times for custom elevations, and moon
  phase). It runs fully offline.
- Golden and blue hour = the times when the sun crosses −6°, −4° and +6°.
- **AR path:** for each time t, take the sun's (azimuth, elevation), convert
  it to a direction vector in the world frame, rotate it into the camera frame
  using the rotation matrix, and project it with the intrinsics. Draw the arc
  with hour ticks.

## C5. Overlay rendering

- Draw all grids in one Compose `Canvas` above the preview, using normalised
  0–1 coordinates mapped to the **crop rect** (the active aspect-ratio frame),
  not the full view.
- Keep each grid as a pure function: `(rect, orientation, flip) → List<Path>`.
  These are easy to test, and the same functions can draw over imported
  photos.
- **Virtual lens frame:** scale = f_phone_eq / f_target_eq (with target
  f_eq = lens focal length × body crop factor). If the target is wider than
  the current phone camera, switch to the ultra-wide. Draw the frame in the
  target body's aspect ratio (usually 3:2).

## C6. Gear data model

```kotlin
data class Body(val name: String, val sensorWidthMm: Double, val sensorHeightMm: Double,
                val megapixels: Double) // crop factor, CoC, pixel pitch are derived
data class Lens(val name: String, val minFocalMm: Double, val maxFocalMm: Double,
                val maxAperture: Double, val minAperture: Double = 22.0)
```

Derived values: crop = 43.27 / sensor diagonal; CoC = diagonal / 1500; pixel
pitch (µm) = sensor width (mm) × 1000 / √(MP × 10⁶ × W/H).

---

# Reference apps (what they do best)

| App | Best at |
|---|---|
| **PhotoPills** | Sun/moon/Milky Way planning, AR sun path, calculators |
| **Halide** (iOS) | Clean manual camera, focus peaking + loupe, RAW |
| **Blackmagic Camera** (iOS/Android) | Pro monitoring: false colour, zebras, waveform, histogram, frame guides |
| **Lightroom crop overlays** | Grid set: thirds, diagonal, triangle, golden ratio, spiral, aspect |
| **Artemis / Viewfinder-style apps** | Director's viewfinder with virtual lens frames |
| **Open Camera** (Android, GPL) | Open-source reference for Camera2 manual controls |
| **Sun Surveyor / Theodolite** | Sun AR and inclinometer overlays |
