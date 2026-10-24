import { render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { LocationProvider } from '../../lib/location'
import { mockMedia } from '../../test/media'
import Toolkit from './Toolkit'

afterEach(() => vi.unstubAllGlobals())

test('on a phone the toolkit is the depth-of-field calculator alone', () => {
  mockMedia('max-width: 760px')
  render(<LocationProvider><Toolkit /></LocationProvider>)
  expect(screen.queryByRole('tablist')).toBeNull()
  expect(screen.getByText('Depth of field', { selector: 'h3' })).toBeInTheDocument()
  expect(screen.queryByText('All 23 grids')).toBeNull()
})
