import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import { LocationProvider } from '../../lib/location'
import { mockMedia } from '../../test/media'
import Toolkit from './Toolkit'

afterEach(() => vi.unstubAllGlobals())

test('on a phone the toolkit shows one tool at a time behind tabs', async () => {
  mockMedia('max-width: 760px')
  render(<LocationProvider><Toolkit /></LocationProvider>)
  const tabs = screen.getByRole('tablist', { name: 'Tools' })
  expect(screen.getByText('Depth of field', { selector: 'h3' })).toBeInTheDocument()
  expect(screen.queryByText('All 23 grids')).toBeNull()
  await userEvent.click(within(tabs).getByRole('tab', { name: 'Grids' }))
  expect(screen.getByText('All 23 grids')).toBeInTheDocument()
})
