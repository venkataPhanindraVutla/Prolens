export interface City {
  name: string
  lat: number
  lon: number
  tz: string
}

/** The Light chapter's fallback places. Reykjavík and Tromsø show what happens near the poles. */
export const CITIES: City[] = [
  { name: 'London', lat: 51.5074, lon: -0.1278, tz: 'Europe/London' },
  { name: 'New York', lat: 40.7128, lon: -74.006, tz: 'America/New_York' },
  { name: 'San Francisco', lat: 37.7749, lon: -122.4194, tz: 'America/Los_Angeles' },
  { name: 'Hyderabad', lat: 17.385, lon: 78.4867, tz: 'Asia/Kolkata' },
  { name: 'Tokyo', lat: 35.6762, lon: 139.6503, tz: 'Asia/Tokyo' },
  { name: 'Sydney', lat: -33.8688, lon: 151.2093, tz: 'Australia/Sydney' },
  { name: 'Cape Town', lat: -33.9249, lon: 18.4241, tz: 'Africa/Johannesburg' },
  { name: 'Reykjavík', lat: 64.1466, lon: -21.9426, tz: 'Atlantic/Reykjavik' },
  { name: 'Tromsø', lat: 69.65, lon: 18.96, tz: 'Europe/Oslo' },
]

export function cityForZone(tz: string): City {
  return CITIES.find((c) => c.tz === tz) ?? CITIES[0]
}
