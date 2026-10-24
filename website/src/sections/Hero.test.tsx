import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { mockMedia } from '../test/media'
import Hero from './Hero'
import ProofStrip from './ProofStrip'

beforeEach(() => {
  mockMedia()
  vi.stubGlobal('fetch', () => new Promise(() => {}))
})
afterEach(() => vi.unstubAllGlobals())

test('the wordmark is the page heading, named Prolens', () => {
  render(<Hero />)
  expect(screen.getByRole('heading', { level: 1, name: 'Prolens' })).toBeInTheDocument()
})

test('the hero line is exact', () => {
  render(<Hero />)
  expect(
    screen.getByText('Composition, exposure and light in your pocket. Built in the open, shaped by the photographers who use it.'),
  ).toBeInTheDocument()
})

test('download jumps to the download section and GitHub opens the repo', () => {
  render(<Hero />)
  expect(screen.getByRole('link', { name: 'Download for Android' })).toHaveAttribute('href', '#download')
  expect(screen.getByRole('link', { name: 'View on GitHub' })).toHaveAttribute('href', 'https://github.com/venkataPhanindraVutla/Prolens')
})

test('the proof strip carries the release size', () => {
  const { container } = render(<ProofStrip />)
  expect(container.textContent).toContain('Android 7+ · 13.6 MB')
  expect(container.textContent).toContain('free · open source · no ads · no account · works offline')
})

test('the hero is a real photograph with its credit', () => {
  render(<Hero />)
  expect(screen.getByRole('img', { name: /torii gate/i })).toHaveAttribute('srcset')
  expect(screen.getByText(/Jakub Hałun, CC BY 4.0/)).toBeInTheDocument()
})

test('pressing the shutter captures a frame onto the strip', async () => {
  const { default: userEvent } = await import('@testing-library/user-event')
  render(<Hero />)
  await userEvent.click(screen.getByRole('button', { name: 'Take a photo' }))
  await userEvent.click(screen.getByRole('button', { name: 'Take a photo' }))
  expect(screen.getByText('2 frames')).toBeInTheDocument()
})
