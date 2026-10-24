import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import App from './App'

test('renders the page landmark', () => {
  render(<App />)
  expect(screen.getByRole('main')).toBeInTheDocument()
})
