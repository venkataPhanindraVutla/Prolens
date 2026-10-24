# Prolens landing page: design

A marketing site for Prolens, the open-source pro camera and photography toolkit for Android. It lives in this repo, in `website/`, and is published with GitHub Pages.

## Intent

Get photographers to download the APK, try it, and help shape it in the open.

- The site markets to everyone, but it leads with the pro angle: "the field kit pros carry". Phone-first creators and learners should see they get value too, through the modes, templates and coach.
- The site should feel like a photographer made it. It is minimal, but loud where it counts, and very interactive, so visitors feel the app before they install it.

## What visitors should do, in priority order

1. **Download the APK.** This is the main call to action, linked to the latest GitHub release asset (`releases/latest`).
2. **Engage on GitHub.**
   - See that Prolens is open source.
   - **Request a feature**: a pre-filled GitHub issue.
   - **Report a bug**: a pre-filled issue.
   - **Test builds**: a link to the releases list.
3. **Join the waitlist** for the Play Store and iOS. This is secondary and visually quieter.

## Goals

- **A playable hero and an interactive story.** Every section has one thing to play with.
- **Bold editorial styling** on a minimal base: big type and photographer motifs (crop marks, HUD readouts, focus squares, shutter clicks).
- **Fast.** A good Lighthouse performance score; the hero is interactive within about 2 s on mid-range phones.
- **Fully usable on phones** (most visitors will arrive on Android), keyboard-accessible, and respects reduced motion.

## Non-goals

- No CMS, blog, docs site, accounts or analytics dashboards.
- No app-store badges until the app is on the stores.

## Anti-goals (a failure even if it works)

- **Generic SaaS template look:** identical rounded cards, gradient washes, stock photos, ALL-CAPS eyebrows everywhere.
- **Motion that blocks content** or makes the page feel slow. Interactions answer the visitor; nothing loops for attention except the feature rail.
- **Neon overload:** pink and chartreuse are signals, not wallpaper.

## Visual system (decided by the user)

- **Colours:**
  - Jet black `#0B0B0B` background
  - Hot pink `#FF2DAB`
  - Chartreuse `#D4FF3F`
  - Off-white `#F4F4EF` for text, with greys between
- **How the colours are used:**
  - Chartreuse = primary actions and live readouts.
  - Pink = emphasis words and the light leak.
  - Mostly black and off-white otherwise.
