import { mcpResource } from "@/lib/config";

export default function Home() {
  return (
    <main>
      <h1>Fairway Log MCP server</h1>
      <p>Add this URL as a custom connector in Claude:</p>
      <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{mcpResource}</pre>
    </main>
  );
}
