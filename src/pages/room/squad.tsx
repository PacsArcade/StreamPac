import type { NostrEvent } from "@snort/system"
import { useUserProfile } from "@snort/system-react"
import HlsVideo from "hls-video-element/react"
import type { HlsVideoElement } from "hls-video-element"
import classNames from "classnames"
import { type CSSProperties, type Ref, useEffect, useRef, useState } from "react"
import { Link } from "react-router"
import { Avatar } from "@/element/avatar"
import { getName } from "@/element/profile"
import { LiveTag } from "@/element/live-tag"
import { Icon } from "@/element/icon"
import { useStreamHref } from "@/hooks/short-link"
import useImgProxy from "@/hooks/img-proxy"
import { extractStreamInfo, getHost } from "@/utils"
import { squadStreamUrl } from "./room-state"
import { shouldReleasePlayer } from "@/element/stream/release-player"

export type MediaEl = HlsVideoElement & HTMLElement

/**
 * One stream in the squad. Plays muted unless it holds the sound. Click it to move the sound here.
 * `paused` is set while a post is open; it pauses here and plays again when it clears.
 */
export function SquadTile({
  ev,
  audible,
  paused,
  big,
  onSound,
  onResume,
  onRemove,
  mediaRef,
}: {
  ev: NostrEvent
  audible: boolean
  paused: boolean
  big?: boolean
  onSound: () => void
  onResume: () => void
  onRemove?: () => void
  mediaRef?: (el: MediaEl | null) => void
}) {
  const host = getHost(ev)
  const profile = useUserProfile(host)
  const href = useStreamHref(ev, host)
  const { proxy } = useImgProxy()
  const { title, image } = extractStreamInfo(ev)
  const url = squadStreamUrl(ev)
  const el = useRef<MediaEl | null>(null)
  const [blockedSound, setBlockedSound] = useState(false)

  // sound and pause follow the Room's state; the browser may refuse sound before a tap, then we play muted and say so
  useEffect(() => {
    const v = el.current
    if (!v) return
    const apply = () => {
      if (paused) {
        v.pause()
        return
      }
      v.muted = !audible
      v.play()
        .then(() => setBlockedSound(false))
        .catch(e => {
          if (e instanceof DOMException && e.name === "NotAllowedError" && !v.muted) {
            v.muted = true
            setBlockedSound(true)
            v.play().catch(() => {})
          }
        })
    }
    apply()
    // the first play() can land before hls.js has data; try again once the stream can play
    v.addEventListener("canplay", apply)
    return () => v.removeEventListener("canplay", apply)
  }, [audible, paused, url])

  // release hls.js when the tile leaves (same reason as LiveVideoPlayer)
  useEffect(() => {
    const v = el.current
    return () => {
      queueMicrotask(() => {
        if (v && shouldReleasePlayer(v)) v.src = ""
      })
    }
  }, [url])

  const name = getName(host, profile)
  return (
    <div
      className={classNames(
        "pa-notch relative bg-black overflow-hidden group min-h-0",
        big ? "row-span-full" : "",
        audible ? "ring-2 ring-primary ring-inset" : "",
      )}
      data-testid="squad-tile"
      data-audible={audible || undefined}
      data-paused={paused || undefined}
    >
      {url && (
        <HlsVideo
          ref={
            ((v: MediaEl | null) => {
              el.current = v
              mediaRef?.(v)
            }) as unknown as Ref<HlsVideoElement>
          }
          src={url}
          muted
          playsInline
          poster={image ? proxy(image) : undefined}
          className="absolute inset-0 w-full h-full"
          style={{ display: "block", "--media-object-fit": "cover" } as CSSProperties}
          config={{ lowLatencyMode: true }}
        />
      )}
      <button
        type="button"
        className="!absolute inset-0 w-full h-full cursor-pointer"
        aria-label={audible ? `${name} has the sound` : `Move the sound to ${name}`}
        onClick={() => {
          if (blockedSound && el.current) {
            el.current.muted = false
            setBlockedSound(false)
          }
          onSound()
        }}
      />
      <div className="pointer-events-none absolute inset-x-3 top-3 flex items-center gap-2">
        <LiveTag />
        {audible && !blockedSound && (
          <span className="rounded-md bg-layer-0/80 px-2 py-0.5 text-[12px] font-bold uppercase tracking-wide text-primary">
            Sound on
          </span>
        )}
        {audible && blockedSound && (
          <span className="rounded-md bg-layer-0/80 px-2 py-0.5 text-[12px] font-bold text-text">Tap for sound</span>
        )}
      </div>
      <div className="absolute right-3 top-3 flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        <Link
          to={href}
          state={ev}
          className="grid place-items-center w-7 h-7 rounded-md bg-layer-0/80 hover:bg-layer-2"
          title="Open this stream on its own page"
          aria-label={`Open ${name}'s stream on its own page`}
        >
          <Icon name="link" size={14} />
        </Link>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="grid place-items-center w-7 h-7 rounded-md bg-layer-0/80 hover:bg-layer-2"
            title="Take this stream off the squad"
            aria-label={`Take ${name} off the squad`}
          >
            <Icon name="x" size={12} />
          </button>
        )}
      </div>
      <div className="pointer-events-none absolute inset-x-3 bottom-3 flex items-center gap-2 min-w-0">
        <Avatar pubkey={host} user={profile} size={big ? 30 : 24} />
        <span className={classNames("font-semibold truncate drop-shadow", big ? "text-[15px]" : "text-[13px]")}>
          {name}
        </span>
        {big && title && <span className="text-[13px] text-layer-5 truncate max-md:hidden">· {title}</span>}
      </div>
      {paused && (
        <div
          className="absolute inset-0 grid place-items-center bg-layer-0/75 backdrop-blur-[2px] text-center px-4"
          data-testid="paused-overlay"
        >
          <div className="flex flex-col items-center gap-2">
            <span className="font-semibold">Paused while you read</span>
            <span className="text-[13px] text-layer-4">Closing the post plays it again.</span>
            <button
              type="button"
              onClick={onResume}
              className="mt-1 rounded-lg border border-primary px-3 py-1 text-sm font-semibold text-primary hover:bg-primary/10"
            >
              Resume
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/** A fren's ring for the phone's top row: tap it to put them on the squad. */
export function FrenRing({ ev, onPick, onSquad }: { ev: NostrEvent; onPick: () => void; onSquad: boolean }) {
  const host = getHost(ev)
  const profile = useUserProfile(host)
  const name = getName(host, profile)
  return (
    <button
      type="button"
      onClick={onPick}
      className="flex flex-col items-center gap-1 w-[64px] shrink-0"
      title={onSquad ? `${name} is on your squad` : `Put ${name} on your squad`}
      data-testid="fren-ring"
    >
      <span className={classNames("rounded-full p-[3px]", onSquad ? "bg-primary" : "bg-live")}>
        <span className="block rounded-full p-[2px] bg-layer-0">
          <Avatar pubkey={host} user={profile} size={50} />
        </span>
      </span>
      <span className="text-[12px] leading-tight truncate w-full text-center">{name}</span>
      <span className="text-[10px] font-bold leading-none text-live">LIVE</span>
    </button>
  )
}