- **This palette is for the website only.** The app keeps its own zinc theme.
- **Feel:** minimal theme, bold editorial styling, modern interactions.
- **Type (builder's call; the mockups used these):** Space Grotesk for display and body, JetBrains Mono for HUD readouts and data. Load them self-hosted or from Google Fonts with `display=swap`.

## Facts and config

- **Repo:** `venkataPhanindraVutla/Prolens` (public).
- **Licence: Apache-2.0** (decided by the user).
  - The repo has no licence yet. Adding `LICENSE` at the root is part of this work and must land before the site says "open source".
  - SunCalc stays credited under its BSD-2 licence.
- **Release in place:**
  - The latest release is `v1.0`, with one asset, `Prolens-1.0.apk`.
  - Size 13,353,471 bytes, SHA-256 `d1cb1834…6af91dbe`.
  - The Releases API returns the hash as the asset's `digest` field (`sha256:…`), so the release workflow doesn't need to change.
- **Release lookup:** fetch `GET /repos/{repo}/releases/latest` and take the first asset whose name ends in `.apk`. Show the version from `tag_name`, the size and the `digest`.
  - If the API fails or is rate-limited, use a fallback baked in at build time. The fallback is the v1.0 values above, with links to `releases/latest`.
  - If `digest` is missing, hide the checksum line.
- **One config module** holds the repo slug, the public site URL, the waitlist endpoint and the fallback release values.
- **Site URL (my call):** the GitHub project page, `https://venkataphanindravutla.github.io/Prolens/`, so Vite `base` is `/Prolens/`. A custom domain later means a config change plus a `CNAME` file.
- **Source of truth for app content: the app code.**
  - Mode names and order come from `core/model/Modes.kt`.
  - Grid names, families and geometry come from `core/grids/Grids.kt`.
  - Maths comes from `core/photomath` and `core/sun`.
  - Where this doc and the code disagree, the code wins. `docs/prototype/` is reference only.

## Page, top to bottom (approved outline)

1. **Hero: PRO/LENS poster** (direction C, approved from the live mockup).
   - A giant "PRO" plus an outlined "LENS" wordmark.
   - A hot-pink light leak that follows the cursor; on touch devices it drifts slowly.
   - A phone mockup that tilts toward the cursor and shows a live viewfinder scene with a grid.
   - A chartreuse vertical feature rail scrolling up the right edge.
   - One sentence: "Composition, exposure and light in your pocket. Built in the open, shaped by the photographers who use it."
   - Buttons: **Download for Android** (chartreuse) and **View on GitHub** (ghost).
2. **Proof strip:** one mono line reading free · open source · no ads · no account · works offline · Android 7+, plus the APK size from the release.
3. **Pinned-phone scroll story.** The phone stays fixed while chapters scroll past and its screen changes with each chapter. One interaction per chapter:
   - **Compose:** grid chips (thirds, phi, golden spiral, golden triangles, dynamic symmetry, one-point perspective) redraw the phone overlay.
   - **Level:** drag horizontally to tilt the scene; the horizon line turns green at 0°.
   - **Expose:** toggles for histogram, zebras, false colour and focus peaking over a photo.
   - **Modes:** a mode strip like the app's (Night, Micro, Macro, Photo, Slo-mo, Pano, Templates). Choosing a mode changes the phone screen and a one-line caption.
   - **Light:** today's golden and blue hour for the visitor's location, from browser geolocation, falling back to a city picker. It uses the same SunCalc maths as the app (BSD-2, credited).
4. **Built for every phone:** a short section on how Prolens reads each phone's cameras and shows only what that phone can do (ultra-wide, macro, slo-mo frame rates, Night, manual controls), shown as a lens-by-lens card.
   - **Interaction (my call):** a switch between three illustrative phone profiles:
     - a one-camera phone
     - a phone whose ultra-wide is hidden from apps (like the test phone)
     - a three-camera flagship

     The card shows each profile's lenses (role, equivalent mm, zoom) and which modes appear.
   - Profiles are generic, not named real models, so the site makes no claims about specific devices.
5. **The toolkit, live:**
   - a working depth-of-field calculator (focal, aperture, distance sliders; near, far and hyperfocal)
   - the 23-grid library over one photo
   - a golden-hour clock

   The maths is ported from `core/photomath` and `core/sun`; reuse the logic, not the Kotlin.
6. **Open source:** what's in the repo, then **Request a feature**, **Report a bug** and **Test builds**. Issue links use GitHub's `issues/new?title=…&body=…&labels=…` with a short template.
   - **Feature requests:** label `enhancement`. The body asks what you were shooting, what you wanted Prolens to do, and how you do it today.
   - **Bugs:** label `bug`. The body asks for phone model, Android version, Prolens version, steps, expected result and what happened.
   - Both labels already exist. Labels only apply for people with triage rights, so the title prefix (`Feature: ` or `Bug: `) carries the meaning too.
7. **Download and waitlist:**
   - The big APK button with version, size and SHA-256, fetched at runtime from the GitHub Releases API, with a static fallback.
   - Three install steps.
   - Then a quieter waitlist form, posted to **Formspree** (decided by the user).
     - **Fields (my call):** email, plus an optional "Which store?" choice of Play Store, iPhone, or both. One line under it: "One email when Prolens reaches a store. Nothing else."
     - **Endpoint:** the Formspree form ID is a public value kept in the config module. The user will create the form and supply the ID.
     - **Until the ID is set:** the form is replaced by "Watch releases on GitHub", so the site can ship first.
     - **States:** sending, then "You're on the list", or an error that says what failed and offers a retry.
8. **Footer:** licence (Apache-2.0), GitHub, credits (SunCalc, Geist font in the app, the site fonts) and "Shoot like you mean it."

## Interaction principles

- **Photographer motifs:**
  - crop-mark corners on key blocks
  - HUD readouts that react (ISO, shutter, ƒ, EV)
  - a focus-square hover state on interactive items
  - a short shutter "click" (flash plus a 120 ms scale) when a primary button is pressed
- **Scroll-linked effects** are subtle: a pull-focus blur-to-sharp on section headings, and the pinned phone crossfading between screens.
- **Reduced motion:**
  - no light-leak following, no tilt, no rail animation
  - crossfades become instant
  - all content stays readable and every interaction still works

## Images

- **No stock photography.** Every image is made for Prolens: the viewfinder scenes and phone mockups are drawn in code (canvas or SVG), and the app UI is recreated faithfully from the real app.
- Generate a social/OG image (1200×630) and a favicon from the same system.

## Stack and hosting (decided by the user)

- React with Vite and TypeScript, in `website/` in this repo.
- Deployed to GitHub Pages by a GitHub Actions workflow on pushes to `main` that touch `website/`.
- Waitlist through a form service, with no server of our own.

## Testing and acceptance (my call)

- **Ported maths gets Vitest unit tests** using the same input and expected values as the Kotlin tests in `shared/src/commonTest` (depth of field, hyperfocal, SunCalc times).
- **Lighthouse mobile performance of 90 or more**, plus accessibility 95 or more. This is checked before release, not as a CI gate.
- **Checked by hand:**
  - at 360 px and at desktop width
  - keyboard only
  - with reduced motion on

## Left to the builder

- Component structure, the animation library (or none), styling approach and how fonts are loaded.
- The copy beyond the hero line and section headings above, in the same voice: plain, confident, photographer-literate, sentence case.
- Exact breakpoints and how the pinned story collapses on small screens. Suggested: the phone sits above each chapter, not pinned.
