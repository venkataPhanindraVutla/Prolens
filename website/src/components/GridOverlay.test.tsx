import { render } from '@testing-library/react'
import { expect, test } from 'vitest'
import GridOverlay from './GridOverlay'

test('thirds renders four lines and four dots', () => {
  const { container } = render(<GridOverlay id="thirds" width={300} height={400} />)
  expect(container.querySelectorAll('line')).toHaveLength(4)
  expect(container.querySelectorAll('circle')).toHaveLength(4)
  expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
})
