# Prolens Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A one-page marketing site for Prolens in `website/`, published to GitHub Pages. Its main job is getting Android users to download the APK; it also invites them to shape the app on GitHub.

**Architecture:** A static React app built with Vite.
- **Ported maths:** the app's maths (depth of field, SunCalc, the 23 grids, exposure analysis) is ported to plain TypeScript in `src/lib/` and unit-tested against the Kotlin test values.
- **Images:** all drawn in code. Viewfinder scenes are SVG. The Expose photo is drawn on a Canvas 2D so its pixels can be analysed.
- **Runtime data:** the release info comes from the GitHub Releases API, with a fallback built in. The waitlist posts to Formspree.
- **No animation library:** motion is CSS plus `requestAnimationFrame`, and every animated piece checks reduced motion.

**Tech Stack:** Vite's official `react-ts` template (React, TypeScript), plus:
- Vitest, jsdom and Testing Library for tests
- `@fontsource/space-grotesk` and `@fontsource/jetbrains-mono` for self-hosted fonts
- `@resvg/resvg-js` (dev only) to render the OG image
- GitHub Actions for Pages

**Spec:** `docs/superpowers/specs/2026-10-24-landing-page-design.md`. Read it before any task.

**Visual reference:** `docs/superpowers/specs/2026-10-24-landing-hero-mockup.html`, the approved live mockup; hero C is the one chosen. Open it in a browser for the hero's light leak, tilt and rail.

## Global Constraints

### Node and repo
- Use the arm64 Node at `~/.local/node-arm64/bin` (Node 24); put it first on `PATH`. Never use the Intel `/usr/local` Node.
- Use npm and commit `package-lock.json`. CI runs `npm ci`.
- Repo slug: `venkataPhanindraVutla/Prolens`.
- Site URL: `https://venkataphanindravutla.github.io/Prolens/`, so Vite `base` is `/Prolens/`.
- Licence: Apache-2.0. SunCalc is credited as BSD-2 (© 2011-2015 Vladimir Agafonkin).

### Visual system
- **Colours:**
  - `--ink #0B0B0B` (background)
  - `--paper #F4F4EF` (text)
  - `--pink #FF2DAB` (emphasis words, light leak)
  - `--lime #D4FF3F` (primary actions, live readouts)
  - Greys in between. Pink and lime are signals, never fills for large areas, except the lime hero rail and lime primary buttons.
- **Type:** Space Grotesk for display and body; JetBrains Mono for HUD readouts and data only.

### Copy
- Sentence case. Plain, confident, photographer-literate.
- Hero line, exactly: "Composition, exposure and light in your pocket. Built in the open, shaped by the photographers who use it."
- Footer sign-off, exactly: "Shoot like you mean it."
- Proof strip, exactly: `free · open source · no ads · no account · works offline · Android 7+ · {size}`. The size comes from the release.
- No app-store badges, analytics, CMS or blog.

### App content (from the app code; the code wins over this plan)
- Mode strip order, from `core/model/Modes.kt`: Night, Micro, Macro, Photo, Slo-mo, Pano, Templates.
- Grids, families, names and geometry are ported from `core/grids/Grids.kt`.
- Thresholds come from `features/viewfinder/Analysis.kt`.

### Motion and accessibility
- Under `prefers-reduced-motion: reduce`:
  - no light-leak following, no phone tilt, no rail animation
  - crossfades are instant
  - every interaction still works
- Every interactive item is reachable by keyboard with a visible focus style.
- Touch targets are at least 44 px.
- Layout works from 360 px wide with no horizontal scroll.

### Safety
- Never push, enable Pages or change repo settings without asking the user first.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **The GitHub API is down, rate-limited (60 requests per hour per IP), or the latest release has no `.apk` asset.** The download button still works, using the fallback values, and never shows "undefined" or "NaN". *Pinned in Task 7.*
2. **A visitor declines location, or picks a place where the sun doesn't rise or set that day** (Tromsø in December, Reykjavík in June). The Light chapter falls back to the city picker. Missing times read "Sun stays down today" or "Sun stays up today", never "Invalid Date". *Pinned in Task 3 (time helpers) and Task 10 (chapter).*
3. **A city's times shown in the browser's time zone instead of the city's.** The old prototype showed London dawn at 10:17 on an IST browser. Times are formatted in the city's own IANA zone, and in the browser's zone for geolocation. *Pinned in Task 3.*
4. **Touch visitors.** The Level drag works with a finger and doesn't block vertical page scroll (`touch-action: pan-y` on the drag surface). The hero tilt is off without a hover-capable pointer. *Pinned in Task 10.*
5. **Waitlist edge cases.** If no Formspree ID is set, a "Watch releases on GitHub" link replaces the form. A double tap while sending sends once. A network or 4xx failure shows what failed plus a retry, and keeps the typed email. *Pinned in Task 8.*

---

## File structure

```
LICENSE                                  Apache-2.0 text (Task 1)
.github/workflows/website.yml            build + deploy to Pages (Task 12)
docs/superpowers/specs/2026-10-24-landing-hero-mockup.html   committed with this plan
website/
  index.html                             meta, OG tags, favicon (Task 12)
  vite.config.ts                         base '/Prolens/', vitest jsdom config
  public/favicon.svg, public/og.png      (Task 12)
  scripts/og.svg, scripts/og.mjs         OG source and renderer (Task 12)
  src/
    main.tsx, App.tsx                    page order
    config.ts                            REPO, SITE_URL, FORMSPREE_ID, FALLBACK_RELEASE
    styles/tokens.css, global.css
    lib/format.ts photomath.ts suncalc.ts time.ts cities.ts grids.ts analysis.ts
        release.ts issues.ts waitlist.ts motion.ts profiles.ts   (each with a .test.ts beside it)
    components/Phone.tsx Scene.tsx GridOverlay.tsx CropMarks.tsx ShutterButton.tsx Hud.tsx SectionHeading.tsx
    sections/Hero.tsx ProofStrip.tsx EveryPhone.tsx OpenSource.tsx Download.tsx Waitlist.tsx Footer.tsx
    sections/story/Story.tsx Compose.tsx Level.tsx Expose.tsx Modes.tsx Light.tsx
    sections/toolkit/Toolkit.tsx DofCalc.tsx GridLibrary.tsx GoldenClock.tsx
```

