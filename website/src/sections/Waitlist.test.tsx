import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import { mockMedia } from '../test/media'
import Waitlist from './Waitlist'

afterEach(() => vi.unstubAllGlobals())

test('without a form ID it points to GitHub releases instead', () => {
  mockMedia()
  render(<Waitlist formId={null} />)
  expect(screen.queryByRole('textbox')).toBeNull()
  expect(screen.getByRole('link', { name: /watch releases on github/i })).toHaveAttribute(
    'href',
    'https://github.com/venkataPhanindraVutla/Prolens/releases',
  )
})

test('a double tap while sending sends once', async () => {
  mockMedia()
  const fetchMock = vi.fn(() => new Promise<Response>(() => {}))
  vi.stubGlobal('fetch', fetchMock)
  render(<Waitlist formId="abc123" />)
  await userEvent.type(screen.getByLabelText('Email'), 'a@b.co')
  const button = screen.getByRole('button', { name: 'Join the waitlist' })
  await userEvent.click(button)
  await userEvent.click(button)
  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(screen.getByRole('button', { name: 'Joining…' })).toBeDisabled()
})

test('a failure says what happened and keeps the email', async () => {
  mockMedia()
  vi.stubGlobal('fetch', async () => {
    throw new TypeError('offline')
  })
  render(<Waitlist formId="abc123" />)
  await userEvent.type(screen.getByLabelText('Email'), 'a@b.co')
  await userEvent.click(screen.getByRole('button', { name: 'Join the waitlist' }))
  expect(await screen.findByText(/Couldn't reach the waitlist service/)).toBeInTheDocument()
  expect(screen.getByLabelText('Email')).toHaveValue('a@b.co')
  expect(screen.getByRole('button', { name: 'Join the waitlist' })).toBeEnabled()
})

test('success replaces the form', async () => {
  mockMedia()
  vi.stubGlobal('fetch', async () => new Response('{}', { status: 200 }))
  render(<Waitlist formId="abc123" />)
  await userEvent.type(screen.getByLabelText('Email'), 'a@b.co')
  await userEvent.click(screen.getByLabelText('iPhone'))
  await userEvent.click(screen.getByRole('button', { name: 'Join the waitlist' }))
  expect(await screen.findByText("You're on the list.")).toBeInTheDocument()
  expect(screen.queryByLabelText('Email')).toBeNull()
})
