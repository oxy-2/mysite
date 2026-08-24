import {
  getRepoInfo,
  getRecentCommits,
  getLanguages,
  getContributionCalendar,
} from "@/lib/github";
import { getHackatime } from "@/lib/hackatime";

export const metadata = { title: "[deltavr.] — stats" };
export const revalidate = 3600;

function fmtDate(d: string | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
}

export default async function StatsPage() {
  const [repo, commits, langs, calendar, hackatime] = await Promise.all([
    getRepoInfo(),
    getRecentCommits(8),
    getLanguages(),
    getContributionCalendar(),
    getHackatime(),
  ]);

  const totalCommits =
    calendar?.reduce((a, d) => a + d.count, 0) ?? null;

  return (
    <section className="section">
      <div className="container">
        <div className="section-label">
          <span className="red-dot" />
          <span>06 // stats — github + coding time</span>
        </div>

        {/* repo overview */}
        <div className="stat-strip" style={{ marginBottom: 32 }}>
          <div className="stat-box">
            <div className="stat-num">{repo ? repo.stars : "—"}</div>
            <div className="stat-label">stars</div>
          </div>
          <div className="stat-box">
            <div className="stat-num">{repo ? repo.forks : "—"}</div>
            <div className="stat-label">forks</div>
          </div>
          <div className="stat-box">
            <div className="stat-num">{repo ? repo.openIssues : "—"}</div>
            <div className="stat-label">open issues</div>
          </div>
          <div className="stat-box">
            <div className="stat-num">
              {hackatime?.totalHours != null ? `${hackatime.totalHours}h` : "—"}
            </div>
            <div className="stat-label">logged hours (hackatime)</div>
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
          {/* languages */}
          <article className="card">
            <div className="meta-row">
              <span className="badge">languages</span>
              <span className="dim">by bytes in repo</span>
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
              <div className="empty-note">couldn't load languages.</div>
            )}
          </article>

          {/* hackatime */}
          <article className="card">
            <div className="meta-row">
              <span className="badge">coding time</span>
              <span className="dim">hackatime / wakatime</span>
            </div>
            {hackatime ? (
              <>
                {hackatime.daily.length > 0 && (
                  <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 90, marginBottom: 12 }}>
                    {hackatime.daily.map((d) => {
                      const max = Math.max(...hackatime.daily.map((x) => x.hours), 1);
                      return (
                        <div
                          key={d.date}
                          title={`${d.date}: ${d.hours}h`}
                          style={{
                            flex: 1,
                            height: `${Math.max(4, (d.hours / max) * 100)}%`,
                            background: "var(--text)",
                            opacity: 0.85,
                          }}
                        />
                      );
                    })}
                  </div>
                )}
                <p className="dim" style={{ fontSize: 10, marginBottom: 8 }}>
                  last {hackatime.daily.length} active days ·{" "}
                  {hackatime.todayHours != null ? `${hackatime.todayHours}h recent` : ""}
                </p>
                {hackatime.topProjects.map((p) => (
                  <div className="lang-row" key={p.name}>
                    <span>{p.name}</span>
                    <span>
                      {p.hours}h · {p.pct}%
                    </span>
                  </div>
                ))}
              </>
            ) : (
              <div className="empty-note">
                set HACKATIME_API_KEY + HACKATIME_BASE env vars to show live coding time here.
              </div>
            )}
          </article>
        </div>

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
            <div className="empty-note">couldn't load commits.</div>
          )}
        </article>
      </div>
    </section>
  );
}
