import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test } from 'vitest'
import EveryPhone from './EveryPhone'

test('choosing the 3× lens zooms the photo five times past the 0.6× ultra-wide', async () => {
  render(<EveryPhone />)
  const lenses = screen.getByRole('radiogroup', { name: 'Lens' })
  await userEvent.click(within(lenses).getByRole('radio', { name: '3×' }))
  expect((document.querySelector('[data-zoom]') as HTMLElement).style.transform).toContain('scale(5)')
})

test('a phone that hides its ultra-wide offers no 0.6× lens', async () => {
  render(<EveryPhone />)
  await userEvent.click(screen.getByRole('radio', { name: 'Hidden ultra-wide' }))
  expect(within(screen.getByRole('radiogroup', { name: 'Lens' })).queryByRole('radio', { name: '0.6×' })).toBeNull()
})

test('the card names the example phone, not the visitor’s', async () => {
  render(<EveryPhone />)
  await userEvent.click(screen.getByRole('radio', { name: 'One camera' }))
  expect(screen.getByRole('heading', { level: 3, name: 'One camera' })).toBeInTheDocument()
  expect(screen.queryByText('This phone')).toBeNull()
})
