import type { NostrEvent } from "@snort/system"

/** Desktop shows up to 4 streams, a phone up to 3 (round 3 boards A and C). */
export const SQUAD_MAX_DESKTOP = 4
export const SQUAD_MAX_PHONE = 3

export interface SquadPick {
  /** the streams on screen, in order; the first one starts with the sound */
  events: Array<NostrEvent>
  /** true when these are your frens; false when you have no frens live and we show who is live */
  frens: boolean
}

/** The HLS url a squad tile can play, or undefined. Squad tiles play HLS only; other kinds open on their own page. */
export function squadStreamUrl(ev: NostrEvent): string | undefined {
  for (const t of ev.tags) {
    if (t[0] !== "streaming" || !t[1]) continue
    try {
      if (new URL(t[1]).pathname.includes(".m3u8")) return t[1]
    } catch {
      // not a url
    }
  }
}

function hostOf(ev: NostrEvent) {
  return ev.tags.find(t => t[0] === "p" && t[3]?.toLowerCase() === "host")?.[1] ?? ev.pubkey
}

function watching(ev: NostrEvent) {
  return Number(ev.tags.find(t => t[0] === "current_participants")?.[1] ?? 0) || 0
}

/**
 * Pick the squad. Frens first (people you follow who are live), most watched first, one stream per host.
 * With no fren live, fall back to the most watched live streams and say so (frens = false).
 * `pinned` keeps streams the watcher chose, in their order, ahead of the rest.
 */
export function pickSquad(
  live: Array<NostrEvent>,
  follows: Set<string>,
  max: number,
  pinned: Array<string> = [],
  dropped: Set<string> = new Set(),
): SquadPick {
  const playable = live.filter(e => squadStreamUrl(e) !== undefined && !dropped.has(e.id))
  const seen = new Set<string>()
  const uniq = (list: Array<NostrEvent>) =>
    list.filter(e => {
      const h = hostOf(e)
      if (seen.has(h)) return false
      seen.add(h)
      return true
    })
  const byWatching = [...playable].sort((a, b) => watching(b) - watching(a))
  const chosen = pinned.map(id => playable.find(e => e.id === id)).filter((e): e is NostrEvent => !!e)
  const frens = byWatching.filter(e => follows.has(hostOf(e)))
  if (frens.length > 0) {
    return { events: uniq([...chosen, ...frens]).slice(0, max), frens: true }
  }
  return { events: uniq([...chosen, ...byWatching]).slice(0, max), frens: false }
}

export interface RoomState {
  /** the tile that has the sound; every other tile plays muted */
  audible?: string
  /** the post that is open, if any */
  post?: string
  /** the tile we paused because a post opened; it resumes when the post closes */
  pausedForPost?: string
}

export type RoomAction =
  | { type: "sound"; id: string }
  | {
      type: "open-post"
      id: string /** the tile that has the sound right now, if the state has not stored one */
      audible?: string
    }
  | { type: "close-post" }
  | { type: "resume" }

/**
 * Opening a post pauses the stream you were watching (the one with the sound). Closing it resumes that stream.
 * Opening a second post while one is open keeps the first pause; it does not pause anything new.
 */
export function roomReducer(state: RoomState, action: RoomAction): RoomState {
  switch (action.type) {
    case "sound":
      return { ...state, audible: action.id }
    case "open-post":
      return { ...state, post: action.id, pausedForPost: state.pausedForPost ?? state.audible ?? action.audible }
    case "close-post":
      return { ...state, post: undefined, pausedForPost: undefined }
    case "resume":
      return { ...state, pausedForPost: undefined }
  }
}
