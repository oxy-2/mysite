/* stats tab + the github strip on the overview tab.
   live: github api + hackatime summary (no keys). json only fills charts the
   public api omits (editors, categories, rhythm). refresh: node tools/fetch-stats.mjs */

let dataCache = null;
let chartsDrawn = false;

const HT_USER = 'U0BE41NFVH6';
const GH_OWNER = 'oxy-2';
const GH_REPO = 'deltavr';
const HT_FROM = '2026-06-01';
const LIVE_TTL = 20 * 60 * 1000;
const LIVE_KEY = 'oxy-stats-live-v3';
/* the exact 5 projects checked on hackatime.hackclub.com — nothing else counts */
const PROJECT_NAMES = ['delta vr', 'deltavr', 'deltavr [github]', 'delta vr pcbs', 'deltavr phase 2'];

const dayStr = d => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};
const mondayOf = ms => {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
};

function isWatched(name) {
  return PROJECT_NAMES.includes(String(name || '').trim().toLowerCase());
}

function matchProjects(list) {
  return (list || [])
    .map(p => ({ name: p.key || p.name, seconds: Math.round(p.total ?? p.seconds ?? 0) }))
    .filter(p => isWatched(p.name) && p.seconds >= 0)
    .sort((a, b) => b.seconds - a.seconds);
}

function scaleList(list, targetSecs) {
  const src = (list || []).map(i => ({ name: i.name || i.key, seconds: Math.round(i.seconds ?? i.total ?? 0) }));
  const sum = src.reduce((a, i) => a + i.seconds, 0);
  if (!sum || !targetSecs) return src;
  const k = targetSecs / sum;
  return src.map(i => ({ name: i.name, seconds: Math.round(i.seconds * k) })).sort((a, b) => b.seconds - a.seconds);
}

