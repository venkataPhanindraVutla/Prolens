import { expect, test, vi } from 'vitest'
import { submitWaitlist } from './waitlist'

test('posts email and store as JSON to the form', async () => {
  const fetchImpl = vi.fn(async () => new Response('{}', { status: 200 }))
  expect(await submitWaitlist('abc123', 'a@b.co', 'play', fetchImpl as typeof fetch)).toBe('ok')
  const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
  expect(url).toBe('https://formspree.io/f/abc123')
  expect(init.method).toBe('POST')
  expect(init.body).toBe('{"email":"a@b.co","store":"play"}')
  expect((init.headers as Record<string, string>).Accept).toBe('application/json')
})

test('a rejected submission or a network failure is an error', async () => {
  expect(await submitWaitlist('abc123', 'a@b.co', '', (async () => new Response('{}', { status: 422 })) as typeof fetch)).toBe('error')
  expect(
    await submitWaitlist('abc123', 'a@b.co', '', (async () => {
      throw new TypeError('offline')
    }) as typeof fetch),
  ).toBe('error')
})
