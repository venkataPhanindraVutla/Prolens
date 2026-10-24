import { REPO } from '../config'

export const repoUrl = `https://github.com/${REPO}`
export const releasesUrl = `${repoUrl}/releases`

const TEMPLATES = {
  feature: {
    title: 'Feature: ',
    labels: 'enhancement',
    body: '**What were you shooting?**\n\n**What did you want Prolens to do?**\n\n**How do you do it today?**\n',
  },
  bug: {
    title: 'Bug: ',
    labels: 'bug',
    body: '**Phone model:**\n**Android version:**\n**Prolens version:**\n\n**Steps:**\n1. \n\n**Expected:**\n\n**What happened:**\n',
  },
}

/** A pre-filled new-issue link. Labels only stick for people with triage rights, so the title prefix carries the kind too. */
export function issueUrl(kind: 'feature' | 'bug'): string {
  return `${repoUrl}/issues/new?${new URLSearchParams(TEMPLATES[kind])}`
}
