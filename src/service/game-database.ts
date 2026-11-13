import { GameDatabase as _GameDatabase } from "@zap.stream/api"
import type { GameCover, GameGenre } from "@zap.stream/api"
import type { ReactNode } from "react"

/**
 * App-extended GameInfo with UI-specific fields.
 * The base `GameInfo` from `@zap.stream/api` is framework-agnostic (name is string).
 * This extension allows ReactNode for name (e.g. FormattedMessage) and adds className.
 */
export interface GameInfo {
  id: string
  /** Allow ReactNode for name (e.g. FormattedMessage) */
  name: string | ReactNode
  cover?: GameCover
  genres?: Array<GameGenre>
  summary?: string
  /** CSS class name for game icon styling */
  className?: string
}

import { STREAM_API_URL } from "@/brand"

/** Same class, defaulting to our configured backend (src/brand.ts). */
export class GameDatabase extends _GameDatabase {
  constructor(url: string = STREAM_API_URL) {
    super(url)
  }
}
export type { GameCover, GameGenre } from "@zap.stream/api"

/** @deprecated Use named import `{ GameDatabase }` instead */
export default GameDatabase
