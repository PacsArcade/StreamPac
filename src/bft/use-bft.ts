import { useEffect, useState, useSyncExternalStore } from "react"
import {
  BFT_ARRIVALS_URL,
  BFT_BEACON_URL,
  BFT_VERIFY_URL,
  type LiveFace,
  type TipState,
  liveFace,
  nextTip,
  parseArrival,
  parseBeacon,
} from "./index"

/** One poller for the whole page, shared by every clock on it. The watcher polls every 10 s (spec 15). */
const POLL_MS = 10_000
let state: TipState = { beaconDown: false }
const listeners = new Set<() => void>()
let timer: ReturnType<typeof setInterval> | undefined

async function getJson(url: string): Promise<unknown> {
  // spec 10: a tip is never cached
  const r = await fetch(url, { cache: "no-store" })
  if (!r.ok) throw new Error(String(r.status))
  return await r.json()
}

async function poll() {
  let polled: number | undefined
  try {
    polled = parseBeacon(await getJson(BFT_BEACON_URL))
  } catch {
    polled = undefined
  }
  let watcher: number | undefined
  if (polled !== undefined && BFT_ARRIVALS_URL) {
    try {
      watcher = parseArrival(await getJson(BFT_ARRIVALS_URL), polled)
    } catch {
      watcher = undefined
    }
  }
  let verify: number | undefined
  try {
    const v = await getJson(BFT_VERIFY_URL)
    verify = typeof v === "number" && Number.isSafeInteger(v) ? v : undefined
  } catch {
    verify = undefined
  }
  state = { ...nextTip(state, polled, Date.now() / 1000, watcher), verify }
  for (const l of listeners) l()
}

function subscribe(l: () => void) {
  listeners.add(l)
  if (!timer) {
    poll()
    timer = setInterval(poll, POLL_MS)
  }
  return () => {
    listeners.delete(l)
    if (listeners.size === 0 && timer) {
      clearInterval(timer)
      timer = undefined
    }
  }
}

export function useBftTip(): TipState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  )
}

/** The tip plus the live face, redrawn every second. */
export function useBftLive(): { tip: TipState; face: LiveFace } {
  const tip = useBftTip()
  const [now, setNow] = useState(() => Date.now() / 1000)
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now() / 1000), 1000)
    return () => clearInterval(t)
  }, [])
  return { tip, face: liveFace(tip.height, tip.arrivedAt, now) }
}
