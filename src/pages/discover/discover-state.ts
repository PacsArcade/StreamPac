import type { NostrEvent } from "@snort/system"
import { getHost } from "@/event-tags"

/** The chips Discover always offers (round 3 board B); tags the live streams really carry are added after them. */
export const BASE_TAGS = ["gaming", "bitcoin", "music", "art"]
/** How many extra chips come from the live streams' own tags. */
export const EXTRA_TAGS = 6

/**
 * The host of a stream. Same rule as the rest of the app (getHost): a "host" p tag only counts from the
 * publishers allowed to name a host, so no stream can borrow someone you follow to get a "why" line.
 */
export function hostOf(ev: NostrEvent) {
  return getHost(ev)
}

/** A stream's own tags (`t`), lower case, without duplicates. */
export function streamTags(ev: NostrEvent): Array<string> {
  return [...new Set(ev.tags.filter(t => t[0] === "t" && t[1]).map(t => t[1].trim().toLowerCase()))].filter(Boolean)
}

/** How many are watching, from the stream's own tag (0 when it does not say). */
export function watchingOf(ev: NostrEvent) {
  return Number(ev.tags.find(t => t[0] === "current_participants")?.[1] ?? 0) || 0
}

/**
 * The chips: the four house tags first, then the tags live streams really carry, most used first.
 * A tag only gets a chip from the streams if at least one live stream carries it.
 */
export function discoverTags(live: Array<NostrEvent>, base = BASE_TAGS, extra = EXTRA_TAGS): Array<string> {
  const count = new Map<string, number>()
  for (const ev of live) {
    for (const t of streamTags(ev)) count.set(t, (count.get(t) ?? 0) + 1)
  }
  const fromStreams = [...count.entries()]
    .filter(([t]) => !base.includes(t))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, extra)
    .map(([t]) => t)
  return [...base, ...fromStreams]
}

/** The streams that carry the chosen tag (case does not matter). No tag: every stream. */
export function filterByTag<T extends NostrEvent>(live: Array<T>, tag?: string): Array<T> {
  if (!tag) return live
  const want = tag.toLowerCase()
  return live.filter(ev => streamTags(ev).includes(want))
}

/** The frens you follow whose own follow list has this host in it. */
export function frensWhoFollow(host: string, follows: Set<string>, lists: Map<string, Set<string>>): Array<string> {
  const out: Array<string> = []
  for (const f of follows) {
    if (f === host) continue
    if (lists.get(f)?.has(host)) out.push(f)
  }
  return out
}

/**
 * Why a stream is in your Discover feed. Only reasons we can show from real data:
 * - fren: you follow the streamer
 * - fof: frens you follow follow the streamer (their real follow lists)
 * - tag: the chip you picked and the stream carries that tag
 * - live: nothing else, it is simply live now
 */
export type Why =
  | { kind: "fren" }
  | { kind: "fof"; via: Array<string>; more: number }
  | { kind: "tag"; tag: string }
  | { kind: "live" }

export interface WhyContext {
  /** logged in at all; without a login there are no frens to name */
  loggedIn: boolean
  follows: Set<string>
  /** follow lists of the people you follow (kind 3), by their pubkey */
  lists: Map<string, Set<string>>
  /** the chip that is picked, if any */
  tag?: string
}

/** How many fren names the line shows before "and N more". */
export const WHY_NAMES = 2

export function whyShown(ev: NostrEvent, ctx: WhyContext): Why {
  const host = hostOf(ev)
  if (ctx.loggedIn) {
    if (ctx.follows.has(host)) return { kind: "fren" }
    const via = frensWhoFollow(host, ctx.follows, ctx.lists)
    if (via.length > 0) return { kind: "fof", via: via.slice(0, WHY_NAMES), more: Math.max(0, via.length - WHY_NAMES) }
  }
  if (ctx.tag && streamTags(ev).includes(ctx.tag.toLowerCase())) return { kind: "tag", tag: ctx.tag.toLowerCase() }
  return { kind: "live" }
}

/** The words for a reason. `names` are the display names of `why.via`, same order. */
export function whyText(why: Why, names: Array<string> = []): string {
  switch (why.kind) {
    case "fren":
      return "you follow them"
    case "tag":
      return `#${why.tag}`
    case "live":
      return "live now"
    case "fof": {
      const n = why.via.map((pk, i) => names[i] ?? pk.slice(0, 8))
      const verb = n.length === 1 && why.more === 0 ? "follows" : "follow"
      if (why.more > 0) return `${n.join(", ")} and ${why.more} more ${verb} them`
      if (n.length === 2) return `${n[0]} and ${n[1]} ${verb} them`
      return `${n[0]} ${verb} them`
    }
  }
}

/** Direct frens first, then by how many of your frens follow them, then most watched. */
export function rankFeed<T extends NostrEvent>(live: Array<T>, ctx: WhyContext): Array<T> {
  const score = (ev: T) => {
    const host = hostOf(ev)
    if (!ctx.loggedIn) return 0
    if (ctx.follows.has(host)) return 100_000
    return frensWhoFollow(host, ctx.follows, ctx.lists).length
  }
  return [...live]
    .map(ev => ({ ev, s: score(ev), w: watchingOf(ev) }))
    .sort((a, b) => b.s - a.s || b.w - a.w)
    .map(x => x.ev)
}

/** One stream per host: a host with two live events shows once (the first in the order given). */
export function onePerHost<T extends NostrEvent>(list: Array<T>): Array<T> {
  const seen = new Set<string>()
  return list.filter(ev => {
    const h = hostOf(ev)
    if (seen.has(h)) return false
    seen.add(h)
    return true
  })
}

/**
 * Keep the streams you have already swiped past (and the one on screen) where they are, so new data never
 * moves the stream you are watching. Everything after the current one follows the fresh ranking.
 */
export function mergeOrder(prev: Array<string>, ranked: Array<string>, current: number): Array<string> {
  const alive = new Set(ranked)
  const head = prev.slice(0, Math.max(0, current + 1)).filter(k => alive.has(k))
  const inHead = new Set(head)
  return [...head, ...ranked.filter(k => !inHead.has(k))]
}

/** Read a kind 3 list into the set of pubkeys it follows. */
export function followSet(ev: NostrEvent): Set<string> {
  return new Set(ev.tags.filter(t => t[0] === "p" && t[1]).map(t => t[1]))
}

/** The newest kind 3 per author, as follow sets. Older copies from other relays are ignored. */
export function followLists(events: Array<NostrEvent>): Map<string, Set<string>> {
  const newest = new Map<string, NostrEvent>()
  for (const ev of events) {
    if (ev.kind !== 3) continue
    const had = newest.get(ev.pubkey)
    if (!had || ev.created_at > had.created_at) newest.set(ev.pubkey, ev)
  }
  return new Map([...newest.entries()].map(([pk, ev]) => [pk, followSet(ev)]))
}
