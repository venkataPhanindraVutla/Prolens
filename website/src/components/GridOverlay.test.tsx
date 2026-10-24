import { render } from '@testing-library/react'
import { expect, test } from 'vitest'
import GridOverlay from './GridOverlay'

test('thirds renders four lines and four dots', () => {
  const { container } = render(<GridOverlay id="thirds" width={300} height={400} />)
  expect(container.querySelectorAll('line')).toHaveLength(4)
  expect(container.querySelectorAll('circle')).toHaveLength(4)
  expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
})

test('the app style draws each line twice: a soft shadow under white at 70%', () => {
  const { container } = render(<GridOverlay id="thirds" width={412} height={549} variant="app" />)
  const lines = container.querySelectorAll('line')
  expect(lines).toHaveLength(8)
  expect(lines[0].closest('g')).toHaveAttribute('stroke', '#000')
  expect(container.querySelector('g[stroke="#fff"]')).toHaveAttribute('stroke-opacity', '0.7')
})
