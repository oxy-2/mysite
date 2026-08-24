"use client";

import { useEffect, useRef } from "react";

export default function WelcomeLoader() {
  const overlayRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const overlay = overlayRef.current;
    const canvas = canvasRef.current;
    if (!overlay || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const SPACING = 20;
    let width = 0,
      height = 0,
      cols = 0,
      rows = 0,
      maxDiag = 0;
    let waveFront = 0;
    let isLoaded = false;
    let fading = false;
    let raf = 0;

    function size() {
      width = canvas!.width = window.innerWidth;
      height = canvas!.height = window.innerHeight;
      cols = Math.ceil(width / SPACING) + 1;
      rows = Math.ceil(height / SPACING) + 1;
      maxDiag = cols + rows;
    }
    size();

    const loadTimer = setTimeout(() => {
      isLoaded = true;
    }, 600);

    const isDark = () =>
      document.documentElement.getAttribute("data-theme") === "dark";

    function render() {
      if (overlay!.classList.contains("hidden")) return;

      ctx!.clearRect(0, 0, width, height);

      if (!fading) {
        waveFront += 1.6;
        if (waveFront >= maxDiag) {
          waveFront = maxDiag;
          if (isLoaded) {
            fading = true;
            overlay!.classList.add("fading");
            setTimeout(() => {
              overlay!.classList.add("hidden");
              document.body.classList.remove("loading");
            }, 700);
          }
        }
      }

      const rgb = isDark() ? "255, 255, 255" : "17, 17, 17";
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const distToFront = waveFront - (c + r);
          if (distToFront >= 0) {
            const radius = Math.min(6, Math.max(1, distToFront * 0.8));
            const opacity = Math.min(
              0.95,
              Math.max(0.15, 1 - distToFront * 0.05)
            );
            ctx!.beginPath();
            ctx!.arc(c * SPACING, r * SPACING, radius, 0, Math.PI * 2);
            ctx!.fillStyle = `rgba(${rgb}, ${opacity.toFixed(2)})`;
            ctx!.fill();
          }
        }
      }
      raf = requestAnimationFrame(render);
    }

    window.addEventListener("resize", size);
    render();

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(loadTimer);
      window.removeEventListener("resize", size);
      document.body.classList.remove("loading");
    };
  }, []);

  return (
    <div id="loader-overlay" className="loader-overlay" ref={overlayRef}>
      <canvas id="loader-wave-canvas" ref={canvasRef} />
      <div className="loader-center">
        <span className="loader-text">deltavr.</span>
      </div>
    </div>
  );
}
