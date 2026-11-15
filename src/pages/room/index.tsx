import "./room.css"
import { APP_NAME } from "@/brand"
import { Helmet } from "@dr.pogodin/react-helmet"
import { NostrLink, type TaggedNostrEvent } from "@snort/system"
import { useUserProfile } from "@snort/system-react"
import { Menu, MenuItem } from "@szhsin/react-menu"
import classNames from "classnames"
import { useCallback, useMemo, useReducer, useRef, useState } from "react"
import { useMediaQuery } from "usehooks-ts"
import { useStreamsFeed } from "@/hooks/live-streams"
import { useSortedStreams } from "@/hooks/useLiveStreams"
import { useFollows, useLogin, useMutedPubkeys } from "@/hooks/login"
import { extractStreamInfo, findTag, getHost } from "@/utils"
import { getName } from "@/element/profile"
import { Avatar } from "@/element/avatar"
import { DefaultButton } from "@/element/buttons"
import { Icon } from "@/element/icon"
import { SendZapsDialog } from "@/element/send-zap"
import { RoomClipButton } from "@/element/stream/room-clip"
import { LiveChat } from "@/element/chat/live-chat"
import { StreamContextProvider } from "@/element/stream/stream-state"
import { formatSats } from "@/number"
import { useShowAdult, withoutAdult } from "@/element/nsfw/adult"
import { FrenRing, type MediaEl, SquadTile } from "./squad"
import { type FeedTab, OpenPost, PostCard, feedTabKey, useRoomFeed } from "./feed"
import { SQUAD_MAX_DESKTOP, SQUAD_MAX_PHONE, pickSquad, roomReducer } from "./room-state"
import { SQUAD_CAP, SquadStore, pinFirst, removeFromSquad, streamAddr, useSquadPicks } from "./squad-store"

const DEFAULT_TAGS = ["gaming", "bitcoin", "music"]