Each section file owns its markup and styles. Use one CSS module per section, `Section.module.css`, next to it. Shared look lives in `tokens.css` and `global.css`.

---

### Task 1: Scaffold, tokens, config and licence

**Files:**
- Create: `website/` from the official template
- Create: `website/src/config.ts`, `website/src/styles/tokens.css`, `website/src/styles/global.css`, `website/src/App.test.tsx`
- Create: `LICENSE` at the repo root
- Modify: `website/vite.config.ts`, `website/package.json`, `website/src/App.tsx`, `website/src/main.tsx`, `README.md` (licence line plus website section)

**Interfaces:**
- Produces:
  - `config.ts` exports:
    - `REPO = 'venkataPhanindraVutla/Prolens'`
    - `SITE_URL = 'https://venkataphanindravutla.github.io/Prolens/'`
    - `FORMSPREE_ID: string | null = null`
    - `FALLBACK_RELEASE: ReleaseInfo` (type from Task 7; define the interface here in `config.ts`, and Task 7 re-exports it):

      ```ts
      { version: 'v1.0', url: `https://github.com/${REPO}/releases/latest`, sizeBytes: 13353471,
        sha256: 'd1cb1834e1c44dbdac9ef292bed718708adf922e833b106a65dbdd4f6af91dbe', source: 'fallback' }
      ```
  - CSS custom properties `--ink --paper --pink --lime --grey-1..--grey-4 --font-display --font-mono`.
  - `App.tsx` renders `<main>` with sections in spec order. Sections not built yet are omitted.

- [ ] **Step 1:** Run `npm create vite@latest website -- --template react-ts` from the repo root, then `npm install` in `website/`. Delete the template's demo assets, logos and demo CSS.
- [ ] **Step 2:** Add the dev dependencies: `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`.
  - Add the font dependencies `@fontsource/space-grotesk` (400, 500, 700) and `@fontsource/jetbrains-mono` (400, 600).
  - Scripts: `"test": "vitest run"`.
  - In `vite.config.ts`, set `base: '/Prolens/'` and `test: { environment: 'jsdom', setupFiles: ['./src/test-setup.ts'] }`; the setup file imports `@testing-library/jest-dom/vitest`.
- [ ] **Step 3: Write the failing test** `App.test.tsx`: `render(<App />)`, then `expect(screen.getByRole('main')).toBeInTheDocument()`.
- [ ] **Step 4:** Run `npm test`. Expected: FAIL until `App` renders `<main>`.
- [ ] **Step 5:** Write the tokens, the global reset and the font imports in `main.tsx`; `App` renders `<main>`. `global.css` provides:
  - `body { background: var(--ink); color: var(--paper) }`
  - a lime `:focus-visible` outline with 2 px offset
  - a `.mono` utility
- [ ] **Step 6:** Write `config.ts` as above. Add `LICENSE` with the standard Apache-2.0 text, `Copyright 2026 Venkata Phanindra Vutla`.
  - In the README, add a "Licence" line and a "Website" section: `cd website && npm install && npm run dev`.
- [ ] **Step 7:** Run `npm test && npm run build`. Expected: PASS, and `dist/` is built.
- [ ] **Step 8: Commit:** `git add LICENSE README.md website && git commit -m "Scaffold the website and add the Apache-2.0 licence"`

### Task 2: Photo maths and formatting

**Files:**
- Create: `website/src/lib/format.ts`, `website/src/lib/photomath.ts`
- Test: `website/src/lib/format.test.ts`, `website/src/lib/photomath.test.ts`

**Interfaces:**
- Produces:
  - `format.ts`: `fixed(v, decimals)`, `trim(v, decimals)`, `shutter(t)`, `aperture(n)`, `distance(mm)`, `ev(ev)`. All return `string` and match `PhotoFormat` in `core/photomath/PhotoMath.kt` exactly.
  - `photomath.ts`:
    - `interface Sensor { id: string; name: string; w: number; h: number; mp: number }`
    - `SENSORS: Sensor[]`:
      - `{id:'ff', name:'Full frame', w:35.9, h:23.9, mp:33}`
      - `{id:'apsc', name:'APS-C', w:23.5, h:15.6, mp:40.2}`
      - `{id:'phone', name:'Phone main camera', w:9.6, h:7.2, mp:50}`
    - `coc(s)` (diagonal / 1500), `cropFactor(s)`, `hyperfocal(f, n, c)`
    - `dof(f, n, c, sMm): { hyperfocal: number; near: number; far: number; total: number }`, where `far` is `Infinity` when `s >= hyperfocal`
    - `APERTURES: number[]` (copy the Kotlin list)
    - `nearest(scale: number[], v: number): number`, nearest in stops

- [ ] **Step 1: Write the failing tests** with the Kotlin vectors:
  - `coc(ff)` is 0.0288 ± 0.0005.
  - `dof(50, 8, coc(ff), 3000)`: near 2360 ± 15, far 4120 ± 25, hyperfocal / 1000 is 10.9 ± 0.05.
  - `dof(24, 8, c, hyperfocal(24, 8, c) + 1).far === Infinity`.
  - `shutter(1/250) === '1/250'`, `shutter(2) === '2s'`, `shutter(0.5) === '0.5s'`.
  - `aperture(2.8) === 'f/2.8'`, `aperture(8) === 'f/8'`.
  - `distance(2360) === '2.36 m'`, `distance(Infinity) === '∞'`, `ev(0.3) === '+0.3 EV'`.
  - `nearest(APERTURES, 7.5) === 8`.
- [ ] **Step 2:** Run `npx vitest run src/lib`. Expected: FAIL (modules missing).
- [ ] **Step 3:** Port the functions line for line from `PhotoMath.kt` and `PhotoFormat`.
- [ ] **Step 4:** Run `npx vitest run src/lib`. Expected: PASS.
- [ ] **Step 5: Commit:** "Port depth-of-field maths and photo formatting"

### Task 3: SunCalc, time zones and cities

**Files:**
- Create: `website/src/lib/suncalc.ts`, `website/src/lib/time.ts`, `website/src/lib/cities.ts`
- Test: `website/src/lib/suncalc.test.ts`, `website/src/lib/time.test.ts`

**Interfaces:**
- Produces:
  - `suncalc.ts`, keeping the BSD-2 header from `SunCalc.kt` verbatim:
    - `sunPosition(ms, lat, lon): { azimuth: number; altitude: number }`, where azimuth 0 is north and runs clockwise
    - `sunTimes(noonMs, lat, lon): SunTimes`, with the same field names as the Kotlin `SunTimes` and `number | null` times
    - `type LightPhase = 'Night' | 'Astro' | 'Nautical' | 'Blue' | 'Golden' | 'Day'`
    - `lightPhase(altitude): LightPhase`, with the bands from `LightPhase.of`
  - `time.ts`:
    - `noonIn(tz: string, nowMs: number): number`: epoch ms of 12:00 local time in `tz` on the calendar date that `nowMs` falls on in `tz`. Use `Intl.DateTimeFormat` parts; no date library.
    - `formatTime(ms: number | null, tz: string): string` returns `'HH:mm'` (24 h). It returns `'—'` for null.
    - `browserZone(): string`
  - `cities.ts`: `interface City { name: string; lat: number; lon: number; tz: string }` and `CITIES: City[]`, in this order:
    - London 51.5074, −0.1278, Europe/London
    - New York 40.7128, −74.006, America/New_York
    - San Francisco 37.7749, −122.4194, America/Los_Angeles
    - Hyderabad 17.385, 78.4867, Asia/Kolkata
    - Tokyo 35.6762, 139.6503, Asia/Tokyo
    - Sydney −33.8688, 151.2093, Australia/Sydney
    - Cape Town −33.9249, 18.4241, Africa/Johannesburg
    - Reykjavík 64.1466, −21.9426, Atlantic/Reykjavik
    - Tromsø 69.65, 18.96, Europe/Oslo
  - `cityForZone(tz): City`: the city whose `tz` matches, otherwise London.

- [ ] **Step 1: Write the failing tests:**
  - **London midsummer** (`noon = 1782043200000`):
    - sunrise is `noon − 496 min` ± 3 min
    - sunset is `noon + 501 min` ± 3 min
    - solar-noon altitude is 61.9 ± 0.3
    - |azimuth − 180| < 1.5
  - **Polar cases:**
    - Reykjavík midsummer: `astroDusk` is null
    - Tromsø `1797854400000`: `sunrise` is null
  - **Phases:** `lightPhase(2) === 'Golden'`, `lightPhase(-5) === 'Blue'`, `lightPhase(-30) === 'Night'`.
  - **Time helpers:**
    - `noonIn('Asia/Kolkata', Date.UTC(2026,5,21,3)) === Date.UTC(2026,5,21,6,30)`
    - `noonIn('Europe/London', Date.UTC(2026,5,21,3)) === Date.UTC(2026,5,21,11)`
    - `noonIn('America/Los_Angeles', Date.UTC(2026,5,21,3)) === Date.UTC(2026,5,20,19)`: it's still the 20th there
    - `formatTime(Date.UTC(2026,5,21,3,44), 'Europe/London') === '04:44'`
    - `formatTime(null, 'Europe/London') === '—'`
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Port `SunCalc.kt` (sun parts only; skip the moon) and write `time.ts` and `cities.ts`.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5: Commit:** "Port SunCalc and add time-zone-correct time helpers"

### Task 4: Grids and the grid overlay

**Files:**
- Create: `website/src/lib/grids.ts`, `website/src/components/GridOverlay.tsx`
- Test: `website/src/lib/grids.test.ts`, `website/src/components/GridOverlay.test.tsx`

**Interfaces:**
- Produces:
  - `grids.ts`:
    - ```ts
      type GridShape = { kind:'line'; x1:number; y1:number; x2:number; y2:number; alpha:number; dashed:boolean }
                     | { kind:'poly'; points:[number,number][]; closed:boolean; alpha:number; dashed:boolean }
                     | { kind:'circle'; cx:number; cy:number; r:number; alpha:number; dashed:boolean }
                     | { kind:'rect'; x:number; y:number; w:number; h:number; alpha:number; dashed:boolean }
      ```
    - `GRID_GROUPS`, with the labels from `GridGroup`
    - `interface GridSpec { id; group; name; desc; bestFor }`
    - `GRIDS: GridSpec[]` (all 23, same ids and order, copy verbatim from `Grids.kt`)
    - `gridShapes(id: string, w: number, h: number): GridShape[]`
  - `<GridOverlay id: string; width: number; height: number; color?: string />` renders an `<svg viewBox="0 0 w h" aria-hidden>`.
    - It uses `clipPath` to the frame, `stroke` = `color` (default `var(--paper)`), `strokeOpacity` = `alpha × 0.8`, and `strokeDasharray="6 5"` when `dashed`.
    - Circles of radius ≤ 4 are filled dots.

- [ ] **Step 1: Write the failing tests** from `GridsTest`:
  - Every one of the 23 ids returns at least one shape at 300×400, and the ids are unique.
  - `thirds` at 300×600 has 4 lines and 4 circles, including a vertical line at x = 100.
  - In `dynamic` at 300×200, the reciprocal from (300, 0) ends at x = 300 − 200²/300 ± 0.01 and y = 200.
  - `GridOverlay` for `thirds` renders 4 `<line>` and 4 `<circle>` elements.
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Port `Grids.kt` `Builder` line for line, including the `spiral`, `family`, `clipRay` and `foot` helpers. Then write `GridOverlay`.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5: Commit:** "Port the 23 composition grids and an SVG overlay"

### Task 5: Exposure analysis

**Files:**
- Create: `website/src/lib/analysis.ts`
- Test: `website/src/lib/analysis.test.ts`

**Interfaces:**
- Produces:
  - `luma(rgba: Uint8ClampedArray): Uint8Array`, using Rec.601: `round(0.299r + 0.587g + 0.114b)`.
  - `histogram(l: Uint8Array): number[]`: 64 bins, `bin = min(63, v >> 2)`.
  - `zebra(l, w, h, levelPct = 95): Uint8ClampedArray`: RGBA, with a white stripe at alpha 204 where `((x + y) / 3 | 0) % 2 === 0` and `l >= levelPct / 100 × 255`. Drawn at analysis size, with no 2× scale.
  - `falseColor(v: number): [number, number, number]`. Port `FC_STOPS` and `FC_COLORS`; grey bands use `v × 0.8`; above every stop the colour is `[239, 68, 68]`.
  - `peaking(l, w, h, threshold = 240): Uint8ClampedArray`: RGBA, Sobel `|gx| + |gy| > threshold`, painted `#EF4444` at alpha 235.

