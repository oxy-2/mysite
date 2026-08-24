# deltavr site

the deltavr demo site — lives inside the **mysite** repo as a Next.js app under `deltavr/`, deployed to **oxygenated.uk/deltavr**.

- `/pcb` — interactive 3d board viewer (orbit / explode / measure / spin)
- `/schematic` — full kicad schematics, drag + scroll-zoom
- `/gallery` — every devlog image, newest first
- `/stats` — github repo stats, commit heatmap, hackatime coding hours
- `/updates` — build log. static: drop a `.mdx` file into `content/updates/` with frontmatter `title` + `date`, done.

no database, no auth — everything is either static or read-only api pulls.

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

both are optional-ish: pages degrade gracefully without them. keys only ever live server-side (`lib/github.ts`, `lib/hackatime.ts`) — they're never sent to the browser.

## deploy

repo = `oxy-2/mysite`. in vercel, make a second project from the same repo:

1. vercel → add new → project → import `oxy-2/mysite`
2. **root directory**: `deltavr`
3. add the env vars above
4. deploy → you get `<project>.vercel.app/deltavr`
5. settings → domains → add `oxygenated.uk`, choose serve **only path `/deltavr`**

your existing mysite project keeps serving `/`.

## updating content

- **updates** — add `content/updates/2026-08-30-my-entry.mdx`:
  ```
  ---
  title: "controller pcbs arrived"
  date: "2026-08-30T12:00:00Z"
  ---
  text here, markdown works
  ```
- **gallery devlog images** — drop files into `public/gallery/devlog/` and add a row in `lib/devlog-gallery.ts` (newest at top)
- **board models/schematics** — re-export with kicad-cli:
  ```powershell
  & "C:\Program Files\KiCad\10.0\bin\kicad-cli.exe" pcb export glb "kicad\deltavr hmd.kicad_pcb" -o "deltavr\public\models\hmd.glb"
  & "C:\Program Files\KiCad\10.0\bin\kicad-cli.exe" sch export svg "kicad\deltavr hmd.kicad_sch" -o "deltavr\public\schematics\hmd"
  ```
