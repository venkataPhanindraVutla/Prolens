import css from './CropMarks.module.css'

/** Four printer's crop marks around the nearest positioned parent. */
export default function CropMarks({ inset = -10 }: { inset?: number }) {
  return (
    <span className={css.marks} style={{ inset }} aria-hidden="true">
      <span className={css.tl} />
      <span className={css.tr} />
      <span className={css.bl} />
      <span className={css.br} />
    </span>
  )
}
