import type { CSSProperties } from 'react'
import { photo, src, srcSet } from '../lib/photos'

interface Props {
  id: string
  /** The rendered width hint for the browser, e.g. "100vw" or "(min-width: 900px) 58vw, 100vw". */
  sizes: string
  /** Load straight away instead of when scrolled near. */
  priority?: boolean
  className?: string
  style?: CSSProperties
  /** Decorative copies (a second layer of the same photo) hide from assistive tech. */
  decorative?: boolean
  /** 'low' for a full-screen backdrop: it loads at once but lets text and fonts go first. */
  fetchPriority?: 'high' | 'low' | 'auto'
}

/** A responsive photograph that fills its box, cropped around its subject. */
export default function Photo({ id, sizes, priority, className, style, decorative, fetchPriority }: Props) {
  const p = photo(id)
  return (
    <img
      className={className}
      src={src(p)}
      srcSet={srcSet(p)}
      sizes={sizes}
      alt={decorative ? '' : p.alt}
      aria-hidden={decorative || undefined}
      width={p.width}
      height={p.height}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={fetchPriority}
      decoding="async"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        objectPosition: p.focus,
        backgroundColor: p.color,
        ...style,
      }}
    />
  )
}
