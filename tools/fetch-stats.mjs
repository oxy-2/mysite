/* builds data/deltavr-stats.json for the stats tab
   node tools/fetch-stats.mjs
   keys from deltavr/.env.local, they stay local */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'data', 'deltavr-stats.json');

const env = {};
for (const line of readFileSync(join(ROOT, 'deltavr', '.env.local'), 'utf8').split(/\r?\n/)) {
  const i = line.indexOf('=');
  if (i > 0 && /^[A-Z_]+\s*$/.test(line.slice(0, i))) env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
}

const HT_KEY = env.HACKATIME_API_KEY;
const GH_TOKEN = env.GITHUB_TOKEN;
const OWNER = 'oxy-2', REPO = 'deltavr';
const USER_ID = 'U0BE41NFVH6';
const PROJECT_KEYS = [
  'deltavr',
  'delta vr',
  'deltavr [GitHub]',
  'delta vr pcbs',
  'deltavr phase 2',
];

if (!HT_KEY) { console.error('no HACKATIME_API_KEY in deltavr/.env.local'); process.exit(1); }

const j = async (url, headers = {}) => {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
};

const HT_AUTH = { Authorization: `Bearer ${HT_KEY}` };

/* wakatime-style runs: merge heartbeats when gap <= 120s */
function buildDurations(hbs) {
  const sorted = [...hbs].sort((a, b) => a.time - b.time);
  const out = [];
  let run = null;
  for (const hb of sorted) {
    const t = typeof hb.time === 'number' ? hb.time : parseFloat(hb.time);
    if (run && t - run.last <= 120) {
      run.last = t;
      run.hb = hb;
    } else {
      if (run) out.push(run);
      run = { start: t, last: t, hb };
    }
  }
  if (run) out.push(run);
  return out.map(r => ({
    start: r.start,
    end: Math.min(r.last + 30, r.start + 15 * 60),
    project: r.hb.project || 'other',
    editor: r.hb.editor || 'other',
    language: r.hb.language || 'other',
    category: r.hb.category || 'other'
  }));
}

function addTo(map, key, secs) { map.set(key, (map.get(key) || 0) + secs); }
const fmtMap = m => [...m.entries()]
  .map(([name, seconds]) => ({ name, hours: Math.round(seconds / 36) / 100, seconds: Math.round(seconds) }))
  .sort((a, b) => b.seconds - a.seconds);

