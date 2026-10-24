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
 * Shown until the Releases API answers, and whenever it can't. The link is the exact v1.0 file,
 * so the version, size and checksum shown always describe what downloads.
 */
export const FALLBACK_RELEASE: ReleaseInfo = {
  version: 'v1.0',
  url: `https://github.com/${REPO}/releases/download/v1.0/Prolens-1.0.apk`,
  sizeBytes: 13353471,
  sha256: 'd1cb1834e1c44dbdac9ef292bed718708adf922e833b106a65dbdd4f6af91dbe',
  source: 'fallback',
}
