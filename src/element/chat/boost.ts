/**
 * Boosted chat: a chat message sent with sats, as a zap to the stream (NIP-57) whose comment is the message.
 * Optional for the sender; plain chat stays free. The effect comes only from a real zap receipt: no receipt, no effect.
 */
export type BoostTier = "bold" | "pin" | "glow"

export const BOOST_TIERS: Array<{ tier: BoostTier; sats: number; name: string; what: string }> = [
  { tier: "bold", sats: 210, name: "Bold", what: "Your message in bold type." },
  { tier: "pin", sats: 2_100, name: "Pin to top", what: "Bold, and it stays first in chat for an hour." },
  { tier: "glow", sats: 21_000, name: "Glow", what: "Pinned, with a steady gold glow." },
]

/** How long a pinned boost stays at the top of chat, in seconds. */
export const PIN_SECONDS = 60 * 60

/** The tier a zap with a message earns. A zap with no message is a plain zap, never a boost. */
export function boostTier(amountSats: number, message?: string): BoostTier | undefined {
  if (!message || message.trim().length === 0) return
  let got: BoostTier | undefined
  for (const t of BOOST_TIERS) if (amountSats >= t.sats) got = t.tier
  return got
}

/** The boost that sits pinned at the top of chat now: the newest pin or glow within the last hour. */
export function pinnedBoost<T extends { amount: number; content?: string; created_at: number }>(
  zaps: Array<T>,
  nowSec: number,
): T | undefined {
  return zaps
    .filter(z => {
      const t = boostTier(z.amount, z.content)
      return (t === "pin" || t === "glow") && nowSec - z.created_at < PIN_SECONDS && z.created_at <= nowSec + 60
    })
    .sort((a, b) => b.created_at - a.created_at)[0]
}
