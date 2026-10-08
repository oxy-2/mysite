import GalleryGrid from "@/components/GalleryGrid";
import LapseGrid from "@/components/LapseGrid";
import { getLocalPhotos } from "@/lib/local-photos";
import { getTeamLapseFeed } from "@/lib/lapse";
import { TEAM } from "@/lib/site";

export const metadata = {
  title: "[deltavr.] — gallery",
  description:
    "devlog shots, hardware photos, and live lapse timelapses from oxy, grand, and joao.",
};

export const revalidate = 1800;

export default async function GalleryPage() {
  const [photos, feeds] = await Promise.all([getLocalPhotos(), getTeamLapseFeed()]);

  const lapseFeeds = feeds.map((f) => ({
    handle: f.user.handle,
    displayName: f.user.displayName,
    profilePictureUrl: f.user.profilePictureUrl,
    profileUrl: `https://lapse.hackclub.com/user/@${f.user.handle}`,
    videos: f.videos.map((v) => ({
      id: v.id,
      name: v.name,
      description: v.description,
      createdAt: v.createdAt,
      duration: v.duration,
      playbackUrl: v.playbackUrl,
      thumbnailUrl: v.thumbnailUrl,
    })),
  }));

  const devlogImages = photos.devlog.map((p) => ({
    src: p.src,
    caption: p.date ? `devlog ${p.date}${p.caption && p.caption !== p.date ? ` · ${p.caption}` : ""}` : p.caption,
  }));

  const hardwareImages = photos.hardware.map((p) => ({
    src: p.src,
    caption: p.caption,
  }));

  const otherImages = photos.other.map((p) => ({
    src: p.src,
    caption: p.caption,
  }));

  return (
    <section className="section">
      <div className="container">
        <div className="section-label">
          <span className="red-dot" />
          <span>05 // gallery · lapse videos, devlogs, hardware</span>
        </div>

        {/* team strip */}
        <div className="team-strip">
          {TEAM.map((t) => (
            <a
              key={t.handle}
              href={t.url}
              target="_blank"
              rel="noopener"
              className="team-chip"
            >
              <span className="red-dot" />
              <span>
                {t.label} <span className="dim">@{t.handle}</span>
              </span>
            </a>
          ))}
        </div>

        {/* live lapse videos */}
        <div className="section-label" style={{ marginTop: 8 }}>
          <span className="red-dot" />
          <span>// lapse timelapses from oxy(me), grand and joao</span>
        </div>
        <p className="dim" style={{ fontSize: 11, marginBottom: 16, maxWidth: 640 }}>
          pulled straight from{" "}
          <a href="https://lapse.hackclub.com" target="_blank" rel="noopener">
            lapse.hackclub.com
          </a>
          . post a timelapse there and it shows up here, no site rebuild needed.
        </p>
        <LapseGrid feeds={lapseFeeds} />

        {/* devlog photos */}
        {devlogImages.length > 0 && (
          <>
            <div className="section-label" style={{ marginTop: 48 }}>
              <span className="red-dot" />
              <span>// devlog shots</span>
            </div>
            <GalleryGrid images={devlogImages} />
          </>
        )}

        {/* hardware */}
        {hardwareImages.length > 0 && (
          <>
            <div className="section-label" style={{ marginTop: 48 }}>
              <span className="red-dot" />
              <span>// hardware shots</span>
            </div>
            <GalleryGrid images={hardwareImages} />
          </>
        )}

        {/* anything else sitting in public/gallery */}
        {otherImages.length > 0 && (
          <>
            <div className="section-label" style={{ marginTop: 48 }}>
              <span className="red-dot" />
              <span>// more from the repo</span>
            </div>
            <GalleryGrid images={otherImages} />
          </>
        )}
      </div>
    </section>
  );
}