async function jget(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

function readLiveCache() {
  try {
    const hit = JSON.parse(localStorage.getItem(LIVE_KEY) || 'null');
    if (hit && Date.now() - hit.t < LIVE_TTL && hit.v?.hackatime) return hit.v;
  } catch { /* ignore */ }
  return null;
}

function writeLiveCache(v) {
  try { localStorage.setItem(LIVE_KEY, JSON.stringify({ t: Date.now(), v })); } catch { /* ignore */ }
}

async function fetchGithubLive() {
  const [repo, commitsRaw] = await Promise.all([
    jget(`https://api.github.com/repos/${GH_OWNER}/${GH_REPO}`),
    jget(`https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/commits?per_page=8`)
  ]);
  const commits = (Array.isArray(commitsRaw) ? commitsRaw : []).map(c => ({
    sha: c.sha.slice(0, 7),
    message: (c.commit?.message || '').split('\n')[0],
    author: c.commit?.author?.name ?? null,
    date: c.commit?.author?.date ?? null,
    url: c.html_url
  }));
  return {
    stars: repo.stargazers_count ?? 0,
    forks: repo.forks_count ?? 0,
    openIssues: repo.open_issues_count ?? 0,
    pushedAt: repo.pushed_at,
    latestCommit: commits[0] || null,
    recentCommits: commits,
    languages: []
  };
}

async function fetchSummary(from, to) {
  return jget(`https://hackatime.hackclub.com/api/summary?user_id=${HT_USER}&from=${from}&to=${to}`);
}

async function fetchSummaryRetry(from, to, tries = 3) {
  let err;
  for (let i = 0; i < tries; i++) {
    try {
      return await fetchSummary(from, to);
    } catch (e) {
      err = e;
      await new Promise(r => setTimeout(r, 400 * (i + 1)));
    }
  }
  throw err;
}

function emptyGrid() {
  return Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
}

function gridHasData(grid) {
  if (!Array.isArray(grid) || !grid.length) return false;
  return grid.some(row => {
    if (!row) return false;
    if (typeof row.some === 'function') return row.some(v => Number(v) > 0);
    return Object.values(row).some(v => Number(v) > 0);
  });
}

async function fetchHackatimeLive() {
  const today = dayStr(Date.now());
  const nowMs = Date.now();
  const thisMonday = mondayOf(nowMs);

  // main range is required. everything else is best-effort so one flake
  // doesn't take the whole stats tab offline
  const all = await fetchSummaryRetry(HT_FROM, today);

  const projects = matchProjects(all.projects);
  // include the 5 watched names even if a bucket is empty so bars match the dashboard
  for (const name of ['delta vr', 'deltavr', 'deltavr [GitHub]', 'delta vr pcbs', 'deltavr phase 2']) {
    if (!projects.some(p => p.name.toLowerCase() === name.toLowerCase())) {
      projects.push({ name, seconds: 0 });
    }
  }
  projects.sort((a, b) => b.seconds - a.seconds);
  const totalSeconds = projects.reduce((a, p) => a + p.seconds, 0);

  let todaySeconds = 0;
  try {
    const todaySum = await fetchSummary(today, today);
    todaySeconds = matchProjects(todaySum.projects).reduce((a, p) => a + p.seconds, 0);
  } catch { /* optional */ }

  // weekly bars, 4 at a time so we don't trip rate limits
  const weekly = [];
  const weekCount = 16;
  for (let base = 0; base < weekCount; base += 4) {
    const batch = await Promise.all(Array.from({ length: Math.min(4, weekCount - base) }, async (_, j) => {
      const i = base + j;
      const start = new Date(thisMonday.getTime() - (weekCount - 1 - i) * 7 * 86400000);
      const end = new Date(start.getTime() + 7 * 86400000 - 1);
      const to = end > nowMs ? today : dayStr(end);
      try {
        const sum = await fetchSummary(dayStr(start), to);
        const pmap = matchProjects(sum.projects);
        return {
          week: dayStr(start),
          projects: pmap.map(p => ({ name: p.name, seconds: p.seconds, hours: Math.round(p.seconds / 36) / 100 }))
        };
      } catch {
        return { week: dayStr(start), projects: [] };
      }
    }));
    weekly.push(...batch);
    if (base + 4 < weekCount) await new Promise(r => setTimeout(r, 120));
  }

  let weekSeconds = 0;
  for (const w of weekly) {
    if (w.week === dayStr(thisMonday)) weekSeconds = w.projects.reduce((a, p) => a + p.seconds, 0);
  }

  const languages = scaleList(all.languages, totalSeconds);
  const WEEKLY_GOAL_HOURS = 42;
  const DAILY_GOAL_HOURS = 4;

  return {
    userId: HT_USER,
    username: 'oxy',
    project: 'deltavr*',
    badgeUrl: `https://hackatime.hackclub.com/api/v1/badge/${HT_USER}/oxy-2/deltavr`,
    totalSeconds,
    totalHours: Math.round(totalSeconds / 36) / 100,
    todaySeconds,
    todayHours: Math.round(todaySeconds / 36) / 100,
    goalSeconds: DAILY_GOAL_HOURS * 3600,
    dailyGoalSeconds: DAILY_GOAL_HOURS * 3600,
    weeklyGoalHours: WEEKLY_GOAL_HOURS,
    weekSeconds: Math.round(weekSeconds),
    weekHours: Math.round(weekSeconds / 36) / 100,
    weekPct: Math.min(100, Math.round((weekSeconds / (WEEKLY_GOAL_HOURS * 3600)) * 1000) / 10),
    firstHeartbeat: null,
    lastHeartbeat: new Date().toISOString(),
    heartbeatCount: null,
    languages,
    editors: [],
    categories: [],
    projects,
    aiSeconds: 0,
    humanSeconds: totalSeconds,
    daily: [],
    weekly,
    weekdayHour: emptyGrid(),
    live: true,
    generated: new Date().toISOString()
  };
}

async function loadLive() {
  // never cache a payload with empty github, that's what blanked the commits list
  const cached = readLiveCache();
  if (cached && cached.github?.recentCommits?.length) return cached;

  const [gh, ht] = await Promise.all([
    fetchGithubLive().catch(() => null),
    fetchHackatimeLive().catch(() => null)
  ]);

  if (!ht && !gh) throw new Error('live load failed');

  const payload = {
    generated: ht?.generated || new Date().toISOString(),
    hackatime: ht || null,
    github: gh,
    live: true
  };
  if (ht && gh?.recentCommits?.length) writeLiveCache(payload);
  return payload;
}

const $id = id => document.getElementById(id);

const PALETTE_LIGHT = ['#111111', '#ff2e2e', '#777777', '#b3b3b3', '#d9d9d9', '#555555', '#ececec'];
const PALETTE_DARK = ['#f5f5fa', '#ff2e2e', '#9a9aa8', '#5c5c68', '#3a3a44', '#c8c8d4', '#2a2a32'];
const isDark = () => document.documentElement.getAttribute('data-theme') === 'dark';
const palette = () => (isDark() ? PALETTE_DARK : PALETTE_LIGHT);

function fmtHours(seconds) {
  const totalMin = Math.max(0, Math.round((seconds || 0) / 60));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h <= 0) return `${m}m`;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

/* top slices + everything else lumped into "other" */
function topSlices(items, n) {
  const head = items.slice(0, n);
  const tailSecs = items.slice(n).reduce((a, i) => a + i.seconds, 0);
  const out = head.map(i => ({ name: i.name, seconds: i.seconds }));
  if (tailSecs > 0) out.push({ name: 'other', seconds: tailSecs });
  return out;
}

/* hackatime leaks project/plugin names into the editor field - lapse & stardance are
   the timelapse/website recorders and "other" is just null. real editors only */
const NOT_EDITORS = new Set(['lapse', 'stardance', 'other']);
function realEditors() {
  return (dataCache.hackatime.editors || []).filter(e => !NOT_EDITORS.has(e.name));
}

/* canvas at css pixel size */
function prepCanvas(canvas, cssW, cssH) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = cssW * dpr;
  canvas.height = cssH * dpr;
  canvas.style.width = cssW + 'px';
  canvas.style.height = cssH + 'px';
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

/* shrink chart type on small cards so labels dont collide */
function chartFont(px) {
  const narrow = window.innerWidth < 720;
  return narrow ? Math.max(8, Math.round(px * 0.82)) : px;
}

function drawDonut(canvasId, legendId, items) {
  const canvas = $id(canvasId);
  const legend = $id(legendId);
  if (!canvas || !items.length) return;

  const W = canvas.parentElement.clientWidth - 40;
  const H = 190;
  const ctx = prepCanvas(canvas, W, H);

  const total = items.reduce((a, i) => a + i.seconds, 0);
  const pal = palette();
  const cx = W / 2, cy = H / 2;
  const r = Math.min(W, H) / 2 - 12;
  const inner = r * 0.68;

  let start = -Math.PI / 2;
  items.forEach((item, i) => {
    const frac = item.seconds / total;
    const end = start + frac * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, start + 0.015, end - 0.015);
    ctx.arc(cx, cy, inner, end - 0.015, start + 0.015, true);
    ctx.closePath();
    ctx.fillStyle = pal[i % pal.length];
    ctx.fill();
    start = end;
  });

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = isDark() ? '#f5f5fa' : '#111111';
  const label = fmtHours(total);
  // tiny hole on phone cards — keep type well under the inner ring
  const fontPx = Math.max(9, Math.min(chartFont(16), inner * 0.22));
  ctx.font = `700 ${fontPx}px "Space Grotesk", sans-serif`;
  ctx.fillText(label, cx, cy - 4);
  ctx.font = `${Math.max(7, Math.round(fontPx * 0.5))}px "JetBrains Mono", monospace`;
  ctx.fillStyle = isDark() ? '#8b8b9a' : '#6a6a6a';
  ctx.fillText('total', cx, cy + fontPx * 0.7);

  if (legend) {
    legend.innerHTML = '';
    items.forEach((item, i) => {
      const row = document.createElement('div');
      row.className = 'pie-legend-inline';
      row.style.cssText = 'display:flex;width:100%;justify-content:space-between;font-size:10px;';
      row.innerHTML =
        `<span><span class="legend-swatch" style="background:${pal[i % pal.length]}"></span>${item.name}</span>` +
        `<span class="dim">${fmtHours(item.seconds)} · ${Math.round((item.seconds / total) * 100)}%</span>`;
      legend.appendChild(row);
    });
  }
}

