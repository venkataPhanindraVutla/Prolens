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

test('on a phone the app scene is tap-to-explode plus a swipe row, with nothing pinned', async () => {
  mockMedia('max-width: 760px')
  const { container } = render(<AppTour />)
  const explode = screen.getByRole('button', { name: 'Explode the layers' })
  await userEvent.click(explode)
  expect(screen.getByRole('button', { name: 'Put it back together' })).toBeInTheDocument()
  expect(within(screen.getByRole('group', { name: 'Layers of the viewfinder' })).getAllByRole('button')).toHaveLength(5)
  const screens = screen.getByRole('tablist', { name: 'App screens' })
  await userEvent.click(within(screens).getByRole('tab', { name: 'Coach' }))
  expect(screen.getByText(/Fifteen shot recipes/)).toBeInTheDocument()
  expect(container.querySelector('[data-pinned]')).toBeNull()
})

test('on a phone the gallery is a swipe row of cards with dots that jump to a genre', async () => {
  mockMedia('max-width: 900px')
  render(<Gallery />)
  const dots = screen.getByRole('tablist', { name: 'Genres' })
  expect(within(dots).getAllByRole('tab')).toHaveLength(GENRES.length)
  await userEvent.click(within(dots).getByRole('tab', { name: 'Street' }))
  expect(within(dots).getByRole('tab', { name: 'Street' })).toHaveAttribute('aria-selected', 'true')
})

test('on a phone the before/after is the one reframing comparison, with no tabs', () => {
  mockMedia('max-width: 900px')
  render(<BeforeAfter />)
  expect(screen.queryByRole('tablist')).toBeNull()
  expect(screen.getAllByRole('slider', { name: /Compare/ })).toHaveLength(1)
  expect(screen.getByRole('slider', { name: /Compare composition/ })).toBeInTheDocument()
})

/** A 200 px wide comparison frame, so pointer positions map to percentages. */
function sized(el: HTMLElement) {
  el.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 250, right: 200, bottom: 250, x: 0, y: 0, toJSON: () => ({}) })
  return el
}

test('a finger that lands on the photo to scroll the page leaves the divider where it was', async () => {
  mockMedia('max-width: 900px')
  const { fireEvent } = await import('@testing-library/react')
  render(<BeforeAfter />)
  const frame = sized(screen.getByRole('slider', { name: /Compare/ }))
  fireEvent.pointerDown(frame, { pointerType: 'touch', pointerId: 1, clientX: 20, clientY: 100 })
  fireEvent.pointerMove(frame, { pointerType: 'touch', pointerId: 1, clientX: 22, clientY: 140 })
  fireEvent.pointerCancel(frame, { pointerType: 'touch', pointerId: 1 })
  expect(frame).toHaveAttribute('aria-valuenow', '50')
})

test('dragging sideways moves the divider, and a tap jumps it', async () => {
  mockMedia('max-width: 900px')
  const { fireEvent } = await import('@testing-library/react')
  render(<BeforeAfter />)
  const frame = sized(screen.getByRole('slider', { name: /Compare/ }))
  fireEvent.pointerDown(frame, { pointerType: 'touch', pointerId: 1, clientX: 100, clientY: 100 })
  fireEvent.pointerMove(frame, { pointerType: 'touch', pointerId: 1, clientX: 140, clientY: 102 })
  fireEvent.pointerUp(frame, { pointerType: 'touch', pointerId: 1, clientX: 140, clientY: 102 })
  expect(frame).toHaveAttribute('aria-valuenow', '70')
  fireEvent.pointerDown(frame, { pointerType: 'touch', pointerId: 2, clientX: 50, clientY: 100 })
  fireEvent.pointerUp(frame, { pointerType: 'touch', pointerId: 2, clientX: 50, clientY: 100 })
  expect(frame).toHaveAttribute('aria-valuenow', '25')
})

test('a tap on a layer name keeps it lifted, even after the browser’s pretend mouseleave', async () => {
  mockMedia('max-width: 760px')
  const { fireEvent } = await import('@testing-library/react')
  render(<AppTour />)
  await userEvent.click(screen.getByRole('button', { name: 'Explode the layers' }))
  const b = within(screen.getByRole('group', { name: 'Layers of the viewfinder' })).getByRole('button', { name: 'Exposure readouts' })
  // What Chrome sends for a tap: touch pointer events, then compatibility mouse events ending in mouseleave.
  fireEvent.pointerEnter(b, { pointerType: 'touch' })
  fireEvent.pointerLeave(b, { pointerType: 'touch' })
  fireEvent.mouseEnter(b)
  fireEvent.focus(b)
  fireEvent.click(b)
  fireEvent.mouseLeave(b)
  expect(b).toHaveAttribute('aria-pressed', 'true')
})
