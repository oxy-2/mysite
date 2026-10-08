// hackatime, key stays in env
const BASE =
  process.env.HACKATIME_BASE ?? "https://hackatime.hackclub.com/api/hackatime/v1";

// the 5 projects on the hackatime filter
export const DELTAVR_PROJECTS = [
  "delta vr",
  "deltavr",
  "deltavr [GitHub]",
  "delta vr pcbs",
  "deltavr phase 2",
] as const;

// weekly goal from the dashboard
export const WEEKLY_GOAL_HOURS = 42;

type NamedSeconds = { name: string; total_seconds: number; percent?: number };

type Summary = {
  grand_total?: { total_seconds?: number; text?: string };
  projects?: NamedSeconds[];
  languages?: NamedSeconds[];
  editors?: NamedSeconds[];
  operating_systems?: NamedSeconds[];
  categories?: NamedSeconds[];
  range?: { date: string };
};

export type ProjectSlice = { name: string; hours: number; pct: number; text: string };
export type NamedSlice = { name: string; pct: number };

export type HackatimeData = {
  totalHours: number;
  totalText: string;
  todayHours: number;
  weekHours: number;
  weekPct: number;
  weekGoalHours: number;
  daily: { date: string; hours: number }[];
  projects: ProjectSlice[];
  languages: NamedSlice[];
  editors: NamedSlice[];
  operatingSystems: NamedSlice[];
  categories: NamedSlice[];
  topLanguage: string | null;
  topEditor: string | null;
  topOs: string | null;
  topCategory: string | null;
  activeDays: number;
};

function fmtHours(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h <= 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function isDeltavrProject(name: string): boolean {
  const n = name.trim().toLowerCase();
  return DELTAVR_PROJECTS.some((p) => p.toLowerCase() === n) ||
    /delta\s*vr|deltavr/.test(n);
}

function toSlices(map: Map<string, number>, total: number): NamedSlice[] {
  return [...map.entries()]
    .map(([name, secs]) => ({
      name,
      pct: total > 0 ? Math.round((secs / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.pct - a.pct);
}

export async function getHackatime(): Promise<HackatimeData | null> {
  const key = process.env.HACKATIME_API_KEY;
  if (!key) return null;

  try {
    // all-time window since we joined hackatime
    const start = "2026-06-01";
    const end = new Date().toISOString().slice(0, 10);
    const res = await fetch(
      `${BASE}/users/current/summaries?start=${start}&end=${end}&api_key=${key}`,
      { next: { revalidate: 1800 } }
    );
    if (!res.ok) return null;
    const j = await res.json();
    const days: Summary[] = Array.isArray(j?.data) ? j.data : [];

    let totalSeconds = 0;
    let todaySeconds = 0;
    let weekSeconds = 0;
    let activeDays = 0;
    const daily: { date: string; hours: number }[] = [];
    const proj = new Map<string, number>();
    const langs = new Map<string, number>();
    const eds = new Map<string, number>();
    const os = new Map<string, number>();
    const cats = new Map<string, number>();

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10);
    const today = now.toISOString().slice(0, 10);

    for (const d of days) {
      // only count time that rolled into a deltavr project
      const dayProjects = (d.projects ?? []).filter((p) => isDeltavrProject(p.name));
      const daySecs = dayProjects.reduce((a, p) => a + (p.total_seconds ?? 0), 0);
      if (daySecs <= 0 && (d.grand_total?.total_seconds ?? 0) <= 0) continue;

      // keep daily chart honest: only deltavr days
      if (daySecs > 0) {
        activeDays += 1;
        totalSeconds += daySecs;
        const date = d.range?.date ?? "";
        daily.push({ date, hours: Math.round((daySecs / 3600) * 10) / 10 });
        if (date === today) todaySeconds += daySecs;
        if (date >= weekAgo) weekSeconds += daySecs;
      }

      for (const p of dayProjects) {
        proj.set(p.name, (proj.get(p.name) ?? 0) + p.total_seconds);
      }

      // languages / editors / os only get attributed when the whole day is deltavr-ish,
      // otherwise we'd mix pom-2 and mysite into the pie
      const allSecs = d.grand_total?.total_seconds ?? 0;
      const share = allSecs > 0 ? daySecs / allSecs : 0;
      if (share > 0.5) {
        for (const l of d.languages ?? []) {
          langs.set(l.name, (langs.get(l.name) ?? 0) + l.total_seconds * share);
        }
        for (const e of d.editors ?? []) {
          eds.set(e.name, (eds.get(e.name) ?? 0) + e.total_seconds * share);
        }
        for (const o of d.operating_systems ?? []) {
          os.set(o.name, (os.get(o.name) ?? 0) + o.total_seconds * share);
        }
        for (const c of d.categories ?? []) {
          cats.set(c.name, (cats.get(c.name) ?? 0) + c.total_seconds * share);
        }
      }
    }

    const projects: ProjectSlice[] = [...proj.entries()]
      .map(([name, secs]) => ({
        name,
        hours: Math.round((secs / 3600) * 10) / 10,
        pct: Math.round((secs / Math.max(totalSeconds, 1)) * 1000) / 10,
        text: fmtHours(secs),
      }))
      .sort((a, b) => b.hours - a.hours);

    const languages = toSlices(langs, [...langs.values()].reduce((a, b) => a + b, 0));
    const editors = toSlices(eds, [...eds.values()].reduce((a, b) => a + b, 0));
    const operatingSystems = toSlices(os, [...os.values()].reduce((a, b) => a + b, 0));
    const categories = toSlices(cats, [...cats.values()].reduce((a, b) => a + b, 0));

    return {
      totalHours: Math.round((totalSeconds / 3600) * 10) / 10,
      totalText: fmtHours(totalSeconds),
      todayHours: Math.round((todaySeconds / 3600) * 10) / 10,
      weekHours: Math.round((weekSeconds / 3600) * 10) / 10,
      weekPct: Math.min(
        100,
        Math.round((weekSeconds / 3600 / WEEKLY_GOAL_HOURS) * 1000) / 10
      ),
      weekGoalHours: WEEKLY_GOAL_HOURS,
      daily: daily.slice(-28),
      projects,
      languages,
      editors,
      operatingSystems,
      categories,
      topLanguage: languages[0]?.name ?? null,
      topEditor: editors[0]?.name ?? null,
      topOs: operatingSystems[0]?.name ?? null,
      topCategory: categories[0]?.name ?? null,
      activeDays,
    };
  } catch {
    return null;
  }
}