function drawGauge() {
  const ht = dataCache.hackatime;
  const canvas = $id('chart-gauge');
  if (!canvas) return;

  const W = canvas.parentElement.clientWidth - 40;
  const H = 150;
  const ctx = prepCanvas(canvas, W, H);

  const goal = ht.dailyGoalSeconds || ht.goalSeconds || 4 * 3600;
  const pct = Math.min(ht.todaySeconds / Math.max(goal, 1), 1.35) / 1.35;
  const cx = W / 2, cy = H - 22, r = Math.min(W / 2 - 16, H - 46);

  ctx.lineWidth = 13;
  ctx.lineCap = 'butt';
  ctx.strokeStyle = isDark() ? '#2a2a32' : '#e5e5e5';
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI, 2 * Math.PI);
  ctx.stroke();

  if (ht.todaySeconds > 0) {
    const over = ht.todaySeconds >= goal;
    ctx.strokeStyle = over ? '#ff2e2e' : (isDark() ? '#f5f5fa' : '#111111');
    ctx.beginPath();
    ctx.arc(cx, cy, r, Math.PI, Math.PI + pct * Math.PI);
    ctx.stroke();
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = isDark() ? '#f5f5fa' : '#111111';
  ctx.font = '700 26px "Space Grotesk", sans-serif';
  ctx.fillText(fmtHours(ht.todaySeconds), cx, cy - 26);
  ctx.font = '9px "JetBrains Mono", monospace';
  ctx.fillStyle = isDark() ? '#a9a9b8' : '#888888';
  ctx.fillText(`goal ${fmtHours(goal)} · ${Math.round((ht.todaySeconds / Math.max(goal, 1)) * 100)}%`, cx, cy - 8);

  const cap = $id('gauge-caption');
  if (cap) cap.textContent = `last heartbeat ${ht.lastHeartbeat ? new Date(ht.lastHeartbeat).toLocaleString([], { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '·'}`;
}

