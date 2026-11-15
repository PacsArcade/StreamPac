import type { NostrEvent } from "@snort/system"
import { useSyncExternalStore } from "react"
import { SQUAD_MAX_DESKTOP } from "./room-state"

/** The squad holds up to 4 streams you picked (the desktop Room shows 4 tiles). */
export const SQUAD_CAP = SQUAD_MAX_DESKTOP

/**
 * A stream's address, `kind:author:d`. A live stream (kind 30311) is replaceable: its event id changes every
 * time the streamer updates it, so the squad keeps the address, which stays the same for the whole stream.
 */
export function streamAddr(ev: NostrEvent) {
  return `${ev.kind}:${ev.pubkey}:${ev.tags.find(t => t[0] === "d")?.[1] ?? ""}`
}

export type SquadAdd = "added" | "already" | "full"

/**
 * Add a stream to the squad, at the end. Streams that are no longer live (`isLive` says no) do not hold a seat:
 * they are dropped first. The squad never holds more than `cap`; a full squad is left as it was and says "full".
 */
export function addToSquad(
  list: Array<string>,
  addr: string,
  cap = SQUAD_CAP,
  isLive: (addr: string) => boolean = () => true,
): { list: Array<string>; outcome: SquadAdd; size: number } {
  const live = list.filter(a => a === addr || isLive(a))
  if (live.includes(addr)) return { list: live, outcome: "already", size: live.length }
  if (live.length >= cap) return { list: live, outcome: "full", size: live.length }
  const next = [...live, addr]
  return { list: next, outcome: "added", size: next.length }
}

/** The Room's own "put this one on": it goes first; past the cap, the last one picked earliest falls off. */
export function pinFirst(list: Array<string>, addr: string, cap = SQUAD_CAP): Array<string> {
  return [addr, ...list.filter(a => a !== addr)].slice(0, cap)
}

export function removeFromSquad(list: Array<string>, addr: string): Array<string> {
  return list.filter(a => a !== addr)
}

const KEY = "pa-squad"

function read(): Array<string> {
  try {
    const v = JSON.parse(window.localStorage.getItem(KEY) ?? "[]")
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, SQUAD_CAP) : []
  } catch {
    return []
  }
}

let current: Array<string> | undefined
const listeners = new Set<() => void>()

/** The squad you picked, kept on this device so Discover and the Room share it. */
export const SquadStore = {
  get(): Array<string> {
    current ??= typeof window === "undefined" ? [] : read()
    return current
  },
  set(list: Array<string>) {
    current = list.slice(0, SQUAD_CAP)
    try {
      window.localStorage.setItem(KEY, JSON.stringify(current))
    } catch {
      // private mode: the squad lasts for this page only
    }
    for (const l of listeners) l()
  },
  subscribe(fn: () => void) {
    listeners.add(fn)
    return () => {
      listeners.delete(fn)
    }
  },
}

const EMPTY: Array<string> = []

export function useSquadPicks() {
  return useSyncExternalStore(SquadStore.subscribe, SquadStore.get, () => EMPTY)
}
