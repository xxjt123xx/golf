import Link from "next/link";
import { mcpResource } from "@/lib/auth";

const features = [
  { title: "Rounds & scores", body: "Start a round at any course, then log scores hole by hole: putts, fairways, greens and penalties." },
  { title: "Shot tracking", body: "Record individual shots with the club you hit, distance and result." },
  { title: "Equipment", body: "Keep your whole bag, see which clubs you used each round, and how far each one really goes." },
  { title: "Handicap", body: "A World Handicap System estimate from your own rounds, alongside your official index." },
  { title: "Practice", body: "Log practice sessions with duration and notes, and see how practice lines up with scoring." },
  { title: "Stats", body: "Scoring average, putts per round, fairways and greens in regulation, scoring by par." },
];

export default function Home() {
  return (
    <main className="wrap">
      <div className="hero">
        <h1>Your golf game, tracked by talking to Claude.</h1>
        <p>
          Fairway Log is a Claude connector for golfers. Tell Claude about your round, your new driver or
          last night&apos;s putting practice, and it keeps the records and the stats.
        </p>
        <p style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href="/sign-up" className="btn">Sign up with Google</Link>
          <a href="#connect" className="btn secondary">How to connect</a>
        </p>
      </div>

      <section>
        <div className="chat">
          <p><strong>You:</strong> Starting a round at Torrey Pines South from the blue tees.</p>
          <p><strong>Claude:</strong> Round started. Hole 1 is a par 4, 452 yards.</p>
          <p><strong>You:</strong> Hit driver 265 to the fairway, 8 iron to the green, two putts.</p>
          <p><strong>Claude:</strong> Par on 1. Fairway and green hit. 8 iron logged at 158 yards.</p>
        </div>
      </section>

      <section>
        <h2>What you can track</h2>
        <div className="grid">
          {features.map((f) => (
            <div className="card" key={f.title}><h3>{f.title}</h3><p>{f.body}</p></div>
          ))}
        </div>
      </section>

      <section id="connect">
        <h2>Connect it to Claude</h2>
        <ol>
          <li><Link href="/sign-up">Create your account</Link> with Google.</li>
          <li>In Claude, open Settings, then Connectors, then Add custom connector.</li>
          <li>Paste this URL and sign in when Claude asks:</li>
        </ol>
        <pre>{mcpResource}</pre>
      </section>
    </main>
  );
}
