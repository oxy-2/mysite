"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { BOARDS, BASE_PATH } from "@/lib/site";

const SchematicViewer = dynamic(() => import("@/components/SchematicViewer"), {
  ssr: false,
  loading: () => (
    <div className="sch-stage">
      <div className="cad-hint">loading schematic…</div>
    </div>
  ),
});

export default function SchematicPageClient() {
  const [boardId, setBoardId] = useState<string>(BOARDS[1].id);
  const board = BOARDS.find((b) => b.id === boardId) ?? BOARDS[0];

  return (
    <>
      <div className="section-label">
        <span className="red-dot" />
        <span>03 // schematics</span>
      </div>

      <div className="viewer-controls" style={{ marginBottom: 16 }}>
        {BOARDS.map((b) => (
          <button
            key={b.id}
            className={`btn-text${b.id === boardId ? " active" : ""}`}
            onClick={() => setBoardId(b.id)}
          >
            {b.label}
          </button>
        ))}
        <a
          href={board.schematicUrl}
          target="_blank"
          rel="noopener"
          className="btn-text"
          style={{ textDecoration: "none" }}
        >
          open raw svg ↗
        </a>
      </div>

      <SchematicViewer key={board.schematicUrl} src={board.schematicUrl} />

      <div className="card" style={{ marginTop: 24 }}>
        <div className="meta-row">
          <span className="badge">{board.id}</span>
          <span className="dim">exported from kicad 10</span>
        </div>
        <p className="card-text">{board.desc}</p>
      </div>
    </>
  );
}
