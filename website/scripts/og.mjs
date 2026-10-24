// Renders scripts/og.svg to public/og.png (1200 × 630) with the site's typefaces.
import { Resvg } from '@resvg/resvg-js'
import { readFileSync, writeFileSync } from 'node:fs'

const font = (p) => new URL(`../node_modules/@expo-google-fonts/${p}`, import.meta.url).pathname
const svg = readFileSync(new URL('./og.svg', import.meta.url), 'utf8')
const png = new Resvg(svg, {
  fitTo: { mode: 'width', value: 1200 },
  font: {
    loadSystemFonts: false,
    defaultFontFamily: 'Space Grotesk',
    fontFiles: [
      font('space-grotesk/400Regular/SpaceGrotesk_400Regular.ttf'),
      font('space-grotesk/700Bold/SpaceGrotesk_700Bold.ttf'),
      font('jetbrains-mono/600SemiBold/JetBrainsMono_600SemiBold.ttf'),
      font('jetbrains-mono/700Bold/JetBrainsMono_700Bold.ttf'),
    ],
  },
}).render()
writeFileSync(new URL('../public/og.png', import.meta.url), png.asPng())
console.log(`og.png ${png.width}×${png.height}`)
