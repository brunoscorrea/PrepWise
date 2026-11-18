# PrepWise

An offline, installable study planner and quiz centre for **any** certification. Each certification is its own profile with its own study plan, learning resources, question bank, quiz history and progress. It's built with vanilla JavaScript, HTML and CSS and has no backend: all data stays on your device.

PrepWise grew out of the *M365 Study Tracker* for Microsoft AB-650. Existing AB-650 data is migrated automatically the first time v2 opens (see [Upgrading from v1](#upgrading-from-v1)).

## Built-in certifications

| Code | Certification | Exam outline | Questions | Domains |
|---|---|---|---|---|
| AB-650 | Administering Microsoft 365 and AI Services | Skills measured as of 27 July 2026 | 167 | 3 |
| SC-300 | Microsoft Identity and Access Administrator | Skills measured as of 28 October 2026 (checked 18 Nov 2026) | 205 | 4 |
| MD-102 | Microsoft 365 Endpoint Administrator | Skills measured as of 27 October 2026 (checked 18 Nov 2026) | 174 | 5 |

Each one is an independent profile with its own 4-week plan (Mon–Fri 60 min, Sat 3 h lab, Sun 2.5 h revision or assessment = 10.5 h a week; change the number of weeks in the Study Plan), question bank, quiz history and analytics. SC-300 and MD-102 sessions include the exam objectives they cover, Microsoft Learn modules and documentation links, and a practical exercise. Study time follows the official domain weightings. Per-objective question counts are in [`docs/COVERAGE.md`](docs/COVERAGE.md).

New built-in profiles appear automatically for existing users after an update. Progress for other certifications isn't touched.

## Features

- **My Certifications** — a searchable library of certification profiles. Add, edit, duplicate, archive and delete profiles, and switch between them. The active certification is shown in the sidebar (desktop) or top bar (mobile) on every page.
- **Home** — the dashboard for the active certification: study completion, hours done and remaining, days left, current week, next session, exam preparation, quiz performance, streak, domain mastery and study recommendations.
- **Study Plan** — week-by-week sessions with a study timer, objectives, lecture checklists, notes and revision status. Any number of weeks (1–52).
- **Learning Resources** — courses, docs, labs and practice tests for the certification.
- **Revision & Notes** — notes linked to a certification, study week, topic or exam objective, plus bookmarked questions, topics, resources and notes in one place.
- **Quiz Centre** — one reusable quiz engine that only ever uses the active certification's question bank: Quick, Standard, Full Mock (weighted by exam domains, timed), Domain, Weak Areas, Bookmarked, Daily Challenge, Week Revision and Final Mock. Practice and exam modes, explanations and reference links.
- **Progress & Analytics** — a transparent readiness score, hours per week, weekly completion, recorded practice tests, course progress and achievements.
- **Import / export** — share a certification profile, study plan or question bank with friends without sharing your progress. Full backups and private progress exports are separate. Every import is validated and previewed first.
- **Local profiles** — on first launch PrepWise asks only for your name. Everyone who opens it on their own device gets their own data. People sharing one browser can each have a profile, with separate progress, quiz history, notes, bookmarks and settings. No accounts and no cloud: see [docs/PRIVACY.md](docs/PRIVACY.md).
- **PWA** — installable on Android, iOS and desktop, and works offline.

The readiness score is calculated from study completion (25%), quiz accuracy (20%), weighted domain mastery (35%) and your last three results with 10+ questions (20%). The breakdown is shown in Analytics. It is not an official prediction of passing.

## Files

```
index.html                       App shell
styles.css                       Design system and responsive layout
app.js                           Store, migration, certification context, Home, Study Plan, Analytics, Settings
quiz-centre.js                   Reusable quiz engine and Quiz Centre
js/schema.js                     Versioned file formats, validation and export builders (also runs in Node)
js/profiles.js                   Local profiles: registry, per-profile storage namespaces, migration (also runs in Node)
js/certs.js                      My Certifications, editor, import/export, resources, question manager
js/revision.js                   Notes, bookmarks, Revision view, readiness score
certifications/ab-650/           Built-in AB-650 profile: meta.js, questions-d1..3.js, profile.js
certifications/sc-300/           Built-in SC-300 profile: meta.js (outline, refs, Learn modules), questions-d1..4.js, profile.js (plan)
certifications/md-102/           Built-in MD-102 profile: meta.js (outline, refs, Learn modules), questions-d1..5.js, profile.js (plan)
docs/COVERAGE.md                 Question counts per domain and per exam objective (generated by tests/certs.js)
certifications/template-profile.json   A valid example profile to start from
docs/CERTIFICATION-PROFILES.md   How to create and share profiles; the JSON schema
docs/PRIVACY.md                  What is stored where, local profiles, sharing PrepWise with friends
service-worker.js                Offline cache (per-path cache names; CACHE_VERSION stamped at build)
scripts/build-pages.js           Checks and builds the GitHub Pages site into _site/
.github/workflows/pages.yml      Tests, build and gated deployment to GitHub Pages
legacy-redirect/                 Files that retire the old m365-study-tracker address (not deployed)
manifest.json                    PWA manifest
icons/                           App icons
```

## Data storage

Everything is in `localStorage` in this browser, one namespace per local profile:

| Key | Contents |
|---|---|
| `prepwise:profiles` | List of local profiles (id, display name, dates) and which one is open |
| `prepwise:p:<profile>:store` | The profile's store: settings, certification content, per-certification progress |
| `prepwise:p:<profile>:bank:<id>` | Question bank of a certification the profile created or imported |
| `prepwise:p:<profile>:snapshots` | The profile's last three automatic snapshots, taken before resets, deletes and overwrites |

The person who used PrepWise before profiles existed (v2.1 and earlier) keeps their original keys: `prepwise:v2`, `prepwise:bank:<id>`, `prepwise:snapshots`, `prepwise:backup:v1` and the untouched v1 data in `m365-study-tracker:v1`. On upgrade these keys become the first profile **in place**: nothing is copied, rewritten or deleted.

Within a profile, progress is stored under a stable certification ID, so resetting or deleting one certification can't affect another. Profiles never share keys, so switching, resetting or deleting one profile can't affect another.

## Upgrading from v1

When v2 opens for the first time on a device that has v1 data, it:

1. copies the v1 data to `prepwise:backup:v1`,
2. creates the built-in **AB-650** profile with the same 4-week plan and the unchanged 167-question bank,
3. moves your sessions, logged time, notes, objectives, practice-test results, Udemy progress, Quiz Centre history, statistics and bookmarks into that profile.

The v1 data itself is left in place. You can download it any time from **Settings → Data Management → Download original v1 data**.

One behaviour change: the Quiz Centre now uses your **Exam preparation target score** setting (Settings → Certification Preferences) instead of a fixed 85%. If you changed the v1 "Mastery target", that value now applies to the Quiz Centre too.

## Run locally

A service worker only runs over `http://localhost` or HTTPS, so don't open `index.html` straight from disk.

```bash
cd PrepWise
python3 -m http.server 8000
# open http://localhost:8000
```

## Tests

```bash
node tests/unit.js           # schema, validation and the AB-650 bank (needs Node 18+)
node tests/certs.js          # SC-300 and MD-102: outline, answer keys, coverage, plan; writes docs/COVERAGE.md
node tests/links.js          # checks every SC-300/MD-102 reference and Learn link (needs network)
node tests/profiles-unit.js  # profile storage layer + scan of the shipped app for personal information
node tests/profiles.js       # real browser: onboarding, profiles, isolation, export/import, upgrade, PWA/offline
node tests/run-multicert.js  # real browser: SC-300/MD-102 quiz modes, upgrade, backup restore
node tests/pages.js          # real browser: GitHub Pages at /PrepWise/ (scope, offline, updates, shared origin, redirect)
node scripts/build-pages.js --check   # precache list, relative paths, APP_VERSION/CACHE_VERSION
```

`profiles.js`, `run-multicert.js` and `pages.js` drive headless Edge or Chrome over the DevTools protocol (Node 22+, no npm packages; set `BROWSER=` to the executable if it isn't found). The older end-to-end, layout and PWA checks use Python Playwright with Chrome (`pip install playwright`).

## Deploy

PrepWise is static, with no build dependencies or backend. It's deployed to **GitHub Pages** by `.github/workflows/pages.yml`:

1. Every push and pull request runs the unit, content and real-browser tests (`test` job). The older Python Playwright suites run in a separate, informational job.
2. `scripts/build-pages.js` checks the app and builds `_site/`. The check covers every script, certification file and icon being precached, relative paths, and matching versions. `_site/` contains only the app files (no tests, docs or fixtures), and `CACHE_VERSION` is stamped as `v<APP_VERSION>-<content hash>`, so every deployment that changes an app file gets a new cache automatically.
3. The `deploy` job publishes `_site/` to Pages only from `main`, and only when the repository variable `PAGES_DEPLOY` is `true`.

Set **Settings → Pages → Source** to **GitHub Actions**. A private repository needs GitHub Pro, Team or Enterprise for Pages. The published site is public either way.

When you release a user-visible change, bump `APP_VERSION` in `app.js` and `CACHE_VERSION` in `service-worker.js` to the same number. The build fails if they differ. Cache refreshes don't depend on it: the content hash handles those. Installed apps show **A new version is available → Update**.

**Rollback:** `git revert` the change and push to `main`. The reverted files produce a new content hash, so installed apps update to the previous code.

**Same origin, shared data:** `https://brunoscorrea.github.io/PrepWise/` and the old `…/m365-study-tracker/` share one origin, so they share `localStorage`: every profile and all progress appear at the new address with no export. Caches are named per path (`prepwise:/PrepWise/:v…`), so the two copies never delete each other's caches. `legacy-redirect/` holds the files that retire the old address (see its README). A custom domain is a new origin: users would need Export → Import.

## Install

- **Android (Chrome):** tap **Install** on the banner, or ⋮ → **Install app**.
- **iPhone/iPad (Safari):** Share → **Add to Home Screen**.
- **Desktop (Chrome/Edge):** the install icon in the address bar.

## Your data

- Your study progress and personal notes are stored locally in this browser. They are not automatically shared with other PrepWise users. Nothing is sent anywhere: no accounts, analytics or tracking.
- Each browser and device has its own data. People who share one browser profile can open each other's PrepWise profiles: profiles keep data apart, they don't lock it.
- Export a backup now and then from **Settings → Profile → Export profile**, and use it to move to another device. Clearing site data or uninstalling the app deletes it.
- The app never signs in to course sites. You enter course progress yourself.
- All practice questions (AB-650, SC-300 and MD-102) are original learning questions, not Microsoft exam questions or exam dumps. Readiness scores are a study aid, not a prediction of your exam result.
