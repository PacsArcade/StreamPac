import type { NostrEvent } from "@snort/system"

/** NIP-18 generic repost: a repost of anything that is not a kind 1 note is kind 16 (kind 6 is for kind 1 only). */
export const GENERIC_REPOST = 16

/**
 * The repost of a live stream (kind 30311): kind 16 with the stream event as its content, an `a` tag for the stream
 * address (so the repost follows the stream across its updates), the `e` tag of this version, the host and `k`.
 */
export function streamRepost(
  ev: NostrEvent,
  relayHint = "",
): { kind: number; content: string; tags: Array<Array<string>> } {
  const d = ev.tags.find(t => t[0] === "d")?.[1] ?? ""
  const host = ev.tags.find(t => t[0] === "p" && t[3]?.toLowerCase() === "host")?.[1]
  const tags: Array<Array<string>> = [
    ["e", ev.id, relayHint],
    ["a", `${ev.kind}:${ev.pubkey}:${d}`, relayHint],
    ["p", ev.pubkey],
    ["k", String(ev.kind)],
  ]
  if (host && host !== ev.pubkey) tags.push(["p", host])
  return { kind: ev.kind === 1 ? 6 : GENERIC_REPOST, content: JSON.stringify(ev), tags }
}
