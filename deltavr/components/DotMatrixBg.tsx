"use client";

import { useEffect, useRef } from "react";

const BASE_RADIUS = 1.3;
const MAX_RADIUS = 5.0;
const INFLUENCE_DIST = 160;

function readNum(key: string, fallback: number) {
  try {
    const v = localStorage.getItem(key);
    return v ? parseFloat(v) : fallback;
  } catch {
    return fallback;
  }
}

export default function DotMatrixBg() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const state = {
      spacing: readNum("oxy_bg_spacing", 24),
      baseOpacity: readNum("oxy_bg_base", 0.22),
      hoverOpacity: readNum("oxy_bg_hover", 0.85),
    };

    let width = 0,
      height = 0,
      raf = 0,
      time = 0;
    let dots: { x: number; y: number; radius: number; phase: number }[] = [];
    const mouse = { x: -1000, y: -1000 };

    const isDark = () =>
      document.documentElement.getAttribute("data-theme") === "dark";

    function resize() {
      width = canvas!.width = window.innerWidth;
      height = canvas!.height = window.innerHeight;
      dots = [];
      for (let y = 0; y < height + state.spacing; y += state.spacing) {
        for (let x = 0; x < width + state.spacing; x += state.spacing) {
          dots.push({
            x,
            y,
            radius: BASE_RADIUS,
            phase: Math.random() * Math.PI * 2,
          });
        }
      }
    }

    function onMove(e: MouseEvent) {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    }

    function render() {
      ctx!.clearRect(0, 0, width, height);
      time += 0.02;
      const rgb = isDark() ? "255, 255, 255" : "17, 17, 17";

      for (const dot of dots) {
        const dist = Math.hypot(mouse.x - dot.x, mouse.y - dot.y);
        let proximityFactor = 0;
        let targetR = BASE_RADIUS;

        if (dist < INFLUENCE_DIST) {
          proximityFactor = 1 - dist / INFLUENCE_DIST;
          targetR =
            BASE_RADIUS +
            (MAX_RADIUS - BASE_RADIUS) * proximityFactor * proximityFactor;
        }
        targetR += Math.sin(dot.phase + time) * 0.2;
        dot.radius += (targetR - dot.radius) * 0.15;

        const opacity =
          state.baseOpacity +
          (state.hoverOpacity - state.baseOpacity) *
            (proximityFactor * proximityFactor);

        ctx!.beginPath();
        ctx!.arc(dot.x, dot.y, Math.max(0.6, dot.radius), 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(${rgb}, ${opacity.toFixed(3)})`;
        ctx!.fill();
      }
      raf = requestAnimationFrame(render);
    }

    // re-read settings when the settings drawer changes them
    const onStorage = () => {
      state.spacing = readNum("oxy_bg_spacing", 24);
      state.baseOpacity = readNum("oxy_bg_base", 0.22);
      state.hoverOpacity = readNum("oxy_bg_hover", 0.85);
      resize();
    };
    window.addEventListener("oxy-settings-changed", onStorage);

    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMove);
    resize();
    render();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("oxy-settings-changed", onStorage);
    };
  }, []);

  return (
    <canvas id="dot-matrix-canvas" aria-hidden="true" ref={canvasRef} />
  );
}