- [ ] **Step 1: Write the failing tests:**
  - **Histogram:** an all-255 frame puts every pixel in bin 63; an all-0 frame puts every pixel in bin 0.
  - **False colour:** `falseColor(0)` is `[124,58,237]` (purple), `falseColor(255)` is `[239,68,68]`, and `falseColor(128)` is grey `[102,102,102]`.
  - **Zebra:** in a 6×6 frame of 250, pixel (0,0) has alpha 204 and pixel (3,0) has alpha 0. In a frame of 200, no pixel has alpha above 0.
  - **Peaking:** a 10×10 frame split 0 | 255 down the middle marks column 4 or 5 on interior rows; a flat frame marks nothing.
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Port from `Analysis.kt`.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5: Commit:** "Port histogram, zebras, false colour and focus peaking"

### Task 6: Shared visual components and motion

**Files:**
- Create: `website/src/lib/motion.ts`, `website/src/components/Phone.tsx`, `Scene.tsx`, `CropMarks.tsx`, `ShutterButton.tsx`, `Hud.tsx`, `SectionHeading.tsx` (each with a `.module.css`)
- Test: `website/src/lib/motion.test.ts`, `website/src/components/ShutterButton.test.tsx`

**Interfaces:**
- Produces:
  - `motion.ts`: `useReducedMotion(): boolean` and `useCanHover(): boolean`. Both use `matchMedia` and update on change. `useCanHover` checks `(hover: hover) and (pointer: fine)`.
  - `<Phone tilt?: {x:number;y:number}; children />`: a 9:19.5 phone frame drawn in CSS with an inner screen slot. It applies `rotateX` and `rotateY` from `tilt` (degrees, clamped to ±8).
  - `<Scene kind: SceneKind; className? />`, an SVG viewfinder scene with `type SceneKind = 'golden-coast' | 'city-night' | 'flower-macro' | 'texture-micro' | 'runner' | 'panorama' | 'portrait'`.
    - Each scene is built from gradients and simple shapes in the palette's warm and cool range.
    - `golden-coast` is the default hero scene: low sun, horizon, a figure on a thirds point.
  - `<CropMarks />`: four L-shaped corners, absolutely positioned, for key blocks.
  - `<ShutterButton variant: 'primary' | 'ghost'; href?; onClick?; children />`.
    - It renders `<a>` when `href` is set, otherwise `<button>`.
    - On press it adds class `fired` for 120 ms: a white flash plus `scale(0.96)`. The class isn't added under reduced motion.
    - Primary is a lime fill with ink text; ghost has a 1 px grey border.
  - `<Hud items: {label: string; value: string}[] />`: a mono readout row. Values are lime.
  - `<SectionHeading level?: 2 | 3; children />`: the spec's pull-focus effect.
    - It starts at `filter: blur(6px)`. The first time it is 40% in view (IntersectionObserver), it eases to sharp over 400 ms.
    - Under reduced motion, or with no IntersectionObserver, it renders sharp.
    - Every section heading uses it.

