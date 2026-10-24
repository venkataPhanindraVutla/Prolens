import { useEffect, useState } from 'react'
import { FALLBACK_RELEASE, REPO, type ReleaseInfo } from '../config'

export type { ReleaseInfo }

type Asset = { name?: unknown; size?: unknown; digest?: unknown; browser_download_url?: unknown }

/** The first .apk asset of a GitHub release, or null if there isn't one. */
export function parseRelease(json: unknown): ReleaseInfo | null {
  if (!json || typeof json !== 'object') return null
  const { tag_name, assets } = json as { tag_name?: unknown; assets?: unknown }
  if (typeof tag_name !== 'string' || !Array.isArray(assets)) return null
  const apk = (assets as Asset[]).find((a) => typeof a?.name === 'string' && a.name.toLowerCase().endsWith('.apk'))
  if (!apk || typeof apk.browser_download_url !== 'string' || typeof apk.size !== 'number') return null
  const sha256 = typeof apk.digest === 'string' && apk.digest.startsWith('sha256:') ? apk.digest.slice(7) : null
  return { version: tag_name, url: apk.browser_download_url, sizeBytes: apk.size, sha256, source: 'api' }
}

/** The latest release from the API. Never throws: any failure gives the built-in fallback. */
export async function fetchRelease(fetchImpl: typeof fetch = fetch): Promise<ReleaseInfo> {
  try {
    const res = await fetchImpl(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json' },
    })
    if (!res.ok) return FALLBACK_RELEASE
    return parseRelease(await res.json()) ?? FALLBACK_RELEASE
  } catch {
    return FALLBACK_RELEASE
  }
}

let pending: Promise<ReleaseInfo> | null = null

/** Release info for the page: the fallback first, then the API's answer. Fetched once per load. */
export function useRelease(): ReleaseInfo {
  const [info, setInfo] = useState<ReleaseInfo>(FALLBACK_RELEASE)
  useEffect(() => {
    let live = true
    pending ??= fetchRelease()
    pending.then((r) => live && setInfo(r))
    return () => {
      live = false
    }
  }, [])
  return info
}

export const formatSize = (bytes: number) => `${(bytes / 1_000_000).toFixed(1)} MB`
