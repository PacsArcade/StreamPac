import classNames from "classnames"
import { useState } from "react"
import { Icon } from "../icon"
import Modal from "../modal"
import { PrimaryButton } from "../buttons"
import { SendZaps } from "../send-zap"
import { BOOST_TIERS, type BoostTier, boostEffect, parsePickedSats } from "./boost"
import { PickYourSats } from "./pick-sats"

/**
 * The lightning tab on the right of chat. Optional: plain chat stays free.
 * A boosted message is a zap to the stream with the message as its comment, paid through the streamer's
 * lightning address (the same zap flow as the Zap button). The effect shows when the zap receipt reaches chat.
 */
export function BoostTab({
  lnurl,
  pubkey,
  aTag,
  targetName,
}: {
  lnurl?: string
  pubkey?: string
  aTag?: string
  targetName?: string
}) {
  const [open, setOpen] = useState(false)
  // a tier, or "pick" for the open box where the watcher types their own amount
  const [tier, setTier] = useState<BoostTier | "pick">("pin")
  const [picked, setPicked] = useState("")
  const [message, setMessage] = useState("")
  const [paying, setPaying] = useState(false)
  const pickedSats = parsePickedSats(picked)
  const amount = tier === "pick" ? pickedSats : (BOOST_TIERS.find(t => t.tier === tier) ?? BOOST_TIERS[1]).sats

  return (
    <>
      {/* positioned by this wrapper: the global `button { position: relative }` (async-button.css) beats utility classes */}
      <div className="absolute right-0 top-[38%] -translate-y-1/2 z-[5]">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          aria-label="Boost a message with sats"
          className={classNames(
            "flex flex-col items-center gap-1 rounded-l-lg px-1 py-2.5 text-[11px] font-bold uppercase tracking-wider",
            open ? "bg-zap text-black" : "bg-zap/90 text-black hover:bg-zap",
          )}
          data-testid="boost-tab"
        >
          <Icon name="zap-filled" size={14} />
          <span className="[writing-mode:vertical-rl]">Boost</span>
        </button>
      </div>
      {open && (
        <div
          className="absolute inset-x-2 bottom-[64px] z-[6] flex flex-col gap-2.5 rounded-xl border border-zap/60 bg-layer-1 p-3 shadow-xl max-h-[calc(100%-72px)] overflow-y-auto scrollbar-hidden"
          data-testid="boost-panel"
        >
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-semibold text-zap">
              <Icon name="zap-filled" size={14} />
              Boost this message
            </span>
            <button type="button" className="text-layer-4 hover:text-text text-sm" onClick={() => setOpen(false)}>
              Close
            </button>
          </div>
          <span className="text-[12px] text-layer-4">Optional. Plain chat stays free.</span>
          <input
            type="text"
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Your message"
            maxLength={280}
            className="rounded-lg bg-layer-2 border border-layer-3 px-3 py-2 text-sm"
          />
          <div className="flex flex-col gap-1.5">
            {BOOST_TIERS.map(t => (
              <button
                type="button"
                aria-pressed={t.tier === tier}
                key={t.tier}
                onClick={() => setTier(t.tier)}
                className={classNames(
                  "flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left",
                  t.tier === tier ? "border-zap bg-zap/10" : "border-layer-3 hover:border-layer-4",
                )}
              >
                <span className="flex flex-col">
                  <span className="text-sm font-bold">{t.name}</span>
                  <span className="text-[12px] text-layer-4">{t.what}</span>
                </span>
                <span className="text-[13px] font-semibold tabular-nums text-zap shrink-0">
                  {t.sats.toLocaleString("en-US")} sats
                </span>
              </button>
            ))}
            <PickYourSats
              value={picked}
              onChange={v => {
                setPicked(v)
                setTier("pick")
              }}
              selected={tier === "pick"}
              onFocus={() => setTier("pick")}
            />
          </div>
          {lnurl ? (
            <PrimaryButton
              disabled={message.trim().length === 0 || amount === undefined}
              onClick={() => setPaying(true)}
              data-testid="boost-send"
              data-effect={amount !== undefined ? boostEffect(amount) : undefined}
            >
              {amount === undefined ? "Type your amount" : `Send for ${amount.toLocaleString("en-US")} sats`}
            </PrimaryButton>
          ) : (
            <span className="text-[12px] text-layer-4">
              This streamer has no lightning address, so boosts are off here.
            </span>
          )}
          <span className="text-[11px] leading-snug text-layer-4">
            Paid as a zap to the stream through the streamer's lightning address. The effect shows when the zap receipt
            reaches chat; no receipt, no effect.
          </span>
        </div>
      )}
      {paying && lnurl && amount !== undefined && (
        <Modal id="boost-zap" onClose={() => setPaying(false)}>
          <SendZaps
            lnurl={lnurl}
            pubkey={pubkey}
            aTag={aTag}
            targetName={targetName}
            presetAmount={amount}
            presetComment={message}
            onFinish={() => {
              setPaying(false)
              setOpen(false)
              setMessage("")
            }}
          />
        </Modal>
      )}
    </>
  )
}
