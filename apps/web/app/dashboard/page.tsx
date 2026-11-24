import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getHandicap, getStats, listPractice, listRounds } from "@golf/db";
import { auth, mcpResource } from "@/lib/auth";
import { SignOut } from "./sign-out";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  const userId = session.user.id;
  const [rounds, handicap, stats, practice] = await Promise.all([
    listRounds(userId, { limit: 10 }),
    getHandicap(userId),
    getStats(userId, 20),
    listPractice(userId, { limit: 5 }),
  ]);

  return (
    <main className="wrap">
      <section style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0 }}>Hi, {session.user.name.split(" ")[0]}</h1>
          <p className="muted" style={{ margin: 0 }}>{session.user.email}</p>
        </div>
        <SignOut />
      </section>

      <div className="grid">
        <div className="card"><h3>Handicap (calculated)</h3><p style={{ fontSize: 28 }}>{handicap.calculated_index ?? "–"}</p>
          <p>{handicap.calculated_index === null ? handicap.calculation_note : `From ${handicap.recent_scores.length} rounds`}</p></div>
        <div className="card"><h3>Official index</h3><p style={{ fontSize: 28 }}>{handicap.official?.handicap_index ?? "–"}</p>
          <p>{handicap.official ? `Recorded ${handicap.official.recorded_on}` : "Tell Claude your index to record it"}</p></div>
        <div className="card"><h3>Scoring average</h3><p style={{ fontSize: 28 }}>{stats.scoringAverage18 ?? "–"}</p>
          <p>Per 18 holes, last {stats.window.rounds} rounds</p></div>
        <div className="card"><h3>Practice</h3><p style={{ fontSize: 28 }}>{practice.total_minutes} min</p>
          <p>Last {practice.sessions.length} sessions</p></div>
      </div>

      <section>
        <h2>Recent rounds</h2>
        {rounds.length === 0 ? (
          <p className="muted">No rounds yet. In Claude, say &quot;Start a round at …&quot;.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead><tr><th>Date</th><th>Course</th><th>Score</th><th>Differential</th><th>Status</th></tr></thead>
              <tbody>
                {rounds.map((r) => (
                  <tr key={r.id}>
                    <td>{r.played_on}</td><td>{r.course_name}{r.tee_name ? ` (${r.tee_name})` : ""}</td>
                    <td>{r.total_score ?? `${r.holes_scored}/${r.holes_planned} holes`}</td>
                    <td>{r.differential ?? "–"}</td><td>{r.status === "completed" ? "Done" : "In progress"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2>Connect Claude</h2>
        <p>Add a custom connector in Claude with this URL:</p>
        <pre>{mcpResource}</pre>
      </section>
    </main>
  );
}
