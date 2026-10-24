import { act, render } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { mockMedia } from '../test/media'
import Hero from './Hero'

afterEach(() => vi.unstubAllGlobals())

test('the light-leak loop stops once it has caught up with the pointer', () => {
  mockMedia('hover')
  vi.stubGlobal('fetch', () => new Promise(() => {}))
  const queue: FrameRequestCallback[] = []
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => queue.push(cb))
  vi.stubGlobal('cancelAnimationFrame', () => {})
  render(<Hero />)
  act(() => {
    for (let i = 0; i < 500 && queue.length; i++) queue.shift()!(i * 16)
  })
  expect(queue).toHaveLength(0)
})
