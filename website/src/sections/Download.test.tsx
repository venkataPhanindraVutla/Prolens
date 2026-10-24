import { render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { mockMedia } from '../test/media'
import Download from './Download'

afterEach(() => vi.unstubAllGlobals())

test('with the fallback release the button still downloads', () => {
  mockMedia()
  vi.stubGlobal('fetch', () => new Promise(() => {}))
  const { container } = render(<Download />)
  const link = screen.getByRole('link', { name: 'Download Prolens v1.0 for Android' })
  expect(link).toHaveAttribute('href', 'https://github.com/venkataPhanindraVutla/Prolens/releases/download/v1.0/Prolens-1.0.apk')
  expect(container.textContent).not.toMatch(/undefined|NaN/)
  expect(container.textContent).toContain('13.4 MB')
})

test('the checksum waits behind a verify row', () => {
  mockMedia()
  vi.stubGlobal('fetch', () => new Promise(() => {}))
  const { container } = render(<Download />)
  const verify = container.querySelector('details')!
  expect(verify).not.toHaveAttribute('open')
  expect(verify.querySelector('summary')).toHaveTextContent('Verify the download')
  expect(verify).toHaveTextContent('SHA-256')
})