- [ ] **Step 1: Write the failing tests:**
  - With `matchMedia` mocked to match `reduce`, `useReducedMotion()` returns true; with no match, it returns false.
  - `ShutterButton` with `onClick` calls it once per click and has class `fired` right after the click.
  - With reduced motion mocked, `fired` is never added.
  - With reduced motion mocked, `SectionHeading` renders without the `blurred` class.
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Implement. The focus-square hover state is defined once in `global.css` as `.focusable`:
  - On hover and on `:focus-visible`, four lime corner ticks appear via `::before` and `::after` with `background` gradients.
  - Interactive chips and cards use that class.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5: Commit:** "Add phone frame, scenes, crop marks, shutter button and motion hooks"

### Task 7: Release info, GitHub links, Download and Open source sections

**Files:**
- Create: `website/src/lib/release.ts`, `website/src/lib/issues.ts`, `website/src/sections/Download.tsx`, `website/src/sections/OpenSource.tsx`
- Test: `website/src/lib/release.test.ts`, `website/src/lib/issues.test.ts`, `website/src/sections/Download.test.tsx`

**Interfaces:**
- Consumes: `REPO`, `FALLBACK_RELEASE` and `ReleaseInfo` from `config.ts`; `ShutterButton`; `CropMarks`.
- Produces:
  - `release.ts`:
    - ```ts
      interface ReleaseInfo { version: string; url: string; sizeBytes: number; sha256: string | null; source: 'api' | 'fallback' }
      ```
      (re-exported from config)
    - `parseRelease(json: unknown): ReleaseInfo | null` takes the first asset whose name ends in `.apk`.
      - `url` is `browser_download_url`, `version` is `tag_name`, `sizeBytes` is `size`.
      - `sha256` is `digest` with the `sha256:` prefix removed, or null.
      - It returns null if there is no APK asset or the shape is wrong.
    - `fetchRelease(fetchImpl = fetch): Promise<ReleaseInfo>` fetches `https://api.github.com/repos/${REPO}/releases/latest`. On any failure, non-OK status or null parse it returns `FALLBACK_RELEASE`. It never throws.
    - `useRelease(): ReleaseInfo` starts from `FALLBACK_RELEASE` and swaps in the API result. It fetches once per page load, shared through a module-level promise.
    - `formatSize(bytes): string`: decimal MB with one decimal, so `13353471 → '13.4 MB'`.
  - `issues.ts`: `issueUrl(kind: 'feature' | 'bug'): string` builds `https://github.com/${REPO}/issues/new?` with `URLSearchParams`.
    - **feature:**
      - `title: 'Feature: '`
      - `labels: 'enhancement'`
      - body:

        ```
        **What were you shooting?**\n\n**What did you want Prolens to do?**\n\n**How do you do it today?**\n
        ```
    - **bug:**
      - `title: 'Bug: '`
      - `labels: 'bug'`
      - body:

        ```
        **Phone model:**\n**Android version:**\n**Prolens version:**\n\n**Steps:**\n1. \n\n**Expected:**\n\n**What happened:**\n
        ```
  - `releasesUrl = https://github.com/${REPO}/releases` and `repoUrl = https://github.com/${REPO}`, both exported from `issues.ts`.
  - `<Download />` (section `id="download"`):
    - the big primary button "Download Prolens {version} for Android" (`href={info.url}`)
    - a mono line: `{formatSize} · SHA-256 {first 8}…{last 8}`. The full hash is in a `title` and a copy button. The checksum part is hidden when `sha256` is null.
    - three install steps as an ordered list (this is a real sequence):
      1. Download the APK.
      2. Allow installs from your browser when Android asks.
      3. Open Prolens and grant camera access.
  - `<OpenSource />`:
    - two or three lines on what's in the repo (Kotlin Multiplatform app, the maths, Apache-2.0)
    - three actions: **Request a feature** (primary, `issueUrl('feature')`), **Report a bug** (`issueUrl('bug')`), **Test builds** (`releasesUrl`)
    - all external links use `target="_blank" rel="noopener"`

