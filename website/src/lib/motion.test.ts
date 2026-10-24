import { renderHook } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { mockMedia } from '../test/media'
import { useCanHover, useReducedMotion } from './motion'

afterEach(() => vi.unstubAllGlobals())

test('reduced motion follows the media query', () => {
  mockMedia('reduce')
  expect(renderHook(() => useReducedMotion()).result.current).toBe(true)
  mockMedia()
  expect(renderHook(() => useReducedMotion()).result.current).toBe(false)
})

test('hover needs a fine pointer', () => {
  mockMedia('hover')
  expect(renderHook(() => useCanHover()).result.current).toBe(true)
  mockMedia()
  expect(renderHook(() => useCanHover()).result.current).toBe(false)
})
