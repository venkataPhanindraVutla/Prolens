import { useState } from 'react'
import GridOverlay from '../../components/GridOverlay'
import Photo from '../../components/Photo'
import { histogram } from '../../lib/analysis'
import { CITIES } from '../../lib/cities'
import { daylight } from '../../lib/daylight'
import { distance, trim } from '../../lib/format'
import { appGradient, coordText, dateText, lightRows, PHASE_NAMES } from '../../lib/lightView'
import { APERTURES, coc, cropFactor, diffractionN, dof, pixelPitchUm, type Sensor } from '../../lib/photomath'
import { RECIPES } from '../../lib/recipes'
import { lightPhase, sunPosition } from '../../lib/suncalc'
import { useNow } from '../../lib/time'
import { AppLightScreen, Button, Card, KvList, Screen, Segmented, StatGrid } from '../AppScreens'
import AppViewfinder from '../AppViewfinder'
import { Icon, type IconName } from '../icons'
import ui from '../app.module.css'

/* Viewfinder: tap a mode or a zoom chip, as on the phone. */

const MODE_PHOTO: Record<string, string> = { Night: 'night', Micro: 'micro', Macro: 'macro', Photo: 'hero', 'Slo-mo': 'slomo', Pano: 'pano', Templates: 'templates' }
const HIST = histogram(Uint8Array.from({ length: 4096 }, (_, i) => Math.round(40 + 60 * Math.sin(i / 300) ** 2 + (i % 7) * 18 + (i > 3000 ? 110 : 0)) % 256))

export function LiveViewfinder() {
  const [mode, setMode] = useState('Photo')
  const [zoom, setZoom] = useState(1)
  const scale = 1 + (zoom - 0.6) * 0.5
  return (
    <AppViewfinder
      preview={
        <div key={mode} className={ui.livePreview} style={{ transform: `scale(${scale})` }}>
          <Photo id={MODE_PHOTO[mode]} sizes="320px" />
        </div>
      }
      overlay={<GridOverlay id="thirds" width={412} height={549} variant="app" />}
      histogram={HIST}
      chips={[{ text: 'Roll 0.0° · Pitch 0°', tone: 'success' }, { text: 'Eye level' }]}
      mode={mode}
      zoom={{ presets: [0.6, 1, 2, 5], active: zoom }}
      onMode={setMode}
      onZoom={setZoom}
    />
  )
}

/* Toolkit: each card opens its screen. */

export function LiveToolkit({ onOpen }: { onOpen: (screen: string) => void }) {
  const cards: [IconName, string, string][] = [
    ['calculator', 'Calculators', 'Depth of field, blur, exposure, ND, astro, field of view and flash.'],
    ['sun', 'Light', 'Golden and blue hour, the sun’s path and direction, and the moon.'],
    ['book', 'Coach', 'Genre recipes, camera angles, lighting patterns and composition.'],
    ['aperture', 'Gear', 'Your bodies and lenses, and what this phone’s cameras can do.'],
  ]
  return (
    <Screen
      title="Toolkit"
      trailing={
        <Button variant="ghost" small icon="camera">
          Back to camera
        </Button>
      }
    >
      <div className={ui.toolkitGrid}>
        {cards.map(([icon, t, d]) => (
          <button key={t} type="button" className={`${ui.toolkitCard} ${ui.tap}`} aria-label={`Open ${t}`} onClick={() => onOpen(t)}>
            <span className={ui.iconTile}>
              <Icon name={icon} />
            </span>
            <span className={ui.cardTitle}>{t}</span>
            <span className={ui.small}>{d}</span>
          </button>
        ))}
      </div>
    </Screen>
  )
}

/* Calculators: depth of field for the app's default Sony A7 IV with a 24–70mm f/2.8. */

