import type { TaggedNostrEvent } from "@snort/system"
import { SnortContext, useUserProfile } from "@snort/system-react"
import { type ReactNode, useContext, useState } from "react"
import Modal from "@/element/modal"
import { LoginSignup } from "@/element/login-signup"
import { getName } from "@/element/profile"
import { useLogin } from "@/hooks/login"
import { useStreamHref } from "@/hooks/short-link"
import { extractStreamInfo, getHost } from "@/utils"
import { PixelIcon, REPOST_GRID, SHARE_GRID } from "./rail-icons"
import { streamRepost } from "./share"

/**
 * The Share sheet from Discover's rail: "Repost to nostr" (a kind 16 repost of the 30311, signed by the app's own
 * signer; logged out it asks you to log in) and "Share somewhere else" (the device share sheet, or a copied link).
 */
export function ShareSheet({
  ev,
  onClose,
  onSay,
}: {
  ev: TaggedNostrEvent
  onClose: () => void
  onSay: (text: ReactNode) => void
}) {
  const system = useContext(SnortContext)
  const login = useLogin()
  const host = getHost(ev)
  const profile = useUserProfile(host)
  const name = getName(host, profile)
  const href = useStreamHref(ev, host)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const [loggingIn, setLoggingIn] = useState(false)
  const pub = login?.publisher()

  async function repost() {
    if (!pub) return
    setBusy(true)
    setError(undefined)
    try {
      const r = streamRepost(ev, ev.relays?.[0] ?? "")
      const signed = await pub.generic(eb => {
        eb.kind(r.kind).content(r.content)
        for (const t of r.tags) eb.tag(t)
        return eb
      })
      await system.BroadcastEvent(signed)
      onSay(`Reposted ${name}'s stream to nostr.`)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Your signer did not sign the repost.")
    } finally {
      setBusy(false)
    }
  }

  async function elsewhere() {
    const url = `${window.location.origin}${href}`
    const title = extractStreamInfo(ev).title ?? `${name} is live`
    try {
      if (navigator.share) {
        await navigator.share({ url, title })
        onClose()
        return
      }
      await navigator.clipboard.writeText(url)
      onSay(`Link copied: ${url}`)
    } catch {
      onSay(`Copy this link: ${url}`)
    }
    onClose()
  }

  if (loggingIn) {
    return (
      <Modal id="discover-share-login" onClose={() => setLoggingIn(false)}>
        <LoginSignup close={() => setLoggingIn(false)} />
      </Modal>
    )
  }

  return (
    <Modal id="discover-share" onClose={onClose} title={`Share ${name}'s stream`}>
      <div className="flex flex-col gap-3" data-testid="share-sheet">
        <ShareRow
          icon={<PixelIcon grid={REPOST_GRID} size={24} />}
          title="Repost to nostr"
          what={
            pub
              ? "A repost (kind 16) of this live stream to your followers, signed by your login."
              : "Log in to repost this stream to your followers."
          }
          onClick={pub ? repost : () => setLoggingIn(true)}
          action={pub ? (busy ? "Reposting..." : "Repost") : "Log in"}
          disabled={busy}
          testid="share-repost"
        />
        {error && <p className="text-sm text-warning">{error}</p>}
        <ShareRow
          icon={<PixelIcon grid={SHARE_GRID} size={24} />}
          title="Share somewhere else"
          what={
            typeof navigator !== "undefined" && "share" in navigator
              ? "Opens your device's share sheet."
              : "Copies the link to this stream."
          }
          onClick={elsewhere}
          action={typeof navigator !== "undefined" && "share" in navigator ? "Share" : "Copy link"}
          testid="share-elsewhere"
        />
      </div>
    </Modal>
  )
}

function ShareRow({
  icon,
  title,
  what,
  action,
  onClick,
  disabled,
  testid,
}: {
  icon: ReactNode
  title: string
  what: string
  action: string
  onClick: () => void
  disabled?: boolean
  testid: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-3 rounded-xl border border-layer-3 bg-layer-2 px-3 py-3 text-left hover:border-primary disabled:opacity-60"
      data-testid={testid}
    >
      <span className="grid place-items-center w-11 h-11 rounded-lg bg-layer-1 text-primary shrink-0">{icon}</span>
      <span className="flex flex-col flex-1 min-w-0">
        <span className="font-semibold">{title}</span>
        <span className="text-[13px] text-layer-4">{what}</span>
      </span>
      <span className="text-[13px] font-semibold text-primary shrink-0">{action}</span>
    </button>
  )
}