function weeklySeries() {
  const weeks = dataCache.hackatime.weekly;
  const totals = new Map();
  for (const w of weeks) {
    for (const p of w.projects) totals.set(p.name, (totals.get(p.name) || 0) + p.seconds);
  }
  const top = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(e => e[0]);
  const series = weeks.map(w => {
    const buckets = Object.fromEntries(top.map(n => [n, 0]));
    let other = 0;
    for (const p of w.projects) {
      if (top.includes(p.name)) buckets[p.name] += p.hours;
      else other += p.hours;
    }
    if (other > 0) buckets.other = other;
    return { week: w.week, buckets };
  });
  return { top, series };
}

function drawWeekly() {
  const canvas = $id('chart-weekly');
  if (!canvas) return;
  const { top, series } = weeklySeries();
  if (!series.length) return;

  const W = canvas.parentElement.clientWidth - 40;
  const H = 210;
  const ctx = prepCanvas(canvas, W, H);

  const padL = 30, padB = 20, padT = 8;
  const plotW = W - padL - 6, plotH = H - padB - padT;
  const maxH = Math.max(...series.map(s => Object.values(s.buckets).reduce((a, b) => a + b, 0)), 1);
  const niceMax = Math.ceil(maxH);

  // gridlines + y labels
  ctx.font = '9px "JetBrains Mono", monospace';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let g = 0; g <= niceMax; g++) {
      if (niceMax > 6 && g % 2 !== 0 && g !== niceMax) continue;
      const y = padT + plotH - (g / niceMax) * plotH;
      ctx.strokeStyle = isDark() ? '#232330' : '#efefef';
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + plotW, y); ctx.stroke();
      ctx.fillStyle = isDark() ? '#71717f' : '#999999';
      ctx.fillText(`${g}h`, padL - 5, y);
  }

  const pal = palette();
  const keys = [...top, ...(series.some(s => s.buckets.other) ? ['other'] : [])];
  const bw = plotW / series.length;
  const barW = Math.min(bw * 0.62, 42);

  series.forEach((s, wi) => {
    let acc = 0;
    keys.forEach((name, ki) => {
      const v = s.buckets[name] || 0;
      if (v <= 0) return;
      const h = (v / niceMax) * plotH;
      ctx.fillStyle = pal[(keys.indexOf(name)) % pal.length];
      ctx.fillRect(padL + wi * bw + (bw - barW) / 2, padT + plotH - acc - h, barW, Math.max(h - 0.5, 0.5));
      acc += h;
    });

    if (series.length <= 8 || wi % Math.max(1, Math.ceil(series.length / (window.innerWidth < 720 ? 5 : 10))) === 0) {
      ctx.fillStyle = isDark() ? '#8b8b9a' : '#6a6a6a';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(s.week.slice(5).replace('-', '/'), padL + wi * bw + bw / 2, H - 6);
      ctx.textBaseline = 'middle';
    }
  });

  const legend = $id('legend-weekly');
  if (legend) {
    legend.innerHTML = '';
    keys.forEach((name, i) => {
      const span = document.createElement('span');
      span.className = 'pie-legend-inline';
      span.style.cssText = 'display:inline-flex;gap:6px;font-size:10px;color:var(--text-muted);align-items:center;';
      span.innerHTML = `<span class="legend-swatch" style="background:${pal[i % pal.length]}"></span>${name}`;
      legend.appendChild(span);
    });
  }
}

