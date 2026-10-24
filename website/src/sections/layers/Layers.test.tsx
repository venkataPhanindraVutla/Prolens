import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import { mockMedia } from '../../test/media'
import AppTour, { dwell } from './AppTour'
import BeforeAfter from './BeforeAfter'
import Gallery, { GENRES } from './Gallery'
import Parallax from './Parallax'

afterEach(() => vi.unstubAllGlobals())

test('the before/after divider moves with the keyboard and clips the before side', async () => {
  mockMedia()
  render(<BeforeAfter />)
  const [first] = screen.getAllByRole('slider', { name: /Compare/ })
  expect(first).toHaveAttribute('aria-valuenow', '50')
  first.focus()
  await userEvent.keyboard('{ArrowRight}{ArrowRight}')
  expect(first).toHaveAttribute('aria-valuenow', '60')
  expect(first).toHaveStyle({ touchAction: 'pan-y' })
})

test('the gallery pairs every genre with the app’s own recipe and a credited photo', () => {
  mockMedia()
  render(<Gallery />)
  expect(GENRES.length).toBeGreaterThanOrEqual(6)
  for (const g of GENRES) {
    const card = screen.getByRole('article', { name: g.genre })
    expect(within(card).getByText(g.recipe)).toBeInTheDocument()
    expect(within(card).getByRole('link', { name: /Photo:/ })).toBeInTheDocument()
  }
})

test('the app tour lists every screen of the app and switches between them', async () => {
  mockMedia()
  render(<AppTour />)
  const tabs = screen.getByRole('tablist', { name: 'App screens' })
  const names = within(tabs).getAllByRole('tab').map((t) => t.textContent)
  expect(names).toEqual(['Viewfinder', 'Toolkit', 'Calculators', 'Light', 'Coach', 'Gear'])
  await userEvent.click(within(tabs).getByRole('tab', { name: 'Coach' }))
  expect(within(tabs).getByRole('tab', { name: 'Coach' })).toHaveAttribute('aria-selected', 'true')
})

test('with reduced motion the parallax layers do not move', () => {
  mockMedia('reduce')
  const { container } = render(<Parallax />)
  for (const el of container.querySelectorAll<HTMLElement>('[data-depth]')) expect(el.style.transform).toBe('')
})

test('the exploded phone names its real layers, and touching a name lifts that layer', async () => {
  mockMedia()
  render(<AppTour />)
  const layers = screen.getByRole('group', { name: 'Layers of the viewfinder' })
  const names = within(layers).getAllByRole('button').map((b) => b.textContent)
  expect(names).toEqual(['Controls', 'Exposure readouts', 'Composition grid', 'Live preview', 'Phone'])
  await userEvent.click(within(layers).getByRole('button', { name: 'Composition grid' }))
  expect(within(layers).getByRole('button', { name: 'Composition grid' })).toHaveAttribute('aria-pressed', 'true')
  expect(document.querySelector('[data-layer="Composition grid"]')).toHaveAttribute('data-lifted', 'true')
})

test('the tour’s screens are live: the toolkit opens the coach', async () => {
  // Flat layout (reduced motion), where every phone takes taps; in 3D only the centred phone does.
  mockMedia('reduce')
  render(<AppTour />)
  await userEvent.click(screen.getByRole('button', { name: 'Open Coach' }))
  expect(within(screen.getByRole('tablist', { name: 'App screens' })).getByRole('tab', { name: 'Coach' })).toHaveAttribute('aria-selected', 'true')
})

test('with reduced motion the gallery spreads and tour phones stay flat', () => {
  mockMedia('reduce')
  const { container } = render(
    <>
      <Gallery />
      <AppTour />
    </>,
  )
  for (const el of container.querySelectorAll<HTMLElement>('[data-3d]')) expect(el.style.transform === '' || el.style.transform === 'none').toBe(true)
})

test('the tour holds each screen in the centre, then glides', () => {
  expect(dwell(2.1)).toBe(2)
  expect(dwell(2.9)).toBe(3)
  expect(dwell(2.5)).toBeCloseTo(2.5)
  expect(dwell(2.4)).toBeGreaterThan(2)
  expect(dwell(2.4)).toBeLessThan(2.5)
})
