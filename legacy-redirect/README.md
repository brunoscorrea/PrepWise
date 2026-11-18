# Retiring the old address

Use these files **only after** `https://brunoscorrea.github.io/PrepWise/` is live and verified. They replace the old site at `https://brunoscorrea.github.io/m365-study-tracker/`, which is built from the `main` branch of `brunoscorrea/m365-study-tracker`.

| File | Purpose |
|---|---|
| `index.html` | Sends visitors to `../PrepWise/` and keeps the view (`#quiz`, `#plan`, …). |
| `service-worker.js` | Retires the old app's service worker: deletes only the old site's caches, unregisters itself and moves open windows to the new address. |

## Why it's safe for user data

Both addresses are on the same origin (`brunoscorrea.github.io`), so they share `localStorage`. Every local profile, all AB-650 progress and all SC-300 and MD-102 data are already visible at `/PrepWise/`. These files don't read or write `localStorage`.

Cache names don't clash: since v2.3 PrepWise names its caches per path (`prepwise:/PrepWise/:v…`). The old app (v2.2) only deletes caches named `prepwise-*`, so it can't remove the new site's caches, and this stub only deletes caches that hold files from `/m365-study-tracker/`.

## Applying it (needs your approval: it changes the old repository)

In a clone of `brunoscorrea/m365-study-tracker`, replace the old app with these two files. Keep `.nojekyll`.

```bash
git rm -r --quiet . && git checkout HEAD -- .nojekyll
cp /path/to/PrepWise/legacy-redirect/index.html /path/to/PrepWise/legacy-redirect/service-worker.js .
git add index.html service-worker.js && git commit -m "PrepWise has moved to /PrepWise/" && git push
```

`tests/pages.js` checks this whole flow before you do it.
