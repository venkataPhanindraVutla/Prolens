import type { ReactNode } from 'react'
import { Icon, type IconName } from './icons'
import ui from './app.module.css'

/* Building blocks from core/designsystem/Components.kt */

function Screen({ title, trailing, children, tab }: { title: string; trailing?: ReactNode; children: ReactNode; tab?: Tab }) {
  return (
    <div className={ui.screen}>
      <div className={ui.screenBody}>
        <div className={ui.titleRow}>
          <h3 className={ui.headline}>{title}</h3>
          {trailing}
        </div>
        {children}
      </div>
      {tab && <TabBar active={tab} />}
    </div>
  )
}

function Card({ title, desc, children }: { title?: string; desc?: string; children: ReactNode }) {
  return (
    <section className={ui.card}>
      {(title || desc) && (
        <header className={ui.cardHead}>
          {title && <h4 className={ui.cardTitle}>{title}</h4>}
          {desc && <p className={ui.small}>{desc}</p>}
        </header>
      )}
      {children}
    </section>
  )
}

const StatGrid = ({ stats }: { stats: [string, string][] }) => (
  <div className={ui.statGrid}>
    {stats.map(([v, l]) => (
      <div key={l}>
        <div className={ui.statValue}>{v}</div>
        <div className={ui.small}>{l}</div>
      </div>
    ))}
  </div>
)

const KvList = ({ rows }: { rows: [string, string][] }) => (
  <dl className={ui.kv}>
    {rows.map(([k, v]) => (
      <div key={k}>
        <dt>{k}</dt>
        <dd>{v}</dd>
      </div>
    ))}
  </dl>
)

const Segmented = ({ items, selected }: { items: string[]; selected: string }) => (
  <div className={ui.segmented}>
    {items.map((i) => (
      <span key={i} className={i === selected ? ui.segOn : ''}>
        {i}
      </span>
    ))}
  </div>
)

const Button = ({ children, variant = 'outline', small, icon }: { children: ReactNode; variant?: 'primary' | 'outline' | 'ghost'; small?: boolean; icon?: IconName }) => (
  <span className={[ui.button, ui[variant], small ? ui.buttonSmall : ''].join(' ')}>
    {icon && <Icon name={icon} size={16} />}
    {children}
  </span>
)

const Slider = ({ label, value, at }: { label: string; value: string; at: number }) => (
  <div className={ui.slider}>
    <div className={ui.sliderHead}>
      <span>{label}</span>
      <span className={ui.small}>{value}</span>
    </div>
    <div className={ui.track} style={{ ['--at' as string]: `${at * 100}%` }}>
      <span />
    </div>
  </div>
)

const Select = ({ label, value, hint }: { label: string; value: string; hint?: string }) => (
  <div className={ui.field}>
    <span className={ui.fieldLabel}>{label}</span>
    <span className={ui.select}>
      {value}
      <Icon name="chevronRight" size={16} className={ui.selectChevron} />
    </span>
    {hint && <span className={ui.small}>{hint}</span>}
  </div>
)

type Tab = 'Viewfinder' | 'Calculators' | 'Light' | 'Coach' | 'Gear'
const TABS: [Tab, IconName][] = [
  ['Viewfinder', 'camera'],
  ['Calculators', 'calculator'],
  ['Light', 'sun'],
  ['Coach', 'book'],
  ['Gear', 'aperture'],
]

function TabBar({ active }: { active: Tab }) {
  return (
    <nav className={ui.tabBar} aria-hidden="true">
      {TABS.map(([t, icon]) => (
        <span key={t} className={t === active ? ui.tabOn : ''}>
          <Icon name={icon} />
          {t}
        </span>
      ))}
    </nav>
  )
}

/* Screens, with the app's default sample values */

export function AppToolkit() {
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
          <div key={t} className={ui.toolkitCard}>
            <span className={ui.iconTile}>
              <Icon name={icon} />
            </span>
            <h4 className={ui.cardTitle}>{t}</h4>
            <p className={ui.small}>{d}</p>
          </div>
        ))}
      </div>
    </Screen>
  )
}

export function AppCalculators() {
  return (
    <Screen title="Calculators" tab="Calculators">
      <div className={ui.gearLine}>
        <span className={ui.small}>Sony A7 IV · 24–70mm f/2.8 at 35 mm</span>
        <Button variant="ghost" small>
          Change
        </Button>
      </div>
      <Segmented items={['Depth of field', 'Background blur', 'Exposure', 'ND filter']} selected="Depth of field" />
      <Card>
        <Select label="Aperture" value="f/2.8" hint="Limited to your lens: f/2.8 to f/22" />
        <Slider label="Focal length" value="35 mm" at={0.24} />
        <Slider label="Subject distance" value="3 m" at={0.45} />
      </Card>
      <Card title="Sharp zone">
        <StatGrid
          stats={[
            ['2.51 m', 'Near limit'],
            ['3.73 m', 'Far limit'],
            ['1.22 m', 'Total depth of field'],
            ['15.3 m', 'Hyperfocal distance'],
          ]}
        />
        <div className={ui.dofBar}>
          <span />
        </div>
        <Button small>Focus at hyperfocal</Button>
      </Card>
    </Screen>
  )
}

