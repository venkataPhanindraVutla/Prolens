import type { ReactNode } from 'react'
import { MODE_LABELS } from '../lib/profiles'
import { Icon, type IconName } from './icons'
import ui from './app.module.css'

export type Tool = 'grid' | 'level' | 'histogram' | 'focus' | 'zebra' | 'timer' | 'sliders' | 'apps'
const LEFT: Tool[] = ['grid', 'level', 'histogram', 'focus', 'zebra']
const RIGHT: Tool[] = ['timer', 'sliders', 'apps']

/** The app's defaults: grid (thirds), level and histogram on (Hud.kt, ViewfinderSettings). */
const DEFAULT_TOOLS: Partial<Record<Tool, boolean>> = { grid: true, level: true, histogram: true }

export interface HudCell {
  label: string
  value: string
  /** Auto values are muted; manual ones white. */
  auto?: boolean
  /** Aperture and lens are read-only and have no cell background. */
  plain?: boolean
}

/** Sample values from the spec: an auto-exposed main camera. */
export const DEFAULT_HUD: HudCell[] = [
  { label: 'ISO', value: '125A', auto: true },
  { label: 'Shutter', value: '1/120A', auto: true },
  { label: 'Aperture', value: 'f/1.8', plain: true },
  { label: 'Lens', value: '24 mm', plain: true },
  { label: 'WB', value: 'AWB', auto: true },
  { label: 'EV', value: '0.0' },
  { label: 'Focus', value: 'AF', auto: true },
]

export interface Chip {
  text: string
  tone?: 'success' | 'warning' | 'accent'
}

interface Props {
  /** Fills the 3:4 preview: a photo, a canvas, anything. */
  preview: ReactNode
  /** Drawn over the preview, under the chips (grids, level lines). */
  overlay?: ReactNode
  mode?: string
  tools?: Partial<Record<Tool, boolean>>
  chips?: Chip[]
  /** 64 histogram bins, or nothing to hide the panel. */
  histogram?: number[] | null
  hud?: HudCell[]
  zoom?: { presets: number[]; active: number }
}

const fmtZoom = (z: number) => String(z)

/** The Prolens viewfinder, portrait, as ViewfinderScreen.kt lays it out. */
export default function AppViewfinder({ preview, overlay, mode = 'Photo', tools, chips = [], histogram, hud = DEFAULT_HUD, zoom = { presets: [0.6, 1, 2, 5], active: 1 } }: Props) {
  const on = { ...DEFAULT_TOOLS, ...tools }
  const max = histogram ? Math.max(1, ...histogram) : 1
  const tool = (t: Tool) => (
    <span key={t} data-testid={`tool-${t}`} data-on={!!on[t]} className={[ui.tool, on[t] ? ui.toolOn : ''].join(' ')}>
      <Icon name={t as IconName} />
    </span>
  )
  return (
    <div className={ui.viewfinder}>
      <div className={ui.preview}>
        {preview}
        {overlay}
        {on.histogram && histogram && (
          <svg className={ui.histogram} viewBox="0 0 64 32" preserveAspectRatio="none" aria-hidden="true">
            {histogram.map((v, i) => (
              <rect key={i} x={i} y={32 - (v / max) * 32} width={1} height={(v / max) * 32} />
            ))}
          </svg>
        )}
        {chips.length > 0 && (
          <div className={ui.chips}>
            {chips.map((c) => (
              <span key={c.text} className={[ui.chip, c.tone ? ui[c.tone] : ''].join(' ')}>
                {c.text}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className={ui.toolRow} aria-hidden="true">
        {LEFT.map(tool)}
        <span className={ui.spacer} />
        {RIGHT.map(tool)}
      </div>

      <div className={ui.bottom} aria-hidden="true">
        <div className={ui.zoomPill}>
          {zoom.presets.map((z) =>
            z === zoom.active ? (
              <span key={z} className={`${ui.zoomChip} ${ui.zoomActive}`}>
                {fmtZoom(z)}×
              </span>
            ) : (
              <span key={z} className={ui.zoomChip}>
                {fmtZoom(z)}
              </span>
            ),
          )}
        </div>
        <div className={ui.strip}>
          <div className={ui.hud} data-testid="app-hud">
            {hud.map((c) => (
              <div key={c.label} className={[ui.cell, c.plain ? ui.cellPlain : ''].join(' ')}>
                <span className={ui.cellLabel}>{c.label}</span>
                <span className={[ui.cellValue, c.auto ? ui.cellAuto : ''].join(' ')}>{c.value}</span>
              </div>
            ))}
          </div>
          <ul className={ui.modes} data-testid="app-modes" style={{ ['--i' as string]: MODE_LABELS.indexOf(mode) }}>
            {MODE_LABELS.map((m) => (
              <li key={m} data-selected={m === mode} className={m === mode ? ui.modeOn : ''}>
                {m}
              </li>
            ))}
          </ul>
          <div className={ui.capture}>
            <span className={ui.thumb}>
              <Icon name="image" />
            </span>
            <span className={ui.shutter}>
              <span />
            </span>
            <span className={ui.flip}>
              <Icon name="flip" />
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
