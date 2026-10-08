"use client";

import { useState } from "react";
import { formatDuration, formatLapseDate, type LapseVideo } from "@/lib/lapse";

type Feed = {
  handle: string;
  displayName: string;
  profilePictureUrl: string;
  profileUrl: string;
  videos: {
    id: string;
    name: string;
    description: string;
    createdAt: number;
    duration: number;
    playbackUrl: string | null;
    thumbnailUrl: string | null;
  }[];
};

export default function LapseGrid({ feeds }: { feeds: Feed[] }) {
  const [playing, setPlaying] = useState<string | null>(null);
  const total = feeds.reduce((a, f) => a + f.videos.length, 0);

  if (total === 0) {
    return (
      <div className="empty-note">
        no lapse videos yet from the crew. they show up here automatically once
        posted on{" "}
        <a href="https://lapse.hackclub.com" target="_blank" rel="noopener">
          lapse
        </a>
        .
      </div>
    );
  }

  return (
    <div>
      {feeds.map((feed) => {
        if (feed.videos.length === 0) return null;
        return (
          <div key={feed.handle} style={{ marginBottom: 36 }}>
            <div className="lapse-user-row">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={feed.profilePictureUrl}
                alt={feed.handle}
                className="lapse-pfp"
              />
              <div>
                <div className="lapse-user-name">
                  <a
                    href={feed.profileUrl}
                    target="_blank"
                    rel="noopener"
                    style={{ color: "inherit", textDecoration: "none" }}
                  >
                    @{feed.handle}
                  </a>
                </div>
                <div className="dim" style={{ fontSize: 10 }}>
                  {feed.videos.length} timelapse{feed.videos.length === 1 ? "" : "s"}
                </div>
              </div>
            </div>

            <div className="lapse-grid">
              {feed.videos.map((v) => (
                <article className="lapse-card" key={v.id}>
                  <div className="lapse-thumb" onClick={() => setPlaying(playing === v.id ? null : v.id)}>
                    {playing === v.id && v.playbackUrl ? (
                      <video
                        src={v.playbackUrl}
                        controls
                        autoPlay
                        playsInline
                        poster={v.thumbnailUrl ?? undefined}
                        className="lapse-video"
                      />
                    ) : (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={v.thumbnailUrl ?? ""}
                          alt={v.name}
                          loading="lazy"
                        />
                        <span className="lapse-play">▶</span>
                        <span className="lapse-dur">{formatDuration(v.duration)}</span>
                      </>
                    )}
                  </div>
                  <div className="lapse-meta">
                    <h3 className="lapse-title">{v.name}</h3>
                    {v.description ? (
                      <p className="lapse-desc">{v.description}</p>
                    ) : null}
                    <div className="dim" style={{ fontSize: 10, marginTop: 6 }}>
                      {formatLapseDate(v.createdAt)}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
