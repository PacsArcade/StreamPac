import { expect, test } from "bun:test"
import { clipLabel, planClip, readHlsWindow } from "./clip-window"

const seg = (n: number, d = 4) =>
  Array.from({ length: n }, (_, i) => ({ url: `https://cdn.example/s${i}.ts`, duration: d }))

test("asks for 30 s from the live edge back", () => {
  const p = planClip(seg(20, 4))
  expect(p?.seconds).toBe(32)
  expect(p?.fragments[p.fragments.length - 1].url).toBe("https://cdn.example/s19.ts")
  expect(p?.window).toBe(80)
  expect(clipLabel(p)).toBe("Clip the last 32 s")
})

test("a short playlist gives what it has, and the label says the real number", () => {
  const p = planClip(seg(3, 6))
  expect(p?.seconds).toBe(18)
  expect(clipLabel(p)).toBe("Clip the last 18 s")
})

test("nothing to clip gives no plan and a plain label", () => {
  expect(planClip([])).toBeUndefined()
  expect(clipLabel(undefined)).toBe("Clip")
})

test("reads the window from hls.js level details", () => {
  const api = {
    currentLevel: 0,
    levels: [{ details: { live: true, fragments: [{ url: "a.m4s", duration: 2, initSegment: { url: "init.mp4" } }] } }],
  }
  expect(readHlsWindow(api)).toEqual({ fragments: [{ url: "a.m4s", duration: 2 }], init: "init.mp4" })
  expect(readHlsWindow(null)).toBeUndefined()
})
