import { expect, test } from 'vitest'
import { PHOTOS, camera, exifLine, photo, srcSet } from './photos'

test('every photo carries alt text, an author and a licence link', () => {
  expect(PHOTOS.length).toBeGreaterThanOrEqual(13)
  for (const p of PHOTOS) {
    expect(p.alt.length, p.id).toBeGreaterThan(10)
    expect(p.artist.length, p.id).toBeGreaterThan(1)
    expect(p.licenseUrl, p.id).toMatch(/^https?:\/\//)
    expect(p.page, p.id).toMatch(/^https:\/\/commons\.wikimedia\.org\//)
    expect(p.license, p.id).toMatch(/^(CC0|CC BY \d|Public domain)/)
  }
})

test('EXIF reads like a camera', () => {
  expect(exifLine(photo('hero'))).toBe('Nikon D750 · 30 mm · f/8 · 1/320 · ISO 100')
  expect(exifLine(photo('night'))).toContain('1.3s')
})

test('camera names gain their maker and lose shouting', () => {
  expect(camera({ Make: 'NIKON CORPORATION', Model: 'NIKON D750' })).toBe('Nikon D750')
  expect(camera({ Make: 'FUJIFILM', Model: 'X-T1' })).toBe('Fujifilm X-T1')
  expect(camera({ Make: 'Canon', Model: 'Canon EOS 7D' })).toBe('Canon EOS 7D')
})

test('srcset lists each rendered width under the site base', () => {
  const b = `${import.meta.env.BASE_URL}photos/hero`
  expect(srcSet(photo('hero'))).toBe(`${b}-640.webp 640w, ${b}-960.webp 960w, ${b}-1280.webp 1280w, ${b}-2000.webp 2000w, ${b}-2400.webp 2400w`)
})
