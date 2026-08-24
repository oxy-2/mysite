"use client";

import { useEffect, useRef, useState } from "react";

export default function SettingsDrawer() {
  const drawerRef = useRef<HTMLElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const [contrast, setContrast] = useState("0.22");
  const [spacing, setSpacing] = useState("24");
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    try {
      setContrast(localStorage.getItem("oxy_bg_base") ?? "0.22");
      setSpacing(localStorage.getItem("oxy_bg_spacing") ?? "24");
      setTheme(
        document.documentElement.getAttribute("data-theme") === "dark"
          ? "dark"
          : "light"
      );
    } catch {}

    const toggle = () => {
      drawerRef.current?.classList.toggle("open");
      bgRef.current?.classList.toggle("open");
    };
    window.addEventListener("oxy-toggle-settings", toggle);
    const onKey = (e: KeyboardEvent) => {
      if (
        e.key === "Escape" &&
        drawerRef.current?.classList.contains("open")
      )
        toggle();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("oxy-toggle-settings", toggle);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  function persist(base: number, hover: number, sp: number) {
    try {
      localStorage.setItem("oxy_bg_base", String(base));
      localStorage.setItem("oxy_bg_hover", String(hover));
      localStorage.setItem("oxy_bg_spacing", String(sp));
    } catch {}
    window.dispatchEvent(new CustomEvent("oxy-settings-changed"));
  }

  return (
    <>
      <div className="drawer-bg" ref={bgRef} onClick={() =>
        window.dispatchEvent(new CustomEvent("oxy-toggle-settings"))
      } />
      <aside className="drawer" ref={drawerRef as React.RefObject<HTMLElement | null>}>
        <div className="drawer-head">
          <span>settings (make stuff different)</span>
          <button
            className="modal-x"
            onClick={() =>
              window.dispatchEvent(new CustomEvent("oxy-toggle-settings"))
            }
          >
            &times;
          </button>
        </div>

        <div className="setting-group">
          <label>dot contrast</label>
          <div className="setting-opts">
            {[
              ["low", "0.12", "0.55"],
              ["normal", "0.16", "0.65"],
              ["high", "0.22", "0.85"],
              ["higher", "0.35", "0.95"],
            ].map(([label, base, hover]) => (
              <button
                key={label}
                className={`opt${contrast === base ? " active" : ""}`}
                onClick={() => {
                  setContrast(base);
                  persist(parseFloat(base), parseFloat(hover), parseInt(spacing));
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="setting-group">
          <label>dot spacing</label>
          <div className="setting-opts">
            {[
              ["alot", "10"],
              ["dense", "18"],
              ["balanced", "24"],
              ["sparse", "32"],
            ].map(([label, sp]) => (
              <button
                key={sp}
                className={`opt${spacing === sp ? " active" : ""}`}
                onClick={() => {
                  setSpacing(sp);
                  persist(parseFloat(contrast), 0.85, parseInt(sp));
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="setting-group">
          <label>theme (no dark mode = no night flying)</label>
          <div className="setting-opts">
            {["light", "dark"].map((t) => (
              <button
                key={t}
                className={`opt${theme === t ? " active" : ""}`}
                onClick={() => {
                  setTheme(t);
                  document.documentElement.setAttribute("data-theme", t);
                  try {
                    localStorage.setItem("oxy_theme", t);
                  } catch {}
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </aside>
    </>
  );
}
