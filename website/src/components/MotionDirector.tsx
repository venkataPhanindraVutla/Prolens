import { useEffect } from 'react'
import { useReducedMotion } from '../lib/motion'

type Kind = 'up' | 'photo' | 'fade'

/** Where each kind of element starts before it reveals, and the Motion keyframes that bring it in. */
const START: Record<Kind, Partial<CSSStyleDeclaration>> = {
  up: { opacity: '0', transform: 'translateY(48px)' },
  photo: { opacity: '0.35', clipPath: 'inset(14% 10% 14% 10% round 6px)' },
  fade: { opacity: '0' },
}
const TO: Record<Kind, Record<string, string[] | number[]>> = {
  up: { opacity: [0, 1], transform: ['translateY(48px)', 'translateY(0px)'] },
  photo: { opacity: [0.35, 1], clipPath: ['inset(14% 10% 14% 10% round 6px)', 'inset(0% 0% 0% 0% round 6px)'] },
  fade: { opacity: [0, 1] },
}

/** Runs after the page is idle, so the first paint never waits for it. */
function whenIdle(fn: () => void): () => void {
  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(fn, { timeout: 2500 })
    return () => window.cancelIdleCallback(id)
  }
  const id = setTimeout(fn, 600)
  return () => clearTimeout(id)
}

/**
 * Gives the page its motion between sections, using Motion's vanilla API loaded after first paint:
 * - [data-reveal="up" | "photo" | "fade"] elements rise in, develop open or fade in as they reach the screen
 *   (optional data-reveal-delay in seconds staggers groups);
 * - [data-stage] sections ease back and dim as they scroll away under the next one.
 * Elements already on screen are never hidden, and nothing happens on phones, with reduced motion or without IntersectionObserver.
 */
export default function MotionDirector() {
  const reduced = useReducedMotion()

  useEffect(() => {
    if (reduced || typeof IntersectionObserver === 'undefined') return
    // Phones are left still. Content arrives at the pace of a thumb, so a reveal still running as it comes on screen
    // reads as greyed out, and short sections would start easing back while they're still being read.
    if (window.matchMedia?.('(max-width: 760px)').matches) return
    let cancelled = false
    const stops: (() => void)[] = []
    const seen = new WeakSet<Element>()

    const cancelIdle = whenIdle(() => {
      import('motion').then(({ animate, inView, scroll }) => {
        if (cancelled) return
        const setup = () => {
          for (const el of document.querySelectorAll<HTMLElement>('[data-reveal]')) {
            if (seen.has(el)) continue
            seen.add(el)
            if (el.getBoundingClientRect().top < window.innerHeight * 0.92) continue
            const kind = (el.dataset.reveal as Kind) in START ? (el.dataset.reveal as Kind) : 'up'
            Object.assign(el.style, START[kind])
            const delay = Number(el.dataset.revealDelay ?? 0)
            stops.push(
              inView(
                el,
                () => {
                  animate(el, TO[kind], { duration: kind === 'photo' ? 1.1 : 0.8, delay, ease: [0.22, 1, 0.36, 1] })
                },
                { amount: 0.2 },
              ),
            )
          }
          for (const el of document.querySelectorAll<HTMLElement>('[data-stage]')) {
            if (seen.has(el)) continue
            seen.add(el)
            el.style.transformOrigin = '50% 0%'
            stops.push(scroll(animate(el, { scale: [1, 0.93], opacity: [1, 0.35] }, { ease: 'linear' }), { target: el, offset: ['end end', 'end start'] }))
          }
        }
        setup()
        // Sections mounted later (scrolled near) get the same treatment.
        let queued = 0
        const mo = new MutationObserver(() => {
          if (!queued) queued = requestAnimationFrame(() => ((queued = 0), setup()))
        })
        mo.observe(document.body, { childList: true, subtree: true })
        stops.push(() => mo.disconnect())
      })
    })

    return () => {
      cancelled = true
      cancelIdle()
      stops.forEach((s) => s())
    }
  }, [reduced])

  return null
}
