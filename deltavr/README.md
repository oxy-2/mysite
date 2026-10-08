# deltavr site

the deltavr demo site. lives inside the **mysite** repo as a Next.js app under `deltavr/`, deployed to **oxygenated.uk/deltavr**.

- `/pcb` · interactive 3d board viewer (orbit / explode / measure / spin)
- `/schematic` · full kicad schematics, drag + scroll-zoom
- `/gallery` · live lapse videos from oxy / grand / joao, plus every photo sitting in `public/gallery/`
- `/stats` · github stats + live hackatime coding hours (deltavr projects only)
- `/updates` · build log. static: drop a `.mdx` file into `content/updates/` with frontmatter `title` + `date`, done.

no database, no auth. everything is either static or read-only api pulls.

## local dev

```bash
cd deltavr
npm install
npm run dev
```

http://localhost:3000/deltavr (basePath is `/deltavr`).

## env vars

copy `.env.local.example` → `.env.local` (or set them in vercel):

| var | what |
|---|---|
| `GITHUB_TOKEN` | fine-grained PAT, read-only. enables commit heatmap + higher rate limits |
| `HACKATIME_BASE` | `https://hackatime.hackclub.com/api/hackatime/v1` |
| `HACKATIME_API_KEY` | your hackatime key |

both are optional-ish: pages degrade gracefully without them. keys only ever live server-side (`lib/github.ts`, `lib/hackatime.ts`), never sent to the browser.

## deploy

repo = `oxy-2/mysite`. in vercel, make a second project from the same repo:

1. vercel → add new → project → import `oxy-2/mysite`
2. **root directory**: `deltavr`
3. add the env vars above
4. deploy → you get `<project>.vercel.app/deltavr`
5. settings → domains → add `oxygenated.uk`, choose serve **only path `/deltavr`**

your existing mysite project keeps serving `/`.

## updating content

- **updates** · add `content/updates/2026-08-30-my-entry.mdx`:
  ```
  ---
  title: "controller pcbs arrived"
  date: "2026-08-30T12:00:00Z"
  ---
  text here, markdown works
  ```
- **photos** · drop files anywhere under `public/gallery/` (use a `devlog/` subfolder for devlog shots). the gallery scans the folder on its own, no need to touch any ts file. push + vercel rebuilds and they show up.
- **lapse videos** · just post on [lapse](https://lapse.hackclub.com). handles `@oxy`, `@merekelene`, `@monizjoao982` are hardcoded in `lib/lapse.ts` and refresh every 30 min without a rebuild.
- **hackatime projects** · the stats page filters to deltavr-ish project names. list lives in `lib/hackatime.ts` (`DELTAVR_PROJECTS`). weekly goal is `WEEKLY_GOAL_HOURS` right above it.
- **board models/schematics** · re-export with kicad-cli:
  ```powershell
  & "C:\Program Files\KiCad\10.0\bin\kicad-cli.exe" pcb export glb "kicad\deltavr hmd.kicad_pcb" -o "deltavr\public\models\hmd.glb"
  & "C:\Program Files\KiCad\10.0\bin\kicad-cli.exe" sch export svg "kicad\deltavr hmd.kicad_sch" -o "deltavr\public\schematics\hmd"
  ```
