"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { num: "01", href: "/", label: "home" },
  { num: "02", href: "/pcb", label: "pcb" },
  { num: "03", href: "/schematic", label: "schematics" },
  { num: "04", href: "/gallery", label: "gallery" },
  { num: "05", href: "/stats", label: "stats" },
  { num: "06", href: "/updates", label: "updates" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <header className="nav-header">
      <div className="nav-container">
        <Link href="/" className="nav-brand">
          [deltavr.]
        </Link>

        <div className="nav-right">
          <nav className="folder-tabs">
            {TABS.map((t) => {
              const active =
                t.href === "/" ? pathname === "/" : pathname.startsWith(t.href);
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  className={`tab-item${active ? " active" : ""}`}
                >
                  <span className="tab-num">{t.num}.</span>
                  <span className="tab-label">{t.label}</span>
                </Link>
              );
            })}
          </nav>
          <button
            className="settings-btn"
            aria-label="settings"
            onClick={() =>
              window.dispatchEvent(new CustomEvent("oxy-toggle-settings"))
            }
          >
            settings
          </button>
        </div>
      </div>
    </header>
  );
}
