import { APP_NAME } from "@/brand"
import { UpstreamCredit } from "@/element/upstream-credit"
import { Link } from "react-router"

/** The site footer, at the bottom of the page. Full-screen pages (Discover) leave it out; the credit is in settings too. */
export function SiteFooter() {
  return (
    <footer
      className="border-t border-layer-3 px-4 sm:px-6 py-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-layer-4"
      data-testid="site-footer"
    >
      <span className="font-semibold text-layer-5">{APP_NAME}</span>
      <nav className="flex gap-4" aria-label="Site">
        <Link className="hover:text-text" to="/faq">
          FAQ
        </Link>
        <Link className="hover:text-text" to="/tos">
          Terms
        </Link>
        <Link className="hover:text-text" to="/privacy">
          Privacy
        </Link>
        <Link className="hover:text-text" to="/settings">
          Settings
        </Link>
      </nav>
      <UpstreamCredit className="sm:ml-auto" />
    </footer>
  )
}
