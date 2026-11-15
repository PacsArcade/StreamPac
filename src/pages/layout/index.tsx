import { APP_NAME } from "@/brand"
import "./layout.css"

import { type CSSProperties, useContext, useEffect, useState } from "react"
import { Outlet, useLocation } from "react-router"
import { Helmet } from "@dr.pogodin/react-helmet"

import { useLogin } from "@/hooks/login"
import { trackEvent } from "@/utils"
import { HeaderNav } from "./header"
import { LeftNav } from "./left-nav"
import { SiteFooter } from "./footer"
import { SnortContext, TraceTimelineOverlay } from "@snort/system-react"
import { EventKind } from "@snort/system"
import { USER_CARDS } from "@/const"
import { useMediaQuery } from "usehooks-ts"
import { BftMiniBanner } from "@/element/bft-clock"
import { useLayout } from "./context"

export function LayoutPage() {
  const location = useLocation()
  const login = useLogin()
  const system = useContext(SnortContext)
  const [trace, setTrace] = useState(false)
  const layout = useLayout()
  // below the desktop rail (which carries the full clock) the top switches to the mini time banner
  const isDesktop = useMediaQuery("(min-width: 1280px)", { initializeWithValue: false })

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const target = e.target
      const skipTarget = ["INPUT", "TEXTAREA", "SELECT"]
      if (skipTarget.includes((target as HTMLElement)?.nodeName) || (target as HTMLElement)?.isContentEditable) {
        return
      }
      if (e.ctrlKey || e.metaKey || e.altKey) {
        return
      }
      if (e.key === "t") {
        setTrace(t => !t)
      }
    }
    window.addEventListener("keydown", h)
    return () => {
      window.removeEventListener("keydown", h)
    }
  }, [])

  useEffect(() => {
    if (login?.state) {
      login.state.checkIsStandardList(EventKind.EmojisList)
      login.state.checkIsStandardList(USER_CARDS)
      login.state.init(login.signer(), system)
      if (login.pubkey) {
        system.config.socialGraphInstance.setRoot(login.pubkey)
      }
    }
  }, [login])

  useEffect(() => {
    trackEvent("pageview")
  }, [location])

  const styles = {} as CSSProperties
  if (login?.color) {
    ;(styles as Record<string, string>)["--primary"] = login.color
    ;(styles as Record<string, string>)["--color-primary"] = login.color
  }
  return (
    <div style={styles}>
      <Helmet>
        <title>{`Home - ${APP_NAME}`}</title>
      </Helmet>

      <HeaderNav />
      {!isDesktop && layout.showHeader && <BftMiniBanner className="sticky top-[var(--header-height)] z-10" />}
      <div className="flex flex-1 overflow-x-clip">
        <LeftNav />
        <main className="flex-1 min-w-0">
          <Outlet />
          {/* Discover fills the screen and does not scroll, so it has no footer */}
          {!location.pathname.startsWith("/discover") && <SiteFooter />}
        </main>
      </div>
      <TraceTimelineOverlay isOpen={trace} onClose={() => setTrace(false)} />
    </div>
  )
}
