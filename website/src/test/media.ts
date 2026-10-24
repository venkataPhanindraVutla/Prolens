import { vi } from 'vitest'

/** Make window.matchMedia answer true for queries containing any of the given fragments. */
export function mockMedia(...matching: string[]) {
  vi.stubGlobal(
    'matchMedia',
    (query: string) =>
      ({
        matches: matching.some((m) => query.includes(m)),
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }) as unknown as MediaQueryList,
  )
}
