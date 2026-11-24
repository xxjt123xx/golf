"use client";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function ConsentButtons() {
  const [busy, setBusy] = useState(false);
  const decide = async (accept: boolean) => {
    setBusy(true);
    // The client plugin attaches oauth_query and follows the redirect back to Claude.
    await authClient.oauth2.consent({ accept });
  };
  return (
    <p style={{ display: "flex", gap: 8 }}>
      <button disabled={busy} onClick={() => decide(true)} className="btn">
        Allow
      </button>
      <button disabled={busy} onClick={() => decide(false)} className="btn secondary">
        Deny
      </button>
    </p>
  );
}
