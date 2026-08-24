"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  useGLTF,
  Center,
} from "@react-three/drei";
import * as THREE from "three";

type Props = {
  modelUrl: string;
  height?: number;
};

function Marker({ p }: { p: THREE.Vector3 }) {
  return (
    <mesh position={p}>
      <sphereGeometry args={[1.4, 12, 12]} />
      <meshBasicMaterial color="#ff2e2e" />
    </mesh>
  );
}

function MeasureLine({ a, b }: { a: THREE.Vector3; b: THREE.Vector3 }) {
  const obj = useMemo(() => {
    const geom = new THREE.BufferGeometry().setFromPoints([a, b]);
    const mat = new THREE.LineBasicMaterial({ color: "#ff2e2e" });
    return new THREE.Line(geom, mat);
  }, [a, b]);
  return <primitive object={obj} />;
}

function Model({
  url,
  exploded,
  measureMode,
  onPick,
}: {
  url: string;
  exploded: boolean;
  measureMode: boolean;
  onPick?: (p: THREE.Vector3 | null) => void;
}) {
  const gltf = useGLTF(url);
  const scene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);

  const parts = useMemo(() => {
    const boardParts: THREE.Mesh[] = [];
    const compParts: THREE.Mesh[] = [];

    scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const box = new THREE.Box3().setFromObject(mesh);
      const size = box.getSize(new THREE.Vector3());
      const isFlat = size.y < Math.max(size.x, size.z) * 0.25;
      (isFlat ? boardParts : compParts).push(mesh);
    });

    if (boardParts.length === 0 && compParts.length > 1) {
      boardParts.push(compParts.shift()!);
    }

    return { boardParts, compParts };
  }, [scene]);

  const originalPos = useRef(new Map<THREE.Object3D, THREE.Vector3>());

  useEffect(() => {
    originalPos.current.clear();
    [...parts.boardParts, ...parts.compParts].forEach((m) => {
      originalPos.current.set(m, m.position.clone());
    });
  }, [parts]);

  useEffect(() => {
    parts.compParts.forEach((m) => {
      const orig = originalPos.current.get(m);
      if (!orig) return;
      m.position.y = exploded ? orig.y + 18 : orig.y;
    });
  }, [exploded, parts]);

  // distinguish click from orbit-drag: only count as pick if pointer barely moved
  const downPos = useRef<{ x: number; y: number } | null>(null);

  return (
    <group
      onPointerDown={(e: any) => {
        downPos.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerUp={(e: any) => {
        if (!measureMode || !onPick) return;
        const d = downPos.current;
        if (!d) return;
        const moved = Math.hypot(e.clientX - d.x, e.clientY - d.y);
        if (moved > 6) return; // that was a drag, not a pick
        e.stopPropagation();
        onPick(e.point.clone());
      }}
    >
      <primitive object={scene} />
    </group>
  );
}

export default function PCBViewer({ modelUrl, height = 420 }: Props) {
  const [exploded, setExploded] = useState(false);
  const [autorotate, setAutorotate] = useState(true);
  const [measure, setMeasure] = useState(false);
  const [pickA, setPickA] = useState<THREE.Vector3 | null>(null);
  const [pickB, setPickB] = useState<THREE.Vector3 | null>(null);

  const handlePick = (p: THREE.Vector3 | null) => {
    if (!measure) return;
    if (!pickA || (pickA && pickB)) {
      setPickA(p);
      setPickB(null);
    } else {
      setPickB(p);
    }
  };

  const dist =
    pickA && pickB ? pickA.distanceTo(pickB).toFixed(2) : null;

  function reset() {
    setExploded(false);
    setMeasure(false);
    setPickA(null);
    setPickB(null);
    setAutorotate(true);
  }

  return (
    <div className="cad-card">
      <div className="cad-header">
        <span className="cad-coords">
          <span className="red-indicator">●</span>{" "}
          {dist ? `distance: ${dist} mm` : measure ? "click two points" : "live render"}
        </span>
        <span>{modelUrl.split("/").pop()}</span>
      </div>

      <div className="cad-viewport" style={{ height }}>
        <Canvas
          camera={{ position: [90, 70, 110], fov: 40 }}
          dpr={[1, 2]}
        >
          <ambientLight intensity={0.75} />
          <directionalLight position={[100, 150, 80]} intensity={2.2} />
          <directionalLight position={[-80, -60, -100]} intensity={0.6} />
          <directionalLight position={[0, -100, 40]} intensity={0.4} />

          <Center key={modelUrl}>
            <Model
              url={modelUrl}
              exploded={exploded}
              measureMode={measure}
              onPick={handlePick}
            />
          </Center>

          {pickA && <Marker p={pickA} />}
          {pickB && <Marker p={pickB} />}
          {pickA && pickB && <MeasureLine a={pickA} b={pickB} />}

          <OrbitControls
            autoRotate={autorotate}
            autoRotateSpeed={1.2}
            enableDamping
            dampingFactor={0.08}
          />
        </Canvas>

        <div className="cad-hint">[ drag rotate · scroll zoom · right-drag pan ]</div>
      </div>

      <div className="cad-footer">
        <div className="viewer-controls">
          <button
            type="button"
            className={`btn-text${exploded ? " active" : ""}`}
            onClick={() => setExploded(!exploded)}
          >
            explode
          </button>
          <button
            type="button"
            className={`btn-text${measure ? " active" : ""}`}
            onClick={() => {
              setMeasure(!measure);
              setPickA(null);
              setPickB(null);
            }}
          >
            measure
          </button>
          <button
            type="button"
            className={`btn-text${autorotate ? " active" : ""}`}
            onClick={() => setAutorotate(!autorotate)}
          >
            spin
          </button>
          <button type="button" className="btn-text" onClick={reset}>
            reset
          </button>
        </div>
        <span>units: mm</span>
      </div>
    </div>
  );
}
