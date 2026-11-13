// Draft for the Admiral's review, not legal advice.
import { APP_DOMAIN, APP_NAME, CONTACT_EMAIL_PLACEHOLDER, HOSTED_SERVICE_NAME, HOSTED_SERVICE_TOS_URL } from "@/brand"

export function TosPage() {
  return (
    <div className="flex flex-col gap-6 grow w-full max-w-[72ch] mx-auto px-4 py-6">
      <h1>Terms of Service</h1>
      <h2>For {APP_DOMAIN}</h2>
      <p>
        {APP_NAME} ({APP_DOMAIN}) is a website run by Pac's Arcade. It is a frontend: it shows live streams and videos
        that people publish on Nostr, an open protocol, and lets you watch, chat and send zaps. By using the site you
        agree to these terms.
      </p>
      <ul className="list-disc pl-6 flex flex-col gap-3">
        <li>
          <b>Your keys are yours:</b> Your account is a Nostr key pair. You are responsible for keeping your private
          key safe. We cannot reset it or recover it for you.
        </li>
        <li>
          <b>What you publish is public:</b> A stream is a Nostr event signed by your own key and sent to public relays.
          Chat, zaps and reactions work the same way. Relays and other apps may keep copies, so we cannot delete what
          they keep.
        </li>
        <li>
          <b>Your conduct:</b> Do not break the law, infringe other people's rights or use the site for fraud or harm.
          Do not stream or upload content you have no right to share.
        </li>
        <li>
          <b>Video hosting:</b> For now, live video goes through the streaming service run by {HOSTED_SERVICE_NAME}, not
          by us. If you stream through it, the{" "}
          <a className="text-primary underline" href={HOSTED_SERVICE_TOS_URL} target="_blank" rel="noopener noreferrer">
            {HOSTED_SERVICE_NAME} terms
          </a>{" "}
          also apply to you, and they may differ from these.
        </li>
        <li>
          <b>Payments:</b> Zaps are Lightning payments sent from your wallet to the streamer's wallet. We do not hold,
          process or return funds, and a sent payment cannot be taken back by us.
        </li>
        <li>
          <b>What we can do:</b> We may stop showing streams on this site if they break these terms. We cannot remove
          events from relays we do not run.
        </li>
        <li>
          <b>No warranty:</b> The site is provided "as is", without promises that it will be available or error free.
        </li>
        <li>
          <b>Limit of liability:</b> To the extent the law allows, we are not liable for damages from your use of the
          site, the relays, the streaming service or the Lightning network.
        </li>
        <li>
          <b>Changes:</b> We may change these terms. Using the site after a change means you accept it.
        </li>
        <li>
          <b>Open source credit:</b> This site is built on the open source zap.stream frontend (MIT license).
        </li>
      </ul>
      <p>Questions: {CONTACT_EMAIL_PLACEHOLDER}</p>
    </div>
  )
}
