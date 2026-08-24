import Link from "next/link";
import { getAllUpdates } from "@/lib/updates";
import TimeElapsed from "@/components/TimeElapsed";

export const metadata = { title: "[deltavr.] — updates" };

function fmtDate(d: string) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function UpdatesPage() {
  const posts = getAllUpdates();

  return (
    <section className="section">
      <div className="container">
        <div className="section-label">
          <span className="red-dot" />
          <span>07 // updates — build log</span>
        </div>

        {posts.length === 0 ? (
          <div className="empty-note">
            no updates yet — drop a .mdx file into content/updates/ and it shows up here.
          </div>
        ) : (
          <div className="post-list">
            {posts.map((p, idx) => (
              <Link
                key={p.slug}
                href={`/updates/${p.slug}`}
                className="post-row"
                style={{ textDecoration: "none" }}
              >
                <span className="post-idx">{String(posts.length - idx).padStart(2, "0")}</span>
                <span className="post-row-main">
                  <span className="post-title">{p.title}</span>
                  <span className="dim post-sub">
                    {fmtDate(p.date)}
                    {p.date ? " · " : ""}
                    {p.date && <TimeElapsed from={p.date} />}
                  </span>
                </span>
                <span className="post-arrow">→</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
