import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import { LocationProvider } from '../../lib/location'
import { sunTimes } from '../../lib/suncalc'
import { formatTime, noonIn } from '../../lib/time'
import { mockMedia } from '../../test/media'
import Story from './Story'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const renderStory = () =>
  render(
    <LocationProvider>
      <Story />
    </LocationProvider>,
  )

test('without geolocation the city picker is the way in', () => {
  mockMedia('min-width: 980px')
  renderStory()
  expect(screen.getByRole('combobox', { name: 'City' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Use my location' })).toBeNull()
})

test('a city’s golden hour is shown in that city’s own time zone', async () => {
  mockMedia('min-width: 980px')
  const now = Date.UTC(2026, 5, 21, 3)
  vi.useFakeTimers({ now, toFake: ['Date'] })
  renderStory()
  await userEvent.selectOptions(screen.getByRole('combobox', { name: 'City' }), 'Hyderabad')
  const start = formatTime(sunTimes(noonIn('Asia/Kolkata', now), 17.385, 78.4867).goldenEveningStart, 'Asia/Kolkata')
  expect(start.startsWith('18:')).toBe(true)
  expect(screen.getByText('Evening golden hour').parentElement!.textContent).toContain(start)
})

test('polar night says so instead of showing a broken time', async () => {
  mockMedia('min-width: 980px')
  vi.useFakeTimers({ now: Date.UTC(2026, 11, 21, 12), toFake: ['Date'] })
  const { container } = renderStory()
  await userEvent.selectOptions(screen.getByRole('combobox', { name: 'City' }), 'Tromsø')
  expect(screen.getAllByText('Sun stays down today').length).toBeGreaterThan(0)
  expect(container.textContent).not.toMatch(/Invalid|NaN/)
})

test('both blue hours are listed', () => {
  mockMedia('min-width: 980px')
  renderStory()
  expect(screen.getByText('Morning blue hour')).toBeInTheDocument()
  expect(screen.getByText('Evening blue hour')).toBeInTheDocument()
})
