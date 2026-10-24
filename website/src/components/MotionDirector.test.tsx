import { render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { mockMedia } from '../test/media'
import MotionDirector from './MotionDirector'

afterEach(() => vi.unstubAllGlobals())

const page = () => (
  <main>
    <p data-reveal="up">Rises in</p>
    <section data-stage>Recedes</section>
    <MotionDirector />
  </main>
)

test('reduced motion leaves every element exactly as rendered', async () => {
  mockMedia('reduce')
  render(page())
  await new Promise((r) => setTimeout(r, 50))
  expect(screen.getByText('Rises in').getAttribute('style')).toBeNull()
})

test('without IntersectionObserver nothing is ever hidden', async () => {
  mockMedia()
  render(page())
  await new Promise((r) => setTimeout(r, 300))
  expect(screen.getByText('Rises in').style.opacity).not.toBe('0')
})
