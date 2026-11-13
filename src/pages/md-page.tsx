import { ZAP_STREAM_PUBKEY } from "@/const"
import { NostrPrefix } from "@snort/shared"
import { EventKind, NostrLink } from "@snort/system"
import { useEventFeed } from "@snort/system-react"
import { type ReactNode, Suspense, lazy, useMemo } from "react"

const Markdown = lazy(() => import("@/element/markdown"))

export default function MarkdownPage({
  dTag,
  title,
  content,
}: { dTag: string; title: ReactNode; content?: string }) {
  // Pac's Arcade Stream: our own page text (bundled) wins over the nostr note from upstream's key
  if (content !== undefined) {
    return (
      <div className="flex flex-col gap-4 w-full max-w-[45rem] mx-auto px-4">
        <h1>{title}</h1>
        <Suspense>
          <Markdown content={content} />
        </Suspense>
      </div>
    )
  }
  return <RemoteMarkdownPage dTag={dTag} title={title} />
}

function RemoteMarkdownPage({ dTag, title }: { dTag: string; title: ReactNode }) {
  const faqLink = useMemo(
    () => new NostrLink(NostrPrefix.Address, dTag, EventKind.LongFormTextNote, ZAP_STREAM_PUBKEY),
    [dTag],
  )
  const ev = useEventFeed(faqLink)
  return (
    <div className="flex flex-col gap-4 w-[45rem] mx-auto">
      <h1>{title}</h1>
      {ev && (
        <Suspense>
          <Markdown content={ev?.content} />
        </Suspense>
      )}
    </div>
  )
}
