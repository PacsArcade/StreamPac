import { UPSTREAM_NAME, UPSTREAM_URL } from "@/brand"

/** The MIT credit to upstream. It lives in the site footer and on the settings page; keep it (the licence needs it). */
export function UpstreamCredit({ className }: { className?: string }) {
  return (
    <p className={className} data-testid="upstream-credit">
      Built on{" "}
      <a className="underline" href={UPSTREAM_URL} target="_blank" rel="noreferrer">
        {UPSTREAM_NAME}
      </a>{" "}
      by v0l (MIT).
    </p>
  )
}
