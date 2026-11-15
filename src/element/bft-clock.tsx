import classNames from "classnames"
import { BftMarker } from "./bitcoin-sign"
import { useBftLive } from "@/bft/use-bft"
import { beaconGap, type LiveFace, type TipState } from "@/bft"

function lateWords(sec: number) {
  return sec >= 60 ? `${Math.floor(sec / 60)} min ${String(sec % 60).padStart(2, "0")} s` : `${sec} s`
}

/** One line that says where the seconds come from, or why they are dashes. Words, not colour alone. */
export function bftSourceLine(tip: TipState, face: LiveFace): string {
  if (tip.height === undefined)
    return tip.beaconDown ? "No answer from the beacon. Dashes, never a guess." : "Asking the beacon for the height."
  if (tip.beaconDown) return "The beacon stopped answering. Showing the last real height."
  if (face.holding) return `Holding at 9:59. This block is late by ${lateWords(face.lateBy)}.`
  if (tip.source === "watcher") return "Seconds count from when our node first saw this block."
  if (tip.source === "viewer") return "Seconds count from when this page saw the block arrive."
  return "Seconds start at the next block. Until then they are dashes, never a guess."
}

/**
 * The real BFT clock: height from the house beacon, seconds since the block arrived (spec 14, 15).
 * The numbers sit bare on the page, no boxes behind them.
 */
export function BftClock({ className }: { className?: string }) {
  const { tip, face } = useBftLive()
  const gap = beaconGap(tip)
  return (
    <section
      className={classNames("flex flex-col gap-1 px-2.5", className)}
      aria-label="Bitcoin Federated Time"
      data-testid="bft-clock"
    >
      <h2 className="font-sans text-xs font-semibold uppercase tracking-wider text-layer-4">Bitcoin time</h2>
      <span
        role="timer"
        aria-live="off"
        className={classNames(
          "font-display text-[30px] leading-none font-extrabold tabular-nums tracking-tight",
          face.holding ? "text-zap" : "text-primary",
        )}
        data-testid="bft-face"
      >
        {face.hms}
      </span>
      <span className="text-[13px] tabular-nums text-text whitespace-nowrap">
        {face.date} <BftMarker />
      </span>
      <span className="text-xs tabular-nums text-layer-4">
        Block {tip.height !== undefined ? tip.height.toLocaleString("en-US") : "---,---"}
        {face.holding && <b className="ml-1.5 text-zap">HOLDING</b>}
      </span>
      <span className="text-[11px] leading-snug text-layer-4">{bftSourceLine(tip, face)}</span>
      {gap !== undefined && (
        <span className="text-[11px] leading-snug text-zap">
          Our mempool reads {tip.verify?.toLocaleString("en-US")}, a gap of {gap} blocks.
        </span>
      )}
    </section>
  )
}

/** The mini time banner: the top of the page on a phone. One thin line, real or dashes. */
export function BftMiniBanner({ className }: { className?: string }) {
  const { tip, face } = useBftLive()
  return (
    <div
      className={classNames(
        "flex items-center justify-center gap-2 px-3 h-7 text-[12px] font-semibold tabular-nums whitespace-nowrap overflow-hidden border-b border-layer-3 bg-layer-0 text-primary",
        className,
      )}
      role="timer"
      aria-label={`Bitcoin Federated Time ${face.text}`}
      title={bftSourceLine(tip, face)}
      data-testid="bft-mini"
    >
      <span className="text-layer-4">BLOCK</span>
      <span>{tip.height !== undefined ? tip.height.toLocaleString("en-US") : "---,---"}</span>
      <span className="text-layer-3">|</span>
      <span>
        {face.date} {face.hms} <BftMarker />
      </span>
      {face.holding && <b className="text-zap">HOLDING</b>}
    </div>
  )
}
