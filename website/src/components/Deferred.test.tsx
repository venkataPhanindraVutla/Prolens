import { act, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import Deferred from './Deferred'

afterEach(() => vi.unstubAllGlobals())

test('children mount only once the placeholder comes near the screen', () => {
  let fire: (hit: boolean) => void = () => {}
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(cb: (e: { isIntersecting: boolean }[]) => void) {
        fire = (hit) => cb([{ isIntersecting: hit }])
      }
      observe() {}
      disconnect() {}
    },
  )
  render(<Deferred minHeight={800}><p>Gallery</p></Deferred>)
  expect(screen.queryByText('Gallery')).toBeNull()
  act(() => fire(true))
  expect(screen.getByText('Gallery')).toBeInTheDocument()
})

test('without IntersectionObserver the children mount straight away', () => {
  render(<Deferred minHeight={800}><p>Gallery</p></Deferred>)
  expect(screen.getByText('Gallery')).toBeInTheDocument()
})
