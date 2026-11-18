# Tests

- `node unit.js` — schema validation, import formats and the AB-650 bank.
- `node certs.js` — SC-300 and MD-102 profiles: official weightings and objectives, ≥120 questions, metadata on every question, answer keys and explanations, multi-select scoring, duplicates, no leakage from AB-650, ≥40% scenarios, objective coverage, weighted mock, plan hours and links, export round trip. Writes `../docs/COVERAGE.md`.
- `node links.js` — fetches every SC-300/MD-102 reference and Microsoft Learn link (network; rate-limit aware).
- `node profiles-unit.js` — local profile storage layer (migration in place, namespaces, delete only own keys, registry rebuild) and a scan of every shipped file for hard-coded personal information.
- `node profiles.js` — real browser (headless Edge/Chrome over the DevTools protocol, Node 22+, no packages). Fresh browser contexts open the same served app: first-run onboarding, greetings per user, isolation between browsers, a second local profile with independent quiz history across AB-650/SC-300/MD-102, switching round trips, rename, export/import as a new profile and as a replacement, delete, reset, upgrade from v2.1 and from the v1 tracker, layout at 375 px and 1280 px, service worker and offline use.
- `node pages.js` — simulates GitHub Pages on one origin: the live v2.2.0 site (rebuilt from git) at `/m365-study-tracker/` and the new build at `/PrepWise/`, both with `Cache-Control: max-age=600`. Checks data carry-over, service worker scope, manifest paths, precaching, offline quizzes and notes, cache isolation between the two copies, the update path (no stale files) and the `legacy-redirect/` stub. Needs the full git history.
- `node run-multicert.js` — runs `browser-multicert.js` with the same headless harness (`cdp.js`).
- `browser-multicert.js` — in-page test: upgrade from a store without SC-300/MD-102 (AB-650 byte-for-byte unchanged), separate quiz histories, every quiz mode, weighted mock, multi-select scoring through the engine, study guide in the session sheet, library cards, backup restore through the import UI. `python3 multicert.py` runs it with Playwright; it can also be pasted into the console on a fresh origin.
- `python3 e2e.py` — acceptance flow: v1 migration, AB-650 quiz, second certification, independence, leakage, import/export, settings persistence, resets, duplicate/archive/delete, notes, readiness, invalid imports. Writes `dl/all_storage.json`, which `layout.py` uses.
- `python3 layout.py` — every page at 320×640, 390×844, 820×1180 and 1440×900: no horizontal overflow, number fields never overlap their unit, sheets/dialogs fit, player touch targets.
- `python3 pwa.py` — service worker, cache, manifest and offline use.
- `legacy_v1_state.json` is v1 data produced by driving the original app (`make_fixture.py`), with an anonymised name.

The Python tests need `pip install playwright` and Chrome/Chromium.
