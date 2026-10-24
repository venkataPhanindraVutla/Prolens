/** Everything the site needs to know about where Prolens lives. */

export const REPO = 'venkataPhanindraVutla/Prolens'
export const SITE_URL = 'https://venkataphanindravutla.github.io/Prolens/'

/** The Formspree form ID. A public value; while it is null the waitlist shows a GitHub link instead. */
export const FORMSPREE_ID: string | null = null

export interface ReleaseInfo {
  version: string
  url: string
  sizeBytes: number
  sha256: string | null
  source: 'api' | 'fallback'
}

/**
 * Shown until the Releases API answers, and whenever it can't. The link is the exact v1.1 file,
 * so the version, size and checksum shown always describe what downloads.
 */
export const FALLBACK_RELEASE: ReleaseInfo = {
  version: 'v1.1',
  url: `https://github.com/${REPO}/releases/download/v1.1/Prolens-1.1.apk`,
  sizeBytes: 13599511,
  sha256: '274ed215e75ce7846e6c5542add1a66cddfbb17723d9f94b2d82130952bf5117',
  source: 'fallback',
}