const A7IV: Sensor = { id: 'a7iv', name: 'Sony A7 IV', w: 35.9, h: 23.9, mp: 33 }
const LENS_APERTURES = APERTURES.filter((n) => n >= 2.8 && n <= 22)
const D_MIN = 500
const D_MAX = 30_000

function RangeField({ label, value, min, max, step = 1, at, onChange }: { label: string; value: string; min: number; max: number; step?: number; at: number; onChange: (v: number) => void }) {
  return (
    <label className={ui.slider}>
      <span className={ui.sliderHead}>
        <span>{label}</span>
        <span className={ui.small}>{value}</span>
      </span>
      <input type="range" className={ui.range} aria-label={label} min={min} max={max} step={step} value={at} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  )
}

export function LiveCalculators() {
  const [ai, setAi] = useState(0)
  const [focal, setFocal] = useState(35)
  const [mm, setMm] = useState(3000)
  const n = LENS_APERTURES[ai]
  const d = dof(focal, n, coc(A7IV), mm)
  const pos = Math.round((Math.log(mm / D_MIN) / Math.log(D_MAX / D_MIN)) * 100)
  return (
    <Screen title="Calculators" tab="Calculators">
      <div className={ui.gearLine}>
        <span className={ui.small}>Sony A7 IV · 24–70mm f/2.8 at {focal} mm</span>
        <Button variant="ghost" small>
          Change
        </Button>
      </div>
      <Segmented items={['Depth of field', 'Background blur', 'Exposure', 'ND filter']} selected="Depth of field" />
      <Card>
        <RangeField label="Aperture" value={`f/${trim(n, 1)}`} min={0} max={LENS_APERTURES.length - 1} at={ai} onChange={setAi} />
        <RangeField label="Focal length" value={`${focal} mm`} min={24} max={70} at={focal} onChange={setFocal} />
        <RangeField label="Subject distance" value={distance(mm)} min={0} max={100} at={pos} onChange={(v) => setMm(D_MIN * (D_MAX / D_MIN) ** (v / 100))} />
      </Card>
      <Card title="Sharp zone">
        <StatGrid
          stats={[
            [distance(d.near), 'Near limit'],
            [distance(d.far), 'Far limit'],
            [distance(d.total), 'Total depth of field'],
            [distance(d.hyperfocal), 'Hyperfocal distance'],
          ]}
        />
      </Card>
    </Screen>
  )
}

/* Light: the city chips from the app's "Change" panel, with today's real times. */

const LIGHT_CITIES = ['London', 'New York', 'Tokyo', 'Hyderabad', 'Sydney', 'Reykjavík']

export function LiveLight() {
  const [name, setName] = useState('London')
  const place = CITIES.find((c) => c.name === name)!
  const clock = useNow()
  const now = clock ?? 0
  const d = daylight(place, now)
  const phase = lightPhase(sunPosition(now, place.lat, place.lon).altitude)
  return (
    <AppLightScreen
      place={place.name}
      coords={coordText(place.lat, place.lon)}
      date={clock ? dateText(now, place.tz) : '—'}
      phase={clock ? PHASE_NAMES[phase] : 'Reading the sky'}
      next={`Times in ${place.name} time`}
      timeline={clock ? appGradient(d) : undefined}
      rows={clock ? lightRows(d, place.tz) : lightRows(d, place.tz).map(([k]) => [k, '—'])}
      picker={
        <div className={ui.chipRow}>
          {LIGHT_CITIES.map((c) => (
            <button key={c} type="button" className={[ui.cityChip, ui.tap, c === name ? ui.cityOn : ''].join(' ')} aria-pressed={c === name} onClick={() => setName(c)}>
              {c}
            </button>
          ))}
        </div>
      }
    />
  )
}

/* Coach: the recipe list, and a recipe's settings when tapped. */

