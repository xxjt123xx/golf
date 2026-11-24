import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { ConsentButtons } from "./consent-buttons";

// Client names are self-asserted by the app that registered, so show where tokens go too.
export default async function Consent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { client_id, scope } = await searchParams;
  const client = client_id
    ? await auth.api
        .getOAuthClientPublic({ query: { client_id }, headers: await headers() })
        .catch(() => null)
    : null;
  if (!client) return <p>This sign-in link has expired. Please start again from Claude.</p>;

  const redirectHosts = (client.redirect_uris ?? []).map((u: string) => new URL(u).host).join(", ");
  return (
    <main>
      <h1>Allow {client.client_name ?? "this app"} to access your golf rounds?</h1>
      <p>Access will be sent to: <strong>{redirectHosts || "unknown"}</strong></p>
      {scope && <p>Permissions: {scope.split(" ").join(", ")}</p>}
      <ConsentButtons />
    </main>
  );
}
