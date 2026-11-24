"use client";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function GoogleButton({ label }: { label: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      className="btn"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        // When Claude started this sign-in, the URL carries a signed oauth_query and Better Auth
        // resumes that flow after Google. Otherwise, land on the dashboard.
        const inOAuthFlow = new URLSearchParams(window.location.search).has("sig");
        await authClient.signIn.social({ provider: "google", ...(inOAuthFlow ? {} : { callbackURL: "/dashboard" }) });
      }}
    >
      {label}
    </button>
  );
}
