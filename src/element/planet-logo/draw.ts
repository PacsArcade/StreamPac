/**
 * The pac planet logo, C: the tricolor pac with its tilted pellet ring ("the galaxy dots"), no buddy.
 * Ported from Lumen's pacplanet-r5.html (block 976,001). The mirror (C is the flipped one) is done by the caller.
 *
 * Two recipes:
 * - "full": the source as drawn, 24 ring dots with a cyan glow, the body pixelated to 7-unit beads. For big sizes and the app icon.
 * - "small": for 32 to 64 px. The full ring's dots come out under 1.5 px there and blur into a haze, so this one has
 *   16 dots of 2 to 3 px, snapped to whole device pixels and drawn without glow, and the body is quantised to beads
 *   of about 2 px so it still reads as pixels.
 */

/** The pac, 13 x 14 cells, mouth to the right (the flip turns it left). */
export const PAC_GRID = [
  "....######...",
  "..##########.",
  ".############",
  ".############",
  "###########..",
  "########.....",
  "#####........",
  "#####........",
  "########.....",
  "###########..",
  ".############",
  ".############",
  "..##########.",
  "....######...",
]

/** Three see-through pacs (ELEVATED recipe: amber .62, magenta .90, cyan .62) circling 120 degrees apart. */
export const LAYERS = [
  { c: "#FFC81E", a: 0.62, ph: 0 },
  { c: "#FF2E8A", a: 0.9, ph: (2 * Math.PI) / 3 },
  { c: "#1EC8E6", a: 0.62, ph: (4 * Math.PI) / 3 },
] as const

/** The source canvas is 480 units square with the planet centred at (232, 250). */
export const UNITS = 480
const CX = 232
const CY = 250
const CELL = 16
const RING = { rx: 212, ry: 58, tilt: -0.3 }

/** The part of the 480 square the planet and ring use (the rest is empty dark), so a 36 px tall logo is all planet. */
export const CROP = { x: 14, y: 110, w: 436, h: 280 } as const
export const ASPECT = CROP.w / CROP.h

/** One loop. Gentle: the source's 4 s, slowed to 6 s. */
export const LOOP_MS = 6000
/** Frames per loop, as in Lumen's captures; the canvas redraws only when the frame changes. */
export const FRAMES = 48

/** Below this height (CSS px) the small recipe is used. */
export const SMALL_MAX = 72

export type Recipe = {
  name: "full" | "small"
  /** dots on the ring */
  dots: number
  /** dot side in CSS px at the back and front of the ring (small), or in 480 units (full) */
  back: number
  front: number
  /** glow blur in 480 units, 0 = none */
  glow: number
  /** bead side: 480 units (full) or CSS px (small) */
  bead: number
}

export const FULL: Recipe = { name: "full", dots: 24, back: 6, front: 11, glow: 8, bead: 7 }
export const SMALL: Recipe = { name: "small", dots: 16, back: 2, front: 3, glow: 0, bead: 2 }

export function recipeFor(cssHeight: number): Recipe {
  return cssHeight <= SMALL_MAX ? SMALL : FULL
}

/** Which of the FRAMES frames a clock time falls on. */
export function frameAt(ms: number, loopMs = LOOP_MS, frames = FRAMES) {
  const f = Math.floor(((((ms % loopMs) + loopMs) % loopMs) / loopMs) * frames)
  return Math.min(frames - 1, f)
}

export type Dot = { x: number; y: number; front: boolean; depth: number }

/**
 * The ring dots at loop time t (0..1), in 480 units. Each loop moves the ring on by two dot spaces,
 * so t = 1 lands on the same picture as t = 0 and the loop has no seam.
 */
export function ringDots(t: number, n: number): Dot[] {
  const out: Dot[] = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + (t * Math.PI * 2) / (n / 2)
    const x = Math.cos(a) * RING.rx
    const y = Math.sin(a) * RING.ry
    out.push({
      x: CX + x * Math.cos(RING.tilt) - y * Math.sin(RING.tilt),
      y: CY + x * Math.sin(RING.tilt) + y * Math.cos(RING.tilt),
      front: Math.sin(a) > 0,
      depth: 0.55 + 0.45 * Math.sin(a),
    })
  }
  return out
}

/** Dot side in device px for the small recipe: whole pixels, never under 2 CSS px. */
export function smallDotPx(depth: number, dpr: number, r: Recipe = SMALL) {
  const css = r.back + (r.front - r.back) * Math.max(0, Math.min(1, (depth - 0.1) / 0.9))
  return Math.max(Math.round(r.back * dpr), Math.round(css * dpr))
}

type Ctx2D = CanvasRenderingContext2D
type MakeCanvas = (w: number, h: number) => { canvas: CanvasImageSource; ctx: Ctx2D }

