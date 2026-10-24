import { formatSize, useRelease } from '../lib/release'
import css from './ProofStrip.module.css'

export default function ProofStrip() {
  const { sizeBytes } = useRelease()
  return (
    <p className={`mono ${css.strip}`}>
      free · open source · no ads · no account · works offline · Android 7+ · {formatSize(sizeBytes)}
    </p>
  )
}
