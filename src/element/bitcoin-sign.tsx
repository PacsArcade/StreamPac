import classNames from "classnames"

/**
 * The Bitcoin sign, drawn once as a path (from VendFrens PR #9, hexart.ts BTC_SIGN_PATH, our own code).
 * A bold B (stem, two bowls) with two strokes above and two below. Centred on 0,0, 19.2 units tall.
 * Filled nonzero: the outline runs clockwise, the two holes the other way, the four strokes overlap the B.
 * Never a font glyph (a phone without the font draws its own sign or none) and never a plain letter B.
 */
export const BTC_SIGN_PATH =
  "M-5 -7H1.5C4.2 -7 5.2 -5.6 5.2 -3.7C5.2 -2.2 4.4 -1.2 3.2 -0.6C4.8 -0.1 5.8 1.1 5.8 3C5.8 5.5 4.3 7 1.6 7H-5Z" +
  "M-1.8 -4.4V-1.8H1C1.9 -1.8 2.3 -2.3 2.3 -3.1C2.3 -3.9 1.9 -4.4 1 -4.4Z" +
  "M-1.8 0.8V4.4H1.3C2.4 4.4 2.9 3.5 2.9 2.6C2.9 1.5 2.4 0.8 1.3 0.8Z" +
  "M-3.4 -9.6H-1.8V-6.5H-3.4ZM0.2 -9.6H1.8V-6.5H0.2Z" +
  "M-3.4 6.5H-1.8V9.6H-3.4ZM0.2 6.5H1.8V9.6H0.2Z"

/** The sign at text size. `lean` 14 is the coin/logo lean; the a₿ marker stands upright. */
export function BitcoinSign({
  size = "1em",
  lean = 0,
  className,
}: {
  size?: string | number
  lean?: number
  className?: string
}) {
  return (
    <svg
      viewBox="-6.5 -10.4 13 20.8"
      width={typeof size === "number" ? size * 0.625 : `calc(${size} * 0.625)`}
      height={size}
      className={classNames("inline-block shrink-0 align-[-0.17em]", className)}
      aria-hidden="true"
      focusable="false"
    >
      <path d={BTC_SIGN_PATH} fill="currentColor" transform={lean ? `rotate(${lean})` : undefined} />
    </svg>
  )
}

/**
 * The BFT marker `a₿`: always after the date and time, never uppercased, never wrapped.
 * Screen readers get the real text from aria-label; nothing on screen is a glyph.
 */
export function BftMarker({ className }: { className?: string }) {
  return (
    <span role="img" aria-label="a₿" className={classNames("inline whitespace-nowrap normal-case", className)}>
      <span aria-hidden="true">a</span>
      <BitcoinSign size="1.05em" className="ml-[0.04em]" />
    </span>
  )
}
