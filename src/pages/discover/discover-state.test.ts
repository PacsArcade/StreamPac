import { describe, expect, test } from "bun:test"
import type { NostrEvent } from "@snort/system"
import {
  discoverTags,
  filterByTag,
  followLists,
  mergeOrder,
  onePerHost,
  rankFeed,
  whyShown,
  whyText,
} from "./discover-state"
import { SQUAD_CAP, addToSquad, pinFirst, removeFromSquad, streamAddr } from "../room/squad-store"
import { pickSquad } from "../room/room-state"

let n = 0
function stream(host: string, opts: { tags?: Array<string>; watching?: number } = {}): NostrEvent {
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
      ["streaming", `https://cdn.example/${n}/live.m3u8`],
      ["current_participants", String(opts.watching ?? 0)],
      ...(opts.tags ?? []).map(t => ["t", t]),
    ],
  }
}
function contacts(author: string, follows: Array<string>, at = 10): NostrEvent {
  return { id: `c-${author}-${at}`, pubkey: author, kind: 3, created_at: at, content: "", sig: "", tags: follows.map(p => ["p", p]) }
}

describe("why it is shown", () => {
  const me = new Set(["satsuma", "node_nana", "bob"])
  const lists = followLists([contacts("satsuma", ["relay_kid"]), contacts("node_nana", ["relay_kid", "other"])])

  test("frens of frens from real follow lists, in your follow order", () => {
    const why = whyShown(stream("relay_kid"), { loggedIn: true, follows: me, lists })
    expect(why).toEqual({ kind: "fof", via: ["satsuma", "node_nana"], more: 0 })
    expect(whyText(why, ["satsuma", "node_nana"])).toBe("satsuma and node_nana follow them")
  })
  test("one fren, and more than two", () => {
    expect(whyText({ kind: "fof", via: ["a"], more: 0 }, ["satsuma"])).toBe("satsuma follows them")
    expect(whyText({ kind: "fof", via: ["a", "b"], more: 3 }, ["satsuma", "node_nana"])).toBe(
      "satsuma, node_nana and 3 more follow them",
    )
    const many = followLists(["a", "b", "c", "d"].map(f => contacts(f, ["h"])))
    expect(whyShown(stream("h"), { loggedIn: true, follows: new Set(["a", "b", "c", "d"]), lists: many })).toEqual({
      kind: "fof",
      via: ["a", "b"],
      more: 2,
    })
  })
  test("a streamer you follow yourself says so", () => {
    expect(whyText(whyShown(stream("bob"), { loggedIn: true, follows: me, lists }))).toBe("you follow them")
  })
  test("no login: never names frens, even if lists are known; says live now", () => {
    const why = whyShown(stream("relay_kid"), { loggedIn: false, follows: me, lists })
    expect(why).toEqual({ kind: "live" })
    expect(whyText(why)).toBe("live now")
  })
  test("logged in with no frens who follow them: the tag that matched, else live now", () => {
    const ev = stream("stranger", { tags: ["Gaming", "retro"] })
    expect(whyText(whyShown(ev, { loggedIn: true, follows: me, lists, tag: "gaming" }))).toBe("#gaming")
    expect(whyText(whyShown(ev, { loggedIn: true, follows: me, lists }))).toBe("live now")
    // a picked tag the stream does not carry is not a reason
    expect(whyText(whyShown(ev, { loggedIn: true, follows: me, lists, tag: "music" }))).toBe("live now")
  })
  test("only the newest follow list counts: an unfollow is not a reason", () => {
    const l = followLists([contacts("satsuma", ["relay_kid"], 10), contacts("satsuma", ["someone"], 20)])
    expect(whyShown(stream("relay_kid"), { loggedIn: true, follows: new Set(["satsuma"]), lists: l }).kind).toBe("live")
  })
  test("ranking: your frens, then most frens following, then most watched", () => {
    const a = stream("relay_kid", { watching: 1 })
    const b = stream("bob", { watching: 0 })
    const c = stream("stranger", { watching: 500 })
    const ranked = rankFeed([c, a, b], { loggedIn: true, follows: me, lists })
    expect(ranked.map(e => e.pubkey)).toEqual(["bob", "relay_kid", "stranger"])
    expect(rankFeed([a, c], { loggedIn: false, follows: me, lists }).map(e => e.pubkey)).toEqual([
      "stranger",
      "relay_kid",
    ])
  })
})

