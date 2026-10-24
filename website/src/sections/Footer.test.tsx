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

test('every photograph is credited with its author and a licence link', async () => {
  const { PHOTOS } = await import('../lib/photos')
  const { container } = render(<Footer />)
  for (const p of PHOTOS) {
    expect(container.textContent, p.id).toContain(p.artist)
    expect(container.querySelector(`a[href="${p.licenseUrl}"]`), p.id).not.toBeNull()
    expect(container.querySelector(`a[href="${p.page}"]`), p.id).not.toBeNull()
  }
})
