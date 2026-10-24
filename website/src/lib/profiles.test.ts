import { expect, test } from 'vitest'
import { PROFILES, modesFor, zoomScale } from './profiles'

const byId = (id: string) => PROFILES.find((p) => p.id === id)!

test('a phone without high frame rates has no Slo-mo', () => {
  expect(modesFor(byId('one-camera'))).not.toContain('Slo-mo')
})

test('a three-camera phone gets the full strip in order', () => {
  expect(modesFor(byId('three-camera'))).toEqual(['Night', 'Micro', 'Macro', 'Photo', 'Slo-mo', 'Pano', 'Templates'])
})

test('zoom is relative to the widest lens the phone shares', () => {
  expect(zoomScale(3, 0.6)).toBeCloseTo(5)
  expect(zoomScale(1, 1)).toBe(1)
})
