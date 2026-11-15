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

/** What a picked amount does when it is sent with a message: the highest tier it reaches, or a plain zap under 210. */
export type BoostEffect = BoostTier | "zap"

export function boostEffect(amountSats: number): BoostEffect {
  return boostTier(amountSats, "x") ?? "zap"
}

/** The words under the open box, so the watcher sees what their amount gets before they send it. */
export function boostEffectWords(e: BoostEffect): string {
  if (e === "zap") return `A plain zap with your message. ${BOOST_TIERS[0].sats} or more makes it bold.`
  const t = BOOST_TIERS.find(b => b.tier === e) ?? BOOST_TIERS[0]
  const next = BOOST_TIERS[BOOST_TIERS.indexOf(t) + 1]
  return `Gets ${t.name}: ${t.what}${next ? ` ${next.sats.toLocaleString("en-US")} or more gets ${next.name}.` : ""}`
}

/** The most sats the open box takes in one go (1,000,000 = 0.01 BTC); more than that is a typo more often than not. */
export const PICK_MAX_SATS = 1_000_000

/** Reads what the watcher typed in the open box: whole sats, 1 to PICK_MAX_SATS, commas and spaces allowed. */
export function parsePickedSats(text: string): number | undefined {
  const clean = text.replace(/[\s,_]/g, "")
  if (!/^\d+$/.test(clean)) return
  const n = Number(clean)
  if (!Number.isSafeInteger(n) || n < 1 || n > PICK_MAX_SATS) return
  return n
}
