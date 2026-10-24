import { expect, test } from 'vitest'
import { FALLBACK_RELEASE } from '../config'
import { fetchRelease, formatSize, parseRelease } from './release'

const v11 = {
  tag_name: 'v1.1',
  assets: [
    {
      name: 'Prolens-1.1.apk',
      size: 13599511,
      digest: 'sha256:274ed215e75ce7846e6c5542add1a66cddfbb17723d9f94b2d82130952bf5117',
      browser_download_url: 'https://github.com/venkataPhanindraVutla/Prolens/releases/download/v1.1/Prolens-1.1.apk',
    },
  ],
}

test('reads the real v1.1 release', () => {
  const r = parseRelease(v11)!
  expect(r.version).toBe('v1.1')
  expect(r.sizeBytes).toBe(13599511)
  expect(r.sha256).toBe('274ed215e75ce7846e6c5542add1a66cddfbb17723d9f94b2d82130952bf5117')
  expect(r.url).toMatch(/Prolens-1\.1\.apk$/)
  expect(r.source).toBe('api')
})

test('no APK asset or a wrong shape gives null', () => {
  expect(parseRelease({ tag_name: 'v2', assets: [{ name: 'notes.txt', size: 1, browser_download_url: 'x' }] })).toBeNull()
  expect(parseRelease({})).toBeNull()
  expect(parseRelease(null)).toBeNull()
})

test('a missing digest hides the checksum', () => {
  const noDigest = { ...v11, assets: [{ ...v11.assets[0], digest: undefined }] }
  expect(parseRelease(noDigest)!.sha256).toBeNull()
})

test('rate limits and network failures fall back', async () => {
  const forbidden = async () => new Response('{"message":"API rate limit exceeded"}', { status: 403 })
  expect(await fetchRelease(forbidden as typeof fetch)).toEqual(FALLBACK_RELEASE)
  const offline = async () => {
    throw new TypeError('Failed to fetch')
  }
  expect(await fetchRelease(offline as typeof fetch)).toEqual(FALLBACK_RELEASE)
})

test('size is decimal megabytes', () => {
  expect(formatSize(13353471)).toBe('13.4 MB')
})

test('the fallback downloads the exact file its checksum describes', () => {
  expect(FALLBACK_RELEASE.url).toBe('https://github.com/venkataPhanindraVutla/Prolens/releases/download/v1.1/Prolens-1.1.apk')
})