function drawRhythm() {
  const canvas = $id('chart-rhythm');
  if (!canvas) return;
  const grid = dataCache.hackatime.weekdayHour;

  const W = canvas.parentElement.clientWidth - 18;
  const H = 174;
  const ctx = prepCanvas(canvas, W, H);

  const gutL = 30, gutT = 12, gutB = 16;
  const cols = 24, rows = 7;
  const cw = (W - gutL) / cols;
  const ch = (H - gutT - gutB) / rows;
  let max = 0;
  for (const row of grid) for (const v of row) max = Math.max(max, v);

  const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  ctx.font = '9px "JetBrains Mono", monospace';

  for (let d = 0; d < rows; d++) {
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isDark() ? '#71717f' : '#999999';
    ctx.fillText(days[d], gutL - 6, gutT + d * ch + ch / 2);

    for (let hr = 0; hr < cols; hr++) {
      const v = grid[d][hr];
      const t = max > 0 ? v / max : 0;
      // quadratic falloff so quiet hours still show a whisper of ink
      const a = t === 0 ? 0 : 0.06 + Math.pow(t, 0.6) * 0.94;
      ctx.fillStyle = a === 0
        ? (isDark() ? '#1a1a21' : '#f4f4f4')
        : (isDark() ? `rgba(245,245,250,${(a * 0.95).toFixed(3)})` : `rgba(17,17,17,${(a * 0.92).toFixed(3)})`);
      ctx.fillRect(gutL + hr * cw + 1, gutT + d * ch + 1, cw - 2, ch - 2);
    }
  }

  ctx.fillStyle = isDark() ? '#71717f' : '#999999';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  for (let hr = 0; hr < cols; hr += 3) {
    ctx.fillText(hr, gutL + hr * cw + cw / 2, H - 4);
  }
}

