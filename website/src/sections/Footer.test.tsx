import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import Footer from './Footer'

test('footer names the licence, the credits and the sign-off', () => {
  const { container } = render(<Footer />)
  expect(container.textContent).toContain('Apache-2.0')
  expect(container.textContent).toContain('SunCalc')
  expect(screen.getByText('Shoot like you mean it.')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /github/i })).toHaveAttribute('href', 'https://github.com/venkataPhanindraVutla/Prolens')
})
