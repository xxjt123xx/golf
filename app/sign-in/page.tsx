"use client";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

// Better Auth redirects here (with a signed oauth_query) when Claude starts sign-in.
// After Google, Better Auth resumes the OAuth flow and sends the user on to /consent.
export default function SignIn() {
  const [busy, setBusy] = useState(false);
  return (
    <main>
      <h1>Sign in to Golf Rounds</h1>
      <button
        disabled={busy}
        style={{ fontSize: 16, padding: "8px 16px" }}
        onClick={async () => {
          setBusy(true);
          await authClient.signIn.social({ provider: "google" });
        }}
      >
        Continue with Google
      </button>
    </main>
  );
}
