import { expect, test } from "bun:test"
import { ADULT_TITLE_PATTERNS, adultTitleSign, isAdultStream, withoutAdult } from "./adult"

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
  // a hashtag t tag alone is not one of the signs
  expect(isAdultStream(ev("art", [["t", "nsfw"]]))).toBe(false)
})

test("hidden unless the watcher opted in", () => {
  const list = [ev("a"), ev("b 🔞"), ev("c", [["content-warning", ""]]), ev("d NSFW")]
  expect(withoutAdult(list, false).map(e => e.tags[0][1])).toEqual(["a"])
  expect(withoutAdult(list, true)).toHaveLength(4)
})