export function LiveCoach() {
  const [open, setOpen] = useState<number | null>(null)
  if (open !== null) {
    const [name, line] = RECIPES[open]
    const [focal, aperture, shutter] = line.split(' · ')
    return (
      <Screen title="Coach" tab="Coach">
        <button type="button" className={`${ui.button} ${ui.ghost} ${ui.buttonSmall} ${ui.tap}`} onClick={() => setOpen(null)}>
          <Icon name="chevronLeft" size={16} />
          Recipes
        </button>
        <Card title={name}>
          <KvList
            rows={[
              ['Focal length', focal],
              ['Aperture', aperture],
              ['Shutter', shutter],
            ]}
          />
        </Card>
        <span className={`${ui.button} ${ui.primary}`} style={{ width: '100%', justifyContent: 'center' }}>
          Use in viewfinder
        </span>
      </Screen>
    )
  }
  return (
    <Screen title="Coach" tab="Coach">
      <Segmented items={['Recipes', 'Angles', 'Lighting', 'Composition']} selected="Recipes" />
      <Card>
        <div className={ui.list}>
          {RECIPES.slice(0, 9).map(([t, s], i) => (
            <button key={t} type="button" className={`${ui.listRow} ${ui.tap}`} onClick={() => setOpen(i)}>
              <span>
                <span className={ui.rowTitle}>{t}</span>
                <span className={ui.small} style={{ display: 'block' }}>
                  {s}
                </span>
              </span>
              <Icon name="chevronRight" size={16} className={ui.muted} />
            </button>
          ))}
        </div>
      </Card>
    </Screen>
  )
}

/* Gear: pick a body and the sensor numbers follow (core/model/Gear.kt presets). */

const BODIES: Sensor[] = [
  { id: 'sony-a7iv', name: 'Sony A7 IV', w: 35.9, h: 23.9, mp: 33 },
  { id: 'canon-r6ii', name: 'Canon EOS R6 Mark II', w: 35.9, h: 23.9, mp: 24.2 },
  { id: 'nikon-z8', name: 'Nikon Z8', w: 35.9, h: 23.9, mp: 45.7 },
  { id: 'fuji-xt5', name: 'Fujifilm X-T5', w: 23.5, h: 15.6, mp: 40.2 },
  { id: 'om-1', name: 'OM System OM-1', w: 17.4, h: 13.0, mp: 20.4 },
]
const FORMAT: Record<string, string> = { 'fuji-xt5': 'APS-C', 'om-1': 'Micro Four Thirds' }

export function LiveGear() {
  const [id, setId] = useState(BODIES[0].id)
  const b = BODIES.find((x) => x.id === id)!
  return (
    <Screen title="Gear" tab="Gear">
      <Card title="Active setup" desc="Every calculator and the viewfinder lens frame use this profile.">
        <div>
          <div className={ui.rowTitle}>{b.name}</div>
          <div className={ui.small}>24–70mm f/2.8 at 35 mm</div>
        </div>
        <StatGrid
          stats={[
            [`${cropFactor(b).toFixed(2)}×`, 'Crop factor'],
            [`${coc(b).toFixed(3)} mm`, 'Circle of confusion'],
            [`${pixelPitchUm(b).toFixed(1)} µm`, 'Pixel pitch'],
            [`f/${trim(diffractionN(b), 1)}`, 'Diffraction starts near'],
          ]}
        />
      </Card>
      <Card title="Camera bodies">
        <div className={ui.list}>
          {BODIES.map((x) => (
            <button key={x.id} type="button" className={`${ui.listRow} ${ui.tap}`} aria-pressed={x.id === id} onClick={() => setId(x.id)}>
              <span className={[ui.radio, x.id === id ? ui.radioOn : ''].join(' ')} />
              <span style={{ flex: 1 }}>
                <span className={ui.rowTitle}>{x.name}</span>
                <span className={ui.small} style={{ display: 'block' }}>
                  {FORMAT[x.id] ?? 'Full frame'} · {x.mp} MP
                </span>
              </span>
            </button>
          ))}
        </div>
      </Card>
    </Screen>
  )
}