- [ ] **Step 1: Write the failing tests** (Review Focus 1):
  - `parseRelease` on the real v1.0 shape (one asset with `digest`) returns `sha256` without the prefix and `sizeBytes` 13353471.
  - `parseRelease` with no APK asset returns null, and so does `parseRelease({})`.
  - With `digest` missing, `sha256` is null.
  - `fetchRelease` returns `FALLBACK_RELEASE` for a 403 response and for a rejected fetch.
  - `formatSize(13353471) === '13.4 MB'`.
  - `issueUrl('feature')` contains `labels=enhancement` and `title=Feature%3A+`, and `issueUrl('bug')` contains `labels=bug`.
  - `Download` rendered with the fallback shows a link to `.../releases/latest` with the text "Download Prolens v1.0 for Android". It has no "undefined" or "NaN" in its text content.
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Implement and add both sections to `App.tsx`.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5: Commit:** "Add the download and open-source sections with live release info"

### Task 8: Waitlist

**Files:**
- Create: `website/src/lib/waitlist.ts`, `website/src/sections/Waitlist.tsx`
- Test: `website/src/lib/waitlist.test.ts`, `website/src/sections/Waitlist.test.tsx`

**Interfaces:**
- Consumes: `FORMSPREE_ID` and `releasesUrl`.
- Produces:
  - `type Store = 'play' | 'iphone' | 'both' | ''`.
  - `submitWaitlist(id: string, email: string, store: Store, fetchImpl = fetch): Promise<'ok' | 'error'>`:
    - POSTs JSON `{ email, store }` to `https://formspree.io/f/${id}` with `Accept: application/json`.
    - It returns `'ok'` only for `res.ok`, and `'error'` for anything else, including a throw.
  - `<Waitlist formId?: string | null />`, defaulting to `FORMSPREE_ID`. It sits inside the Download section, visually quieter.
    - **With an ID:**
      - an email input (`type="email" required`, labelled "Email")
      - an optional "Which store?" radio group (Play Store, iPhone, Both)
      - a ghost button "Join the waitlist"
      - the line "One email when Prolens reaches a store. Nothing else."
    - **States:**
      - `idle`
      - `sending`: the button is disabled and reads "Joining…"
      - `done`: the form is replaced by "You're on the list."
      - `error`: "Couldn't reach the waitlist service. Check your connection and try again." with the button back and the email kept
    - **Without an ID:** "Want the store version? Watch releases on GitHub to hear first.", linking to `releasesUrl`.

