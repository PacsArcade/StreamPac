import { ExternalStore } from "@snort/shared"
import type { NostrEvent } from "@snort/system"
import { useSyncExternalStore } from "react"

/**
 * 18+ streams. A stream counts as 18+ when it carries nostr's content-warning tag (NIP-36, with or without a
 * reason) OR its title has an 18+ sign. The title signs are listed here, in one place, and tested in adult.test.ts.
 * 18+ streams are left out of Discover, the Room squad and the frens rings unless the watcher opts in on the
 * settings page (off by default). A left-out stream is never rendered, so its picture is never requested.
 */
export const ADULT_TITLE_PATTERNS: ReadonlyArray<{ name: string; re: RegExp }> = [
  // the no-one-under-eighteen emoji, anywhere in the title
  { name: "🔞", re: /\u{1F51E}/u },
  // "18+" (or "18 +") on its own: not the end of a longer number or word ("118+", "2018+", "U18+" do not match)
  { name: "18+", re: /(?<![\p{L}\p{N}])18 ?\+/u },
  // "NSFW" as a word, any case, also as #nsfw or [NSFW]; not inside a longer word
  { name: "NSFW", re: /(?<![\p{L}\p{N}])nsfw(?![\p{L}\p{N}])/iu },
]

/** The name of the first 18+ sign the title carries, or undefined. */
export function adultTitleSign(title?: string): string | undefined {
  if (!title) return
  return ADULT_TITLE_PATTERNS.find(p => p.re.test(title))?.name
}

export function hasContentWarning(ev: Pick<NostrEvent, "tags">): boolean {
  return ev.tags.some(t => t[0] === "content-warning")
}

/** True when the stream is 18+: a content-warning tag, or an 18+ sign in its title. */
export function isAdultStream(ev: Pick<NostrEvent, "tags">): boolean {
  if (hasContentWarning(ev)) return true
  return adultTitleSign(ev.tags.find(t => t[0] === "title")?.[1]) !== undefined
}

/** Keep only what the watcher may see: everything when they opted in, otherwise no 18+ streams. */
export function withoutAdult<T extends Pick<NostrEvent, "tags">>(list: Array<T>, showAdult: boolean): Array<T> {
  return showAdult ? list : list.filter(e => !isAdultStream(e))
}

/** The watcher's opt-in, kept on this device. Off unless they turned it on in settings. */
export const SHOW_ADULT_KEY = "pa-show-18plus"

class ShowAdult extends ExternalStore<boolean> {
  #value = typeof window !== "undefined" && window.localStorage?.getItem(SHOW_ADULT_KEY) === "true"

  setValue(v: boolean) {
    this.#value = v
    if (v) window.localStorage.setItem(SHOW_ADULT_KEY, "true")
    else window.localStorage.removeItem(SHOW_ADULT_KEY)
    this.notifyChange()
  }

  takeSnapshot(): boolean {
    return this.#value
  }
}

export const ShowAdultStore = new ShowAdult()

export function useShowAdult() {
  return useSyncExternalStore(
    c => ShowAdultStore.hook(c),
    () => ShowAdultStore.snapshot(),
    () => false,
  )
}
