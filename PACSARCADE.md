# Pac's Arcade Stream (pacsarcade.stream)

A thin rebrand of [v0l/zap.stream](https://github.com/v0l/zap.stream) (MIT, (c) Kieran/v0l). Upstream license and credit are kept (LICENSE untouched; the credit line is in the site footer and on the settings page). Branch `pacsarcade-stream`, started from upstream/main at 72c1818. Merge upstream into it (never rebase).

## What changed and where
| Change | Where |
|---|---|
| Name, domain, tagline, upstream credit, hosted-core URL, relay list | `src/brand.ts` (the one config file) |
| Stream API URL, one value | `STREAM_API_URL` in `src/brand.ts` (env `VITE_STREAM_API_URL` at build time). Used by the default provider, the game DB and clock sync. `packages/zap-stream-api` keeps its own `DEFAULT_API_URL` (now one constant instead of 3 copies) |
| Relays (ours first, no house relay yet) | `PACSARCADE_RELAYS` in `src/brand.ts`, wired into `defaultRelays` in `src/const.ts`; same list in `ssr.json` |
| Colors, dark only, 8-bit notched cards | `src/pacsarcade.css` (cyan #00ffff primary, pink #ff00ff secondary, gold #ffd700 zap). Notch = frens.earth `.r6-px8` polygon on `main` cards; buttons stay rounded |
| Title/meta/OG/canonical | `index.html`, `public/manifest.json`, `ssr.json` (cannot import brand.ts: keep in step) |
| Header wordmark, page titles, welcome text, client tag | one-line swaps to `APP_NAME` / `APP_DOMAIN` |
| Google Tag Manager removed | script tags gone from `index.html`; `gtag` conversion call removed from `login-signup.tsx`; `src/gtm.ts` is now unreferenced (left on disk) |
| Plausible-style analytics off | `trackEvent` in `src/utils.ts` no longer POSTs to pa.v0l.io |

Second pass (logo, legal, notch scope): our pixel pac mark replaces the Logo component, `layout.css` watermark, manifest, favicon links, OG image and service worker icon (`public/pacsarcade-mark.svg` + `pacsarcade-logo-*.png`, rendered with rsvg-convert from the brand-assets tricolor pac; upstream `logo*.png`, `favicon.png`, `zap-stream.svg` stay on disk, unreferenced). The notch is now only on stream/video tile thumbnails (class `pa-notch`). `tos.tsx`, `privacy.tsx`, `delete-account.tsx`, `faq.md` are rewritten as drafts for review (code comment on each); `/faq` now renders the bundled `faq.md` instead of upstream's nostr note. Placeholders in `brand.ts`: `CONTACT_EMAIL_PLACEHOLDER`, `TWITTER_HANDLE_PLACEHOLDER`. Dev-only card fixture at `/dev-cards` (vite dev server only, `import.meta.env.DEV`). The provider name in `DEFAULT_CONFIG` stays "zap.stream" on purpose (it is the hosted service). The "Get the zap.stream app" download page is left (those are upstream's mobile apps).

Third pass, the Room (step 1 of the round 3 design, block 975,992). `/` is now the Room (`src/pages/room/`); the old stream grid stays at `/streams`.
- Squad: up to 4 live streams on screen at 1280 px and up, 3 on a phone (`pickSquad` in `room-state.ts`): frens first, most watched first, one tile per host, HLS only. With no fren live it shows who is live and says so. One tile has the sound, the rest play muted; click a tile to move the sound. Phone: frens' rings across the top (tap one to put it on the squad).
- Feed beside the squad: Frens (kind 1 from your follows), Frens of frens (social graph distance 2), and tags. Opening a post pauses the tile with the sound; closing it resumes (`roomReducer`). Live streams stay kind 30311.
- Bar under the squad: Chat (swaps the feed for the stream's chat), Clip, "Boost or zap the stream".
- Clip (`element/stream/room-clip.tsx`, `clip-window.ts`): reads the live playlist from the player and offers the last N s it still holds (asks for 30 s, the label shows the real number). Saves to the device by re-fetching those segments. Posting a clip to Nostr needs the stream's server to cut it (upstream's clip API on zap-stream-core); offered only when the stream has a `service` tag and you are logged in.
- Lightning tab on chat (`element/chat/boost-tab.tsx`, `boost.ts`): a message sent with sats is a NIP-57 zap to the stream with the message as its comment, through the existing zap flow. Bold from 210 sats, pinned for an hour from 2,100, steady gold glow from 21,000. The effect is read from the real zap receipt; no receipt, no effect.
- BFT clock (`src/bft/`): height from `https://time.pacsarcade.org/height` (never cached), checked against our mempool (gap of 2 or more is shown). Seconds per BFT spec 14 and 15: the house watcher's first-seen if `VITE_BFT_ARRIVALS_URL` is set, otherwise the moment this page saw the height change; until then the seconds are dashes, never estimated. Full clock with bare numbers in the desktop left rail; below 1280 px the top is the mini time banner. Tests run the house conformance vectors (`src/bft/vectors.json`, copied from PacsArcade/bitcoin-federated-time).
- The Bitcoin sign is a drawn SVG path (`element/bitcoin-sign.tsx`, the path from VendFrens PR #9), never a glyph or a letter B.
- LIVE is ember orange `#ff6400` with its glow (`--live`, `.pa-live-dot`, `LiveTag`) on every LIVE tag.
- The dark strip down the left of every phone page was the closed side menu (219 px wide, slid out only 200 px). `Flyout` now slides by its own width and hides when closed.
- Slot for step 3 (dock and buddy): `.room-dock-slot` in the Room, empty.

Fourth pass, Discover (step 2 of the round 3 design, block 975,999). `/discover` (`src/pages/discover/`), a "Discover" row in the left nav and the phone menu (the same list).
- One live stream at a time. Phone: it fills the page under the mini time banner; swipe up for the next, down for the one before (CSS scroll snap). Desktop: one tall 3:4 column in the middle, the step 1 left rail (BFT clock) on the left, the Room's feed on the right; scroll, the arrow keys (or Page Up/Down) and the up/down buttons move through it. A wide stream is never cropped: it sits whole in the column over a blur of its own picture.
- Only the stream on screen has a player (one plays at a time). It starts muted; "Tap for sound" turns it on, and the sound stays on for the next ones until you tap again. If the browser refuses sound it plays muted and keeps saying "Tap for sound".
- Why it is shown (`whyShown` in `discover-state.ts`): "you follow them"; or "satsuma and node_nana follow them" from the newest follow lists (kind 3) of the people you follow; or the picked tag when the stream carries it; otherwise "live now". No login: never fren names. The host comes from `getHost`, so a stream cannot borrow a host you follow.
- Order: your frens, then the most frens following, then most watched. What you have swiped past and the stream on screen never move when new data arrives (`mergeOrder`).
- Tag chips: #gaming #bitcoin #music #art, then up to 6 tags live streams really carry, most used first. `?tag=` in the URL.
- Side buttons: Zap (the same zap flow as "Boost or zap the stream"), Chat (that stream's chat with the lightning tab; a sheet on a phone, the right column on desktop), Squad, Share (system share, else copy the link).
- Squad: Add puts the stream into the Room's squad (`src/pages/room/squad-store.ts`, kept on this device under `pa-squad`, by stream address `30311:author:d` because the event id changes on every update). Up to 4; a 5th says the squad is full and changes nothing. Ended streams do not hold a seat. The Room shows your picks first; a phone shows all 4 when you picked 4 (2 x 2).
- Left out of Discover: non-HLS streams (they play on their own page), streams with a content warning unless you accepted them, your own stream.

Fifth pass, his marks on Discover (block 976,007).
- Discover's right rail is pixel icons with a small label under each and an aria-label on each (`src/pages/discover/rail-icons.tsx`, 14 x 14 grids drawn at 2 px a pixel, crisp edges): Zap (a lightning bolt), Chat (a bubble), Squad (three heads with a small gold plug, and a "+" while the stream is not on your squad), Share (a forwarding arrow).
- Share opens a sheet (`share-sheet.tsx`): "Repost to nostr" is a NIP-18 generic repost, kind 16, of the 30311 (`streamRepost` in `share.ts`: the stream event as content, `a`, `e`, `p`, `k` tags), signed by the login's own signer and sent to the relays; logged out it says "Log in" and opens the login. "Share somewhere else" opens the device share sheet, or copies the link.
- Phone chat in Discover is see-through glass over the lower half of the stream: `rgb(6 5 10 / 0.64)` with an 8 px backdrop blur; muted chat text is lifted to #ebe6f0 inside it. The video keeps playing behind it. Desktop chat is unchanged (the right column).
- The "Built on zap.stream by v0l (MIT)" credit left the phone menu and the left rail. It is in the site footer (`pages/layout/footer.tsx`, every page but Discover, which fills the screen) and on the settings page (an "About" card). One component, `element/upstream-credit.tsx`.
- 18+ (`element/nsfw/adult.ts`): a stream is 18+ when it has a content-warning tag (with or without a reason) or its title has 🔞, "18+" or "NSFW" (`ADULT_TITLE_PATTERNS`, tested with near-misses in `adult.test.ts`). 18+ streams are left out of Discover, the Room squad (and its Add menu), the frens rings and the left rail's "Frens live now" unless the watcher turns on "Show 18+ streams" in settings (off by default, stored on this device as `pa-show-18plus`). A left-out stream is never rendered, so its picture is never requested. The stream page's own "I am over 18" overlay is unchanged and separate.
- Pick your sats (`element/chat/pick-sats.tsx`): the lightning tab keeps Bold 210, Pin to top 2,100 and Glow 21,000 and gets a fourth choice, an open box for your own amount. The amount gets the highest tier it reaches; under 210 it is a plain zap with the message (`boostEffect` in `boost.ts`). The same box is on every "Boost or zap the stream" (`SendZaps` with `pickYourSats`), where it replaces the hidden "Custom" amount in sats.
- Also fixed: `NSFWStore` read any stored value as "accepted", so turning it off ("false") still read as on after a reload. It now reads `"true"` only.

Still not done: NIP-05 domain default (still `zap.stream`, set `VITE_NIP5_DOMAIN` when we serve our own `/.well-known/nostr.json`), a real contact address and Twitter handle, other locale files still carry old zap.stream strings (en is regenerated).

## Build
Package manager is bun (`bun.lock`).
```
bun install
bun run build        # builds packages/zap-stream-api, then vite -> build/ (static)
bun test src
```
Optional: `VITE_STREAM_API_URL=https://core.example/api/v1 bun run build`, `VITE_SINGLE_PUBLISHER=<hexpubkey,...>`, `VITE_NIP5_DOMAIN=...`. Vite env values are baked in at build time.

## Serve under podman + nginx (sample text, not run)
Static only. Upstream's `docker/nginx.conf` (CSP + SPA fallback) is reused.
```
# Containerfile
FROM docker.io/nginxinc/nginx-unprivileged:mainline-alpine
COPY build /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
```
```
podman build -f Containerfile -t pacsarcade-stream .
podman run -d --name pacsarcade-stream -p 127.0.0.1:8080:8080 pacsarcade-stream
```
Put the host nginx/Caddy TLS vhost for pacsarcade.stream in front of 127.0.0.1:8080. For a Quadlet unit, translate the run line.

## What a static nginx deploy loses
This upstream no longer ships Cloudflare Pages Functions. Their job moved into the SSR image (`Dockerfile.ssr`, base `voidic/nostr-ssr`, configured by `ssr.json`). A plain static deploy therefore loses:
- Server-rendered pages and per-stream OpenGraph/Twitter previews (shared links show only the generic index.html card), sitemaps.
- `/.well-known/lnurlp/<name>` (Lightning address lookup, proxied to api-core.zap.stream, with a NIP-05 resolve via api.snort.social).
- `/.well-known/nostr.json` (NIP-05 names, proxied to api.snort.social) for our domain.
Even the SSR config still proxies to v0l/snort hosts (`ssr.json` `proxy`, `nip05_url`); change those when we have our own. Other third-party calls left in place: avatar fallback `nostr-rs-api.v0l.io` (`src/event-tags.ts`), YouTube chat proxy `ytproxy.zap.stream`. Also note `.github/workflows` (nsite, translations) phone out; do not enable on the fork unless wanted. Upstream's `docker.yml` (pushed `Dockerfile.ssr` images to v0l's Docker Hub) is removed; image checks here use podman (`ci.yml`).

## Swapping in our own zap-stream-core later
zap-stream-core (v0l/zap-stream-core) is GPLv3 and runs as a separate service (MariaDB, LND or other payments, RTMP 1935, HTTPS API). Never vendor its code into this MIT repo; the two talk only over HTTP. To switch: stand it up, publish a NIP-89 handler event (kind 31990, k=30311) so it shows in the provider picker, then rebuild with `VITE_STREAM_API_URL` set to its `/api/v1` (and set the provider name/pubkey in `DEFAULT_CONFIG` in `src/hooks/stream-provider.ts`, currently still the zap.stream name and pubkey).
