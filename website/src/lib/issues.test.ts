import { expect, test } from 'vitest'
import { issueUrl } from './issues'

test('feature requests are labelled enhancement', () => {
  const u = issueUrl('feature')
  expect(u.startsWith('https://github.com/venkataPhanindraVutla/Prolens/issues/new?')).toBe(true)
  expect(u).toContain('labels=enhancement')
  expect(u).toContain('title=Feature%3A+')
  expect(decodeURIComponent(new URL(u).searchParams.get('body')!)).toContain('What were you shooting?')
})

test('bug reports are labelled bug and ask for the phone', () => {
  const u = issueUrl('bug')
  expect(u).toContain('labels=bug')
  expect(new URL(u).searchParams.get('body')).toContain('**Phone model:**')
})
