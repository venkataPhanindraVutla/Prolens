import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import { distance } from '../../lib/format'
import { SENSORS, coc, dof } from '../../lib/photomath'
import { LiveCalculators, LiveCoach, LiveGear, LiveLight, LiveToolkit, LiveViewfinder } from './LiveScreens'

test('viewfinder: tapping a mode selects it', async () => {
  render(<LiveViewfinder />)
  await userEvent.click(screen.getByRole('button', { name: 'Night mode' }))
  expect(screen.getByRole('button', { name: 'Night mode' })).toHaveAttribute('aria-pressed', 'true')
})

test('calculators: the depth-of-field numbers follow the sliders', () => {
  render(<LiveCalculators />)
  const near = () => screen.getByText('Near limit').previousElementSibling!.textContent
  expect(near()).toBe(distance(dof(35, 2.8, coc(SENSORS[0]), 3000).near))
  fireEvent.change(screen.getByLabelText('Subject distance'), { target: { value: '0' } })
  expect(near()).not.toBe(distance(dof(35, 2.8, coc(SENSORS[0]), 3000).near))
})

test('light: switching city shows that city', async () => {
  render(<LiveLight />)
  await userEvent.click(screen.getByRole('button', { name: 'Tokyo' }))
  expect(screen.getByText('35.6762° N, 139.6503° E')).toBeInTheDocument()
})

test('coach: a recipe opens and closes', async () => {
  render(<LiveCoach />)
  await userEvent.click(screen.getByRole('button', { name: /Street/ }))
  expect(screen.getByText('1/500 s')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Recipes' }))
  expect(screen.getByRole('button', { name: /Headshot/ })).toBeInTheDocument()
})

test('gear: picking an APS-C body changes the crop factor', async () => {
  render(<LiveGear />)
  expect(screen.getByText('1.00×')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: /Fujifilm X-T5/ }))
  expect(screen.getByText('1.53×')).toBeInTheDocument()
})

test('toolkit: a card opens its screen', async () => {
  const open = vi.fn()
  render(<LiveToolkit onOpen={open} />)
  await userEvent.click(screen.getByRole('button', { name: 'Open Coach' }))
  expect(open).toHaveBeenCalledWith('Coach')
})
