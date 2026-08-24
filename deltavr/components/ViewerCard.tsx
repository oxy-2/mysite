"use client";

import dynamic from "next/dynamic";

const PCBViewer = dynamic(() => import("@/components/PCBViewer"), {
  ssr: false,
  loading: () => (
    <div className="cad-viewport" style={{ height: 380 }}>
      <div className="cad-hint">loading 3d…</div>
    </div>
  ),
});

export default function ViewerCard({
  modelUrl,
  height = 380,
}: {
  modelUrl: string;
  height?: number;
}) {
  return <PCBViewer modelUrl={modelUrl} height={height} />;
}
