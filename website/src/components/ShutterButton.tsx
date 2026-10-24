import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useReducedMotion } from '../lib/motion'
import css from './ShutterButton.module.css'

interface Props {
  variant: 'primary' | 'ghost'
  href?: string
  onClick?: () => void
  external?: boolean
  disabled?: boolean
  type?: 'button' | 'submit'
  className?: string
  children: ReactNode
}

/** A button that answers a press like a shutter: a 120 ms flash and a small squeeze. */
export default function ShutterButton({ variant, href, onClick, external, disabled, type = 'button', className, children }: Props) {
  const reduced = useReducedMotion()
  const [fired, setFired] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const press = () => {
    if (!reduced) {
      setFired(true)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setFired(false), 120)
    }
    onClick?.()
  }
  const cls = [css.button, css[variant], 'focusable', fired ? 'fired' : '', className ?? ''].filter(Boolean).join(' ')

  if (href)
    return (
      <a className={cls} href={href} onClick={press} {...(external ? { target: '_blank', rel: 'noopener' } : {})}>
        {children}
      </a>
    )
  return (
    <button className={cls} type={type} onClick={press} disabled={disabled}>
      {children}
    </button>
  )
}
