## How do I stream here?

1. Click Log In. Use a Nostr browser extension, or paste a private key (less safe), or make a new key.
2. Click the Stream button at the top right.
3. Pick a streaming provider. For now the default is the zap.stream hosted service, and its terms apply when you stream through it. You can also use your own HLS stream URL.
4. Copy the stream URL and stream key into OBS and start streaming.

## What is OBS?

OBS (Open Broadcaster Software) is free, open source software for recording and live streaming on Windows, Mac and Linux. Install it, then paste your stream URL and stream key into its Stream settings.

## What does it cost to stream?

Each streaming provider sets its own prices. See [the providers page](/providers).

## What is Nostr?

Nostr is an open protocol. A stream here is a Nostr event (NIP-53) signed by the streamer's own key and sent to public relays. Pac's Arcade runs this website as one frontend for it. Other apps can show the same streams.

## Who holds my account?

You do. Your account is a key pair. We cannot reset or recover your key. Back it up.

## Can you delete my stream or messages?

Not from relays we do not run. A deletion request asks relays to drop an event, but relays may keep copies. See [deleting your data](/delete-account).

## What are sats?

Sats are small units of Bitcoin. Sending sats to a streamer here is called zapping.

## What are zaps?

Zaps are Lightning payments sent from your wallet to the streamer's wallet. They are published on Nostr as receipts. We do not hold the funds.

## How do I get sats?

Use an exchange or wallet app you trust to buy a small amount of Bitcoin, then send it to a Lightning wallet.

## What is a Nostr extension?

A browser extension that keeps your keys and signs actions for you, so sites never see your key. It is safer than pasting a private key into a website.

## Do you track me?

No. This site runs no analytics and no ads. See the [privacy policy](/privacy).

## Recommended stream settings

| Name              | Value |
| ----------------- | ----- |
| Video Codec       | h264  |
| Audio Codec       | AAC   |
| Max Video Bitrate | 7000k |
| Max Audio Bitrate | 320k  |
| Keyframe Interval | 2s    |