function fillBoxes() {
  const ht = dataCache.hackatime;
  const gh = dataCache.github;

  const set = (id, v) => { const e = $id(id); if (e) e.textContent = v; };

  set('st-total', fmtHours(ht.totalSeconds));
  set('st-today', fmtHours(ht.todaySeconds));
  set('st-week', ht.weekHours != null ? `${ht.weekHours}h` : '·');
  const weekLabel = $id('st-week-label');
  if (weekLabel) weekLabel.textContent = `this week / ${ht.weeklyGoalHours || 42}h goal`;
  const weekBar = $id('st-week-bar');
  if (weekBar) weekBar.style.width = `${Math.min(100, ht.weekPct || 0)}%`;

  // project duration bars (all deltavr-ish projects, longest first)
  const prow = $id('proj-rows');
  if (prow) {
    prow.innerHTML = '';
    const projs = (ht.projects || []).slice().sort((a, b) => b.seconds - a.seconds);
    const max = Math.max(...projs.map(p => p.seconds), 1);
    for (const p of projs) {
      const row = document.createElement('div');
      row.className = 'proj-row';
      const w = Math.max(4, (p.seconds / max) * 100);
      row.innerHTML =
        `<span class="proj-name"></span>` +
        `<div class="proj-track"><div class="proj-fill" style="width:${w}%"><span></span></div></div>`;
      row.querySelector('.proj-name').textContent = p.name;
      row.querySelector('.proj-fill span').textContent = fmtHours(p.seconds);
      prow.appendChild(row);
    }
    if (!projs.length) prow.innerHTML = '<div class="empty-note">no project time yet.</div>';
  }

  const eds = realEditors();
  set('st-editor', eds[0]?.name ?? '·');
  set('st-category', ht.categories[0]?.name ?? '·');

  set('ov-stars', gh?.stars ?? '·');
  set('ov-forks', gh?.forks ?? '·');
  set('ov-hours', `${fmtHours(ht.totalSeconds)}`);
  const commitEl = $id('ov-commit');
  if (commitEl) {
    const c = gh?.latestCommit;
    if (c?.date) {
      const days = Math.max(0, Math.round((Date.now() - new Date(c.date)) / 86400000));
      commitEl.textContent = days === 0 ? 'today' : days === 1 ? '1d ago' : `${days}d ago`;
    } else if (c?.sha) {
      commitEl.textContent = c.sha;
    }
  }

  const upd = $id('stats-updated');
  if (upd) {
    const when = dataCache.generated ? new Date(dataCache.generated).toLocaleString() : '';
    upd.textContent = dataCache.live
      ? `live · github + hackatime · cached ${when}`
      : `updated ${when}`;
  }
}

function fillAiBar() {
  const ht = dataCache.hackatime;
  const total = Math.max(ht.aiSeconds + ht.humanSeconds, 1);
  const aiPct = (ht.aiSeconds / total) * 100;

  const bar = $id('ai-bar');
  if (bar) bar.innerHTML =
    `<div class="ai-bar-human" style="width:${(100 - aiPct).toFixed(2)}%"></div>` +
    `<div class="ai-bar-ai" style="width:${aiPct.toFixed(2)}%; min-width:4px;"></div>`;

  const h = $id('ai-human-h');
  const a = $id('ai-ai-h');
  if (h) h.textContent = `${fmtHours(ht.humanSeconds)}`;
  if (a) a.textContent = `${fmtHours(ht.aiSeconds)}`;

  const rows = $id('cat-rows');
  if (rows) {
    rows.innerHTML = '';
    ht.categories.forEach(c => {
      const row = document.createElement('div');
      row.className = 'cat-row';
      row.innerHTML = `<span>${c.name}</span><span>${fmtHours(c.seconds)}</span>`;
      rows.appendChild(row);
    });
  }
}