export function RoomPage() {
  const isDesktop = useMediaQuery("(min-width: 1280px)", { initializeWithValue: false })
  const login = useLogin()
  const follows = useFollows()
  const muted = useMutedPubkeys()
  const streams = useStreamsFeed()
  // 18+ streams stay off the squad, the rings and the Add menu unless you opted in in settings
  const showAdult = useShowAdult()
  const { live } = useSortedStreams(
    withoutAdult(
      streams.filter(a => !muted.has(getHost(a))),
      showAdult,
    ),
  )

  // the streams you picked (here or from Discover), kept on this device; addresses, not event ids
  const pinned = useSquadPicks()
  const [dropped, setDropped] = useState<Set<string>>(new Set())
  // a phone shows 3 tiles, but never hides a stream you picked: with 4 picks it shows 4
  const max = isDesktop ? SQUAD_MAX_DESKTOP : Math.min(SQUAD_CAP, Math.max(SQUAD_MAX_PHONE, pinned.length))
  const squad = useMemo(() => pickSquad(live, follows, max, pinned, dropped), [live, follows, max, pinned, dropped])

  const [state, dispatch] = useReducer(roomReducer, {})
  const audibleId =
    state.audible && squad.events.some(e => e.id === state.audible) ? state.audible : squad.events[0]?.id
  const audibleEv = squad.events.find(e => e.id === audibleId) as TaggedNostrEvent | undefined

  // the media element of each tile, so the Clip button can read the live window of the one with the sound
  const media = useRef(new Map<string, MediaEl | null>())
  const audibleMedia = useCallback(() => (audibleId ? media.current.get(audibleId) : undefined), [audibleId])

  const [side, setSide] = useState<"feed" | "chat">("feed")
  const tags = useMemo(() => {
    const own = audibleEv ? extractStreamInfo(audibleEv).tags.slice(0, 2) : []
    return [...new Set([...DEFAULT_TAGS, ...own.map(t => t.toLowerCase())])].slice(0, 4)
  }, [audibleEv?.id])
  const [tab, setTab] = useState<FeedTab | undefined>()
  const activeTab: FeedTab = tab ?? (login && follows.size > 0 ? { kind: "frens" } : { kind: "tag", tag: tags[0] })
  const { notes, fofSize } = useRoomFeed(activeTab, [...follows])
  const openNote = notes.find(n => n.id === state.post)
  const [openEv, setOpenEv] = useState<TaggedNostrEvent>()

  const pausedEv = squad.events.find(e => e.id === state.pausedForPost)
  const pausedName = usePausedName(pausedEv)

  function pin(ev: TaggedNostrEvent) {
    setDropped(d => {
      const n = new Set(d)
      n.delete(ev.id)
      return n
    })
    SquadStore.set(pinFirst(SquadStore.get(), streamAddr(ev)))
  }
  const picked = squad.events.filter(e => pinned.includes(streamAddr(e)) || pinned.includes(e.id)).length
  const offSquad = live.filter(e => !squad.events.some(s => s.id === e.id)).slice(0, 12)

  const tiles = (
    <div
      className={classNames("room-squad", `room-squad-${Math.max(1, squad.events.length)}`)}
      data-testid="squad"
      data-count={squad.events.length}
    >
      {squad.events.map((ev, i) => (
        <SquadTile
          key={ev.id}
          ev={ev}
          big={i === 0 && squad.events.length > 1}
          audible={ev.id === audibleId}
          paused={ev.id === state.pausedForPost}
          onSound={() => dispatch({ type: "sound", id: ev.id })}
          onResume={() => dispatch({ type: "resume" })}
          onRemove={() => {
            SquadStore.set(removeFromSquad(SquadStore.get(), streamAddr(ev)))
            setDropped(d => new Set(d).add(ev.id))
          }}
          mediaRef={el => {
            media.current.set(ev.id, el)
          }}
        />
      ))}
      {squad.events.length === 0 && (
        <div className="pa-notch bg-layer-1 grid place-items-center text-layer-4 text-center p-6 row-span-full">
          Nobody is live right now. The squad fills when frens go live.
        </div>
      )}
    </div>
  )

  const feed = (
    <section className="flex flex-col gap-3 min-h-0 h-full" aria-label="Feed">
      <div className="flex gap-2 flex-wrap" role="tablist">
        <FeedChip active={activeTab.kind === "frens"} onClick={() => setTab({ kind: "frens" })}>
          Frens
        </FeedChip>
        <FeedChip active={activeTab.kind === "fof"} onClick={() => setTab({ kind: "fof" })}>
          Frens of frens
        </FeedChip>
        {tags.map(t => (
          <FeedChip
            key={t}
            active={activeTab.kind === "tag" && activeTab.tag === t}
            onClick={() => setTab({ kind: "tag", tag: t })}
          >
            #{t}
          </FeedChip>
        ))}
      </div>
      <div className="relative min-h-0 flex-1">
        {state.post && (openNote ?? openEv) ? (
          <div className="absolute inset-0 max-xl:static">
            <OpenPost
              ev={(openNote ?? openEv) as TaggedNostrEvent}
              pausedName={pausedName}
              onClose={() => {
                dispatch({ type: "close-post" })
                setOpenEv(undefined)
              }}
            />
          </div>
        ) : (
          <div
            className="flex flex-col gap-2.5 xl:overflow-y-auto xl:h-full scrollbar-hidden"
            key={feedTabKey(activeTab)}
          >
            {activeTab.kind !== "tag" && !login && (
              <p className="text-sm text-layer-4 px-1">Log in to see your frens' posts. Tags work for everyone.</p>
            )}
            {activeTab.kind === "fof" && login && fofSize === 0 && (
              <p className="text-sm text-layer-4 px-1">Your frens' follow lists have not loaded yet.</p>
            )}
            {notes.map(n => (
              <PostCard
                key={n.id}
                ev={n}
                open={state.post === n.id}
                onOpen={() => {
                  setOpenEv(n)
                  dispatch({ type: "open-post", id: n.id, audible: audibleId })
                }}
              />
            ))}
            {notes.length === 0 && (activeTab.kind === "tag" || login) && (
              <p className="text-sm text-layer-4 px-1">No posts here in the last two days yet.</p>
            )}
          </div>
        )}
      </div>
    </section>
  )

  const chat = audibleEv && (
    <StreamContextProvider link={NostrLink.fromEvent(audibleEv)} evPreload={audibleEv} key={audibleEv.id}>
      <LiveChat
        canWrite={true}
        showGoal={false}
        showHeader={true}
        className="min-h-0 h-full max-xl:h-[78dvh] border border-layer-3 bg-layer-1 rounded-2xl overflow-hidden"
      />
    </StreamContextProvider>
  )

  return (
    <div className="room" data-testid="room">
      <Helmet>
        <title>{`Room - ${APP_NAME}`}</title>
      </Helmet>
      {!isDesktop && (
        <nav className="flex gap-2 overflow-x-auto scrollbar-hidden px-3 pt-3 pb-1" aria-label="Frens live now">
          {[...squad.events, ...offSquad].map(ev => (
            <FrenRing
              key={ev.id}
              ev={ev}
              onSquad={squad.events.some(s => s.id === ev.id)}
              onPick={() => pin(ev as TaggedNostrEvent)}
            />
          ))}
        </nav>
      )}
      <div className="room-main">
        <div className="flex items-baseline justify-between gap-3 max-xl:px-3">
          <h1 className="font-display text-[22px] max-xl:text-[17px] tracking-tight">Your squad</h1>
          <span className="text-[13px] text-layer-4 flex-1 truncate">
            {squad.frens
              ? `${squad.events.length} ${squad.events.length === 1 ? "fren" : "frens"} on screen, sound from one at a time`
              : "No frens live, so here is who is live now. Sound from one at a time."}
          </span>
          {isDesktop && offSquad.length > 0 && (
            <Menu
              menuClassName="ctx-menu"
              menuButton={<DefaultButton className="shrink-0">Add a stream</DefaultButton>}
              align="end"
              gap={5}
            >
              {offSquad.map(ev => (
                <MenuItem key={ev.id} onClick={() => pin(ev as TaggedNostrEvent)}>
                  {extractStreamInfo(ev).title ?? getHost(ev).slice(0, 8)}
                </MenuItem>
              ))}
            </Menu>
          )}
        </div>
        {picked > 0 && (
          <p className="text-[13px] font-semibold text-primary max-xl:px-3 -mt-1" data-testid="squad-picked">
            {picked} of {SQUAD_CAP} picked by you, first on the squad
          </p>
        )}
        {tiles}
        {audibleEv && (
          <NowPlaying
            ev={audibleEv}
            media={audibleMedia}
            chatOpen={side === "chat"}
            onChat={() => setSide(s => (s === "chat" ? "feed" : "chat"))}
          />
        )}
        {isDesktop && (
          <section
            className="pa-notch bg-layer-1/60 px-5 py-4 text-[13.5px] leading-relaxed text-layer-5"
            aria-label="How the Room works"
          >
            <h2 className="font-sans text-xs font-semibold uppercase tracking-wider text-layer-4 mb-1.5">
              How the Room works
            </h2>
            <p>
              <b className="text-text">Squad.</b> Up to 4 streams on screen. One has the sound, the rest play muted.
              Click a tile to move the sound.
            </p>
            <p>
              <b className="text-text">Read a post.</b> Opening a post pauses the stream with the sound. Closing it
              plays it again.
            </p>
            <p>
              <b className="text-text">Clip.</b> Saves the last stretch the live stream still holds, up to 30 s. The
              button says how much.
            </p>
            <p>
              <b className="text-text">Feed.</b> Frens first, then frens of frens and tags.
            </p>
          </section>
        )}
        {/* step 3: the dock (music or podcast player) and the buddy live here. Slot only, nothing built yet. */}
        <div className="room-dock-slot" data-slot="dock-and-buddy" aria-hidden="true" />
      </div>
      <aside className="room-side">{side === "chat" && chat ? chat : feed}</aside>
    </div>
  )
}

