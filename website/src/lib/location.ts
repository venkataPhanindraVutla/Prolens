import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { CITIES, cityForZone } from './cities'
import { browserZone } from './time'

export interface Place {
  name: string
  lat: number
  lon: number
  tz: string
}

export type LocateResult = 'ok' | 'denied' | 'unavailable'

interface LocationState {
  place: Place
  setCity(name: string): void
  locate(): Promise<LocateResult>
}

const Ctx = createContext<LocationState | null>(null)

/** One place for the whole page, so the Light chapter and the golden-hour clock agree. */
export function LocationProvider({ children }: { children: ReactNode }) {
  // Pre-rendered HTML starts at the first city; the browser's own zone takes over once mounted.
  const [place, setPlace] = useState<Place>(CITIES[0])
  useEffect(() => setPlace(cityForZone(browserZone())), [])

  const setCity = useCallback((name: string) => {
    const city = CITIES.find((c) => c.name === name)
    if (city) setPlace(city)
  }, [])

  const locate = useCallback(
    () =>
      new Promise<LocateResult>((resolve) => {
        if (!('geolocation' in navigator)) return resolve('unavailable')
        navigator.geolocation.getCurrentPosition(
          (p) => {
            setPlace({ name: 'Your location', lat: p.coords.latitude, lon: p.coords.longitude, tz: browserZone() })
            resolve('ok')
          },
          (err) => resolve(err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable'),
          { maximumAge: 600_000, timeout: 10_000 },
        )
      }),
    [],
  )

  const value = useMemo(() => ({ place, setCity, locate }), [place, setCity, locate])
  return createElement(Ctx.Provider, { value }, children)
}

export function useLocation(): LocationState {
  const v = useContext(Ctx)
  if (!v) throw new Error('useLocation needs a LocationProvider')
  return v
}
