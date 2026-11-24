import type { ReactNode } from "react";

export const metadata = { title: "Golf Rounds", description: "Track your golf rounds from Claude." };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", maxWidth: 480, margin: "48px auto", padding: "0 16px" }}>
        {children}
      </body>
    </html>
  );
}