describe("tag filter", () => {
  const live = [
    stream("a", { tags: ["Gaming", "retro"] }),
    stream("b", { tags: ["bitcoin", "retro"] }),
    stream("c", { tags: ["hardware", "retro", "bitcoin"] }),
    stream("d", { tags: [] }),
  ]
  test("the chips: house tags first, then real tags from live streams, most used first", () => {
    expect(discoverTags(live)).toEqual(["gaming", "bitcoin", "music", "art", "retro", "hardware"])
    expect(discoverTags([])).toEqual(["gaming", "bitcoin", "music", "art"])
  })
  test("filters by tag, any case; no tag means everything", () => {
    expect(filterByTag(live, "gaming").map(e => e.pubkey)).toEqual(["a"])
    expect(filterByTag(live, "BITCOIN").map(e => e.pubkey)).toEqual(["b", "c"])
    expect(filterByTag(live, "art")).toEqual([])
    expect(filterByTag(live, undefined).length).toBe(4)
  })
  test("a stream cannot borrow a host you follow: a host p tag only counts from allowed publishers", () => {
    const fake = stream("stranger")
    fake.tags.push(["p", "bob", "", "host"])
    const why = whyShown(fake, { loggedIn: true, follows: new Set(["bob"]), lists: new Map() })
    expect(why.kind).toBe("live")
  })
  test("one stream per host", () => {
    const h1 = stream("h")
    const h2 = stream("h")
    expect(onePerHost([h1, h2, stream("k")]).length).toBe(2)
  })
  test("the stream on screen never moves when new data arrives", () => {
    expect(mergeOrder(["a", "b", "c"], ["c", "x", "a", "b"], 1)).toEqual(["a", "b", "c", "x"])
    // an ended stream drops out
    expect(mergeOrder(["a", "b", "c"], ["c", "b"], 1)).toEqual(["b", "c"])
    expect(mergeOrder([], ["z", "y"], 0)).toEqual(["z", "y"])
  })
})

describe("squad cap of 4", () => {
  test("adds up to 4, then says full and changes nothing", () => {
    let list: Array<string> = []
    for (const a of ["s1", "s2", "s3", "s4"]) {
      const r = addToSquad(list, a)
      expect(r.outcome).toBe("added")
      list = r.list
    }
    expect(SQUAD_CAP).toBe(4)
    const full = addToSquad(list, "s5")
    expect(full.outcome).toBe("full")
    expect(full.list).toEqual(["s1", "s2", "s3", "s4"])
    expect(full.size).toBe(4)
  })
  test("adding one already on says so and does not double it", () => {
    const r = addToSquad(["s1"], "s1")
    expect(r).toEqual({ list: ["s1"], outcome: "already", size: 1 })
  })
  test("a stream that ended does not hold a seat", () => {
    const r = addToSquad(["s1", "s2", "ended", "s4"], "s5", 4, a => a !== "ended")
    expect(r.outcome).toBe("added")
    expect(r.list).toEqual(["s1", "s2", "s4", "s5"])
  })
  test("removing frees a seat; the Room's own pick goes first and keeps the cap", () => {
    expect(removeFromSquad(["s1", "s2"], "s1")).toEqual(["s2"])
    expect(pinFirst(["s1", "s2", "s3", "s4"], "s9")).toEqual(["s9", "s1", "s2", "s3"])
  })
  test("the Room finds a pick by its address after the event id changed", () => {
    const ev = stream("host", { watching: 0 })
    const updated = { ...ev, id: "new-id" }
    const other = stream("other", { watching: 999 })
    const pick = pickSquad([other, updated], new Set(), 4, [streamAddr(ev)])
    expect(pick.events[0].id).toBe("new-id")
  })
})
