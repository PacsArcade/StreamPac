import { describe, expect, test } from "bun:test"
import vectors from "./vectors.json"
import { beaconGap, bftFields, bftStamp, liveFace, nextTip, parseArrival, parseBeacon } from "./index"

describe("BFT core (spec sections 4 to 6), house conformance vectors", () => {
  for (const v of vectors.forward) {
    test(`height ${v.height}`, () => {
      const f = bftFields(v.height)
      expect(f.date).toBe(v.date)
      expect(bftStamp(v.height)).toBe(v.stampTime)
      expect(bftStamp(v.height, false)).toBe(v.stamp)
    })
  }
  test("no height gives the dash face, never a guess", () => {
    expect(bftStamp(undefined)).toBe("----.--.-- --:-- a₿")
    expect(bftStamp(-1, false)).toBe("----.--.-- a₿")
  })
})

describe("BFT live face (spec section 14), house conformance vectors", () => {
  for (const v of vectors.live) {
    test(v.name, () => {
      const got = liveFace(v.height as number | null, v.arrivedAt as number | null, v.now as number | null, v.estimated)
      const { hms: _h, date: _d, ...rest } = got
      expect(rest).toEqual(v.expected)
    })
  }
})

describe("reading now (spec sections 10 and 15)", () => {
  test("beacon reply parses only a real height", () => {
    expect(parseBeacon({ height: 975993 })).toBe(975993)
    expect(parseBeacon({ height: "975993" })).toBeUndefined()
    expect(parseBeacon(null)).toBeUndefined()
  })
  test("watcher first-seen is read for the matching height only", () => {
    const body = {
      calls: [
        { height: 10, first_seen: 1700 },
        { height: 11, first_seen: 1800 },
      ],
    }
    expect(parseArrival(body, 11)).toBe(1800)
    expect(parseArrival(body, 12)).toBeUndefined()
  })
  test("a cold load has no arrival: seconds stay dashes until this viewer sees the height change", () => {
    let t = nextTip({ beaconDown: false }, 100, 5000)
    expect(t.height).toBe(100)
    expect(t.arrivedAt).toBeUndefined()
    expect(liveFace(t.height, t.arrivedAt, 5010).hms).toMatch(/-:--$/)
    t = nextTip(t, 100, 5020)
    expect(t.arrivedAt).toBeUndefined()
    t = nextTip(t, 101, 5030)
    expect(t).toMatchObject({ height: 101, arrivedAt: 5030, source: "viewer" })
    expect(liveFace(t.height, t.arrivedAt, 5072).second).toBe(42)
  })
  test("the watcher's first-seen wins when it is given", () => {
    const t = nextTip({ beaconDown: false }, 100, 5000, 4990)
    expect(t).toMatchObject({ arrivedAt: 4990, source: "watcher" })
  })
  test("a beacon miss keeps the last real height and flags it", () => {
    const t = nextTip({ height: 100, arrivedAt: 1, source: "viewer", beaconDown: false }, undefined, 9)
    expect(t).toMatchObject({ height: 100, beaconDown: true })
  })
  test("a beacon gap of 2 or more is reported", () => {
    expect(beaconGap({ height: 100, verify: 101, beaconDown: false })).toBeUndefined()
    expect(beaconGap({ height: 100, verify: 102, beaconDown: false })).toBe(2)
  })
})
