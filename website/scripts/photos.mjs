// Turns the downloaded originals into responsive WebP files and the data the site reads.
// Usage: node scripts/photos.mjs <folder of originals named <id>.jpg>
// Originals come from each entry's `source` in scripts/photos.json (Wikimedia Commons, 2400 px renders).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import sharp from 'sharp'

const raw = process.argv[2]
if (!raw) throw new Error('Pass the folder that holds the original <id>.jpg files')
const manifest = JSON.parse(readFileSync(new URL('./photos.json', import.meta.url), 'utf8'))
const out = new URL('../public/photos/', import.meta.url)
mkdirSync(out, { recursive: true })

const WIDTHS = [640, 960, 1280, 2000]
const data = []
for (const p of manifest) {
  const src = sharp(`${raw}/${p.id}.jpg`).rotate()
  const meta = await src.metadata()
  const widths = WIDTHS.filter((w) => w < meta.width).concat(Math.min(meta.width, 2400))
  for (const w of widths) await src.clone().resize({ width: w }).webp({ quality: 74, effort: 6 }).toFile(new URL(`${p.id}-${w}.webp`, out).pathname)
  const { dominant } = await src.clone().resize(64).stats()
  const hex = '#' + [dominant.r, dominant.g, dominant.b].map((v) => v.toString(16).padStart(2, '0')).join('')
  const { source: _source, ...rest } = p
  data.push({ ...rest, width: meta.width, height: meta.height, widths, color: hex })
  console.log(p.id, widths.join('/'), hex)
}
writeFileSync(new URL('../src/lib/photos.data.json', import.meta.url), JSON.stringify(data, null, 1) + '\n')
