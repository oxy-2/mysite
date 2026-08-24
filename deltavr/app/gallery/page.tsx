import GalleryGrid from "@/components/GalleryGrid";
import { DEVLOG_IMAGES } from "@/lib/devlog-gallery";
import { BASE_PATH } from "@/lib/site";

export const metadata = {
  title: "[deltavr.] — gallery",
};

const HARDWARE = [
  {
    src: `${BASE_PATH}/gallery/controller-pinouts.png`,
    caption: "controller pcb — pinouts",
  },
  {
    src: `${BASE_PATH}/gallery/thumbstick-board.png`,
    caption: "thumbstick breakout — board render (kicad)",
  },
  {
    src: `${BASE_PATH}/gallery/thumbstick-schematic.png`,
    caption: "thumbstick breakout — schematic",
  },
  {
    src: `${BASE_PATH}/gallery/thumbstick-assembled.jpg`,
    caption: "thumbstick breakout — assembled",
  },
  {
    src: `${BASE_PATH}/gallery/nicenano.png`,
    caption: "nice!nano footprint reference",
  },
];

export default function GalleryPage() {
  // every devlog image, newest first
  const devlog = DEVLOG_IMAGES.map((d) => ({
    src: d.src,
    caption: `devlog ${d.date}`,
  }));

  return (
    <section className="section">
      <div className="container">
        <div className="section-label">
          <span className="red-dot" />
          <span>05 // gallery — everything from the devlogs</span>
        </div>

        <GalleryGrid images={devlog} />

        <div className="section-label" style={{ marginTop: 48 }}>
          <span className="red-dot" />
          <span>// hardware shots</span>
        </div>
        <GalleryGrid images={HARDWARE} />
      </div>
    </section>
  );
}
