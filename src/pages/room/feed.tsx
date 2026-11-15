import { EventKind, RequestBuilder, type TaggedNostrEvent } from "@snort/system"
import { SnortContext, useRequestBuilder, useUserProfile } from "@snort/system-react"
import { unixNow } from "@snort/shared"
import classNames from "classnames"
import { useContext, useMemo } from "react"
import { Avatar } from "@/element/avatar"
import { getName } from "@/element/profile"
import { Text } from "@/element/text"
import { RelativeTime } from "@/element/relative-time"
import EventReactions from "@/element/event-reactions"
import { IconButton } from "@/element/buttons"
import { useMutedPubkeys } from "@/hooks/login"

export type FeedTab = { kind: "frens" } | { kind: "fof" } | { kind: "tag"; tag: string }

export function feedTabKey(t: FeedTab) {
  return t.kind === "tag" ? `#${t.tag}` : t.kind
}

const FOF_CAP = 300
const FRENS_CAP = 500

/** Notes for one tab: kind 1 from your frens, from frens of frens (the social graph's distance 2), or by tag. */
export function useRoomFeed(tab: FeedTab, follows: Array<string>) {
  const system = useContext(SnortContext)
  const fof = useMemo(() => {
    if (tab.kind !== "fof") return []
    try {
      return [...system.config.socialGraphInstance.getUsersByFollowDistance(2)].slice(0, FOF_CAP)
    } catch {
      return []
    }
  }, [tab.kind, system, follows.length])

  const rb = useMemo(() => {
    const key = feedTabKey(tab)
    const rb = new RequestBuilder(`room-feed:${key}`)
    rb.withOptions({ leaveOpen: true })
    const since = unixNow() - 2 * 24 * 60 * 60
    if (tab.kind === "frens") {
      if (follows.length === 0) return rb
      rb.withFilter().kinds([EventKind.TextNote]).authors(follows.slice(0, FRENS_CAP)).since(since).limit(50)
    } else if (tab.kind === "fof") {
      if (fof.length === 0) return rb
      rb.withFilter().kinds([EventKind.TextNote]).authors(fof).since(since).limit(50)
    } else {
      rb.withFilter().kinds([EventKind.TextNote]).tag("t", [tab.tag]).since(since).limit(50)
    }
    return rb
  }, [feedTabKey(tab), follows.length, fof.length])

  const evs = useRequestBuilder(rb)
  const muted = useMutedPubkeys()
  return {
    notes: useMemo(
      () =>
        [...evs]
          // top-level notes only; replies belong under their post
          .filter(e => !e.tags.some(t => t[0] === "e"))
          .filter(e => !muted.has(e.pubkey))
          .sort((a, b) => b.created_at - a.created_at)
          .slice(0, 60),
      [evs, muted],
    ),
    fofSize: fof.length,
  }
}

/** A post in the feed. Click it to open it (and pause the stream you were watching). */
export function PostCard({ ev, onOpen, open }: { ev: TaggedNostrEvent; onOpen: () => void; open: boolean }) {
  const profile = useUserProfile(ev.pubkey)
  return (
    <article
      className={classNames(
        "pa-notch bg-layer-1 hover:bg-layer-2 transition-colors px-4 py-3.5 cursor-pointer",
        open && "bg-layer-2 shadow-[inset_3px_0_0_var(--color-primary)]",
      )}
      onClick={onOpen}
      onKeyDown={e => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onOpen()
        }
      }}
      data-testid="post-card"
    >
      <header className="flex items-center gap-2.5 min-w-0">
        <Avatar pubkey={ev.pubkey} user={profile} size={30} />
        <span className="font-semibold truncate">{getName(ev.pubkey, profile)}</span>
        <span className="text-[12px] text-layer-4 shrink-0">
          <RelativeTime from={ev.created_at * 1000} suffix={true} />
        </span>
      </header>
      <div className="mt-2 pl-[40px] text-[15px] leading-relaxed line-clamp-5 break-words [&_img]:max-h-48 [&_img]:rounded-md [&_video]:hidden">
        <Text content={ev.content} tags={ev.tags} className="whitespace-pre-line" />
      </div>
      <button type="button" className="mt-2 ml-[40px] text-[13px] font-semibold text-layer-4 hover:text-text">
        Open
      </button>
    </article>
  )
}

/** The open post. While it is open the stream you were watching is paused. */
export function OpenPost({
  ev,
  pausedName,
  onClose,
}: {
  ev: TaggedNostrEvent
  pausedName?: string
  onClose: () => void
}) {
  const profile = useUserProfile(ev.pubkey)
  return (
    <div className="flex flex-col gap-3 min-h-0 h-full" data-testid="open-post">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] text-layer-4">
          {pausedName ? `${pausedName}'s stream is paused while you read.` : "Reading a post."}
        </span>
        <IconButton
          iconName="x"
          iconSize={14}
          className="rounded-xl w-9 h-9 bg-layer-2"
          onClick={onClose}
          aria-label="Close the post"
        />
      </div>
      <article className="pa-notch bg-layer-1 px-5 py-4 overflow-y-auto min-h-0 flex flex-col gap-3">
        <header className="flex items-center gap-3 min-w-0">
          <Avatar pubkey={ev.pubkey} user={profile} size={40} />
          <div className="flex flex-col min-w-0">
            <span className="font-semibold truncate">{getName(ev.pubkey, profile)}</span>
            <span className="text-[12px] text-layer-4">
              <RelativeTime from={ev.created_at * 1000} suffix={true} />
            </span>
          </div>
        </header>
        <div className="text-[16px] leading-relaxed break-words [&_img]:rounded-md">
          <Text content={ev.content} tags={ev.tags} className="whitespace-pre-line" />
        </div>
        <EventReactions ev={ev} />
      </article>
    </div>
  )
}
