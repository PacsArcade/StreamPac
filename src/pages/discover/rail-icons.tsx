/**
 * Discover's right rail: pixel icons in the house style (square pixels, no anti-aliasing).
 * Each icon is a 14 x 14 grid; "#" is the icon colour, "o" the accent (the plug, the plus), "." empty.
 * Drawn at 2 px per pixel (28 px), crisp edges. The label under each icon and the aria-label are set by the rail.
 */
type Grid = ReadonlyArray<string>

export const ZAP_GRID: Grid = [
  "........###...",
  ".......###....",
  "......###.....",
  ".....###......",
  "....###.......",
  "...#########..",
  "..#########...",
  "......###.....",
  ".....###......",
  "....###.......",
  "...###........",
  "...##.........",
  "..##..........",
  "..#...........",
]

export const CHAT_GRID: Grid = [
  "..............",
  ".############.",
  "##############",
  "##############",
  "##..##..##..##",
  "##..##..##..##",
  "##############",
  "##############",
  ".############.",
  "...###........",
  "...##.........",
  "...#..........",
  "..............",
  "..............",
]

/** three heads and shoulders, with a small plug at the bottom right */
export const SQUAD_GRID: Grid = [
  ".....####.....",
  "....######....",
  ".##.######.##.",
  "####.####.####",
  ".##........##.",
  "....######....",
  "##.########.##",
  "##.########.##",
  "##.########.##",
  "##.########.##",
  "..........o.o.",
  "..........o.o.",
  ".........ooooo",
  "..........ooo.",
]

/** a forwarding arrow: a curved shaft into an arrowhead pointing right */
export const SHARE_GRID: Grid = [
  "..............",
  "........#.....",
  "........##....",
  "........###...",
  "...#########..",
  "..###########.",
  ".###########..",
  ".###....###...",
  "##......##....",
  "##......#.....",
  "##............",
  "##............",
  ".#............",
  "..............",
]

/** repost: two arrows chasing round a loop (the Share sheet's "Repost to nostr") */
export const REPOST_GRID: Grid = [
  ".........#....",
  ".........##...",
  ".###########..",
  "##.......##...",
  "##.......#....",
  "##............",
  "##............",
  "............##",
  "............##",
  "....#.......##",
  "...##.......##",
  "..###########.",
  "...##.........",
  "....#.........",
]

/** the small "+" that sits on Squad while the stream is not on your squad yet */
export const PLUS_GRID: Grid = ["..#..", "..#..", "#####", "..#..", "..#.."]

export function PixelIcon({ grid, size = 28, title }: { grid: Grid; size?: number; title?: string }) {
  const w = grid[0].length
  const h = grid.length
  // one path per colour: a 1 x 1 square for every filled pixel
  let main = ""
  let accent = ""
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      const c = grid[y][x]
      if (c === "#") main += `M${x} ${y}h1v1h-1z`
      else if (c === "o") accent += `M${x} ${y}h1v1h-1z`
    }
  }
  const paths = (
    <>
      <path d={main} fill="currentColor" />
      {accent && <path d={accent} fill="var(--pixel-accent, currentColor)" />}
    </>
  )
  const box = { viewBox: `0 0 ${w} ${h}`, width: size, height: (size * h) / w, shapeRendering: "crispEdges" }
  if (title)
    return (
      <svg {...box} role="img" focusable="false">
        <title>{title}</title>
        {paths}
      </svg>
    )
  return (
    <svg {...box} aria-hidden="true" focusable="false">
      {paths}
    </svg>
  )
}
