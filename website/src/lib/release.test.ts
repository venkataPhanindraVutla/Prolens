import { expect, test } from 'vitest'
import { FALLBACK_RELEASE } from '../config'
import { fetchRelease, formatSize, parseRelease } from './release'

const v10 = {
  tag_name: 'v1.0',
  assets: [
    {
      name: 'Prolens-1.0.apk',
      size: 13353471,
      digest: 'sha256:d1cb1834e1c44dbdac9ef292bed718708adf922e833b106a65dbdd4f6af91dbe',
      browser_download_url: 'https://github.com/venkataPhanindraVutla/Prolens/releases/download/v1.0/Prolens-1.0.apk',
    },
  ],
}

test('reads the real v1.0 release', () => {
  const r = parseRelease(v10)!
  expect(r.version).toBe('v1.0')
  expect(r.sizeBytes).toBe(13353471)
  expect(r.sha256).toBe('d1cb1834e1c44dbdac9ef292bed718708adf922e833b106a65dbdd4f6af91dbe')
  expect(r.url).toMatch(/Prolens-1\.0\.apk$/)
  expect(r.source).toBe('api')
})

test('no APK asset or a wrong shape gives null', () => {
  expect(parseRelease({ tag_name: 'v2', assets: [{ name: 'notes.txt', size: 1, browser_download_url: 'x' }] })).toBeNull()
  expect(parseRelease({})).toBeNull()
  expect(parseRelease(null)).toBeNull()
})

test('a missing digest hides the checksum', () => {
  const noDigest = { ...v10, assets: [{ ...v10.assets[0], digest: undefined }] }
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
  expect(FALLBACK_RELEASE.url).toBe('https://github.com/venkataPhanindraVutla/Prolens/releases/download/v1.0/Prolens-1.0.apk')
})
