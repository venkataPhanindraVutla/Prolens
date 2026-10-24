import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import { LocationProvider } from '../../lib/location'
import { mockMedia } from '../../test/media'
import Story from './Story'

afterEach(() => vi.unstubAllGlobals())

test('the level starts tilted and arrows bring it to level', async () => {
  mockMedia()
  render(<LocationProvider><Story /></LocationProvider>)
  const tilt = screen.getByRole('slider', { name: 'Tilt' })
  expect(tilt).toHaveAttribute('aria-valuenow', '4.5')
  expect(screen.getAllByText('Roll 4.5°')[0]).not.toHaveClass('level')
  tilt.focus()
  for (let i = 0; i < 9; i++) await userEvent.keyboard('{ArrowLeft}')
  expect(tilt).toHaveAttribute('aria-valuenow', '0')
  expect(screen.getAllByText('Roll 0.0°')[0]).toHaveClass('level')
})

test('dragging the level never blocks vertical page scroll', () => {
  mockMedia()
  render(<LocationProvider><Story /></LocationProvider>)
  expect(screen.getByRole('slider', { name: 'Tilt' })).toHaveStyle({ touchAction: 'pan-y' })
})

test('the horizon line turns with the scene, like the app’s', () => {
  mockMedia()
  const { container } = render(<LocationProvider><Story /></LocationProvider>)
  const line = container.querySelector('[data-horizon]') as HTMLElement
  expect(line.style.transform).toContain('rotate(4.5deg)')
})
