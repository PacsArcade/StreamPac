import { expect, test } from "bun:test"
import { renderToString } from "react-dom/server"
import PlanetLogo from "."
import { ASPECT, drawPlanet, FRAMES, FULL, frameAt, LOOP_MS, recipeFor, ringDots, SMALL, smallDotPx } from "./draw"

// A 2D context that records what is drawn; getImageData hands back a solid body so beads get laid.
function fakeCtx(w = 0, h = 0) {
  const rects: { x: number; y: number; w: number; h: number; fill: string; alpha: number; blur: number }[] = []
  const ctx = {
    fillStyle: "",
    globalAlpha: 1,
    shadowBlur: 0,
    shadowColor: "",
    imageSmoothingEnabled: true,
    setTransform() {},
    clearRect() {},
    save() {},
    restore() {},
    translate() {},
    scale() {},
    drawImage() {},
    fillRect(x: number, y: number, rw: number, rh: number) {
      rects.push({ x, y, w: rw, h: rh, fill: String(ctx.fillStyle), alpha: ctx.globalAlpha, blur: ctx.shadowBlur })
    },
    getImageData(_x: number, _y: number, gw: number, gh: number) {
      return { data: new Uint8ClampedArray(gw * gh * 4).fill(200) }
    },
  }
  return { ctx: ctx as unknown as CanvasRenderingContext2D, rects, w, h }
}
const makeCanvas = (w: number, h: number) => ({ canvas: {} as CanvasImageSource, ctx: fakeCtx(w, h).ctx })
const dotsOf = (rects: ReturnType<typeof fakeCtx>["rects"]) => rects.filter(r => r.fill === "#ffe9a8")

test("header sizes (32 to 40 px) use the small recipe: fewer dots than the source", () => {
  for (const h of [32, 36, 40]) expect(recipeFor(h)).toBe(SMALL)
  expect(recipeFor(240)).toBe(FULL)
  expect(SMALL.dots).toBeLessThan(FULL.dots)
})

test("at 32 to 40 px every ring dot is a crisp square of at least 2 CSS px, with no glow", () => {
  for (const h of [32, 36, 40])
    for (const dpr of [1, 2, 3]) {
      const { ctx, rects } = fakeCtx()
      drawPlanet(ctx, { t: 0.3, width: Math.round(h * ASPECT) * dpr, height: h * dpr, dpr, makeCanvas })
      const dots = dotsOf(rects)
      expect(dots.length).toBe(SMALL.dots)
      for (const d of dots) {
        expect(d.w).toBeGreaterThanOrEqual(2 * dpr)
        expect(Number.isInteger(d.w) && Number.isInteger(d.x) && Number.isInteger(d.y)).toBe(true)
        expect(d.blur).toBe(0)
      }
      // the front of the ring is bigger than the back, so the tilt still reads
      const sizes = dots.map(d => d.w)
      expect(Math.max(...sizes)).toBeGreaterThan(Math.min(...sizes))
    }
})

test("the dot size steps from back to front and never drops under 2 px", () => {
  expect(smallDotPx(0.1, 1)).toBe(2)
  expect(smallDotPx(1, 1)).toBe(3)
  expect(smallDotPx(1, 2)).toBe(6)
})

test("the loop has no seam: t = 1 draws the same ring as t = 0", () => {
  for (const n of [SMALL.dots, FULL.dots]) {
    const key = (t: number) =>
      ringDots(t, n)
        .map(d => `${d.x.toFixed(3)},${d.y.toFixed(3)}`)
        .sort()
        .join(" ")
    expect(key(1)).toBe(key(0))
    expect(key(0.25)).not.toBe(key(0))
  }
})

test("frames: 48 per 6 s loop, wrapping", () => {
  expect(LOOP_MS).toBe(6000)
  expect(frameAt(0)).toBe(0)
  expect(frameAt(LOOP_MS - 1)).toBe(FRAMES - 1)
  expect(frameAt(LOOP_MS)).toBe(0)
  expect(frameAt(LOOP_MS / 2)).toBe(FRAMES / 2)
})

test("the background is clear unless asked for", () => {
  const a = fakeCtx()
  drawPlanet(a.ctx, { t: 0, width: 56, height: 36, dpr: 1, makeCanvas })
  expect(a.rects.some(r => r.fill === "#0A0907")).toBe(false)
  const b = fakeCtx()
  drawPlanet(b.ctx, { t: 0, width: 56, height: 36, dpr: 1, makeCanvas, background: "#0A0907" })
  expect(b.rects[0]).toMatchObject({ x: 0, y: 0, w: 56, h: 36, fill: "#0A0907" })
})

test("the logo renders a mirrored canvas (C is the flipped one), with no text of its own, sized to the planet", () => {
  const html = renderToString(<PlanetLogo height={36} />)
  expect(html).toContain("<canvas")
  expect(html).toContain("scaleX(-1)")
  expect(html).not.toMatch(/<canvas[^>]*>[^<]/) // no fallback text, so screen readers pass over it
  expect(html).toContain(`width="${Math.round(36 * ASPECT)}"`)
  expect(html).toContain('height="36"')
})
