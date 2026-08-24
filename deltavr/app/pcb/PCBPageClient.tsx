"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { BOARDS } from "@/lib/site";

const PCBViewer = dynamic(() => import("@/components/PCBViewer"), {
  ssr: false,
  loading: () => (
    <div className="cad-viewport" style={{ height: 520 }}>
      <div className="cad-hint">loading 3d…</div>
    </div>
  ),
});

export default function PCBPageClient() {
  const [boardId, setBoardId] = useState<string>(BOARDS[1].id);
  const board = BOARDS.find((b) => b.id === boardId) ?? BOARDS[0];

  return (
    <>
      <div className="section-label">
        <span className="red-dot" />
        <span>02 // pcb — interactive 3d</span>
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
      </div>

      <PCBViewer modelUrl={board.modelUrl} height={520} />

      <div className="card" style={{ marginTop: 24 }}>
        <div className="meta-row">
          <span className="badge">{board.id}</span>
          <a href={board.modelUrl} download className="dim" style={{ textDecoration: "none" }}>
            download .glb ↓
          </a>
        </div>
        <h3 className="card-title">{board.label}</h3>
        <p className="card-text">{board.desc}</p>
      </div>
    </>
  );
}
