import { expect, test } from 'vitest'
import { PROFILES, modesFor } from './profiles'

const byId = (id: string) => PROFILES.find((p) => p.id === id)!

test('a phone without high frame rates has no Slo-mo', () => {
  expect(modesFor(byId('one-camera'))).not.toContain('Slo-mo')
})

test('a three-camera phone gets the full strip in order', () => {
  expect(modesFor(byId('three-camera'))).toEqual(['Night', 'Micro', 'Macro', 'Photo', 'Slo-mo', 'Pano', 'Templates'])
})
