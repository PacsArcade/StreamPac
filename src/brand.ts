/**
 * Pac's Arcade Stream (pacsarcade.stream) brand + deployment config.
 * One file on purpose: keeps the fork's diff against v0l/zap.stream small.
 * Theme tokens live in src/pacsarcade.css. index.html, ssr.json and
 * public/manifest.json cannot import this file; keep their names in step.
 */

export const APP_NAME = "Pac's Arcade Stream"
export const APP_DOMAIN = "pacsarcade.stream"
export const APP_URL = `https://${APP_DOMAIN}`
export const APP_TAGLINE = "Nostr live streaming, powered by Bitcoin Lightning."

/** Upstream credit (MIT). Keep this. */
export const UPSTREAM_NAME = "zap.stream"
export const UPSTREAM_URL = "https://github.com/v0l/zap.stream"

/**
 * The ONE streaming backend (zap-stream-core API) used by default.
 * Hosted core for now; swap in our own core with VITE_STREAM_API_URL at build time.
 */
export const STREAM_API_URL: string = import.meta.env.VITE_STREAM_API_URL || "https://api-core.zap.stream/api/v1"

/** Our relay list. No house relay URL confirmed yet: swap here when we have one. */
export const PACSARCADE_RELAYS: Record<string, { read: boolean; write: boolean }> = {
  "wss://relay.zap.stream": { read: true, write: true },
  "wss://nos.lol": { read: true, write: true },
  "wss://relay.primal.net": { read: true, write: true },
  "wss://relay.damus.io": { read: true, write: true },
}
