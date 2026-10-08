import Link from "next/link";
import ViewerCard from "@/components/ViewerCard";
import { BOARDS, BASE_PATH } from "@/lib/site";
import { getRepoInfo, getRecentCommits } from "@/lib/github";

export const revalidate = 3600;

export default async function Home() {
  const repo = await getRepoInfo();
  const commits = await getRecentCommits(1);

  return (
    <>
      {/* hero */}
      <section className="section hero-section">
        <div className="container hero-grid">
          <div>
            <div className="hero-tagline">
              <span className="red-dot" />
              <span>open source pcvr headset / orbsLAM3 / full asa</span>
            </div>

            <h1 className="hero-name">[deltavr.]</h1>

            <p className="hero-bio">
              a pseudopancake pcvr headset with orbsLAM3 tracking running on the
              headset camera, processed by your pc. tmr controllers with hall
              triggers, everything printed in asa on a lightly-modified ender 3.
              built for stardance, shipping soon.
            </p>

            <div className="hero-links">
              <Link href="/pcb" className="btn btn-black">
                view the pcbs →
              </Link>
              <a
                href={`${BASE_PATH}/downloads/Gerber_PCB.zip`}
                download
                className="btn btn-ghost"
              >
                download gerbers ↓
              </a>
              <a
                href="https://github.com/oxy-2/deltavr"
                target="_blank"
                rel="noopener"
                className="btn btn-ghost"
              >
                star on github ★
              </a>
            </div>

            <div className="tag-group">
              <span className="tag">orbsLAM3</span>
              <span className="tag">pseudopancake optics</span>
              <span className="tag">nrf52840</span>
              <span className="tag">lsm6dsv</span>
              <span className="tag">tmr sticks</span>
              <span className="tag">hall triggers</span>
              <span className="tag">asa prints</span>
              <span className="tag">kicad</span>
            </div>
          </div>

          <div>
            <ViewerCard modelUrl={BOARDS[1].modelUrl} height={380} />
          </div>
        </div>
      </section>

      {/* ticker */}
      <div className="ticker" aria-hidden="true">
        <div className="ticker-track">
          {Array.from({ length: 4 }).map((_, i) => (
            <span key={i} className="ticker-chunk">
              deltavr ▸ orbsLAM3 on-headset-camera tracking ▸ processed by pc ▸
              pseudopancake optics ▸ tmr sticks + hall triggers ▸ nrf52840 +
              lsm6dsv ▸ full asa shell ▸ kicad 10 ▸ shipping for stardance ▸&nbsp;
            </span>
          ))}
        </div>
      </div>

      {/* stats strip */}
      <section className="section">
        <div className="container">
          <div className="stat-strip">
            <div className="stat-box">
              <div className="stat-num">{repo ? repo.stars : "."}</div>
              <div className="stat-label">github stars</div>
            </div>
            <div className="stat-box">
              <div className="stat-num">{repo ? repo.forks : "."}</div>
              <div className="stat-label">forks</div>
            </div>
            <div className="stat-box">
              <div className="stat-num">{commits.length > 0 ? `${commits[0].sha}` : "."}</div>
              <div className="stat-label">latest commit</div>
            </div>
            <div className="stat-box">
              <div className="stat-num">2</div>
              <div className="stat-label">custom boards designed</div>
            </div>
          </div>
        </div>
      </section>

      {/* boards */}
      <section className="section">
        <div className="container">
          <div className="section-label">
            <span className="red-dot" />
            <span>01 // the boards</span>
          </div>

          <div className="grid grid-2">
            {BOARDS.map((b) => (
              <article className={`card${b.id === "controller" ? " featured" : ""}`} key={b.id}>
                <div className="meta-row">
                  <span className="badge">{b.id}</span>
                  <span className="dim">kicad 10</span>
                </div>
                <h3 className="card-title">{b.label}</h3>
                <p className="card-text">{b.desc}</p>
                <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
                  <Link href="/pcb" className="btn-text">
                    3d view →
                  </Link>
                  <Link href="/schematic" className="btn-text">
                    schematic →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* updates teaser */}
      <section className="section" style={{ borderBottom: "none" }}>
        <div className="container">
          <div className="section-label">
            <span className="red-dot" />
            <span>02 // build log</span>
          </div>

          <div className="grid grid-2">
            <article className="card">
              <div className="meta-row">
                <span className="badge">stardance</span>
                <span className="dim">devlogs live there now</span>
              </div>
              <h3 className="card-title">follow the build on stardance</h3>
              <p className="card-text">
                daily devlogs with time-elapsed tracking while stardance runs,
                mirrored here in the updates feed.
              </p>
              <div style={{ marginTop: 16 }}>
                <a
                  href="https://stardance.hackclub.com/projects/26318"
                  target="_blank"
                  rel="noopener"
                  className="btn-text"
                >
                  stardance page →
                </a>
              </div>
            </article>

            <article className="card">
              <div className="meta-row">
                <span className="badge">this site</span>
                <span className="dim">13 devlogs and counting</span>
              </div>
              <h3 className="card-title">updates feed</h3>
              <p className="card-text">
                every stardance devlog lives here now. the full build log from
                fusion-360 struggles to finished controller pcbs, newest first.
              </p>
              <div style={{ marginTop: 16 }}>
                <Link href="/updates" className="btn-text">
                  go to updates →
                </Link>
              </div>
            </article>
          </div>
        </div>
      </section>
    </>
  );
}
