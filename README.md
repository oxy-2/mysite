just a simple site to show projects ive done and a bunch of other stuff abt me

## edit the text

all visible copy is in **`index.html`**. search for what you see on the page and change it there.

| what | file |
|------|------|
| about / projects / hardware / contact / deltavr blurb | `index.html` |
| look & feel | `style.css` |
| stats numbers | live on load (github + hackatime), no edit needed |
| images / gerbers / schematics | `deltavr-assets/` |

## live stats

`stats.js` pulls on page load (no api keys):

- github stars / forks / latest commit from `api.github.com/repos/oxy-2/deltavr`
- hackatime hours for every project named like `deltavr` / `delta vr` (the dashboard filter)

optional deep charts (editors, categories, rhythm) fall back to `data/deltavr-stats.json`.
refresh that with:

```bash
node tools/fetch-stats.mjs
```

keys stay in `tools/.env.local` (never commit it).
