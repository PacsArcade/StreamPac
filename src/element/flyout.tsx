import type { CSSProperties, ReactNode } from "react"
import { IconButton } from "./buttons"
import { createPortal } from "react-dom"
import classNames from "classnames"
import { useHydrated } from "@/hooks/hydrated"

export default function Flyout({
  show,
  children,
  onClose,
  side,
}: {
  show: boolean
  children: ReactNode
  onClose: () => void
  side: "left" | "right"
}) {
  const hydrated = useHydrated()
  const styles = {
    "--flyout-w": "200px",
    transition: "all 0.2s ease-in-out",
    // translate by the panel's OWN width (100%), not --flyout-w: the panel is wider than 200px once padded,
    // so a fixed 200px left its edge showing as a dark strip down the left of every phone page.
    transform: side === "right" ? `translate(${show ? "0" : "100%"},0)` : `translate(${show ? "0" : "-100%"},0)`,
    visibility: show ? "visible" : "hidden",
    transitionProperty: "transform, visibility",
  } as CSSProperties

  if (!hydrated) return null

  return createPortal(
    <div
      className={classNames("absolute z-20 top-0 overflow-hidden", {
        "pointer-events-none": !show,
        "right-0": side === "right",
        "left-0": side === "left",
      })}
    >
      <div className="bg-layer-2/90 h-[100dvh] px-3 py-4" style={styles}>
        <IconButton iconName="x" className="rounded-xl w-10 h-10 mb-6" iconSize={16} onClick={onClose} />
        {children}
      </div>
    </div>,
    document.body,
  ) as React.ReactNode
}
