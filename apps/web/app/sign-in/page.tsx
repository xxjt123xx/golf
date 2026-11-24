import Link from "next/link";
import { GoogleButton } from "./google-button";

// Better Auth also redirects here when Claude starts sign-in.
export default function SignIn() {
  return (
    <main className="wrap narrow">
      <h1>Sign in</h1>
      <p className="muted">Use the Google account you signed up with.</p>
      <GoogleButton label="Continue with Google" />
      <p className="muted">New here? <Link href="/sign-up">Create an account</Link></p>
    </main>
  );
}
