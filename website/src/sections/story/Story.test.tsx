import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import { LocationProvider } from '../../lib/location'
import { mockMedia } from '../../test/media'
import Story from './Story'

afterEach(() => vi.unstubAllGlobals())

test('five chapters, each with its own heading', () => {
  mockMedia()
  render(<LocationProvider><Story /></LocationProvider>)
  const titles = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
  expect(titles).toHaveLength(5)
  expect(screen.getAllByRole('article')).toHaveLength(5)
})

test('choosing a grid chip selects it', async () => {
  mockMedia()
  render(<LocationProvider><Story /></LocationProvider>)
  const grids = screen.getByRole('radiogroup', { name: 'Grid' })
  await userEvent.click(within(grids).getByRole('radio', { name: 'Golden spiral' }))
  expect(within(grids).getByRole('radio', { name: 'Golden spiral' })).toHaveAttribute('aria-checked', 'true')
  expect(screen.getByText(/kept at the real 1.618 ratio/)).toBeInTheDocument()
})

test('the golden spiral is drawn at its true ratio, never stretched', async () => {
  const { container } = render(<LocationProvider><Story /></LocationProvider>)
  await userEvent.click(screen.getByRole('radio', { name: 'Golden spiral' }))
  // The true-ratio spiral outlines its golden rectangle; the stretched one has none.
  expect(container.querySelector('[data-grid="spiralTrue"]')).not.toBeNull()
})
