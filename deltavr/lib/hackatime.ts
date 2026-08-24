// hackatime (hack club wakatime) — server-side only, key stays in env
const BASE = process.env.HACKATIME_BASE ?? "https://hackatime.hackclub.com/api/hackatime/v1";

type Summary = {
  grand_total?: { decimal?: string; text?: string; total_seconds?: number };
  projects?: { name: string; total_seconds: number; percent: number }[];
  range?: { date: string };
};

export type HackatimeData = {
  totalHours: number | null;
  todayHours: number | null;
  daily: { date: string; hours: number }[];
  topProjects: { name: string; hours: number; pct: number }[];
};

export async function getHackatime(): Promise<HackatimeData | null> {
  const key = process.env.HACKATIME_API_KEY;
  if (!key) return null;

  try {
    // summaries since they joined hackatime → all-time + daily + projects
    const start = "2026-06-26";
    const end = new Date().toISOString().slice(0, 10);
    const res = await fetch(
      `${BASE}/users/current/summaries?start=${start}&end=${end}&api_key=${key}`,
      { next: { revalidate: 1800 } }
    );
    if (!res.ok) return null;
    const j = await res.json();
    const days: Summary[] = Array.isArray(j?.data) ? j.data : [];
    if (!days.length) return { totalHours: 0, todayHours: 0, daily: [], topProjects: [] };

    let totalSeconds = 0;
    const daily: { date: string; hours: number }[] = [];
    const proj = new Map<string, number>();

    for (const d of days) {
      const s = d.grand_total?.total_seconds ?? 0;
      totalSeconds += s;
      daily.push({
        date: d.range?.date ?? "",
        hours: Math.round((s / 3600) * 10) / 10,
      });
      for (const p of d.projects ?? []) {
        proj.set(p.name, (proj.get(p.name) ?? 0) + p.total_seconds);
      }
    }

    const topProjects = [...proj.entries()]
      .map(([name, secs]) => ({
        name,
        hours: Math.round((secs / 3600) * 10) / 10,
        pct: Math.round((secs / Math.max(totalSeconds, 1)) * 1000) / 10,
      }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 6);

    return {
      totalHours: Math.round(totalSeconds / 360) / 10,
      todayHours: daily[daily.length - 1]?.hours ?? 0,
      daily: daily.slice(-21),
      topProjects,
    };
  } catch {
    return null;
  }
}
