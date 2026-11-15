import { expect, test } from "bun:test"
import {
  BOOST_TIERS,
  type BoostEffect,
  PICK_MAX_SATS,
  boostEffect,
  boostEffectWords,
  boostTier,
  parsePickedSats,
  pinnedBoost,
} from "./boost"

test("tiers come from the amount, only for a zap that carries a message", () => {
  expect(boostTier(209, "hi")).toBeUndefined()
  expect(boostTier(210, "hi")).toBe("bold")
  expect(boostTier(2_100, "hi")).toBe("pin")
  expect(boostTier(21_000, "hi")).toBe("glow")
  expect(boostTier(50_000, "")).toBeUndefined()
  expect(boostTier(50_000, undefined)).toBeUndefined()
})

test("the pinned boost is the newest pin or glow within the hour", () => {
  const now = 10_000
  const zaps = [
    { amount: 2_100, content: "old pin", created_at: now - 4000 },
    { amount: 21_000, content: "glow", created_at: now - 600 },
    { amount: 2_100, content: "new pin", created_at: now - 60 },
    { amount: 210, content: "bold only", created_at: now - 10 },
  ]
  expect(pinnedBoost(zaps, now)?.content).toBe("new pin")
  expect(pinnedBoost([zaps[0]], now)).toBeUndefined()
})

test("a picked amount gets the highest tier it reaches; under 210 it is a plain zap", () => {
  const cases: Array<[number, BoostEffect]> = [
    [1, "zap"],
    [21, "zap"],
    [209, "zap"],
    [210, "bold"],
    [211, "bold"],
    [2_099, "bold"],
    [2_100, "pin"],
    [5_000, "pin"],
    [20_999, "pin"],
    [21_000, "glow"],
    [100_000, "glow"],
  ]
  for (const [sats, effect] of cases) expect([sats, boostEffect(sats)]).toEqual([sats, effect])
  expect(boostEffectWords("zap")).toStartWith("A plain zap with your message.")
  expect(boostEffectWords("pin")).toContain("Pin to top")
  expect(boostEffectWords("glow")).not.toContain("or more gets")
})

test("the tiers are still Bold 210, Pin to top 2,100, Glow 21,000", () => {
  expect(BOOST_TIERS.map(t => [t.name, t.sats])).toEqual([
    ["Bold", 210],
    ["Pin to top", 2_100],
    ["Glow", 21_000],
  ])
})

test("the open box reads whole sats only", () => {
  expect(parsePickedSats("500")).toBe(500)
  expect(parsePickedSats(" 2,100 ")).toBe(2_100)
  expect(parsePickedSats("21 000")).toBe(21_000)
  expect(parsePickedSats("0")).toBeUndefined()
  expect(parsePickedSats("-5")).toBeUndefined()
  expect(parsePickedSats("1.5")).toBeUndefined()
  expect(parsePickedSats("abc")).toBeUndefined()
  expect(parsePickedSats("")).toBeUndefined()
  expect(parsePickedSats(String(PICK_MAX_SATS))).toBe(PICK_MAX_SATS)
  expect(parsePickedSats(String(PICK_MAX_SATS + 1))).toBeUndefined()
})
