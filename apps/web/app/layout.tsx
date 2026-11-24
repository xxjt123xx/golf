import type { ReactNode } from "react";
import Link from "next/link";
import "./globals.css";

export const metadata = {
  title: "Fairway Log",
  description: "Track golf rounds, equipment, handicap and practice by chatting with Claude.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site">
          <div className="wrap">
            <Link href="/" className="logo">⛳ Fairway Log</Link>
            <nav>
              <Link href="/dashboard">Dashboard</Link>
              <Link href="/sign-up" className="btn">Sign up</Link>
            </nav>
          </div>
        </header>
        {children}
        <footer><div className="wrap">Fairway Log · Track your golf with Claude</div></footer>
      </body>
    </html>
  );
}
