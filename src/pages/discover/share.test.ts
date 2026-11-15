import { expect, test } from "bun:test"
import { GENERIC_REPOST, streamRepost } from "./share"

const stream = {
  id: "e".repeat(64),
  pubkey: "a".repeat(64),
  created_at: 1,
  kind: 30311,
  tags: [
    ["d", "abc"],
    ["title", "Live"],
    ["p", "b".repeat(64), "", "host"],
  ],
  content: "",
  sig: "s",
}

test("a live stream is reposted as kind 16 with the stream address, this version, the host and k", () => {
  const r = streamRepost(stream, "wss://relay.zap.stream")
  expect(r.kind).toBe(GENERIC_REPOST)
  expect(r.tags).toContainEqual(["a", `30311:${"a".repeat(64)}:abc`, "wss://relay.zap.stream"])
  expect(r.tags).toContainEqual(["e", "e".repeat(64), "wss://relay.zap.stream"])
  expect(r.tags).toContainEqual(["k", "30311"])
  expect(r.tags).toContainEqual(["p", "a".repeat(64)])
  expect(r.tags).toContainEqual(["p", "b".repeat(64)])
  expect(JSON.parse(r.content).id).toBe(stream.id)
})

test("a kind 1 note would be kind 6", () => {
  expect(streamRepost({ ...stream, kind: 1 }).kind).toBe(6)
})
