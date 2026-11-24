"use client";
import { authClient } from "@/lib/auth-client";

export function SignOut() {
  return (
    <button className="btn secondary" onClick={async () => { await authClient.signOut(); window.location.href = "/"; }}>
      Sign out
    </button>
  );
}
