# Prolens

A pro camera and photography toolkit for Android, built with Kotlin Multiplatform and Compose Multiplatform. The UI and logic are shared, so iOS can be added later as another target.

## What's in it

- **Viewfinder:**
  - Live CameraX preview with 23 composition grids in six families (classic, golden ratio, triangles, diagonals, perspective and 3D, guides).
  - Level and camera-angle label, histogram, clipping warnings, focus peaking, zebras, false colour and waveform.
  - A lens frame for your real camera, the sun's path, and a 3D ground grid.
  - Manual ISO, shutter, white balance, EV and focus.
  - Aspect-ratio crops that are applied to the saved photo.
  - Camera-style rotation: the screen stays put and the icons turn with the phone.
- **Calculators:** depth of field, background blur, exposure, ND filter (with a timer), shutter speed, astro (500 and NPF rules), field of view, flash.
- **Light:** golden and blue hour for any place and date, in that place's time zone, plus the sun path, sun direction, shadow length and the moon.
- **Coach:** 15 genre recipes you can apply to the viewfinder, camera angles and shot sizes, lighting patterns, and composition principles.
- **Gear:** camera bodies and lenses. Every calculator and the lens frame use them.

## Project layout

```
androidApp/                      Android entry point (MainActivity, manifest)
shared/src/commonMain/.../prolens/
  app/                           AppState and the tab shell
  core/designsystem/             Theme (zinc, Geist), components, icons
  core/model/                    Gear, viewfinder settings, recipes
  core/photomath/                Exposure, depth of field, blur, FOV maths
  core/sun/                      Sun and moon positions and times (SunCalc port)
  core/grids/                    Grid geometry and Compose renderer
  core/platform/                 expect/actual seams: camera, sensors, permissions, location
  features/<screen>/             viewfinder, calculators, light, coach, gear
shared/src/androidMain/          CameraX + Camera2 interop, motion sensors, permissions
docs/RESEARCH.md                 The photography research and feature plan
docs/prototype/                  The HTML prototype (open index.html in a browser)
```

## Build

You need JDK 21 and the Android SDK (`local.properties` with `sdk.dir`).

```
./gradlew :shared:testAndroidHostTest      # unit tests
./gradlew :androidApp:assembleDebug        # debug APK
./gradlew :androidApp:assembleRelease      # release APK
```

Release signing reads `prolens.storeFile`, `prolens.storePassword`, `prolens.keyAlias` and `prolens.keyPassword` from `~/.gradle/gradle.properties`. Without them the release builds unsigned. Keystores and passwords are never committed.

## Website

The landing page lives in `website/` (React, Vite, TypeScript) and is published to GitHub Pages.

```
cd website
npm install
npm run dev      # local preview
npm test         # unit tests
```

## Credits

- The sun and moon maths is ported from [SunCalc](https://github.com/mourner/suncalc) by Vladimir Agafonkin (BSD-2-Clause).
- The Geist font is by Vercel (SIL Open Font License).

## Licence

Copyright 2026 the Prolens contributors. Licensed under the [Apache License 2.0](LICENSE).
