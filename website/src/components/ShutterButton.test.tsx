import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import { mockMedia } from '../test/media'
import SectionHeading from './SectionHeading'
import ShutterButton from './ShutterButton'

afterEach(() => vi.unstubAllGlobals())

test('a press calls onClick once and fires the shutter', async () => {
  mockMedia()
  const onClick = vi.fn()
  render(<ShutterButton variant="primary" onClick={onClick}>Shoot</ShutterButton>)
  await userEvent.click(screen.getByRole('button', { name: 'Shoot' }))
  expect(onClick).toHaveBeenCalledTimes(1)
  expect(screen.getByRole('button')).toHaveClass('fired')
})

test('with an href it is a link', () => {
  mockMedia()
  render(<ShutterButton variant="ghost" href="#download">Get it</ShutterButton>)
  expect(screen.getByRole('link', { name: 'Get it' })).toHaveAttribute('href', '#download')
})

test('reduced motion never fires the shutter flash', async () => {
  mockMedia('reduce')
  render(<ShutterButton variant="primary" onClick={() => {}}>Shoot</ShutterButton>)
  await userEvent.click(screen.getByRole('button'))
  expect(screen.getByRole('button')).not.toHaveClass('fired')
})

test('reduced motion renders headings sharp', () => {
  mockMedia('reduce')
  render(<SectionHeading>Compose</SectionHeading>)
  expect(screen.getByRole('heading', { level: 2, name: 'Compose' })).not.toHaveClass('blurred')
})

test('a heading blurred before reduced motion is known comes back sharp', () => {
  mockMedia()
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      disconnect() {}
    },
  )
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ top: 5000 } as DOMRect)
  const { rerender } = render(<SectionHeading>Later</SectionHeading>)
  expect(screen.getByRole('heading', { name: 'Later' })).toHaveClass('blurred')
  mockMedia('reduce')
  rerender(<SectionHeading>Later</SectionHeading>)
  expect(screen.getByRole('heading', { name: 'Later' })).not.toHaveClass('blurred')
  vi.restoreAllMocks()
})
