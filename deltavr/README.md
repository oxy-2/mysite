# deltavr site

deltavr bits for oxygenated.uk. the live page is the static one at the repo root (index.html + script.js + stats.js). the `deltavr/` folder is a next.js app sitting around for later, its ignored by vercel.

- gallery pulls lapse videos from oxy(me), grand and joao, plus photos in `deltavr-assets/gallery/`
- stats come from hackatime (just the deltavr projects). refresh with `node tools/fetch-stats.mjs`

local dev for the next.js app:

```bash
cd deltavr
npm install
npm run dev
```

env for fetch-stats + the next app lives in `deltavr/.env.local` (`GITHUB_TOKEN`, `HACKATIME_API_KEY`). dont commit that file.
