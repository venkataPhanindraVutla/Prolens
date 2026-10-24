import { render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import App from './App'
import { mockMedia } from './test/media'

afterEach(() => vi.unstubAllGlobals())

test('renders the page landmark', () => {
  mockMedia()
  vi.stubGlobal('fetch', () => new Promise(() => {}))
  render(<App />)
  expect(screen.getByRole('main')).toBeInTheDocument()
})
