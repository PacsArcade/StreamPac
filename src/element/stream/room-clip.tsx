import type { TaggedNostrEvent } from "@snort/system"
import { useEffect, useState } from "react"
import { extractStreamInfo } from "@/utils"
import { useLogin } from "@/hooks/login"
import { DefaultButton, PrimaryButton } from "../buttons"
import { Icon } from "../icon"
import Modal from "../modal"
import { ClipButton } from "./clip-button"
import { type ClipPlan, clipLabel, planClip, readHlsWindow } from "./clip-window"

type HlsHost = HTMLElement & { api?: Parameters<typeof readHlsWindow>[0] }

/** Join the planned segments (and the init segment for fMP4) into one file the watcher keeps. */
async function saveClip(plan: ClipPlan, init: string | undefined, title: string) {
  const parts: Array<ArrayBuffer> = []
  if (init) parts.push(await (await fetch(init)).arrayBuffer())
  for (const f of plan.fragments) {
    const r = await fetch(f.url)
    if (!r.ok) throw new Error(`segment ${r.status}`)
    parts.push(await r.arrayBuffer())
  }
  const isMp4 = !!init || /\.(m4s|mp4)(\?|$)/i.test(plan.fragments[0]?.url ?? "")
  const blob = new Blob(parts, { type: isMp4 ? "video/mp4" : "video/mp2t" })
  const a = document.createElement("a")
  a.href = URL.createObjectURL(blob)
  a.download = `${title.replace(/[^\w-]+/g, "-").slice(0, 40) || "clip"}-last-${Math.floor(plan.seconds)}s.${isMp4 ? "mp4" : "ts"}`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000)
}

/**
 * The Clip button on a stream. It says what the player can really give:
 * the last N seconds the live playlist still holds (we ask for 30), read live from the player.
 * Posting a clip needs the stream's server to cut it (zap-stream-core's clip service); only streams on a server
 * with that service offer it. Everything else saves the clip to the watcher's device.
 */
export function RoomClipButton({
  ev,
  media,
  className,
}: {
  ev: TaggedNostrEvent
  media: () => HlsHost | null | undefined
  className?: string
}) {
  const login = useLogin()
  const { service, title } = extractStreamInfo(ev)
  const [plan, setPlan] = useState<ClipPlan>()
  const [init, setInit] = useState<string>()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState<"idle" | "saving" | "saved" | "failed">("idle")

  useEffect(() => {
    const read = () => {
      const w = readHlsWindow(media()?.api)
      setPlan(w ? planClip(w.fragments) : undefined)
      setInit(w?.init)
    }
    read()
    const t = setInterval(read, 3000)
    return () => clearInterval(t)
  }, [media, ev.id])

  const label = clipLabel(plan)
  return (
    <>
      <DefaultButton
        className={className}
        onClick={() => {
          setSaving("idle")
          setOpen(true)
        }}
        title={plan ? `The live playlist holds ${Math.floor(plan.window)} s right now` : "Waiting for the player"}
        data-testid="clip-button"
      >
        <Icon name="scissor" size={16} />
        {label}
      </DefaultButton>
      {open && (
        <Modal id="room-clip" onClose={() => setOpen(false)}>
          <div className="flex flex-col gap-4" data-testid="clip-panel">
            <h2 className="text-xl">{label}</h2>
            <p className="text-sm text-layer-5">
              {plan ? (
                <>
                  What this player can give: the last <b>{Math.floor(plan.seconds)} s</b>. A live stream only keeps its
                  newest segments; this one holds <b>{Math.floor(plan.window)} s</b> right now. We ask for 30 s and take
                  what is there.
                </>
              ) : (
                <>The player has not loaded this stream's segments yet, so there is nothing to clip.</>
              )}
            </p>
            {plan && (
              <PrimaryButton
                onClick={async () => {
                  setSaving("saving")
                  try {
                    await saveClip(plan, init, title ?? "clip")
                    setSaving("saved")
                  } catch {
                    setSaving("failed")
                  }
                }}
                disabled={saving === "saving"}
              >
                Save the last {Math.floor(plan.seconds)} s to this device
              </PrimaryButton>
            )}
            {saving === "saved" && <p className="text-sm text-primary">Saved. Post it from your device.</p>}
            {saving === "failed" && (
              <p className="text-sm text-warning">The stream's server would not hand the segments over again.</p>
            )}
            <p className="text-sm text-layer-4">
              {service
                ? login
                  ? "This stream's server can cut a clip and post it to Nostr:"
                  : "This stream's server can cut a clip and post it to Nostr. Log in to use it."
                : "Posting straight from here needs the stream's server to cut the clip. This stream's server has no clip service, so the clip saves to your device."}
            </p>
            {service && login && <ClipButton ev={ev} />}
          </div>
        </Modal>
      )}
    </>
  )
}
