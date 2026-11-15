import { describe, expect, test } from "bun:test"
import type { NostrEvent } from "@snort/system"
import { pickSquad, roomReducer, squadStreamUrl } from "./room-state"

let n = 0
function stream(host: string, opts: { url?: string; watching?: number } = {}): NostrEvent {
  n++
  return {
    id: `id${n}`,
    pubkey: host,
    kind: 30311,
    created_at: 1,
    content: "",
    sig: "",
    tags: [
      ["d", `d${n}`],
      ["status", "live"],
      ["streaming", opts.url ?? `https://cdn.example/${n}/live.m3u8`],
      ["current_participants", String(opts.watching ?? 0)],
    ],
  }
}

describe("squad", () => {
  test("frens first, most watched first, up to the max", () => {
    const a = stream("fren-a", { watching: 3 })
    const b = stream("fren-b", { watching: 30 })
    const c = stream("stranger", { watching: 999 })
    const d = stream("fren-d", { watching: 1 })
    const e = stream("fren-e", { watching: 2 })
    const pick = pickSquad([a, b, c, d, e], new Set(["fren-a", "fren-b", "fren-d", "fren-e"]), 3)
    expect(pick.frens).toBe(true)
    expect(pick.events.map(x => x.pubkey)).toEqual(["fren-b", "fren-a", "fren-e"])
  })
  test("no fren live: shows who is live and says so", () => {
    const pick = pickSquad([stream("x", { watching: 1 }), stream("y", { watching: 5 })], new Set(), 4)
    expect(pick.frens).toBe(false)
    expect(pick.events.map(x => x.pubkey)).toEqual(["y", "x"])
  })
  test("one tile per host, HLS only, and the phone cap of 3", () => {
    const evs = [
      stream("h"),
      stream("h"),
      stream("yt", { url: "https://www.youtube.com/watch?v=abc" }),
      stream("p"),
      stream("q"),
      stream("r"),
    ]
    const pick = pickSquad(evs, new Set(), 3)
    expect(pick.events.length).toBe(3)
    expect(new Set(pick.events.map(x => x.pubkey)).size).toBe(3)
    expect(pick.events.some(x => x.pubkey === "yt")).toBe(false)
    expect(squadStreamUrl(evs[2])).toBeUndefined()
  })
  test("a stream the watcher added stays on, ahead of the rest; a removed one stays off", () => {
    const a = stream("a", { watching: 50 })
    const b = stream("b", { watching: 1 })
    const pick = pickSquad([a, b], new Set(), 1, [b.id])
    expect(pick.events[0].id).toBe(b.id)
    expect(pickSquad([a, b], new Set(), 4, [], new Set([a.id])).events.map(x => x.id)).toEqual([b.id])
  })
})

describe("open a post, pause; close it, resume", () => {
  test("opening a post pauses the stream with the sound, closing resumes it", () => {
    let s = roomReducer({}, { type: "sound", id: "s1" })
    s = roomReducer(s, { type: "open-post", id: "p1" })
    expect(s).toMatchObject({ post: "p1", pausedForPost: "s1" })
    s = roomReducer(s, { type: "close-post" })
    expect(s.pausedForPost).toBeUndefined()
    expect(s.post).toBeUndefined()
    expect(s.audible).toBe("s1")
  })
  test("a second post keeps the first pause; moving the sound while reading does not unpause", () => {
    let s = roomReducer({ audible: "s1" }, { type: "open-post", id: "p1" })
    s = roomReducer(s, { type: "sound", id: "s2" })
    s = roomReducer(s, { type: "open-post", id: "p2" })
    expect(s).toMatchObject({ post: "p2", pausedForPost: "s1", audible: "s2" })
  })
  test("with no stored sound tile, the one on screen with the sound is the one paused", () => {
    const s = roomReducer({}, { type: "open-post", id: "p1", audible: "first" })
    expect(s.pausedForPost).toBe("first")
  })
  test("resume plays it again while the post stays open", () => {
    let s = roomReducer({ audible: "s1" }, { type: "open-post", id: "p1" })
    s = roomReducer(s, { type: "resume" })
    expect(s).toMatchObject({ post: "p1", pausedForPost: undefined })
  })
})