- [ ] **Step 1: Write the failing tests** (Review Focus 5):
  - `submitWaitlist` returns `'error'` on a 422 and on a rejected fetch, and `'ok'` on a 200. The request body is `{"email":"a@b.co","store":"play"}`.
  - `<Waitlist formId={null} />` shows the GitHub link and no form.
  - With an ID and a fetch that never resolves, clicking twice calls fetch once.
  - With a failing fetch, the error text appears and the input still holds the email.
  - With a 200, "You're on the list." appears.
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5: Commit:** "Add the waitlist form with Formspree and a GitHub fallback"

### Task 9: Hero and proof strip

**Files:**
- Create: `website/src/sections/Hero.tsx`, `website/src/sections/ProofStrip.tsx` (each with a `.module.css`)
- Test: `website/src/sections/Hero.test.tsx`

**Interfaces:**
- Consumes:
  - `Phone`, `Scene`, `GridOverlay`, `ShutterButton`
  - `useReducedMotion`, `useCanHover`
  - `useRelease`, `formatSize`
  - `repoUrl`
- Produces:
  - `<Hero />`, matching mockup C:
    - an `<h1>` with accessible name "Prolens": a giant solid "PRO" over an outlined "LENS" (`-webkit-text-stroke`, transparent fill)
    - the hero line
    - **Download for Android** (primary, `href="#download"`) and **View on GitHub** (ghost, `repoUrl`)
  - **Light leak:** a pink radial blob with `mix-blend-mode: screen`.
    - It follows the pointer through a CSS variable set in a `requestAnimationFrame` loop, eased 12% per frame.
    - Without hover, it drifts on a 20 s CSS keyframe path.
    - Under reduced motion it stays fixed, upper right of the wordmark.
  - **Phone:** shows `Scene kind="golden-coast"` with the thirds overlay and a `Hud` (ISO 100, 1/250, f/1.9, 24 mm, +0.3 EV).
    - It tilts toward the pointer, up to ±8°, only when `useCanHover() && !useReducedMotion()`.
  - **Feature rail:** lime, `writing-mode: vertical-rl`, on the right edge. Its text is "GRIDS · LEVEL · PEAKING · ZEBRAS · NIGHT · PANO · SLO-MO", repeated and scrolling upward on a 30 s linear loop. The loop stops under reduced motion. The rail is `aria-hidden` because it repeats the chapters.
  - **Mobile, under 720 px:** the wordmark scales with `clamp()`, the phone sits below the buttons without tilt, and the rail becomes a horizontal band under the hero.
  - `<ProofStrip />`: the exact proof line from Global Constraints, in mono, with `{size}` from `formatSize(useRelease().sizeBytes)`.

- [ ] **Step 1: Write the failing tests:**
  - The heading's accessible name is "Prolens".
  - The hero line text is present exactly.
  - The "Download for Android" link has `href="#download"`, and "View on GitHub" points to the repo URL.
  - ProofStrip text contains `Android 7+ · 13.4 MB` with the fallback release.
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Implement and add both sections to `App.tsx` first in the page order. Use the mockup file for proportions.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5: Check by eye:** run `npm run dev` and screenshot at 1440×900 and 360×780.
  - Pink and lime read as signals.
  - No horizontal scroll at 360.
- [ ] **Step 6: Commit:** "Add the PRO/LENS hero and proof strip"

### Task 10: The pinned-phone story

**Files:**
- Create: `website/src/lib/location.ts`, `website/src/sections/story/Story.tsx`, `Compose.tsx`, `Level.tsx`, `Expose.tsx`, `Modes.tsx`, `Light.tsx` (with CSS modules)
- Test: `website/src/sections/story/Story.test.tsx`, `Level.test.tsx`, `Light.test.tsx`

**Interfaces:**
- Consumes: Tasks 3–6 (`sunTimes`, `sunPosition`, `lightPhase`, `noonIn`, `formatTime`, `browserZone`, `CITIES`, `cityForZone`, `gridShapes`/`GridOverlay`, `luma`/`histogram`/`zebra`/`falseColor`/`peaking`, `Phone`, `Scene`).
- Produces:
  - `<Story />`: on screens 900 px wide or more, a two-column layout. The `Phone` sits in a `position: sticky` column; the chapters scroll in the other.
    - An `IntersectionObserver` (threshold 0.6) picks the active chapter.
    - The phone screen crossfades (250 ms, instant under reduced motion) to that chapter's screen.
    - Under 900 px, each chapter renders its own small phone above its text, and nothing is pinned.
    - Each chapter exports `{ id, title, Screen, Controls }`. `Story` maps them in the order Compose, Level, Expose, Modes, Light, and the heading for each is an `<h2>`.
  - **Compose:** six chips (`thirds`, `phi`, `spiral`, `triangles`, `dynamic`, `onePoint`), using the names from `GRIDS`, in a radio group (`role="radiogroup"`). Choosing one redraws `GridOverlay` on the phone, and the chosen grid's `desc` shows under the chips.
  - **Level:**
    - A horizontal drag surface (pointer events, `touch-action: pan-y`) sets the roll from −15° to +15°. The arrow keys move it ±0.5° when focused (`role="slider"`, `aria-valuenow`). It starts at 4.5°.
    - The scene rotates by the roll. The horizon line and the readout ("Roll 4.5°") turn `--lime` when |roll| < 0.5°, which matches the app's threshold.
  - **Expose:**
    - A Canvas 2D photo (270×480: a backlit portrait with a bright sky and dark foreground, so all four tools show something).
    - Four toggle buttons (`aria-pressed`): Histogram, Zebras, False colour, Peaking.
    - Each runs on the canvas `ImageData` through `analysis.ts` and draws onto an overlay canvas. The histogram is drawn as 64 bars in a small panel.
  - **Modes:**
    - A strip in `CaptureMode` order, with Photo selected first. Choosing a mode swaps the phone's `Scene`: Night uses `city-night`, Micro `texture-micro`, Macro `flower-macro`, Photo `golden-coast`, Slo-mo `runner`, Pano `panorama`, Templates `portrait`.
    - A one-line caption per mode, written by you in the spec's voice. Each caption must be true to the app. For example: Night takes a long exposure when the phone has no night mode; Pano is stitched by Prolens; Slo-mo shows only when the phone supports it; Micro and Macro use the closest-focusing lens.
  - `lib/location.ts`:
    - `interface Place { name: string; lat: number; lon: number; tz: string }`
    - `<LocationProvider>` and `useLocation(): { place: Place; setCity(name: string): void; locate(): Promise<'ok' | 'denied' | 'unavailable'> }`
    - It starts at `cityForZone(browserZone())`. `locate()` replaces the place with `{ name: 'Your location', lat, lon, tz: browserZone() }`.
    - `App` wraps the page in `LocationProvider`, and Task 11's `GoldenClock` reads the same place.
  - **Light:**
    - **Location:**
      - Location is set by a "Use my location" button. Geolocation is requested only on click, never on load.
      - If the visitor allows it, the chapter uses their coordinates and `browserZone()`.
      - Otherwise it uses a city `<select>` from `CITIES`, which starts at `cityForZone(browserZone())`.
    - **Timeline:**
      - Today's timeline: a horizontal bar from 00:00 to 24:00 local, with blue and golden bands for morning and evening, and a "now" marker.
      - It shows the times "Golden hour 18:02–18:40", formatted with `formatTime(…, tz)`.
      - When a band's times are null, the text reads "Sun stays down today" if the noon altitude is ≤ −0.833°, otherwise "Sun stays up today".
    - **Credit:** a SunCalc credit line in small text.

