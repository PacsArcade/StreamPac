# Pac's Arcade Stream (pacsarcade.stream)

A thin rebrand of [v0l/zap.stream](https://github.com/v0l/zap.stream) (MIT, (c) Kieran/v0l). Upstream license and credit are kept (LICENSE untouched; credit line in the left nav). Branch `pacsarcade-stream`, started from upstream/main at 72c1818. Merge upstream into it (never rebase).

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
Even the SSR config still proxies to v0l/snort hosts (`ssr.json` `proxy`, `nip05_url`); change those when we have our own. Other third-party calls left in place: avatar fallback `nostr-rs-api.v0l.io` (`src/event-tags.ts`), YouTube chat proxy `ytproxy.zap.stream`. Also note `.github/workflows` (docker, nsite, translations) phone out; do not enable on the fork unless wanted.

## Swapping in our own zap-stream-core later
zap-stream-core (v0l/zap-stream-core) is GPLv3 and runs as a separate service (MariaDB, LND or other payments, RTMP 1935, HTTPS API). Never vendor its code into this MIT repo; the two talk only over HTTP. To switch: stand it up, publish a NIP-89 handler event (kind 31990, k=30311) so it shows in the provider picker, then rebuild with `VITE_STREAM_API_URL` set to its `/api/v1` (and set the provider name/pubkey in `DEFAULT_CONFIG` in `src/hooks/stream-provider.ts`, currently still the zap.stream name and pubkey).
