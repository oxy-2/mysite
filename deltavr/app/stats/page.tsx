import {
  getRepoInfo,
  getRecentCommits,
  getLanguages,
  getContributionCalendar,
} from "@/lib/github";
import { getHackatime, type HackatimeData } from "@/lib/hackatime";

export const metadata = {
  title: "[deltavr.] stats",
  description:
    "live github and hackatime numbers for deltavr",
};

export const revalidate = 1800;

function fmtDate(d: string | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
}

function DurationBars({ projects }: { projects: HackatimeData["projects"] }) {
  if (projects.length === 0) return <div className="empty-note">no project time yet.</div>;
  const max = Math.max(...projects.map((p) => p.hours), 1);
  return (
    <div className="proj-bars">
      {projects.map((p) => (
        <div className="proj-row" key={p.name}>
          <span className="proj-name">{p.name}</span>
          <div className="proj-track">
            <div
              className="proj-fill"
              style={{ width: `${Math.max(4, (p.hours / max) * 100)}%` }}
            >
              <span>{p.text}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SliceList({
  items,
  empty,
}: {
  items: { name: string; pct: number }[];
  empty: string;
}) {
  if (items.length === 0) return <div className="empty-note">{empty}</div>;
  return (
    <div>
      {items.slice(0, 8).map((l) => (
        <div className="lang-row" key={l.name}>
          <span>{l.name}</span>
          <span>{l.pct}%</span>
        </div>
      ))}
    </div>
  );
}

export default async function StatsPage() {
  const [repo, commits, langs, calendar, hackatime] = await Promise.all([
    getRepoInfo(),
    getRecentCommits(8),
    getLanguages(),
    getContributionCalendar(),
    getHackatime(),
  ]);

  const totalCommits = calendar?.reduce((a, d) => a + d.count, 0) ?? null;

  return (
    <section className="section">
      <div className="container">
        <div className="section-label">
          <span className="red-dot" />
          <span>06 // stats · github + coding time</span>
        </div>

        {/* headline numbers */}
        <div className="stat-strip" style={{ marginBottom: 32 }}>
          <div className="stat-box">
            <div className="stat-num">
              {hackatime ? hackatime.totalText : "."}
            </div>
            <div className="stat-label">deltavr coding time (hackatime)</div>
          </div>
          <div className="stat-box">
            <div className="stat-num">
              {hackatime ? `${hackatime.weekHours}h` : "."}
            </div>
            <div className="stat-label">
              this week / {hackatime?.weekGoalHours ?? 42}h goal
            </div>
            {hackatime && (
              <div className="goal-track" title={`${hackatime.weekPct}%`}>
                <div
                  className="goal-fill"
                  style={{ width: `${Math.min(100, hackatime.weekPct)}%` }}
                />
              </div>
            )}
          </div>
          <div className="stat-box">
            <div className="stat-num">{repo ? repo.stars : "."}</div>
            <div className="stat-label">github stars</div>
          </div>
          <div className="stat-box">
            <div className="stat-num">
              {hackatime?.todayHours != null ? `${hackatime.todayHours}h` : commits.length > 0 ? commits[0].sha : "."}
            </div>
            <div className="stat-label">
              {hackatime?.todayHours != null ? "logged today" : "latest commit"}
            </div>
          </div>
        </div>

        {/* heatmap */}
        <article className="card" style={{ marginBottom: 24 }}>
          <div className="meta-row">
            <span className="badge">contributions</span>
            <a
              href="https://github.com/oxy-2/deltavr/graphs/contributors"
              target="_blank"
              rel="noopener"
              className="dim"
              style={{ textDecoration: "none" }}
            >
              full graph ↗
            </a>
          </div>

          {calendar ? (
            <>
              <div className="heatmap">
                {calendar.map((d) => (
                  <div
                    key={d.date}
                    className={`heatmap-cell${d.level ? ` l${d.level}` : ""}`}
                    title={`${d.date}: ${d.count} commit(s)`}
                  />
                ))}
              </div>
              {totalCommits != null && (
                <p className="dim" style={{ fontSize: 10, marginTop: 8 }}>
                  {totalCommits} commits in the last 16 weeks
                </p>
              )}
            </>
          ) : (
            <div className="empty-note">
              contribution heatmap needs a GITHUB_TOKEN env var (read-only PAT).
              everything else on this page works without it.
            </div>
          )}
        </article>

        <div className="grid grid-2" style={{ marginBottom: 24 }}>
          {/* project durations */}
          <article className="card">
            <div className="meta-row">
              <span className="badge">project durations</span>
              <span className="dim">deltavr filter · all time</span>
            </div>
            {hackatime ? (
              <DurationBars projects={hackatime.projects} />
            ) : (
              <div className="empty-note">
                set HACKATIME_API_KEY + HACKATIME_BASE env vars to show live coding
                time here.
              </div>
            )}
          </article>

          {/* daily chart */}
          <article className="card">
            <div className="meta-row">
              <span className="badge">daily grind</span>
              <span className="dim">
                {hackatime ? `last ${hackatime.daily.length} active days` : "hackatime"}
              </span>
            </div>
            {hackatime && hackatime.daily.length > 0 ? (
              <>
                <div className="daily-chart">
                  {hackatime.daily.map((d) => {
                    const max = Math.max(...hackatime.daily.map((x) => x.hours), 1);
                    return (
                      <div
                        key={d.date}
                        title={`${d.date}: ${d.hours}h`}
                        className="daily-bar"
                        style={{ height: `${Math.max(4, (d.hours / max) * 100)}%` }}
                      />
                    );
                  })}
                </div>
                <p className="dim" style={{ fontSize: 10, marginTop: 8 }}>
                  {hackatime.activeDays} active days on deltavr · today{" "}
                  {hackatime.todayHours}h
                </p>
              </>
            ) : (
              <div className="empty-note">no coding days logged yet.</div>
            )}
          </article>
        </div>

        <div className="grid grid-2" style={{ marginBottom: 24 }}>
          {/* languages from hackatime */}
          <article className="card">
            <div className="meta-row">
              <span className="badge">languages</span>
              <span className="dim">hackatime · deltavr only</span>
            </div>
            <SliceList
              items={hackatime?.languages ?? []}
              empty="hackatime hasnt filled language stats in yet. they show up as you code."
            />
          </article>

          {/* editors / os / category */}
          <article className="card">
            <div className="meta-row">
              <span className="badge">top tools</span>
              <span className="dim">hackatime</span>
            </div>
            <div className="lang-row">
              <span>top editor</span>
              <span>{hackatime?.topEditor ?? "."}</span>
            </div>
            <div className="lang-row">
              <span>top os</span>
              <span>{hackatime?.topOs ?? "."}</span>
            </div>
            <div className="lang-row">
              <span>top category</span>
              <span>{hackatime?.topCategory ?? "."}</span>
            </div>
            <div className="lang-row">
              <span>top language</span>
              <span>{hackatime?.topLanguage ?? "."}</span>
            </div>
            {hackatime && (hackatime.editors.length > 0 || hackatime.categories.length > 0) && (
              <div style={{ marginTop: 12 }}>
                {(hackatime.editors.length > 0 ? hackatime.editors : hackatime.categories).map(
                  (e) => (
                    <div className="lang-row" key={e.name}>
                      <span className="dim">{e.name}</span>
                      <span>{e.pct}%</span>
                    </div>
                  )
                )}
              </div>
            )}
          </article>
        </div>

        {/* repo languages (bytes) */}
        <article className="card" style={{ marginBottom: 24 }}>
          <div className="meta-row">
            <span className="badge">repo languages</span>
            <span className="dim">by bytes in github</span>
          </div>
          {langs.length > 0 ? (
            <>
              <div className="lang-bar">
                {langs.map((l) => (
                  <div
                    key={l.name}
                    style={{
                      width: `${l.pct}%`,
                      background: l.color,
                    }}
                    title={`${l.name} ${l.pct}%`}
                  />
                ))}
              </div>
              {langs.map((l) => (
                <div className="lang-row" key={l.name}>
                  <span style={{ color: l.color }}>■ {l.name}</span>
                  <span>{l.pct}%</span>
                </div>
              ))}
            </>
          ) : (
            <div className="empty-note">couldn&apos;t load languages.</div>
          )}
        </article>

        {/* recent commits */}
        <article className="card">
          <div className="meta-row">
            <span className="badge">recent commits</span>
            <a
              href="https://github.com/oxy-2/deltavr/commits/main"
              target="_blank"
              rel="noopener"
              className="dim"
              style={{ textDecoration: "none" }}
            >
              view all ↗
            </a>
          </div>
          {commits.length > 0 ? (
            <div>
              {commits.map((c) => (
                <div className="lang-row" key={c.sha}>
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener"
                    style={{
                      color: "var(--text-muted)",
                      textDecoration: "none",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <strong style={{ color: "var(--red-accent)" }}>{c.sha}</strong>{" "}
                    {c.message}
                  </a>
                  <span style={{ whiteSpace: "nowrap", marginLeft: 16 }}>
                    {fmtDate(c.date)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-note">couldn&apos;t load commits.</div>
          )}
        </article>
      </div>
    </section>
  );
}
