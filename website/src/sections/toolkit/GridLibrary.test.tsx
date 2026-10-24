import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test } from 'vitest'
import GridLibrary from './GridLibrary'

test('all 23 grids can be chosen, and each explains itself', async () => {
  render(<GridLibrary />)
  const group = screen.getByRole('radiogroup', { name: 'Grid library' })
  expect(within(group).getAllByRole('radio')).toHaveLength(23)
  await userEvent.click(within(group).getByRole('radio', { name: 'Harmonic armature' }))
  expect(screen.getByText(/The 14-line armature/)).toBeInTheDocument()
})