- [ ] **Step 1: Write the failing tests** (Review Focus 2, 3, 4):
  - **Story:** five chapters, each with an `<h2>`; clicking the Compose "Golden spiral" chip sets its `aria-checked="true"`.
  - **Level:**
    - initial `aria-valuenow` is `4.5`
    - after ArrowLeft × 9, `aria-valuenow` is `0` and the readout has the `level` class
    - the drag surface's computed style has `touch-action: pan-y`
  - **Light:**
    - With `navigator.geolocation` absent, the city select is shown.
    - Choosing Hyderabad on a fixed date (mock `Date.now` to `Date.UTC(2026,5,21,3)`) shows the evening golden-hour start formatted in Asia/Kolkata. Assert it equals `formatTime(sunTimes(noonIn('Asia/Kolkata', now), 17.385, 78.4867).goldenEveningStart, 'Asia/Kolkata')` and starts with `18:`.
    - Choosing Tromsø on `Date.UTC(2026,11,21,12)` shows "Sun stays down today", and no text contains "Invalid".
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Implement and add `<Story />` to `App.tsx` after the proof strip.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5: Check by eye** at 1440 and 360. Then check on a touch viewport (Playwright with `hasTouch`) that dragging in Level still lets the page scroll vertically.
- [ ] **Step 6: Commit:** "Add the pinned-phone story with five playable chapters"

### Task 11: Built for every phone, and the live toolkit

**Files:**
- Create: `website/src/lib/profiles.ts`, `website/src/sections/EveryPhone.tsx`, `website/src/sections/toolkit/Toolkit.tsx`, `DofCalc.tsx`, `GridLibrary.tsx`, `GoldenClock.tsx`
- Test: `website/src/lib/profiles.test.ts`, `website/src/sections/toolkit/DofCalc.test.tsx`, `website/src/sections/toolkit/GridLibrary.test.tsx`

**Interfaces:**
- Consumes: `photomath`, `format`, `GRIDS`/`GridOverlay`, `Scene`, `suncalc`/`time`/`cities`.
- Produces:
  - `profiles.ts`:
    - ```ts
      interface Lens { role: 'Ultra-wide'|'Wide'|'Telephoto'|'Front'; zoom: number; mm: number; mp: number; focusFromCm: number | null }
      interface PhoneProfile { id; name; note?: string; lenses: Lens[]; manual: boolean; night: 'phone' | 'prolens'; sloMoFps: number[]; portraitBlur: boolean }
      ```
    - `PROFILES`:
      - **one-camera, "One camera":**
        - Lenses: Wide 1× 26 mm 50 MP from 10 cm; Front 24 mm 8 MP fixed focus.
        - Manual no, night prolens, no slo-mo, no blur.
      - **hidden-uw, "Ultra-wide kept from apps":**
        - Lenses: Wide 1× 24 mm 50 MP from 8 cm; Front 22 mm 16 MP fixed focus.
        - Note: "This phone has a 0.6× camera, but doesn't share it with apps. Prolens only offers what it can use."
        - Manual yes, night prolens, 120 fps, no blur.
      - **three-camera, "Three cameras":**
        - Lenses: Ultra-wide 0.6× 14 mm 50 MP from 3 cm; Wide 1× 23 mm 50 MP from 10 cm; Telephoto 3× 70 mm 12 MP from 35 cm; Front 21 mm 32 MP fixed focus.
        - Manual yes, night phone, 120 and 240 fps, blur yes.
    - `modesFor(p): string[]` returns the `CaptureMode` labels in order, dropping "Slo-mo" when `sloMoFps` is empty. This is the rule in `availableModes`.
  - `<EveryPhone />`:
    - a short intro
    - a segmented switch of the three profiles
    - a "This phone" card in the app's layout:
      - a lens row per lens, `"{role} · {zoom}×"` with detail `"{mm} mm · {mp} MP · focus from {n} cm"` or `"fixed focus"`
      - rows for Manual exposure, Night (`"Phone's night mode"` or `"Prolens long exposure"`), Slo-mo (`"120 · 240 fps"` or `"Not available"`) and Portrait blur
      - the mode strip from `modesFor`
  - `<DofCalc />`:
    - a sensor select (`SENSORS`, default Full frame)
    - focal slider: 4–200 mm, default 50
    - aperture slider over the `APERTURES` indices, default f/8
    - distance slider: log scale 0.3–30 m, default 3 m
    - Each slider is a labelled `<input type="range">`.
    - The output is a mono `Hud`: Near, Far, Total, Hyperfocal, formatted with `distance()`. Far shows "∞" at or past the hyperfocal distance.
    - A thin bar diagram shows the sharp zone.
  - `<GridLibrary />`:
    - a `Scene` with the selected grid
    - all 23 grids as chips grouped under the `GRID_GROUPS` labels (`role="radiogroup"`)
    - the name, `desc` and "Best for: {bestFor}"
  - `<GoldenClock />`:
    - a 24 h dial: an SVG ring with the night, blue, golden and day arcs for today, plus a "now" hand
    - it reads the place from `useLocation()` (Task 10), so changing the city in the Light chapter updates the clock
  - `<Toolkit />` lays out the three; `<EveryPhone />` and `<Toolkit />` go into `App` after `<Story />`.

