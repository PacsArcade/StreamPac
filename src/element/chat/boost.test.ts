import { expect, test } from "bun:test"
import { boostTier, pinnedBoost } from "./boost"

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
