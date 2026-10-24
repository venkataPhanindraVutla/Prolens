import css from './Hud.module.css'

interface Props {
  items: { label: string; value: string }[]
  className?: string
  live?: boolean
}

/** A camera-style readout row: small grey labels, lime values. */
export default function Hud({ items, className, live }: Props) {
  return (
    <dl className={[css.hud, 'mono', className ?? ''].join(' ')} aria-live={live ? 'polite' : undefined}>
      {items.map((it) => (
        <div key={it.label} className={css.item}>
          <dt>{it.label}</dt>
          <dd>{it.value}</dd>
        </div>
      ))}
    </dl>
  )
}
