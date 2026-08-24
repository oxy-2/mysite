"use client";

import { useState } from "react";
import Lightbox, { type GalleryImage } from "@/components/Lightbox";

export default function GalleryGrid({ images }: { images: GalleryImage[] }) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <>
      <div className="gallery-grid">
        {images.map((img, i) => (
          <figure className="gallery-item" key={img.src} onClick={() => setOpen(i)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.src} alt={img.caption} loading="lazy" />
            <figcaption className="gallery-caption">{img.caption}</figcaption>
          </figure>
        ))}
      </div>

      {open !== null && (
        <Lightbox images={images} index={open} onClose={() => setOpen(null)} />
      )}
    </>
  );
}
