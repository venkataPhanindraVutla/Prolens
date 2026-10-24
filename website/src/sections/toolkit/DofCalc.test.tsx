import { fireEvent, render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { distance } from '../../lib/format'
import { SENSORS, coc, dof } from '../../lib/photomath'
import DofCalc from './DofCalc'

const value = (label: string) => screen.getByText(label).nextElementSibling!.textContent

test('defaults are full frame, 50 mm, f/8 at 3 m', () => {
  render(<DofCalc />)
  const d = dof(50, 8, coc(SENSORS[0]), 3000)
  expect(value('Near')).toBe(distance(d.near))
  expect(value('Far')).toBe(distance(d.far))
  expect(value('Near')!.startsWith('2.3')).toBe(true)
  expect(value('Far')!.startsWith('4.1')).toBe(true)
})

test('focusing past the hyperfocal distance makes the far limit infinite', () => {
  render(<DofCalc />)
  const slider = screen.getByLabelText(/Focus distance/)
  fireEvent.change(slider, { target: { value: slider.getAttribute('max') } })
  expect(value('Far')).toBe('∞')
})
