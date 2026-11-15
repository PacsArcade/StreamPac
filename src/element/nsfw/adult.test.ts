import { expect, test } from "bun:test"
import {
  ADULT_HASHTAGS,
  ADULT_TITLE_PATTERNS,
  adultHashtag,
  adultTitleSign,
  isAdultStream,
  withoutAdult,
} from "./adult"

const ev = (title?: string, extra: Array<Array<string>> = []) => ({
  tags: [...(title !== undefined ? [["title", title]] : []), ...extra],
})

test("the patterns are the three signs, in one list", () => {
  expect(ADULT_TITLE_PATTERNS.map(p => p.name)).toEqual(["🔞", "18+", "NSFW"])
})

test("titles that carry an 18+ sign match", () => {
  const yes: Array<[string, string]> = [
    ["SWATing on-chain zappers... 🔞", "🔞"],
    ["🔞late night", "🔞"],
    ["18+ only tonight", "18+"],
    ["chill stream (18+)", "18+"],
    ["[18+] horror", "18+"],
    ["Rated 18 + up", "18+"],
    ["Ready Or Not #NSFW Probably", "NSFW"],
    ["nsfw", "NSFW"],
    ["NsFw art", "NSFW"],
    ["art [NSFW]", "NSFW"],
    ["art - nsfw!", "NSFW"],
  ]
  for (const [t, sign] of yes) expect([t, adultTitleSign(t)]).toEqual([t, sign])
})

test("near-misses do not match", () => {
  const no = [
    "U18 football",
    "2018+ highlights",
    "118+ wins",
    "18 holes of golf",
    "top 18",
    "Ages 18-25 welcome",
    "SFW art only",
    "unsfw",
    "nsfwish",
    "NSFWL league",
    "level 180+",
    "",
  ]
  for (const t of no) expect([t, adultTitleSign(t)]).toEqual([t, undefined])
  expect(adultTitleSign(undefined)).toBeUndefined()
})

test("a content-warning tag makes a stream 18+, with or without a reason", () => {
  expect(isAdultStream(ev("family friendly", [["content-warning", "nsfw"]]))).toBe(true)
  expect(isAdultStream(ev("family friendly", [["content-warning"]]))).toBe(true)
  expect(isAdultStream(ev("family friendly"))).toBe(false)
  expect(isAdultStream(ev(undefined))).toBe(false)
  expect(isAdultStream(ev("late 🔞"))).toBe(true)
  // a hashtag t tag alone counts ("by title or tag")
  expect(isAdultStream(ev("art", [["t", "nsfw"]]))).toBe(true)
})

test("the hashtags are the four, in one list", () => {
  expect(ADULT_HASHTAGS).toEqual(["nsfw", "18+", "porn", "xxx"])
})

test("an 18+ hashtag makes a stream 18+, any case", () => {
  const yes: Array<[string, string]> = [
    ["nsfw", "nsfw"],
    ["NSFW", "nsfw"],
    ["NsFw", "nsfw"],
    ["#nsfw", "nsfw"],
    ["18+", "18+"],
    ["porn", "porn"],
    ["Porn", "porn"],
    ["xxx", "xxx"],
    ["XXX", "xxx"],
  ]
  for (const [t, tag] of yes) {
    const e = ev("art", [
      ["t", "gaming"],
      ["t", t],
    ])
    expect([t, adultHashtag(e), isAdultStream(e)]).toEqual([t, tag, true])
  }
})

test("hashtag near-misses do not count", () => {
  // the whole tag must be one of the four: nsfwart, adulting, 18 and the rest are left alone
  const no = ["nsfwart", "adulting", "adult", "18", "18plus", "porno", "xx", "xxxl", "sfw", ""]
  for (const t of no) {
    const e = ev("art", [["t", t]])
    expect([t, adultHashtag(e), isAdultStream(e)]).toEqual([t, undefined, false])
  }
  // nsfw as some other tag's value is not a hashtag
  expect(isAdultStream(ev("art", [["g", "nsfw"]]))).toBe(false)
  expect(isAdultStream(ev("art", [["t"]]))).toBe(false)
})

test("a NIP-32 content-warning label makes a stream 18+", () => {
  // the NIP-36 example form: the namespace and a label marked with it
  expect(
    isAdultStream(
      ev("art", [
        ["L", "content-warning"],
        ["l", "nudity", "content-warning"],
      ]),
    ),
  ).toBe(true)
  // the namespace alone
  expect(isAdultStream(ev("art", [["L", "content-warning"]]))).toBe(true)
  // a label marked content-warning without its L tag (NIP-32: the mark SHOULD still be there)
  expect(isAdultStream(ev("art", [["l", "reason", "content-warning"]]))).toBe(true)
})

test("labels in other namespaces do not count", () => {
  expect(
    isAdultStream(
      ev("art", [
        ["L", "social.nos.ontology"],
        ["l", "NS-nud", "social.nos.ontology"],
      ]),
    ),
  ).toBe(false)
  expect(
    isAdultStream(
      ev("art", [
        ["L", "license"],
        ["l", "content-warning", "license"],
      ]),
    ),
  ).toBe(false)
  // a label with no mark is in the ugc namespace (NIP-32), even if its value says content-warning
  expect(isAdultStream(ev("art", [["l", "content-warning"]]))).toBe(false)
  expect(
    isAdultStream(
      ev("art", [
        ["L", "#t"],
        ["l", "nsfw", "#t"],
      ]),
    ),
  ).toBe(false)
})

test("hidden unless the watcher opted in", () => {
  const list = [
    ev("a"),
    ev("b 🔞"),
    ev("c", [["content-warning", ""]]),
    ev("d NSFW"),
    ev("e", [["t", "nsfw"]]),
    ev("f", [["L", "content-warning"]]),
    ev("g", [["t", "nsfwart"]]),
  ]
  expect(withoutAdult(list, false).map(e => e.tags[0][1])).toEqual(["a", "g"])
  expect(withoutAdult(list, true)).toHaveLength(7)
})
