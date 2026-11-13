/**
 * DEV ONLY card fixture (route /dev-cards). Registered in routes.tsx behind
 * import.meta.env.DEV, so production builds drop it. Renders stream and video
 * tiles from fake local events so the notched thumbnails can be seen without relays.
 */
import type { NostrEvent } from "@snort/system"
import { StreamTile } from "@/element/stream/stream-tile"
import { VideoTile } from "@/element/video/video-tile"

const PUB = "a".repeat(64)

function art(c1: string, c2: string, label: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="640" height="360" fill="url(#g)"/><text x="24" y="48" font-family="monospace" font-size="32" fill="#fff">${label}</text><text x="616" y="340" text-anchor="end" font-family="monospace" font-size="32" fill="#fff">${label}</text></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

function live(n: number, tags: Array<Array<string>>): NostrEvent {
  return {
    id: `${n}`.repeat(64).slice(0, 64),
    pubkey: PUB,
    created_at: 1_700_000_000 + n,
    kind: 30311,
    content: "",
    sig: "",
    tags: [["d", `fixture-${n}`], ...tags],
  }
}

const streams = [
  live(1, [
    ["title", "Retro cabinet night: speedrunning in 8-bit"],
    ["status", "live"],
    ["image", art("#ff00ff", "#00ffff", "LIVE")],
    ["current_participants", "128"],
  ]),
  live(2, [
    ["title", "Planned: building a lightning arcade"],
    ["status", "planned"],
    ["image", art("#1d1629", "#ffd700", "PLAN")],
  ]),
  live(3, [["title", "Ended stream with no thumbnail"], ["status", "ended"]]),
  live(4, [
    ["title", "A very long stream title that should wrap onto two lines and then clip with an ellipsis after that"],
    ["status", "live"],
    ["image", art("#00ffff", "#130e1c", "WIDE")],
    ["current_participants", "12400"],
  ]),
]

const video: NostrEvent = {
  id: "9".repeat(64),
  pubkey: PUB,
  created_at: 1_700_000_100,
  kind: 34235,
  content: "",
  sig: "",
  tags: [
    ["d", "fixture-video"],
    ["title", "Past stream replay"],
    ["imeta", `url ${art("#ff00ff", "#ffd700", "VOD")}`, "m image/svg+xml", "dim 640x360"],
    ["duration", "3725"],
  ],
}

export function DevCardsPage() {
  return (
    <div className="flex flex-col gap-6 p-4">
      <h1>Card fixture (dev only)</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {streams.map(e => (
          <StreamTile key={e.id} ev={e} style="grid" zapTotal={e.id.startsWith("1") ? 21000 : undefined} />
        ))}
        <VideoTile ev={video} style="grid" />
      </div>
    </div>
  )
}