function pac(ctx: Ctx2D, x: number, y: number, s: number, col: string, a: number) {
  ctx.globalAlpha = a
  ctx.fillStyle = col
  const w = 13 * CELL * s
  const h = 14 * CELL * s
  for (let r = 0; r < 14; r++)
    for (let q = 0; q < 13; q++)
      if (PAC_GRID[r][q] === "#")
        ctx.fillRect(x - w / 2 + q * CELL * s, y - h / 2 + r * CELL * s, CELL * s + 0.6, CELL * s + 0.6)
  ctx.globalAlpha = 1
}

/** The three pacs, white paper first then the colours, in 480 units (the caller sets the transform). */
function body(ctx: Ctx2D, t: number) {
  const yaw = Math.sin(t * Math.PI * 2) * 0.12
  const layers = LAYERS.map(L => {
    const a = t * Math.PI * 2 + L.ph
    return { ...L, dx: Math.cos(a) * 20, dy: Math.sin(a) * 13, z: Math.sin(a) }
  })
  for (const pass of [0, 1])
    for (const L of layers) {
      const s = 1 + L.z * 0.045
      ctx.save()
      ctx.translate(CX, CY)
      ctx.scale(Math.cos(yaw), 1)
      ctx.translate(-CX, -CY)
      if (pass === 0) pac(ctx, CX + L.dx, CY + L.dy, s, "#ffffff", 1)
      else pac(ctx, CX + L.dx, CY + L.dy, s, L.c, L.a)
      ctx.restore()
    }
}

export type DrawOpts = {
  /** loop time 0..1 */
  t: number
  /** device px of the target canvas */
  width: number
  height: number
  /** device px per CSS px */
  dpr: number
  /** fill colour behind the planet; omitted = transparent */
  background?: string
  recipe?: Recipe
  /** make offscreen canvases (DOM or OffscreenCanvas) */
  makeCanvas: MakeCanvas
}

/**
 * Draw one frame of the planet into ctx, CROP fitted to width x height (letterboxed, centred).
 * Not mirrored: C is this drawing flipped with scaleX(-1), which the caller does.
 */
export function drawPlanet(ctx: Ctx2D, o: DrawOpts) {
  const r = o.recipe ?? recipeFor(o.height / o.dpr)
  const k = Math.min(o.width / CROP.w, o.height / CROP.h) // device px per unit
  const ox = (o.width - CROP.w * k) / 2 - CROP.x * k
  const oy = (o.height - CROP.h * k) / 2 - CROP.y * k
  const toX = (u: number) => ox + u * k
  const toY = (u: number) => oy + u * k

  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, o.width, o.height)
  if (o.background) {
    ctx.fillStyle = o.background
    ctx.fillRect(0, 0, o.width, o.height)
  }

  const dots = ringDots(o.t, r.dots)
  const ring = (front: boolean) => {
    for (const d of dots) {
      if (d.front !== front) continue
      let s: number
      if (r.name === "small") s = smallDotPx(d.depth, o.dpr, r)
      else s = Math.round(r.back + (r.front - r.back) * d.depth) * k
      ctx.globalAlpha = r.name === "small" ? 0.62 + 0.38 * d.depth : 0.5 + 0.5 * d.depth
      ctx.fillStyle = "#ffe9a8"
      if (r.glow) {
        ctx.shadowColor = "#00ffff"
        ctx.shadowBlur = r.glow * d.depth * k
      }
      ctx.fillRect(Math.round(toX(d.x) - s / 2), Math.round(toY(d.y) - s / 2), s, s)
    }
    ctx.globalAlpha = 1
    ctx.shadowBlur = 0
  }

  ring(false)

  // body: draw at full size offscreen, shrink to one pixel per bead, then lay the beads down
  const beadPx = r.name === "small" ? Math.max(1, Math.round(r.bead * o.dpr)) : r.bead * k
  const bw = Math.ceil(o.width / beadPx)
  const bh = Math.ceil(o.height / beadPx)
  const big = o.makeCanvas(o.width, o.height)
  big.ctx.setTransform(k, 0, 0, k, ox, oy)
  body(big.ctx, o.t)
  const tiny = o.makeCanvas(bw, bh)
  tiny.ctx.imageSmoothingEnabled = true
  tiny.ctx.drawImage(big.canvas, 0, 0, bw, bh)
  const px = tiny.ctx.getImageData(0, 0, bw, bh).data
  const gap = r.name === "full" ? Math.max(0, k) : 0 // the source leaves one unit between beads; small beads touch
  for (let j = 0; j < bh; j++)
    for (let i = 0; i < bw; i++) {
      const q = (j * bw + i) * 4
      if (px[q + 3] < 60) continue
      ctx.fillStyle = `rgba(${px[q]},${px[q + 1]},${px[q + 2]},${Math.min(1, px[q + 3] / 255 + 0.15)})`
      ctx.fillRect(i * beadPx, j * beadPx, beadPx - gap, beadPx - gap)
      if (r.name === "full") {
        ctx.fillStyle = "rgba(255,255,255,.16)"
        ctx.fillRect(i * beadPx + k, j * beadPx + k, 2 * k, 2 * k)
      }
    }

  ring(true)
}
