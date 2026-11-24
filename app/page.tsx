import { mcpResource } from "@/lib/auth";

export default function Home() {
  return (
    <main>
      <h1>Golf Rounds</h1>
      <p>Track rounds, scores and stats by chatting with Claude.</p>
      <p>
        In Claude, go to Settings, then Connectors, then Add custom connector, and paste:
      </p>
      <pre>{mcpResource}</pre>
    </main>
  );
}
