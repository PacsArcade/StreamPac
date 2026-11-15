import classNames from "classnames"
import { useId } from "react"
import { PICK_MAX_SATS, boostEffect, boostEffectWords, parsePickedSats } from "./boost"

/**
 * "Pick your sats": an open box where the watcher types their own amount. Used on the chat's lightning tab and on
 * "Boost or zap the stream". Under the box it says what that amount gets when it carries a message.
 */
export function PickYourSats({
  value,
  onChange,
  selected,
  onFocus,
  showEffect = true,
  className,
}: {
  value: string
  onChange: (text: string) => void
  selected?: boolean
  onFocus?: () => void
  showEffect?: boolean
  className?: string
}) {
  const id = useId()
  const sats = parsePickedSats(value)
  const bad = value.trim().length > 0 && sats === undefined
  return (
    <div
      className={classNames(
        "flex flex-col gap-1 rounded-lg border px-3 py-2",
        selected ? "border-zap bg-zap/10" : "border-layer-3",
        className,
      )}
      data-testid="pick-sats"
    >
      <label htmlFor={id} className="flex items-center justify-between gap-3">
        <span className="flex flex-col">
          <span className="text-sm font-bold">Pick your sats</span>
          <span className="text-[12px] text-layer-4">Type your own amount.</span>
        </span>
        <span className="flex items-center gap-1.5 shrink-0">
          <input
            id={id}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="e.g. 500"
            value={value}
            onFocus={onFocus}
            onChange={e => onChange(e.target.value)}
            aria-invalid={bad || undefined}
            aria-describedby={`${id}-what`}
            className="!w-[96px] !py-1.5 !px-2 text-right tabular-nums text-[14px] font-semibold rounded-md bg-layer-2 border border-layer-3"
            data-testid="pick-sats-input"
          />
          <span className="text-[13px] font-semibold text-zap">sats</span>
        </span>
      </label>
      <span
        id={`${id}-what`}
        className={classNames("text-[12px]", bad ? "text-warning" : "text-layer-5")}
        data-testid="pick-sats-effect"
      >
        {bad
          ? `Whole sats from 1 to ${PICK_MAX_SATS.toLocaleString("en-US")}.`
          : sats !== undefined
            ? showEffect
              ? `${sats.toLocaleString("en-US")} sats. ${boostEffectWords(boostEffect(sats))}`
              : `${sats.toLocaleString("en-US")} sats.`
            : showEffect
              ? "Under 210 it is a plain zap with your message; 210, 2,100 and 21,000 reach Bold, Pin and Glow."
              : ""}
      </span>
    </div>
  )
}
