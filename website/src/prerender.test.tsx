import { act } from '@testing-library/react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, expect, test, vi } from 'vitest'
import App from './App'
import { mockMedia } from './test/media'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

test('pre-rendered HTML hydrates without mismatches, even minutes later', async () => {
  mockMedia()
  vi.stubGlobal('fetch', () => new Promise(() => {}))
  vi.useFakeTimers({ now: Date.UTC(2026, 5, 21, 10, 0), toFake: ['Date'] })
  const html = renderToString(<App />)

  // The browser has scroll observers and geolocation the build machine doesn't, and the clock has moved on.
  vi.setSystemTime(Date.UTC(2026, 5, 21, 10, 7))
  vi.stubGlobal('navigator', Object.assign(Object.create(navigator), { geolocation: { getCurrentPosition() {} } }))
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
  const recoverable = vi.fn()
  const root = document.createElement('div')
  root.innerHTML = html
  document.body.append(root)
  await act(async () => {
    hydrateRoot(root, <App />, { onRecoverableError: recoverable })
  })
  expect(recoverable).not.toHaveBeenCalled()
  expect(errors).not.toHaveBeenCalled()
  root.remove()
})
