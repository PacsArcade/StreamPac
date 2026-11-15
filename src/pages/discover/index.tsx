import "./discover.css"
import { APP_NAME } from "@/brand"
import { Helmet } from "@dr.pogodin/react-helmet"
import { NostrLink, RequestBuilder, type NostrEvent, type TaggedNostrEvent } from "@snort/system"
import { useRequestBuilder, useUserProfile } from "@snort/system-react"
import HlsVideo from "hls-video-element/react"
import type { HlsVideoElement } from "hls-video-element"
import classNames from "classnames"
import {
  type CSSProperties,
  type ReactNode,
  type Ref,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { Link, useSearchParams } from "react-router"
import { useMediaQuery } from "usehooks-ts"
import { useStreamsFeed } from "@/hooks/live-streams"
import { useSortedStreams } from "@/hooks/useLiveStreams"
import { useFollows, useLogin, useMutedPubkeys } from "@/hooks/login"
import useImgProxy from "@/hooks/img-proxy"
import { extractStreamInfo, findTag, getHost } from "@/utils"
import { getName } from "@/element/profile"
import { Avatar } from "@/element/avatar"
import { Icon } from "@/element/icon"
import { LiveTag } from "@/element/live-tag"
import { isAdultStream, useShowAdult } from "@/element/nsfw/adult"
import { SendZapsDialog } from "@/element/send-zap"
import { LiveChat } from "@/element/chat/live-chat"
import { StreamContextProvider } from "@/element/stream/stream-state"
import { shouldReleasePlayer } from "@/element/stream/release-player"
import { formatSats } from "@/number"
import { squadStreamUrl } from "../room/room-state"
import { SQUAD_CAP, SquadStore, type SquadAdd, addToSquad, streamAddr, useSquadPicks } from "../room/squad-store"
import { type FeedTab, OpenPost, PostCard, feedTabKey, useRoomFeed } from "../room/feed"
import {
  type Why,
  type WhyContext,
  discoverTags,
  filterByTag,
  followLists,
  mergeOrder,
  onePerHost,
  rankFeed,
  whyShown,
  whyText,
} from "./discover-state"
import { CHAT_GRID, PLUS_GRID, PixelIcon, SHARE_GRID, SQUAD_GRID, ZAP_GRID } from "./rail-icons"
import { ShareSheet } from "./share-sheet"

type MediaEl = HlsVideoElement & HTMLElement

/** Follow lists (kind 3) of the people you follow, so "satsuma and node_nana follow them" is read, not made up. */
function useFrenLists(follows: Set<string>, enabled: boolean) {
  const authors = useMemo(() => [...follows].slice(0, 500), [follows])
  const rb = useMemo(() => {
    const rb = new RequestBuilder(`discover-fren-lists:${authors.length}`)
    rb.withOptions({ leaveOpen: true })
    if (enabled && authors.length > 0) rb.withFilter().kinds([3]).authors(authors)
    return rb
  }, [authors, enabled])
  const evs = useRequestBuilder(rb)
  return useMemo(() => followLists(evs), [evs])
}

export function DiscoverPage() {
  const isDesktop = useMediaQuery("(min-width: 1280px)", { initializeWithValue: false })
  const login = useLogin()
  const follows = useFollows()
  const muted = useMutedPubkeys()
  const streams = useStreamsFeed()
  const { live } = useSortedStreams(streams.filter(a => !muted.has(getHost(a))))
  // Discover plays HLS (like the squad); other stream kinds open on their own page from /streams.
  // 18+ streams (a content-warning tag or an 18+ sign in the title) are left out unless you opted in in settings.
  // A left-out stream is never rendered, so its picture is never requested.
  const showAdult = useShowAdult()
  const playable = useMemo(
    () =>
      live.filter(
        e =>
          squadStreamUrl(e) !== undefined &&
          (showAdult || !isAdultStream(e)) &&
          // your own stream is not something to discover
          getHost(e) !== login?.pubkey,
      ),
    [live, showAdult, login?.pubkey],
  )
  const lists = useFrenLists(follows, !!login)

  const [params, setParams] = useSearchParams()
  const tag = params.get("tag")?.toLowerCase() || undefined
  const chips = useMemo(() => {
    const t = discoverTags(playable)
    return tag && !t.includes(tag) ? [...t, tag] : t
  }, [playable, tag])

  const ctx: WhyContext = useMemo(() => ({ loggedIn: !!login, follows, lists, tag }), [login, follows, lists, tag])
  const ranked = useMemo(() => onePerHost(rankFeed(filterByTag(playable, tag), ctx)), [playable, tag, ctx])
  const byKey = useMemo(() => new Map(ranked.map(e => [streamAddr(e), e as TaggedNostrEvent])), [ranked])

  // the order you swipe through; what is on screen and behind you never moves when new data arrives
  const [order, setOrder] = useState<Array<string>>([])
  const [currentKey, setCurrentKey] = useState<string>()
  useEffect(() => {
    setOrder(prev => {
      const next = mergeOrder(prev, [...byKey.keys()], currentKey ? prev.indexOf(currentKey) : 0)
      // same order: keep the same array, so nothing re-renders or scrolls
      return next.length === prev.length && next.every((k, i) => k === prev[i]) ? prev : next
    })
  }, [byKey])
  const items = order.map(k => byKey.get(k)).filter((e): e is TaggedNostrEvent => !!e)
  const index = Math.max(0, currentKey ? order.indexOf(currentKey) : 0)
  const current = items[index]
  const currentProfile = useUserProfile(current ? getHost(current) : undefined)
  const currentName = current ? getName(getHost(current), currentProfile) : undefined

  const scroller = useRef<HTMLDivElement>(null)
  // the slide the scroller is on; if streams before it end, the order shifts and we move with it
  const shownIndex = useRef(0)
  useLayoutEffect(() => {
    const s = scroller.current
    if (!s?.clientHeight || index === shownIndex.current) return
    shownIndex.current = index
    s.scrollTop = index * s.clientHeight
  }, [order])

  const onScroll = useCallback(() => {
    const s = scroller.current
    if (!s?.clientHeight) return
    const i = Math.min(Math.round(s.scrollTop / s.clientHeight), order.length - 1)
    shownIndex.current = i
    const k = order[i]
    if (k && k !== currentKey) setCurrentKey(k)
  }, [order, currentKey])

  const go = useCallback(
    (to: number) => {
      const s = scroller.current
      if (!s) return
      const i = Math.max(0, Math.min(order.length - 1, to))
      s.scrollTo({ top: i * s.clientHeight, behavior: "smooth" })
    },
    [order.length],
  )

  // arrow keys (and page up/down) move to the next or the one before
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (["INPUT", "TEXTAREA", "SELECT"].includes(t.nodeName) || t.isContentEditable)) return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (e.key === "ArrowDown" || e.key === "PageDown") {
        e.preventDefault()
        go(index + 1)
      } else if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault()
        go(index - 1)
      }
    }
    window.addEventListener("keydown", h)
    return () => window.removeEventListener("keydown", h)
  }, [go, index])

  function pickTag(t?: string) {
    setOrder([])
    setCurrentKey(undefined)
    shownIndex.current = 0
    scroller.current?.scrollTo({ top: 0 })
    setParams(
      p => {
        const n = new URLSearchParams(p)
        if (t) n.set("tag", t)
        else n.delete("tag")
        return n
      },
      { replace: true },
    )
  }

  // muted until you tap for sound; after that the stream on screen has the sound (one plays at a time)
  const [soundOn, setSoundOn] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [post, setPost] = useState<TaggedNostrEvent>()
  const [sharing, setSharing] = useState<TaggedNostrEvent>()
  const [toast, setToast] = useState<{ text: ReactNode; key: number }>()
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(undefined), 6000)
    return () => clearTimeout(t)
  }, [toast])
  const say = (text: ReactNode) => setToast({ text, key: Date.now() })

  const picks = useSquadPicks()
  const liveAddrs = useMemo(() => new Set(playable.map(streamAddr)), [playable])
  function addSquad(ev: NostrEvent) {
    const r = addToSquad(SquadStore.get(), streamAddr(ev), SQUAD_CAP, a => liveAddrs.size === 0 || liveAddrs.has(a))
    SquadStore.set(r.list)
    say(squadWords(r.outcome, r.size))
  }

  const chips_ = (
    <div className="discover-chips" role="tablist" aria-label="Filter by tag" data-testid="discover-chips">
      <Chip active={!tag} onClick={() => pickTag(undefined)}>
        All
      </Chip>
      {chips.map(t => (
        <Chip key={t} active={tag === t} onClick={() => pickTag(tag === t ? undefined : t)}>
          #{t}
        </Chip>
      ))}
    </div>
  )

  const feedEmpty = (
    <div className="discover-slide grid place-items-center text-center px-8" data-testid="discover-empty">
      <div className="flex flex-col items-center gap-3">
        {streams.length === 0 ? (
          <span className="text-layer-4">Looking for live streams...</span>
        ) : (
          <>
            <span className="font-semibold">
              {tag ? `Nobody is live with #${tag} right now.` : "Nobody is live right now."}
            </span>
            {tag && (
              <button
                type="button"
                className="rounded-full border border-primary px-3 py-1 text-sm font-semibold text-primary"
                onClick={() => pickTag(undefined)}
              >
                Show every live stream
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )

  const slides = (
    <div
      ref={scroller}
      className="discover-scroller scrollbar-hidden"
      onScroll={onScroll}
      data-testid="discover-feed"
      data-index={index}
      data-count={items.length}
      tabIndex={-1}
    >
      {items.length === 0 && feedEmpty}
      {items.map((ev, i) => (
        <Slide
          key={streamAddr(ev)}
          ev={ev}
          active={i === index}
          near={Math.abs(i - index) <= 1}
          soundOn={soundOn}
          paused={!!post}
          why={whyShown(ev, ctx)}
          isDesktop={isDesktop}
          onSound={on => setSoundOn(on)}
          hasNext={i < items.length - 1}
          side={
            <SideButtons
              ev={ev}
              chatOpen={chatOpen && i === index}
              onChat={() => setChatOpen(o => !o)}
              squad={
                picks.includes(streamAddr(ev))
                  ? "on"
                  : picks.filter(a => liveAddrs.has(a)).length >= SQUAD_CAP
                    ? "full"
                    : "add"
              }
              onSquad={() => addSquad(ev)}
              onShare={() => setSharing(ev)}
            />
          }
        />
      ))}
    </div>
  )

  const chat = current && (
    <StreamContextProvider link={NostrLink.fromEvent(current)} evPreload={current} key={current.id}>
      <LiveChat
        canWrite={true}
        showGoal={false}
        showHeader={true}
        className={
          isDesktop
            ? "min-h-0 h-full border border-layer-3 bg-layer-1 rounded-2xl overflow-hidden"
            : "min-h-0 h-full overflow-hidden discover-glass-chat"
        }
      />
    </StreamContextProvider>
  )

  const toastEl = toast && (
    <div className="discover-toast" role="status" aria-live="polite" key={toast.key} data-testid="discover-toast">
      {toast.text}
    </div>
  )

  if (isDesktop) {
    return (
      <div className="discover discover-desktop" data-testid="discover">
        <Helmet>
          <title>{`Discover - ${APP_NAME}`}</title>
        </Helmet>
        <div className="discover-middle">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-[22px] tracking-tight shrink-0">Discover</h1>
            {chips_}
          </div>
          <div className="discover-stage">
            {slides}
            <nav className="discover-steps" aria-label="Move through the feed">
              <button
                type="button"
                onClick={() => go(index - 1)}
                disabled={index === 0}
                aria-label="The stream before"
                title="The stream before (arrow up)"
              >
                <Icon name="chevron-left" size={18} className="rotate-90" />
              </button>
              <span className="text-[12px] tabular-nums text-layer-4" data-testid="discover-position">
                {items.length ? `${index + 1} / ${items.length}` : "0 / 0"}
              </span>
              <button
                type="button"
                onClick={() => go(index + 1)}
                disabled={index >= items.length - 1}
                aria-label="The next stream"
                title="The next stream (arrow down)"
              >
                <Icon name="chevron-right" size={18} className="rotate-90" />
              </button>
            </nav>
          </div>
          {toastEl}
        </div>
        {sharing && <ShareSheet ev={sharing} onClose={() => setSharing(undefined)} onSay={say} />}
        <aside className="discover-side">
          {chatOpen && chat ? (
            <div className="flex flex-col gap-2 h-full min-h-0" data-testid="discover-chat">
              <button
                type="button"
                className="self-start text-[13px] font-semibold text-layer-4 hover:text-text"
                onClick={() => setChatOpen(false)}
              >
                ← Back to the feed
              </button>
              {chat}
            </div>
          ) : (
            <SideFeed tag={tag} post={post} onPost={setPost} pausedName={currentName} />
          )}
        </aside>
      </div>
    )
  }

  return (
    <div className={classNames("discover discover-phone", chatOpen && "discover-chat-open")} data-testid="discover">
      <Helmet>
        <title>{`Discover - ${APP_NAME}`}</title>
      </Helmet>
      {slides}
      {chips_}
      {toastEl}
      {sharing && <ShareSheet ev={sharing} onClose={() => setSharing(undefined)} onSay={say} />}
      {chatOpen && chat && (
        <div className="discover-sheet discover-glass" data-testid="discover-chat">
          <div className="flex items-center justify-between px-3 pt-2">
            <span className="text-[13px] text-text">The stream keeps playing behind the chat.</span>
            <button
              type="button"
              className="grid place-items-center w-8 h-8 rounded-lg bg-black/40"
              onClick={() => setChatOpen(false)}
              aria-label="Close the chat"
            >
              <Icon name="x" size={12} />
            </button>
          </div>
          <div className="flex-1 min-h-0 px-2 pb-2">{chat}</div>
        </div>
      )}
    </div>
  )
}

function squadWords(outcome: SquadAdd, size: number): ReactNode {
  switch (outcome) {
    case "added":
      return (
        <>
          On your squad ({size} of {SQUAD_CAP}).{" "}
          <Link to="/room" className="underline font-semibold">
            Open the Room
          </Link>
        </>
      )
    case "already":
      return (
        <>
          Already on your squad.{" "}
          <Link to="/room" className="underline font-semibold">
            Open the Room
          </Link>
        </>
      )
    case "full":
      return (
        <>
          Your squad is full: {SQUAD_CAP} of {SQUAD_CAP}. Take one off in the{" "}
          <Link to="/room" className="underline font-semibold">
            Room
          </Link>{" "}
          to add this one.
        </>
      )
  }
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={classNames(
        "shrink-0 rounded-full border px-3 py-1 text-[13px] font-semibold backdrop-blur-sm",
        active
          ? "border-primary text-primary bg-primary/10"
          : "border-layer-3 text-layer-5 bg-layer-0/60 hover:text-text",
      )}
    >
      {children}
    </button>
  )
}

/** The names of the frens in a "why" line, from their profiles. */
function WhyLine({ why }: { why: Why }) {
  const a = useUserProfile(why.kind === "fof" ? why.via[0] : undefined)
  const b = useUserProfile(why.kind === "fof" ? why.via[1] : undefined)
  const names = why.kind === "fof" ? why.via.map((pk, i) => getName(pk, i === 0 ? a : b) ?? pk.slice(0, 8)) : []
  return (
    <span className={why.kind === "live" ? "text-layer-5" : "text-primary"} data-testid="why-line" data-why={why.kind}>
      {whyText(why, names)}
    </span>
  )
}

/** One live stream, full height. Only the one on screen plays; the rest show their picture. */
function Slide({
  ev,
  active,
  near,
  soundOn,
  paused,
  why,
  isDesktop,
  hasNext,
  side,
  onSound,
}: {
  ev: TaggedNostrEvent
  active: boolean
  near: boolean
  soundOn: boolean
  paused: boolean
  why: Why
  isDesktop: boolean
  hasNext: boolean
  side: ReactNode
  onSound: (on: boolean) => void
}) {
  const host = getHost(ev)
  const profile = useUserProfile(host)
  const { proxy } = useImgProxy()
  const { title, image, participants } = extractStreamInfo(ev)
  const poster = image ? proxy(image) : undefined
  const name = getName(host, profile)
  const [blocked, setBlocked] = useState(false)
  const audible = soundOn && !blocked

  return (
    <section
      className="discover-slide"
      data-testid="discover-slide"
      data-active={active || undefined}
      data-host={host}
      data-addr={streamAddr(ev)}
      aria-label={`${name}: ${title ?? "live stream"}`}
    >
      <div className="discover-card pa-notch">
        {near && poster && <div className="discover-backdrop" style={{ backgroundImage: `url(${poster})` }} />}
        {active ? (
          <ActivePlayer ev={ev} poster={poster} soundOn={soundOn} paused={paused} onBlocked={setBlocked} />
        ) : (
          near && poster && <img src={poster} alt="" className="discover-poster" loading="lazy" />
        )}
        <button
          type="button"
          className="!absolute inset-0 w-full h-full cursor-pointer"
          aria-label={audible ? `Mute ${name}` : `Tap for ${name}'s sound`}
          onClick={() => {
            setBlocked(false)
            onSound(!audible)
          }}
        />
        {active && (
          <span
            className={classNames("discover-sound", audible ? "text-primary" : "text-text")}
            data-testid="discover-sound"
            data-sound={audible ? "on" : "off"}
          >
            <Icon name={audible ? "volume" : "volume-muted"} size={14} />
            {audible ? "Sound on" : "Tap for sound"}
          </span>
        )}
        <div className="discover-info">
          <div className="flex items-center gap-2.5">
            <LiveTag />
            {participants !== undefined && (
              <span className="text-[13px] text-text drop-shadow">{formatSats(Number(participants))} watching</span>
            )}
          </div>
          <h2 className="font-sans text-[18px] font-bold leading-tight tracking-normal line-clamp-2 drop-shadow">
            {title ?? "Untitled stream"}
          </h2>
          <div className="flex items-start gap-1.5 text-[14px] min-w-0">
            <Avatar pubkey={host} user={profile} size={20} />
            <p className="min-w-0 leading-snug line-clamp-2 break-words">
              <span className="font-semibold">{name}</span>
              <span className="text-layer-4"> · </span>
              <WhyLine why={why} />
            </p>
          </div>
          {!isDesktop && hasNext && active && (
            <span className="text-[12px] text-layer-4 text-center pt-1">Swipe up for the next live stream</span>
          )}
        </div>
        {!isDesktop && side}
      </div>
      {isDesktop && side}
    </section>
  )
}

function ActivePlayer({
  ev,
  poster,
  soundOn,
  paused,
  onBlocked,
}: {
  ev: NostrEvent
  poster?: string
  soundOn: boolean
  paused: boolean
  onBlocked: (b: boolean) => void
}) {
  const url = squadStreamUrl(ev)
  const el = useRef<MediaEl | null>(null)
  useEffect(() => {
    const v = el.current
    if (!v) return
    const apply = () => {
      if (paused) {
        v.pause()
        return
      }
      v.muted = !soundOn
      v.play()
        .then(() => onBlocked(false))
        .catch(e => {
          // the browser can refuse sound before a tap: play muted and keep saying "Tap for sound"
          if (e instanceof DOMException && e.name === "NotAllowedError" && !v.muted) {
            v.muted = true
            onBlocked(true)
            v.play().catch(() => {})
          }
        })
    }
    apply()
    v.addEventListener("canplay", apply)
    return () => v.removeEventListener("canplay", apply)
  }, [soundOn, paused, url])
  useEffect(() => {
    const v = el.current
    return () => {
      queueMicrotask(() => {
        if (v && shouldReleasePlayer(v)) v.src = ""
      })
    }
  }, [url])
  if (!url) return null
  return (
    <HlsVideo
      ref={
        ((v: MediaEl | null) => {
          el.current = v
        }) as unknown as Ref<HlsVideoElement>
      }
      src={url}
      muted
      playsInline
      poster={poster}
      className="absolute inset-0 w-full h-full"
      style={{ display: "block", "--media-object-fit": "contain" } as CSSProperties}
      config={{ lowLatencyMode: true }}
      data-testid="discover-video"
    />
  )
}

function SideButton({
  icon,
  caption,
  tone,
  pressed,
  onClick,
  label,
  testid,
  plus,
  disabled,
}: {
  icon: ReactNode
  caption: string
  tone?: "zap" | "primary"
  pressed?: boolean
  onClick?: () => void
  /** the aria-label (and tooltip) */
  label: string
  testid?: string
  /** the small "+" badge (Squad, while the stream is not on your squad) */
  plus?: boolean
  disabled?: boolean
}) {
  const circle = (
    <span
      className={classNames(
        "discover-round",
        tone === "zap" && "border-zap text-zap",
        tone === "primary" && "border-primary text-primary",
        pressed && "bg-primary/20",
        disabled && "opacity-50",
      )}
    >
      {icon}
      {plus && (
        <span className="discover-plus" data-testid="squad-plus">
          <PixelIcon grid={PLUS_GRID} size={10} />
        </span>
      )}
    </span>
  )
  return (
    <div className="flex flex-col items-center gap-1">
      {onClick && !disabled ? (
        <button
          type="button"
          onClick={onClick}
          aria-pressed={pressed}
          title={label}
          aria-label={label}
          data-testid={testid}
        >
          {circle}
        </button>
      ) : (
        <span role="img" aria-label={label} title={label} data-testid={testid}>
          {circle}
        </span>
      )}
      <span className="discover-caption" aria-hidden="true">
        {caption}
      </span>
    </div>
  )
}

function SideButtons({
  ev,
  chatOpen,
  onChat,
  squad,
  onSquad,
  onShare,
}: {
  ev: TaggedNostrEvent
  chatOpen: boolean
  onChat: () => void
  squad: "add" | "on" | "full"
  onSquad: () => void
  onShare: () => void
}) {
  const host = getHost(ev)
  const profile = useUserProfile(host)
  const zapTarget = profile?.lud16 ?? profile?.lud06
  const name = getName(host, profile)

  return (
    <div className="discover-buttons" data-testid="discover-buttons">
      {zapTarget ? (
        <div className="flex flex-col items-center gap-1" data-testid="discover-zap">
          <SendZapsDialog
            lnurl={zapTarget}
            pubkey={host}
            aTag={`${ev.kind}:${ev.pubkey}:${findTag(ev, "d")}`}
            targetName={name}
            label="Boost or zap the stream"
            pickYourSats
            button={
              <span
                className="discover-round border-zap text-zap"
                title="Boost or zap the stream"
                role="img"
                aria-label={`Zap ${name}: boost or zap the stream`}
                data-testid="discover-zap-button"
              >
                <PixelIcon grid={ZAP_GRID} />
              </span>
            }
          />
          <span className="discover-caption" aria-hidden="true">
            Zap
          </span>
        </div>
      ) : (
        <SideButton
          icon={<PixelIcon grid={ZAP_GRID} />}
          caption="No address"
          label="Zap: this streamer has no lightning address on their profile"
          disabled
          testid="discover-zap-button"
        />
      )}
      <SideButton
        icon={<PixelIcon grid={CHAT_GRID} />}
        caption={chatOpen ? "Close" : "Chat"}
        pressed={chatOpen}
        onClick={onChat}
        label={chatOpen ? "Close the chat" : `Chat: open ${name}'s chat`}
        testid="discover-chat-button"
      />
      <SideButton
        icon={<PixelIcon grid={SQUAD_GRID} />}
        tone="primary"
        caption={squad === "on" ? "On squad" : squad === "full" ? "Full" : "Squad"}
        pressed={squad === "on"}
        plus={squad === "add"}
        onClick={onSquad}
        label={
          squad === "on"
            ? "Squad: on your squad"
            : squad === "full"
              ? `Squad: your squad is full (${SQUAD_CAP})`
              : "Squad: add to your squad in the Room"
        }
        testid="discover-squad-button"
      />
      <SideButton
        icon={<PixelIcon grid={SHARE_GRID} />}
        caption="Share"
        onClick={onShare}
        label="Share: repost to nostr or share somewhere else"
        testid="discover-share-button"
      />
    </div>
  )
}

/** Desktop right column: the same feed as the Room. Opening a post pauses the stream; closing plays it again. */
function SideFeed({
  tag,
  post,
  onPost,
  pausedName,
}: {
  tag?: string
  post?: TaggedNostrEvent
  onPost: (p?: TaggedNostrEvent) => void
  pausedName?: string
}) {
  const login = useLogin()
  const follows = useFollows()
  const [tab, setTab] = useState<FeedTab>()
  const fallback: FeedTab = login && follows.size > 0 ? { kind: "frens" } : { kind: "tag", tag: tag ?? "gaming" }
  const active: FeedTab =
    tab && !(tab.kind === "tag" && tag && tab.tag !== tag) ? tab : tag ? { kind: "tag", tag } : fallback
  const { notes } = useRoomFeed(active, [...follows])
  if (post) return <OpenPost ev={post} pausedName={pausedName} onClose={() => onPost(undefined)} />
  const tabs: Array<FeedTab> = [{ kind: "frens" }, { kind: "fof" }, { kind: "tag", tag: tag ?? "gaming" }]
  return (
    <section className="flex flex-col gap-3 min-h-0 h-full" aria-label="Feed" data-testid="discover-side-feed">
      <div className="flex gap-2 flex-wrap" role="tablist">
        {tabs.map(t => (
          <button
            key={feedTabKey(t)}
            type="button"
            role="tab"
            aria-selected={feedTabKey(t) === feedTabKey(active)}
            onClick={() => setTab(t)}
            className={classNames(
              "rounded-full border px-3 py-1 text-[13px] font-semibold",
              feedTabKey(t) === feedTabKey(active)
                ? "border-primary text-primary bg-primary/10"
                : "border-layer-3 text-layer-4 hover:text-text",
            )}
          >
            {t.kind === "frens" ? "Frens" : t.kind === "fof" ? "Frens of frens" : `#${t.tag}`}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-2.5 overflow-y-auto min-h-0 flex-1 scrollbar-hidden">
        {active.kind !== "tag" && !login && (
          <p className="text-sm text-layer-4 px-1">Log in to see your frens' posts. Tags work for everyone.</p>
        )}
        {notes.map(n => (
          <PostCard key={n.id} ev={n} open={false} onOpen={() => onPost(n)} />
        ))}
        {notes.length === 0 && (active.kind === "tag" || login) && (
          <p className="text-sm text-layer-4 px-1">No posts here in the last two days yet.</p>
        )}
      </div>
    </section>
  )
}