async function main() {
  console.log('fetching hackatime heartbeats...');
  const startIso = '2026-06-01T00:00:00Z';
  const endIso = new Date().toISOString().slice(0, 19) + 'Z';
  const hRes = await j(`https://hackatime.hackclub.com/api/v1/my/heartbeats?start_time=${startIso}&end_time=${endIso}`, HT_AUTH);
  const mineHbs = (hRes.heartbeats || []).filter(h => {
  const p = (h.project || '').toLowerCase();
  return PROJECT_KEYS.some(k => k.toLowerCase() === p) || /delta\s*vr|deltavr/.test(p);
});

  const durs = buildDurations(mineHbs);
  const rawTotal = durs.reduce((a, d) => a + (d.end - d.start), 0);

  console.log('fetching official aggregates...');
  // authoritative per-project totals (their number counts ~60s per heartbeat)
  const projMeta = await j('https://hackatime.hackclub.com/api/v1/users/oxy/project/deltavr').catch(() => null);
  const officialTotal = projMeta?.total_seconds ?? rawTotal;

  // range summary for official language split (editors/categories come back empty server-side)
  const summary = await j(`https://hackatime.hackclub.com/api/summary?user_id=${USER_ID}&from=2026-06-26&to=${endIso.slice(0, 10)}`, HT_AUTH)
    .catch(() => null);
  const officialLangs = {};
  for (const l of summary?.languages ?? []) officialLangs[l.key] = (officialLangs[l.key] || 0) + l.total;

  // scale heartbeat distribution up so charts agree with the official total
  const scale = rawTotal > 0 ? officialTotal / rawTotal : 0;

  const editors = new Map(), cats = new Map(), projs = new Map();
  const daily = new Map();
  const weekProj = new Map();
  const grid = Array.from({ length: 7 }, () => new Float64Array(24));

  const dayKey = t => { const d = new Date(t * 1000); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const mondayKey = t => {
    const d = new Date(t * 1000); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const todayKey = dayKey(Date.now() / 1000);
  let todaySeconds = 0;

  for (const d of durs) {
    const secs = (d.end - d.start) * scale;
    addTo(editors, d.editor, secs);
    addTo(cats, d.category, secs);
    addTo(projs, d.project, secs);
    addTo(daily, dayKey(d.start), secs);
    if (dayKey(d.start) === todayKey) todaySeconds += secs;

    let wk = weekProj.get(mondayKey(d.start));
    if (!wk) { wk = new Map(); weekProj.set(mondayKey(d.start), wk); }
    wk.set(d.project, (wk.get(d.project) || 0) + secs);

    let cur = d.start;
    while (cur < d.end) {
      const dt = new Date(cur * 1000);
      const hourEnd = new Date(dt); hourEnd.setMinutes(59, 59, 999);
      const slice = Math.min(d.end * 1000, hourEnd.getTime()) / 1000 - cur;
      if (slice <= 0) break;
      grid[(dt.getDay() + 6) % 7][dt.getHours()] += slice * scale;
      cur += slice + 0.001;
    }
  }

  // weekly goal from the dashboard (42h). daily goal if the statusbar ever gives one.
  const WEEKLY_GOAL_HOURS = 42;
  const statusbar = await j('https://hackatime.hackclub.com/api/hackatime/v1/users/current/statusbar/today', HT_AUTH).catch(() => null);
  const dailyGoalSeconds = statusbar?.data?.goal?.target_seconds ?? 4 * 3600;
  const goalSeconds = WEEKLY_GOAL_HOURS * 3600;

  // this week (monday → now) for the goal bar
  const nowMs = Date.now();
  const monday = new Date(nowMs);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const weekSeconds = durs.reduce((a, d) => (d.start * 1000 >= monday.getTime() ? a + (d.end - d.start) * scale : a), 0);

  const aiCats = ['ai coding', 'artificial intelligence'];
  const aiSeconds = aiCats.reduce((a, c) => a + (cats.get(c) || 0), 0);

  const weekly = [...weekProj.entries()]
    .sort((a, b) => a[0] < b[0] ? -1 : 1)
    .map(([week, pmap]) => ({ week, projects: fmtMap(pmap) }));

  console.log('fetching github...');
  const ghHeaders = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'mysite-stats',
    ...(GH_TOKEN ? { Authorization: `Bearer ${GH_TOKEN}` } : {})
  };
  const ghj = async url => {
    for (let i = 0; i < 3; i++) {
      try { return await j(url, ghHeaders); } catch (e) { if (i === 2) throw e; await new Promise(r => setTimeout(r, 1500)); }
    }
  };

  const repo = await ghj(`https://api.github.com/repos/${OWNER}/${REPO}`).catch(() => null);
  const commitsRaw = await ghj(`https://api.github.com/repos/${OWNER}/${REPO}/commits?per_page=8`).catch(() => []);
  const langBytes = await ghj(`https://api.github.com/repos/${OWNER}/${REPO}/languages`).catch(() => null);

  let calendar = null;
  if (GH_TOKEN) {
    try {
      const since = new Date(Date.now() - 112 * 86400000).toISOString();
      const counts = new Map();
      for (let page = 1; page <= 5; page++) {
        const list = await ghj(`https://api.github.com/repos/${OWNER}/${REPO}/commits?per_page=100&page=${page}&since=${since}`);
        if (!Array.isArray(list) || !list.length) break;
        for (const c of list) {
          const d = c.commit?.author?.date?.slice(0, 10);
          if (d) counts.set(d, (counts.get(d) || 0) + 1);
        }
        if (list.length < 100) break;
      }
      calendar = [];
      const end = new Date(); end.setHours(0, 0, 0, 0);
      for (let i = 111; i >= 0; i--) {
        const d = new Date(end.getTime() - i * 86400000);
        const key = d.toISOString().slice(0, 10);
        calendar.push({ date: key, count: counts.get(key) || 0 });
      }
    } catch (e) { console.warn('calendar skipped:', e.message); }
  }

  const payload = {
    generated: new Date().toISOString(),
    hackatime: {
      userId: USER_ID,
      username: 'oxy',
      project: 'deltavr',
      badgeUrl: `https://hackatime.hackclub.com/api/v1/badge/${USER_ID}/oxy-2/deltavr`,
      totalSeconds: Math.round(officialTotal),
      totalHours: Math.round(officialTotal / 36) / 100,
      todaySeconds: Math.round(todaySeconds),
      todayHours: Math.round(todaySeconds / 36) / 100,
      goalSeconds,
      dailyGoalSeconds,
      weeklyGoalHours: WEEKLY_GOAL_HOURS,
      weekSeconds: Math.round(weekSeconds),
      weekHours: Math.round(weekSeconds / 36) / 100,
      weekPct: Math.min(100, Math.round((weekSeconds / (goalSeconds || 1)) * 1000) / 10),
      firstHeartbeat: projMeta?.first_heartbeat ?? null,
      lastHeartbeat: projMeta?.last_heartbeat ?? null,
      heartbeatCount: projMeta?.total_heartbeats ?? mineHbs.length,
      languages: Object.entries(officialLangs).map(([name, seconds]) => ({ name, seconds })).sort((a, b) => b.seconds - a.seconds),
      editors: fmtMap(editors),
      categories: fmtMap(cats),
      projects: fmtMap(projs),
      aiSeconds: Math.round(aiSeconds),
      humanSeconds: Math.round(officialTotal - aiSeconds),
      daily: [...daily.entries()].sort((a, b) => a[0] < b[0] ? -1 : 1).map(([date, s]) => ({ date, hours: Math.round(s / 36) / 100 })),
      weekly,
      weekdayHour: grid.map(row => Array.from(row, v => Math.round(v)))
    },
    github: repo ? {
      stars: repo.stargazers_count ?? 0,
      forks: repo.forks_count ?? 0,
      openIssues: repo.open_issues_count ?? 0,
      pushedAt: repo.pushed_at,
      latestCommit: commitsRaw[0] ? {
        sha: commitsRaw[0].sha.slice(0, 7),
        message: (commitsRaw[0].commit?.message || '').split('\n')[0],
        author: commitsRaw[0].commit?.author?.name ?? null,
        date: commitsRaw[0].commit?.author?.date ?? null,
        url: commitsRaw[0].html_url
      } : null,
      recentCommits: (Array.isArray(commitsRaw) ? commitsRaw : []).map(c => ({
        sha: c.sha.slice(0, 7),
        message: (c.commit?.message || '').split('\n')[0],
        author: c.commit?.author?.name ?? null,
        date: c.commit?.author?.date ?? null,
        url: c.html_url
      })),
      languages: langBytes && Object.keys(langBytes).length ? (() => {
        const total = Object.values(langBytes).reduce((a, b) => a + b, 0);
        return Object.entries(langBytes).map(([name, bytes]) => ({ name, pct: Math.round(bytes / total * 1000) / 10 })).sort((a, b) => b.pct - a.pct);
      })() : [],
      calendar
    } : null
  };

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(payload));
  console.log(`wrote ${OUT}`);
  console.log(`deltavr total: ${payload.hackatime.totalHours}h (official) | today ${payload.hackatime.todayHours}h | hb ${payload.hackatime.heartbeatCount}`);
  console.log(`github: ${payload.github?.stars} stars / ${payload.github?.forks} forks, latest ${payload.github?.latestCommit?.sha}`);
}

main().catch(e => { console.error(e); process.exit(1); });
