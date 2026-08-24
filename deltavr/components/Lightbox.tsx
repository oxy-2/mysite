"use client";

import { useState } from "react";

export type GalleryImage = {
  src: string;
  caption: string;
};

export default function Lightbox({
  images,
  index,
  onClose,
}: {
  images: GalleryImage[];
  index: number;
  onClose: () => void;
}) {
  const [i, setI] = useState(index);

  const prev = () => setI((v) => (v - 1 + images.length) % images.length);
  const next = () => setI((v) => (v + 1) % images.length);

  return (
    <div className="lightbox-bg" onClick={onClose}>
      <button className="lightbox-close" onClick={onClose} aria-label="close">
        ×
      </button>
      <button
        className="lightbox-nav"
        style={{ left: 24 }}
        onClick={(e) => {
          e.stopPropagation();
          prev();
        }}
      >
        ←
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={images[i].src}
        alt={images[i].caption}
        className="lightbox-img"
        onClick={(e) => e.stopPropagation()}
      />
      <div
        style={{
          position: "absolute",
          bottom: 24,
          color: "#fff",
          fontSize: 11,
          fontFamily: "var(--font-mono)",
        }}
      >
        [{i + 1}/{images.length}] {images[i].caption}
      </div>
      <button
        className="lightbox-nav"
        style={{ right: 24 }}
        onClick={(e) => {
          e.stopPropagation();
          next();
        }}
      >
        →
      </button>
    </div>
  );
}