/** The Light tab's day timeline: phases across 24 h, in the app's chart colours. */
export function AppLightScreen({ place = 'London', coords = '51.5074° N, 0.1278° W', date = 'Sat, 21 Jun', phase = 'Golden hour', next = 'Golden hour ends at 21:12', timeline, rows }: {
  place?: string
  coords?: string
  date?: string
  phase?: string
  next?: string
  timeline?: string
  rows?: [string, string][]
}) {
  return (
    <Screen title="Light" tab="Light">
      <div className={ui.gearLine}>
        <div>
          <div className={ui.cardTitle}>{place}</div>
          <div className={ui.small}>{coords}</div>
        </div>
        <Button variant="ghost" small>
          Change
        </Button>
      </div>
      <div className={ui.dateRow}>
        <Button small icon="chevronLeft">
          Previous
        </Button>
        <span className={ui.date}>{date}</span>
        <Button small>Next</Button>
      </div>
      <Card>
        <div className={ui.phase}>{phase}</div>
        <p className={ui.small}>{next}</p>
        <StatGrid
          stats={[
            ['285° W', 'Sun azimuth'],
            ['4.2°', 'Sun altitude'],
          ]}
        />
      </Card>
      <Card title="Day timeline" desc={date}>
        <div className={ui.timeline} style={timeline ? { background: timeline } : undefined} />
        <KvList
          rows={
            rows ?? [
              ['Blue hour morning', '03:47–04:12'],
              ['Golden hour morning', '04:12–05:29'],
              ['Sunrise', '04:43'],
              ['Sunset', '21:21'],
              ['Golden hour evening', '20:35–21:52'],
            ]
          }
        />
      </Card>
    </Screen>
  )
}

const RECIPES: [string, string][] = [
  ['Headshot', '85–135 mm · f/1.8–f/2.8 · 1/200 s+'],
  ['Environmental portrait', '35 mm · f/2.8–f/4 · 1/200 s'],
  ['Landscape', '16–35 mm · f/8–f/11 · Tripod, any'],
  ['Street', '28–35 mm · f/8 · 1/500 s'],
  ['Sports', '70–400 mm · f/2.8–f/4 · 1/1000 s+'],
  ['Wildlife and birds', '400–600 mm · Wide open · 1/2000 s+'],
  ['Astro and Milky Way', '14–24 mm · f/1.4–f/2.8 · NPF rule (≈10–20 s)'],
  ['Macro', '90–105 mm macro · f/8–f/16 · 1/200 s + flash'],
]

export function AppCoach() {
  return (
    <Screen title="Coach" tab="Coach">
      <Segmented items={['Recipes', 'Angles', 'Lighting', 'Composition']} selected="Recipes" />
      <Card>
        <div className={ui.list}>
          {RECIPES.map(([t, s]) => (
            <div key={t} className={ui.listRow}>
              <div>
                <div className={ui.rowTitle}>{t}</div>
                <div className={ui.small}>{s}</div>
              </div>
              <Icon name="chevronRight" size={16} className={ui.muted} />
            </div>
          ))}
        </div>
      </Card>
    </Screen>
  )
}

export function AppGear() {
  const bodies: [string, string, boolean][] = [
    ['Sony A7 IV', 'Full frame · 33 MP', true],
    ['Canon EOS R6 Mark II', 'Full frame · 24.2 MP', false],
    ['Nikon Z8', 'Full frame · 45.7 MP', false],
    ['Fujifilm X-T5', 'APS-C · 40.2 MP', false],
  ]
  return (
    <Screen title="Gear" tab="Gear">
      <Card title="Active setup" desc="Every calculator and the viewfinder lens frame use this profile.">
        <div>
          <div className={ui.rowTitle}>Sony A7 IV</div>
          <div className={ui.small}>24–70mm f/2.8 at 35 mm</div>
        </div>
        <Slider label="Focal length" value="35 mm" at={0.24} />
        <StatGrid
          stats={[
            ['1.00×', 'Crop factor'],
            ['0.029 mm', 'Circle of confusion'],
            ['5.1 µm', 'Pixel pitch'],
            ['f/7.6', 'Diffraction starts near'],
          ]}
        />
      </Card>
      <Card title="Camera bodies" desc="Sensor size and megapixels drive crop factor, blur and diffraction.">
        <div className={ui.list}>
          {bodies.map(([n, s, active]) => (
            <div key={n} className={ui.listRow}>
              <span className={[ui.radio, active ? ui.radioOn : ''].join(' ')} />
              <div style={{ flex: 1 }}>
                <div className={ui.rowTitle}>{n}</div>
                <div className={ui.small}>{s}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </Screen>
  )
}
