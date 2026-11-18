# PrepWise

An offline, installable study planner and quiz centre for **any** certification. Each certification is its own profile with its own study plan, learning resources, question bank, quiz history and progress. It's built with vanilla JavaScript, HTML and CSS and has no backend: all data stays on your device.

PrepWise grew out of the *M365 Study Tracker* for Microsoft AB-650. Existing AB-650 data is migrated automatically the first time v2 opens (see [Upgrading from v1](#upgrading-from-v1)).

## Features

- **My Certifications** — a searchable library of certification profiles. Add, edit, duplicate, archive and delete profiles, and switch between them. The active certification is shown in the sidebar (desktop) or top bar (mobile) on every page.
- **Home** — the dashboard for the active certification: study completion, hours done and remaining, days left, current week, next session, exam preparation, quiz performance, streak, domain mastery and study recommendations.
- **Study Plan** — week-by-week sessions with a study timer, objectives, lecture checklists, notes and revision status. Any number of weeks (1–52).
- **Learning Resources** — courses, docs, labs and practice tests for the certification.
- **Revision & Notes** — notes linked to a certification, study week, topic or exam objective, plus bookmarked questions, topics, resources and notes in one place.
- **Quiz Centre** — one reusable quiz engine that only ever uses the active certification's question bank: Quick, Standard, Full Mock (weighted by exam domains, timed), Domain, Weak Areas, Bookmarked, Daily Challenge, Week Revision and Final Mock. Practice and exam modes, explanations and reference links.
- **Progress & Analytics** — a transparent readiness score, hours per week, weekly completion, recorded practice tests, course progress and achievements.
- **Import / export** — share a certification profile, study plan or question bank with friends without sharing your progress. Full backups and private progress exports are separate. Every import is validated and previewed first.
- **PWA** — installable on Android, iOS and desktop, and works offline.

The readiness score is calculated from study completion (25%), quiz accuracy (20%), weighted domain mastery (35%) and your last three results with 10+ questions (20%). The breakdown is shown in Analytics. It is not an official prediction of passing.

## Files

```
index.html                       App shell
styles.css                       Design system and responsive layout
app.js                           Store, migration, certification context, Home, Study Plan, Analytics, Settings
quiz-centre.js                   Reusable quiz engine and Quiz Centre
js/schema.js                     Versioned file formats, validation and export builders (also runs in Node)
js/certs.js                      My Certifications, editor, import/export, resources, question manager
js/revision.js                   Notes, bookmarks, Revision view, readiness score
certifications/ab-650/           Built-in AB-650 profile: meta.js, questions-d1..3.js, profile.js
certifications/template-profile.json   A valid example profile to start from
docs/CERTIFICATION-PROFILES.md   How to create and share profiles; the JSON schema
service-worker.js                Offline cache
manifest.json                    PWA manifest
icons/                           App icons
```

## Data storage

Everything is in `localStorage` on this device:

| Key | Contents |
|---|---|
| `prepwise:v2` | Application store: settings, certification content, per-certification progress |
| `prepwise:bank:<id>` | Question bank of a certification created or imported on this device |
| `prepwise:snapshots` | The last three automatic snapshots, taken before resets, deletes and overwrites |
| `prepwise:backup:v1` | Untouched copy of the v1 data, made before migration |
| `m365-study-tracker:v1` | The original v1 data. Never modified or deleted |

All progress is stored under a stable certification ID, so resetting or deleting one certification can't affect another.

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
```

The end-to-end, layout and PWA checks in `tests/` use Python Playwright with Chrome (`pip install playwright`).

## Deploy

The app is static. Upload the folder to any static host (GitHub Pages, Netlify, Cloudflare Pages). All paths are relative.

**To keep your existing AB-650 data, deploy to the same origin as v1** (for example, push to the existing `m365-study-tracker` repository on GitHub Pages). Browser storage is per origin, so a different domain starts empty. A different repository under the same `github.io` account shares the origin, so it also finds the v1 data.

Whenever you change any file, bump `CACHE_VERSION` in `service-worker.js`. Installed apps then show **A new version is available → Update**.

## Install

- **Android (Chrome):** tap **Install** on the banner, or ⋮ → **Install app**.
- **iPhone/iPad (Safari):** Share → **Add to Home Screen**.
- **Desktop (Chrome/Edge):** the install icon in the address bar.

## Your data

- Data saves automatically on this device. Nothing is sent anywhere.
- Export a backup now and then from **Settings → Data Management**. Clearing site data or uninstalling the app deletes it.
- The app never signs in to course sites. You enter course progress yourself.
- AB-650 practice questions are original learning questions, not Microsoft exam questions.