- [ ] **Step 1: Write the failing tests:**
  - **Profiles:**
    - `modesFor(one-camera)` has no "Slo-mo"
    - `modesFor(three-camera)` equals `['Night','Micro','Macro','Photo','Slo-mo','Pano','Templates']`
  - **DofCalc defaults:** for full frame, 50 mm, f/8 and 3 m, the Near and Far values equal `distance(dof(50, 8, coc(ff), 3000).near)` and `.far`. These start `2.3` and `4.1`.
  - **DofCalc far limit:** setting the distance slider to its maximum (30 m, past the 10.9 m hyperfocal) shows Far `∞`.
  - **GridLibrary:** 23 radio chips, and choosing "Harmonic armature" shows its `desc`.
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5: Commit:** "Add the every-phone card and the live toolkit"

### Task 12: Footer, meta, OG image, deploy and final checks

**Files:**
- Create:
  - `website/src/sections/Footer.tsx`
  - `website/public/favicon.svg`
  - `website/scripts/og.svg`, `website/scripts/og.mjs`
  - `website/public/og.png` (generated, committed)
  - `.github/workflows/website.yml`
- Modify: `website/index.html`, `website/package.json` (`"og": "node scripts/og.mjs"`)
- Test: `website/src/sections/Footer.test.tsx`

**Interfaces:**
- Consumes: `repoUrl`, `SITE_URL`.
- Produces:
  - `<Footer />`:
    - "Apache-2.0"
    - a GitHub link
    - credits: "Sun times: SunCalc by Vladimir Agafonkin (BSD-2)", "App type: Geist", "Site type: Space Grotesk, JetBrains Mono"
    - "Shoot like you mean it." set large
  - `index.html`:
    - `<title>Prolens: a pro camera kit for Android</title>`
    - a meta description from the hero line
    - `og:title`, `og:description`, `og:image` = `${SITE_URL}og.png` (absolute), `og:url`, `twitter:card=summary_large_image`
    - `theme-color #0B0B0B`
    - `<link rel="icon" href="favicon.svg">`
  - `favicon.svg`: a lime focus square with a pink centre dot on ink, readable at 16 px.
  - `og.svg` (1200×630): the PRO/LENS poster (pink leak, a tilted phone outline with a thirds grid, the lime rail).
    - `og.mjs` renders it to `public/og.png` with `@resvg/resvg-js`, loading the Space Grotesk font file from `node_modules/@fontsource/space-grotesk/files/`.
  - `website.yml`:
    - Triggers: `on: push: branches: [main], paths: ['website/**', '.github/workflows/website.yml']` and `workflow_dispatch`.
    - Permissions: `pages: write`, `id-token: write`, `contents: read`.
    - Job steps: `actions/checkout`, `actions/setup-node` (node 24, npm cache on `website/package-lock.json`), `npm ci`, `npm test`, `npm run build` (working-directory `website`), `actions/configure-pages`, `actions/upload-pages-artifact` (path `website/dist`), then `actions/deploy-pages` in a `deploy` job with environment `github-pages`.
    - Use each action's current major version.

- [ ] **Step 1: Write the failing test:** Footer contains "Apache-2.0", "SunCalc" and "Shoot like you mean it.", plus a link to the repo.
- [ ] **Step 2:** Run the test. Expected: FAIL.
- [ ] **Step 3:** Implement the Footer, `index.html` meta, the favicon, the OG script and the workflow. Run `npm run og` and open `public/og.png` to check it.
- [ ] **Step 4:** Run `npm test && npm run build`. Expected: all tests pass and `dist/` contains `og.png` and `favicon.svg`.
- [ ] **Step 5: Final checks** on `npm run preview`:
  - Run a Lighthouse mobile audit. Pass: performance ≥ 90, accessibility ≥ 95. Fix and re-run until it passes, then record the scores in the commit message.
  - Keyboard-only pass through every section; every control is reachable and visibly focused.
  - Turn reduced motion on: no leak following, no tilt, no rail motion, instant crossfades, everything still usable.
  - Check 360 px width for horizontal scroll: `document.documentElement.scrollWidth <= 360`.
- [ ] **Step 6: Commit:** "Add footer, social image, favicon and the Pages workflow"
- [ ] **Step 7: Stop and ask the user** before:
  - pushing to `origin/main`
  - enabling Pages with the "GitHub Actions" source (`gh api -X POST repos/venkataPhanindraVutla/Prolens/pages -f build_type=workflow`)
  - setting the repo's homepage to `SITE_URL`

  After they approve, push, watch the workflow run, then open the live URL. Confirm that the download button shows v1.0 from the API (`source: 'api'`) and that `og.png` loads.
