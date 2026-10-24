/** Local days and clock times in a named IANA zone, using Intl only. */

function parts(ms: number, tz: string) {
  const out: Record<string, number> = {}
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  })
  for (const p of fmt.formatToParts(ms)) if (p.type !== 'literal') out[p.type] = Number(p.value)
  return out
}

/** How far the zone's wall clock is ahead of UTC at instant ms. */
function offsetMs(ms: number, tz: string): number {
  const p = parts(ms, tz)
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(ms / 1000) * 1000
}

/** Epoch ms of 12:00 local time in tz, on the calendar date nowMs falls on in tz. */
export function noonIn(tz: string, nowMs: number): number {
  const p = parts(nowMs, tz)
  const wall = Date.UTC(p.year, p.month - 1, p.day, 12)
  // Two passes settle the offset across a daylight-saving change.
  let t = wall - offsetMs(wall, tz)
  t = wall - offsetMs(t, tz)
  return t
}

/** 'HH:mm' in tz, or a dash when there is no time. */
export function formatTime(ms: number | null, tz: string): string {
  if (ms === null || !Number.isFinite(ms)) return '—'
  return new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(ms)
}

export function browserZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}