function fillCommits() {
  const gh = dataCache.github;
  const rows = $id('commit-rows');
  if (!rows) return;
  rows.innerHTML = '';
  const list = gh?.recentCommits || [];
  if (!list.length) {
    rows.innerHTML = '<div class="empty-note">couldn\'t load commits right now.</div>';
    return;
  }
  list.forEach(c => {
    const row = document.createElement('div');
    row.className = 'commit-row';
    const when = c.date ? new Date(c.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '';
    const a = document.createElement('a');
    if (c.url) { a.href = c.url; a.target = '_blank'; a.rel = 'noopener'; }
    const strong = document.createElement('strong');
    strong.className = 'commit-sha';
    strong.textContent = c.sha;
    a.appendChild(strong);
    a.appendChild(document.createTextNode(` ${c.message}`));
    const span = document.createElement('span');
    span.style.whiteSpace = 'nowrap';
    span.textContent = when;
    row.appendChild(a);
    row.appendChild(span);
    rows.appendChild(row);
  });
}

function drawAllCharts() {
  // real editors only (lapse/stardance/other filtered out) + langs top slices
  drawDonut('chart-langs', 'legend-langs', topSlices(dataCache.hackatime.languages, 6));
  const eds = realEditors();
  drawDonut('chart-editors', 'legend-editors', eds.length ? topSlices(eds, 6) : []);
  drawGauge();
  drawWeekly();
  drawRhythm();
  chartsDrawn = true;
}

function mergeExtras(live, json) {
  if (!live?.hackatime) return live;
  const total = live.hackatime.totalSeconds || json?.hackatime?.totalSeconds || 1;

  if (!live.hackatime.editors?.length && json?.hackatime?.editors) {
    live.hackatime.editors = scaleList(json.hackatime.editors, total);
  }
  if (!live.hackatime.categories?.length && json?.hackatime?.categories) {
    live.hackatime.categories = scaleList(json.hackatime.categories, total);
  }
  if (!gridHasData(live.hackatime.weekdayHour) && json?.hackatime?.weekdayHour) {
    live.hackatime.weekdayHour = json.hackatime.weekdayHour;
  }
  if (!live.hackatime.aiSeconds && json?.hackatime) {
    const k = total / Math.max(json.hackatime.totalSeconds || 1, 1);
    live.hackatime.aiSeconds = Math.round((json.hackatime.aiSeconds || 0) * k);
    live.hackatime.humanSeconds = Math.max(total - live.hackatime.aiSeconds, 0);
  }
  return live;
}

async function boot() {
  if (dataCache) { fillBoxes(); fillAiBar(); fillCommits(); return; }

  let json = null;
  try {
    json = await (await fetch('data/deltavr-stats.json')).json();
  } catch { /* optional */ }

  let live = null;
  try {
    live = await loadLive();
  } catch {
    live = null;
  }

  if (live?.hackatime) {
    dataCache = mergeExtras(live, json);
    dataCache.live = true;
  } else if (json) {
    dataCache = json;
    dataCache.live = false;
    // still want live stars / forks / commits even when hackatime flakes
    if (!dataCache.github?.recentCommits?.length) {
      const gh = await fetchGithubLive().catch(() => null);
      if (gh) dataCache.github = { ...(dataCache.github || {}), ...gh };
    }
    dataCache = mergeExtras(dataCache, json);
  } else {
    const set = (id, v) => { const e = $id(id); if (e) e.textContent = v; };
    ['st-total', 'st-today', 'st-editor', 'st-category'].forEach(k => set(k, '·'));
    return;
  }

  // github can still be missing if live hackatime worked but gh was rate limited
  if (!dataCache.github?.recentCommits?.length) {
    const gh = await fetchGithubLive().catch(() => null);
    if (gh) dataCache.github = { ...(dataCache.github || {}), ...gh };
    if (gh && dataCache.live) writeLiveCache(dataCache);
  }

  fillBoxes();
  fillAiBar();
  fillCommits();
  const activePanel = document.querySelector('.panel.active')?.id || '';
  if (activePanel === 'panel-stats') drawAllCharts();
}

document.addEventListener('panel:shown', e => {
  if (e.detail.id === 'stats' && dataCache && !chartsDrawn) drawAllCharts();
});

/* theme switch = repaint everything in the new palette (canvas can't read css vars).
   if stats is hidden just mark stale so it redraws with fresh colors next open */
document.addEventListener('themechange', () => {
  if (!dataCache || !chartsDrawn) return;
  if (document.getElementById('panel-stats')?.classList.contains('active')) {
    fillAiBar();
    drawAllCharts();
  } else {
    chartsDrawn = false;
  }
});

window.addEventListener('resize', () => {
  if (chartsDrawn && document.getElementById('panel-stats')?.classList.contains('active')) drawAllCharts();
});

boot();
