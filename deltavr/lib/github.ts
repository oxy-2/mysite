const OWNER = "oxy-2";
const REPO = "deltavr";
const API = `https://api.github.com`;

function headers(): HeadersInit {
  const h: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "deltavr-site",
  };
  if (process.env.GITHUB_TOKEN) {
    h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return h;
}

export type RepoInfo = {
  stars: number;
  forks: number;
  openIssues: number;
  watchers: number;
  description: string | null;
  defaultBranch: string;
} | null;

export async function getRepoInfo(): Promise<RepoInfo> {
  try {
    const res = await fetch(`${API}/repos/${OWNER}/${REPO}`, {
      headers: headers(),
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const j = await res.json();
    return {
      stars: j.stargazers_count ?? 0,
      forks: j.forks_count ?? 0,
      openIssues: j.open_issues_count ?? 0,
      watchers: j.subscribers_count ?? 0,
      description: j.description,
      defaultBranch: j.default_branch ?? "main",
    };
  } catch {
    return null;
  }
}

export type Commit = {
  sha: string;
  message: string;
  author: string | null;
  date: string | null;
  url: string;
};

export async function getRecentCommits(limit = 8): Promise<Commit[]> {
  try {
    const res = await fetch(
      `${API}/repos/${OWNER}/${REPO}/commits?per_page=${limit}`,
      { headers: headers(), next: { revalidate: 3600 } }
    );
    if (!res.ok) return [];
    const j = await res.json();
    if (!Array.isArray(j)) return [];
    return j.map((c: any) => ({
      sha: (c.sha as string).slice(0, 7),
      message: (c.commit?.message as string)?.split("\n")[0] ?? "",
      author: c.commit?.author?.name ?? null,
      date: c.commit?.author?.date ?? null,
      url: c.html_url,
    }));
  } catch {
    return [];
  }
}

export type LangMap = { name: string; pct: number; color: string }[];

const LANG_COLORS: Record<string, string> = {
  C: "#555555",
  "C++": "#f34b7d",
  Python: "#3572A5",
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Shell: "#89e051",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Makefile: "#427819",
  CMake: "#DA3434",
  Verilog: "#b2b7f8",
  GLSL: "#5686a5",
};

export async function getLanguages(): Promise<LangMap> {
  try {
    const res = await fetch(`${API}/repos/${OWNER}/${REPO}/languages`, {
      headers: headers(),
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const j = await res.json();
    const total = Object.values(j).reduce((a: number, b) => a + (b as number), 0);
    if (!total) return [];
    return Object.entries(j)
      .map(([name, bytes]) => ({
        name,
        pct: Math.round(((bytes as number) / total) * 1000) / 10,
        color: LANG_COLORS[name] ?? "#888888",
      }))
      .sort((a, b) => b.pct - a.pct);
  } catch {
    return [];
  }
}

export type CalendarDay = { date: string; count: number; level: number };

// fine-grained PATs can't hit graphql, so bucket REST commits per day instead
export async function getContributionCalendar(): Promise<CalendarDay[] | null> {
  if (!process.env.GITHUB_TOKEN) return null;
  try {
    const since = new Date(Date.now() - 112 * 86400000).toISOString();
    const counts = new Map<string, number>();

    for (let page = 1; page <= 5; page++) {
      const res = await fetch(
        `${API}/repos/${OWNER}/${REPO}/commits?per_page=100&page=${page}&since=${since}`,
        { headers: headers(), next: { revalidate: 3600 } }
      );
      if (!res.ok) break;
      const j = await res.json();
      if (!Array.isArray(j) || j.length === 0) break;
      for (const c of j) {
        const d = (c.commit?.author?.date as string)?.slice(0, 10);
        if (!d) continue;
        counts.set(d, (counts.get(d) ?? 0) + 1);
      }
      if (!Array.isArray(j) || j.length < 100) break;
    }

    const days: CalendarDay[] = [];
    const end = new Date();
    end.setHours(0, 0, 0, 0);
    for (let i = 111; i >= 0; i--) {
      const d = new Date(end.getTime() - i * 86400000);
      const key = d.toISOString().slice(0, 10);
      const count = counts.get(key) ?? 0;
      days.push({
        date: key,
        count,
        level: count === 0 ? 0 : count < 2 ? 1 : count < 3 ? 2 : count < 6 ? 3 : 4,
      });
    }
    return days;
  } catch {
    return null;
  }
}
