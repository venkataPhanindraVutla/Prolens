export type Store = 'play' | 'iphone' | 'both' | ''

/** Sends one signup to Formspree. 'ok' only when Formspree accepts it. */
export async function submitWaitlist(id: string, email: string, store: Store, fetchImpl: typeof fetch = fetch): Promise<'ok' | 'error'> {
  try {
    const res = await fetchImpl(`https://formspree.io/f/${id}`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, store }),
    })
    return res.ok ? 'ok' : 'error'
  } catch {
    return 'error'
  }
}
