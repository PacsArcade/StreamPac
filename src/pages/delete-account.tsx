// Draft for the Admiral's review, not legal advice.
import { APP_DOMAIN, CONTACT_EMAIL_PLACEHOLDER, HOSTED_SERVICE_NAME } from "@/brand"

export function DeleteAccountPage() {
  return (
    <div className="flex flex-col gap-6 grow w-full max-w-[72ch] mx-auto px-4 py-6">
      <h1>Deleting your data</h1>
      <h2>For {APP_DOMAIN}</h2>
      <p>
        Your account is a Nostr key pair that you hold. It is not a row in a database that we run, so there is no
        account for us to delete.
      </p>
      <h2>On this site</h2>
      <ul className="list-disc pl-6 flex flex-col gap-2">
        <li>Log out to remove your login, including a pasted private key, from this browser.</li>
        <li>Clear your browser's site data to remove the settings and the local event copy.</li>
        <li>A streamer can delete one of their own streams from its page. This sends a Nostr deletion request.</li>
      </ul>
      <h2>What we cannot do</h2>
      <p>
        Events you published went to public relays. A deletion request asks relays to drop an event, but relays and
        other apps may keep copies. We cannot force them to delete.
      </p>
      <h2>Streaming service</h2>
      <p>
        If you streamed through the {HOSTED_SERVICE_NAME} service, your stream account details are kept by that
        service. Ask it to remove them. For help finding who to ask: {CONTACT_EMAIL_PLACEHOLDER}
      </p>
    </div>
  )
}
