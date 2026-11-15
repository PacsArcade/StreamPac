import classNames from "classnames"
import type { ReactNode } from "react"

/** The one LIVE tag: the ember orange hit (dot with glow) and the word in ember. Used on every LIVE in the Room. */
export function LiveTag({ className, children }: { className?: string; children?: ReactNode }) {
  return (
    <span
      className={classNames(
        "inline-flex items-center gap-1.5 rounded-md bg-layer-0/80 px-2 py-0.5 text-[12px] font-bold uppercase tracking-wide text-live backdrop-blur-sm",
        className,
      )}
      data-testid="live-tag"
    >
      <span className="pa-live-dot" />
      LIVE
      {children}
    </span>
  )
}
