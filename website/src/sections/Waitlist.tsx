import { useRef, useState, type FormEvent } from 'react'
import ShutterButton from '../components/ShutterButton'
import { FORMSPREE_ID } from '../config'
import { releasesUrl } from '../lib/issues'
import { submitWaitlist, type Store } from '../lib/waitlist'
import css from './Waitlist.module.css'

const STORES: { value: Exclude<Store, ''>; label: string }[] = [
  { value: 'play', label: 'Play Store' },
  { value: 'iphone', label: 'iPhone' },
  { value: 'both', label: 'Both' },
]

export default function Waitlist({ formId = FORMSPREE_ID }: { formId?: string | null }) {
  const [email, setEmail] = useState('')
  const [store, setStore] = useState<Store>('')
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const sending = useRef(false)

  if (!formId)
    return (
      <div className={css.waitlist}>
        <p className={css.quiet}>
          Want the store version?{' '}
          <a className="focusable" href={releasesUrl} target="_blank" rel="noopener">
            Watch releases on GitHub
          </a>{' '}
          to hear first.
        </p>
      </div>
    )

  if (state === 'done')
    return (
      <div className={css.waitlist} role="status">
        <p className={css.done}>You're on the list.</p>
      </div>
    )

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (sending.current) return
    sending.current = true
    setState('sending')
    const result = await submitWaitlist(formId, email, store)
    sending.current = false
    setState(result === 'ok' ? 'done' : 'error')
  }

  return (
    <form className={css.waitlist} onSubmit={submit} aria-labelledby="waitlist-title">
      <h3 id="waitlist-title" className={css.title}>
        Waiting for the Play Store or iPhone?
      </h3>
      <div className={css.row}>
        <label className={css.field}>
          <span>Email</span>
          <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <ShutterButton variant="ghost" type="submit" disabled={state === 'sending'}>
          {state === 'sending' ? 'Joining…' : 'Join the waitlist'}
        </ShutterButton>
      </div>
      <fieldset className={css.stores}>
        <legend>Which store? (optional)</legend>
        {STORES.map((s) => (
          <label key={s.value} className={css.store}>
            <input type="radio" name="store" value={s.value} checked={store === s.value} onChange={() => setStore(s.value)} />
            <span>{s.label}</span>
          </label>
        ))}
      </fieldset>
      <p className={css.quiet}>One email when Prolens reaches a store. Nothing else.</p>
      {state === 'error' && (
        <p className={css.error} role="alert">
          Couldn't reach the waitlist service. Check your connection and try again.
        </p>
      )}
    </form>
  )
}
