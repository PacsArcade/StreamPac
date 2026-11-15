/**
 * Bitcoin Federated Time for pacsarcade.stream.
 * Spec: PacsArcade/bitcoin-federated-time spec/BFT-SPEC.md (MIT, in-house), version 2.
 * - Sections 4 to 6: the date and the 10 minute step come from the block height alone. No height: dashes.
 * - Section 14 (live face, a display convention): the wall clock only counts seconds since the block ARRIVED.
 * - Section 15: the arrival is the house watcher's first-seen, else this viewer's own first-seen. Never a block header time.
 * Nothing here estimates a height or a date from a civil clock.
 */

export const BFT_BEACON_URL = "https://time.pacsarcade.org/height"
/** Our own mempool instance, used only to check the beacon (spec 10: report a gap of 2 or more). */
export const BFT_VERIFY_URL = "https://mempool.pacsarcade.org/api/blocks/tip/height"
/**
 * Optional house watcher feed (spec 15a, `/api/block-calls` of the Lumen block caller: `{calls:[{height, first_seen}]}`).
 * Not public yet, so it is off unless `VITE_BFT_ARRIVALS_URL` is set at build time.
 */
export const BFT_ARRIVALS_URL: string | undefined = import.meta.env?.VITE_BFT_ARRIVALS_URL || undefined

const pad = (v: number, w: number) => String(v).padStart(w, "0")
const isHeight = (h: unknown): h is number => typeof h === "number" && Number.isSafeInteger(h) && h >= 0
const isNum = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x)

export interface BftFields {
  year: number
  month: number
  day: number
  hour: number
  /** the 10 minute step, 0 to 50 */
  step: number
  date: string
}

/** Spec section 4. Integer maths only. */
export function bftFields(h: number): BftFields {
  const dayIndex = Math.floor(h / 144)
  const beat = h % 144
  const year = Math.floor(dayIndex / 364)
  const doy = dayIndex % 364
  const month = Math.floor(doy / 28) + 1
  const day = (doy % 28) + 1
  return {
    year,
    month,
    day,
    hour: Math.floor(beat / 6),
    step: (beat % 6) * 10,
    date: `${pad(year, 4)}.${pad(month, 2)}.${pad(day, 2)}`,
  }
}

/** Spec section 5 stamp, `YYYY.MM.DD HH:MM a₿`, or the section 6 dash face. */
export function bftStamp(h: number | null | undefined, withTime = true): string {
  if (!isHeight(h)) return withTime ? "----.--.-- --:-- a₿" : "----.--.-- a₿"
  const f = bftFields(h)
  return withTime ? `${f.date} ${pad(f.hour, 2)}:${pad(f.step, 2)} a₿` : `${f.date} a₿`
}

export interface LiveFace {
  known: boolean
  text: string
  /** the face without the date and marker, e.g. `16:14:32` or `16:1-:--` */
  hms: string
  date: string
  hour: number | null
  minute: number | null
  second: number | null
  elapsed: number | null
  holding: boolean
  lateBy: number
  skewed: boolean
  estimated: boolean
}

/** Spec section 14. Pure: (height, arrivedAt unix s, now unix s). */
export function liveFace(
  height: number | null | undefined,
  arrivedAt: number | null | undefined,
  now: number | null | undefined,
  estimated = false,
): LiveFace {
  const est = !!estimated
  if (!isHeight(height)) {
    return {
      known: false,
      text: "----.--.-- --:--:-- a₿",
      hms: "--:--:--",
      date: "----.--.--",
      hour: null,
      minute: null,
      second: null,
      elapsed: null,
      holding: false,
      lateBy: 0,
      skewed: false,
      estimated: est,
    }
  }
  const f = bftFields(height)
  if (!isNum(arrivedAt) || !isNum(now)) {
    const hms = `${pad(f.hour, 2)}:${f.step / 10}-:--`
    return {
      known: true,
      text: `${f.date} ${hms} a₿`,
      hms,
      date: f.date,
      hour: f.hour,
      minute: null,
      second: null,
      elapsed: null,
      holding: false,
      lateBy: 0,
      skewed: false,
      estimated: est,
    }
  }
  const raw = Math.floor(now - arrivedAt)
  const elapsed = Math.max(0, raw)
  const holding = elapsed >= 600
  const shown = holding ? 599 : elapsed
  const minute = f.step + Math.floor(shown / 60)
  const second = shown % 60
  const hms = `${pad(f.hour, 2)}:${pad(minute, 2)}:${pad(second, 2)}`
  return {
    known: true,
    text: `${f.date} ${hms} a₿`,
    hms,
    date: f.date,
    hour: f.hour,
    minute,
    second,
    elapsed,
    holding,
    lateBy: holding ? elapsed - 600 : 0,
    skewed: raw < 0,
    estimated: est,
  }
}

/** Parse the beacon's `{"height": n}` reply. Anything else is no height. */
export function parseBeacon(body: unknown): number | undefined {
  const h = (body as { height?: unknown } | null)?.height
  return isHeight(h) ? h : undefined
}

/** Parse the house watcher feed (spec 15a) for the first-seen second of one height. */
export function parseArrival(body: unknown, height: number): number | undefined {
  const calls = (body as { calls?: Array<{ height?: unknown; first_seen?: unknown }> } | null)?.calls
  if (!Array.isArray(calls)) return
  const c = calls.find(c => c?.height === height)
  return isNum(c?.first_seen) ? c.first_seen : undefined
}

export type ArrivalSource = "watcher" | "viewer"

export interface TipState {
  height?: number
  arrivedAt?: number
  source?: ArrivalSource
  /** height from our mempool, to check the beacon */
  verify?: number
  /** the beacon did not answer on the last poll */
  beaconDown: boolean
}

/**
 * Fold one poll into the tip state. Viewer first-seen (spec 15b) only starts at a CHANGE of height that this
 * viewer saw happen; the first height after a cold load has no arrival unless the watcher gives one.
 */
export function nextTip(prev: TipState, polled: number | undefined, nowSec: number, watcherArrival?: number): TipState {
  if (polled === undefined) return { ...prev, beaconDown: true }
  if (watcherArrival !== undefined) {
    return { ...prev, height: polled, arrivedAt: watcherArrival, source: "watcher", beaconDown: false }
  }
  if (prev.height === undefined)
    return { ...prev, height: polled, arrivedAt: undefined, source: undefined, beaconDown: false }
  if (polled !== prev.height) return { ...prev, height: polled, arrivedAt: nowSec, source: "viewer", beaconDown: false }
  return { ...prev, beaconDown: false }
}

/** Spec 10: a beacon and public gap of 2 or more blocks must be reported. */
export function beaconGap(tip: TipState): number | undefined {
  if (tip.height === undefined || tip.verify === undefined) return
  const gap = Math.abs(tip.height - tip.verify)
  return gap >= 2 ? gap : undefined
}
