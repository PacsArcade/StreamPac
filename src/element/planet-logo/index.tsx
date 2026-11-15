import { type CSSProperties, useEffect, useRef } from "react"
import { ASPECT, drawPlanet, FRAMES, frameAt, LOOP_MS } from "./draw"

const REDUCE = "(prefers-reduced-motion: reduce)"

function makeCanvas(w: number, h: number) {
  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext("2d", { willReadFrequently: true }) as CanvasRenderingContext2D
  return { canvas, ctx }
}

/**
 * The pac planet logo C (flipped, no buddy), drawn live on a canvas with a clear background.
 * It loops gently; with prefers-reduced-motion it shows the still (frame 0) and never animates.
 * `height` is in CSS px; the width follows the planet's shape.
 */
export default function PlanetLogo({
  height,
  className,
  style,
  still,
}: {
  height: number
  className?: string
  style?: CSSProperties
  /** always show the still */
  still?: boolean
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  const width = Math.round(height * ASPECT)

  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const dpr = Math.max(1, Math.round(window.devicePixelRatio || 1))
    cv.width = width * dpr
    cv.height = height * dpr
    const ctx = cv.getContext("2d")
    if (!ctx) return
    const paint = (frame: number) =>
      drawPlanet(ctx, { t: frame / FRAMES, width: cv.width, height: cv.height, dpr, makeCanvas })

    const mq = window.matchMedia?.(REDUCE)
    let raf = 0
    let last = -1
    const start = performance.now()
    const tick = (now: number) => {
      const f = frameAt(now - start, LOOP_MS, FRAMES)
      if (f !== last) {
        last = f
        paint(f)
      }
      raf = requestAnimationFrame(tick)
    }
    const run = () => {
      cancelAnimationFrame(raf)
      last = -1
      if (still || mq?.matches) paint(0)
      else raf = requestAnimationFrame(tick)
    }
    run()
    mq?.addEventListener?.("change", run)
    return () => {
      cancelAnimationFrame(raf)
      mq?.removeEventListener?.("change", run)
    }
  }, [height, width, still])

  return (
    <canvas
      ref={ref}
      data-testid="planet-logo"
      width={width}
      height={height}
      className={className}
      // C is the planet flipped: the pac faces left
      style={{ width, height, transform: "scaleX(-1)", imageRendering: "pixelated", ...style }}
    />
  )
}
