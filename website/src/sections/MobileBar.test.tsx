import { render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { mockMedia } from '../test/media'
import MobileBar from './MobileBar'

afterEach(() => vi.unstubAllGlobals())

test('the phone download bar links to the download and names the version', () => {
  mockMedia('max-width: 760px')
  vi.stubGlobal('fetch', () => new Promise(() => {}))
  render(<MobileBar />)
  expect(screen.getByRole('link', { name: /Download/ })).toHaveAttribute('href', '#download')
  expect(screen.getByText(/v1\.0/)).toBeInTheDocument()
})

test('there is no download bar on wide screens', () => {
  mockMedia()
  vi.stubGlobal('fetch', () => new Promise(() => {}))
  const { container } = render(<MobileBar />)
  expect(container.firstChild).toBeNull()
})
