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
      <button disabled={busy} onClick={() => decide(true)} style={{ fontSize: 16, padding: "8px 16px" }}>
        Allow
      </button>
      <button disabled={busy} onClick={() => decide(false)} style={{ fontSize: 16, padding: "8px 16px" }}>
        Deny
      </button>
    </p>
  );
}
