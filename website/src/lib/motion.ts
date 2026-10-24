import { useSyncExternalStore } from 'react'

function useMedia(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window.matchMedia !== 'function') return () => {}
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    () => typeof window.matchMedia === 'function' && window.matchMedia(query).matches,
    () => false,
  )
}

export const useReducedMotion = () => useMedia('(prefers-reduced-motion: reduce)')

/** True for a mouse or trackpad; false on touch screens. */
export const useCanHover = () => useMedia('(hover: hover) and (pointer: fine)')
