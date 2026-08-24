"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BASE_PATH } from "@/lib/site";

export default function SchematicViewer({ src }: { src: string }) {
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const stage = useRef<HTMLDivElement>(null);

  const reset = useCallback(() => {
    setZoom(1);
    setPos({ x: 0, y: 0 });
  }, []);

  // reset when switching boards
  useEffect(() => {
    reset();
  }, [src, reset]);

  const clampZoom = (z: number) => Math.min(8, Math.max(0.4, z));

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => clampZoom(z * (e.deltaY < 0 ? 1.12 : 0.89)));
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: pos.x, oy: pos.y };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    setPos({
      x: drag.current.ox + (e.clientX - drag.current.x),
      y: drag.current.oy + (e.clientY - drag.current.y),
    });
  };

  const endDrag = () => {
    drag.current = null;
  };

  return (
    <div className="sch-card">
      <div className="sch-toolbar">
        <span className="dim">{src.split("/").pop()}</span>
        <div className="viewer-controls">
          <button type="button" className="btn-text" onClick={() => setZoom((z) => clampZoom(z * 1.25))}>
            +
          </button>
          <button type="button" className="btn-text" onClick={() => setZoom((z) => clampZoom(z * 0.8))}>
            −
          </button>
          <button type="button" className="btn-text active">{Math.round(zoom * 100)}%</button>
          <button type="button" className="btn-text" onClick={reset}>
            reset
          </button>
          <a
            className="btn-text"
            href={src.startsWith("http") ? src : `${BASE_PATH}${src.replace(BASE_PATH, "")}`}
            download
          >
            download ↓
          </a>
        </div>
      </div>

      <div
        ref={stage}
        className="sch-stage sch-stage--img"
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt="schematic"
          draggable={false}
          style={{
            transform: `translate(${pos.x}px, ${pos.y}px) scale(${zoom})`,
          }}
        />
      </div>

      <div className="sch-hint">[ scroll zoom · drag pan ]</div>
    </div>
  );
}
