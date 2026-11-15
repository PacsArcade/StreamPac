/**
 * What a watcher can really clip from a live HLS stream in the browser.
 * The player does not keep a recording. A live playlist lists only its last few segments (often 6 to 60 s);
 * those segments are still on the stream's server, so the page can fetch them again and join them into a file.
 * That window is the most a watcher can clip here. We ask for 30 s and say how much the playlist really holds.
 */
export const CLIP_WANT_SECONDS = 30

export interface ClipFragment {
  url: string
  duration: number
}

export interface ClipPlan {
  fragments: Array<ClipFragment>
  /** seconds the chosen fragments cover */
  seconds: number
  /** seconds the whole playlist holds right now */
  window: number
}

/** Take segments from the live edge backwards until `want` seconds are covered, or the playlist runs out. */
export function planClip(fragments: Array<ClipFragment>, want = CLIP_WANT_SECONDS): ClipPlan | undefined {
  const usable = fragments.filter(f => f.url && Number.isFinite(f.duration) && f.duration > 0)
  if (usable.length === 0) return
  const window = usable.reduce((s, f) => s + f.duration, 0)
  const picked: Array<ClipFragment> = []
  let seconds = 0
  for (let i = usable.length - 1; i >= 0 && seconds < want; i--) {
    picked.unshift(usable[i])
    seconds += usable[i].duration
  }
  return { fragments: picked, seconds, window }
}

/** The label the button wears: the real number, rounded down, never the 30 we wished for. */
export function clipLabel(plan: ClipPlan | undefined): string {
  if (!plan) return "Clip"
  return `Clip the last ${Math.floor(plan.seconds)} s`
}

interface HlsLike {
  currentLevel?: number
  levels?: Array<{
    details?: {
      live?: boolean
      fragments?: Array<{ url?: string; duration?: number; initSegment?: { url?: string } | null }>
    }
  }>
  latestLevelDetails?: {
    live?: boolean
    fragments?: Array<{ url?: string; duration?: number; initSegment?: { url?: string } | null }>
  } | null
}

/** Read the live window from an hls.js instance (hls-video-element exposes it as `.api`). */
export function readHlsWindow(
  api: HlsLike | null | undefined,
): { fragments: Array<ClipFragment>; init?: string } | undefined {
  if (!api) return
  const lvl =
    api.levels?.[api.currentLevel ?? -1]?.details ??
    api.latestLevelDetails ??
    api.levels?.find(l => l.details?.fragments?.length)?.details ??
    undefined
  const frags = lvl?.fragments
  if (!frags || frags.length === 0) return
  return {
    fragments: frags.map(f => ({ url: f.url ?? "", duration: Number(f.duration) })),
    init: frags.find(f => f.initSegment?.url)?.initSegment?.url ?? undefined,
  }
}
