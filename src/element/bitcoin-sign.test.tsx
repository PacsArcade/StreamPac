import { expect, test } from "bun:test"
import { renderToString } from "react-dom/server"
import { BTC_SIGN_PATH, BftMarker, BitcoinSign } from "./bitcoin-sign"

// Board b1 rule: the real Bitcoin sign, drawn as a path with both strokes top and bottom. Never a letter B, never a font glyph.
const GLYPH = /₿|\\u20bf|&#x20bf;|&#8383;/i
const visible = (html: string) => html.replace(/aria-label="[^"]*"/g, "")

test("the sign is one path: the B, its two holes, two strokes above and two below", () => {
  expect(BTC_SIGN_PATH.match(/M/g)?.length).toBe(7)
  expect(BTC_SIGN_PATH).toContain("-9.6")
  expect(BTC_SIGN_PATH).toContain("V9.6")
})

test("the drawn sign and the a₿ marker put no glyph and no letter B on screen", () => {
  for (const html of [renderToString(<BitcoinSign />), renderToString(<BftMarker />)]) {
    expect(html).toContain(BTC_SIGN_PATH)
    expect(visible(html)).not.toMatch(GLYPH)
    expect(visible(html)).not.toMatch(/>\s*B\s*</)
    expect(html).not.toMatch(/<text\b/)
  }
  // screen readers still hear the real marker
  expect(renderToString(<BftMarker />)).toContain('aria-label="a₿"')
})
