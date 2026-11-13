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

Not done in this pass: logos (`public/logo*.png`, `zap-stream.svg`, `Logo` component are still upstream's, replace with ours), legal pages (`tos.tsx`, `privacy.tsx`, `faq.md`, translations still say zap.stream), NIP-05 domain default (still `zap.stream`, set `VITE_NIP5_DOMAIN` when we serve our own `/.well-known/nostr.json`), `@zap_stream` twitter handle in `ssr.json`.

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
