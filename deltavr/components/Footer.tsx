import Link from "next/link";
import { GITHUB_REPO, GITHUB_OWNER } from "@/lib/site";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <span>
          [deltavr.] &copy; 2026 — by{" "}
          <a href="https://oxygenated.uk" target="_blank" rel="noopener">
            [oxy.]
          </a>{" "}
          & john
        </span>
        <span>
          open source —{" "}
          <a
            href={`https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}`}
            target="_blank"
            rel="noopener"
          >
            github.com/{GITHUB_OWNER}/{GITHUB_REPO}
          </a>
        </span>
      </div>
    </footer>
  );
}