function usePausedName(ev?: TaggedNostrEvent) {
  const host = ev ? getHost(ev) : undefined
  const profile = useUserProfile(host)
  return host ? getName(host, profile) : undefined
}

function FeedChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={classNames(
        "rounded-full border px-3 py-1 text-[13px] font-semibold",
        active ? "border-primary text-primary bg-primary/10" : "border-layer-3 text-layer-4 hover:text-text",
      )}
    >
      {children}
    </button>
  )
}

/** The bar under the squad: who has the sound, and what you can do with their stream. */
function NowPlaying({
  ev,
  media,
  chatOpen,
  onChat,
}: {
  ev: TaggedNostrEvent
  media: () => MediaEl | null | undefined
  chatOpen: boolean
  onChat: () => void
}) {
  const host = getHost(ev)
  const profile = useUserProfile(host)
  const { title, participants } = extractStreamInfo(ev)
  const follows = useFollows()
  const zapTarget = profile?.lud16 ?? profile?.lud06
  return (
    <div className="room-now pa-notch bg-layer-1" data-testid="now-playing">
      <div className="flex items-center gap-3 min-w-0">
        <Avatar pubkey={host} user={profile} size={36} />
        <div className="flex flex-col min-w-0">
          <span className="font-semibold truncate">{title ?? "Untitled"}</span>
          <span className="text-[13px] text-layer-4 truncate">
            {getName(host, profile)}
            {participants !== undefined && ` · ${formatSats(Number(participants))} watching`}
            {follows.has(host) && " · your fren"}
          </span>
        </div>
      </div>
      <div className="room-now-actions" data-testid="now-actions">
        <DefaultButton onClick={onChat} aria-pressed={chatOpen}>
          <Icon name="message" size={16} />
          {chatOpen ? "Feed" : "Chat"}
        </DefaultButton>
        <RoomClipButton ev={ev} media={media} />
        {zapTarget ? (
          <SendZapsDialog
            lnurl={zapTarget}
            pubkey={host}
            aTag={`${ev.kind}:${ev.pubkey}:${findTag(ev, "d")}`}
            targetName={getName(host, profile)}
            label="Boost or zap the stream"
            pickYourSats
          />
        ) : (
          <DefaultButton disabled title="This streamer has no lightning address on their profile">
            <Icon name="zap" size={16} />
            Boost or zap the stream
          </DefaultButton>
        )}
      </div>
    </div>
  )
}
