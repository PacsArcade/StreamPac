// Draft for the Admiral's review, not legal advice.
import {
  APP_DOMAIN,
  CONTACT_EMAIL_PLACEHOLDER,
  HOSTED_SERVICE_NAME,
  HOSTED_SERVICE_PRIVACY_URL,
  HOSTED_SERVICE_TOS_URL,
} from "@/brand"

export function PrivacyPage() {
  return (
    <div className="flex flex-col gap-6 grow w-full max-w-[72ch] mx-auto px-4 py-6">
      <h1>Privacy Policy</h1>
      <h2>For {APP_DOMAIN}</h2>
      <p>
        This site shows live streams and chat that people publish on Nostr, an open protocol. This page says what the
        site keeps and what it does not.
      </p>
      <ul className="list-disc pl-6 flex flex-col gap-3">
        <li>
          <b>No tracking:</b> We run no analytics, no advertising and no tracking scripts on this site. We do not sell
          your data.
        </li>
        <li>
          <b>Your login:</b> You can log in with a Nostr browser extension or by pasting a private key (nsec). With an
          extension, the key stays in the extension. If you paste a key, this site saves it in your browser's local
          storage on your own device so you stay logged in. It is not sent to us. Logging out removes it.
        </li>
        <li>
          <b>What the site stores in your browser:</b> your login session (public key, login type, your lists and the
          wallet connection if you added one), your language, the streaming provider you picked, whether you accepted
          the content warning, player settings, a short memory of video links that did not load, a draft upload, sign-in tokens for chat services you connect, and a
          local copy of Nostr events so pages load faster. It all stays on your device. Clearing your browser data
          removes it.
        </li>
        <li>
          <b>What you publish:</b> Streams, chat messages, reactions, zaps, profile and follows are Nostr events signed
          by your key and sent to public relays. They are public by design. Relays and other apps can keep copies, and
          we do not control them, so we cannot delete what they keep.
        </li>
        <li>
          <b>Video hosting:</b> For now, live video goes through the streaming service run by {HOSTED_SERVICE_NAME}. If
          you stream through it, it stores what it needs to run your stream (for example your public key, stream key,
          title and payment records), under its own{" "}
          <a
            className="text-primary underline"
            href={HOSTED_SERVICE_PRIVACY_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            privacy policy
          </a>{" "}
          and{" "}
          <a className="text-primary underline" href={HOSTED_SERVICE_TOS_URL} target="_blank" rel="noopener noreferrer">
            terms
          </a>
          . Go live alerts you turn on are also registered with that service.
        </li>
        <li>
          <b>Payments:</b> Zaps are Lightning payments sent from your wallet to the streamer's wallet. We do not hold
          funds and do not see your wallet. A wallet connection string that you add is saved in your browser only.
        </li>
        <li>
          <b>Other servers you reach:</b> Your browser connects to Nostr relays, the streaming service, and image and
          video hosts. Like any web server, they see your IP address. Some small helpers still point at third party
          hosts, for example a fallback avatar picture service and a proxy for YouTube chat.
        </li>
        <li>
          <b>Children:</b> This site is not directed at children under 13.
        </li>
        <li>
          <b>Deleting your data:</b> See <a className="text-primary underline" href="/delete-account">how deletion works</a>.
        </li>
        <li>
          <b>Changes:</b> We may update this policy.
        </li>
      </ul>
      <p>Questions about privacy: {CONTACT_EMAIL_PLACEHOLDER}</p>
    </div>
  )
}
