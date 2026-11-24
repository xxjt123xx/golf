import Link from "next/link";
import { GoogleButton } from "../sign-in/google-button";

export default function SignUp() {
  return (
    <main className="wrap narrow">
      <h1>Create your account</h1>
      <p className="muted">One click with Google. Then connect Fairway Log to Claude and start logging rounds.</p>
      <GoogleButton label="Sign up with Google" />
      <p className="muted">Already have an account? <Link href="/sign-in">Sign in</Link></p>
    </main>
  );
}
